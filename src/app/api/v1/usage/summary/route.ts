import { z } from 'zod';

import { getUserInfo } from '@/shared/models/user';
import { getUsageSummary } from '@/shared/models/usage-log';
import { respData, respErr } from '@/shared/lib/resp';

const periodSchema = z
  .enum(['1d', '7d', '30d', '90d', 'custom'])
  .default('7d');

const groupBySchema = z
  .enum(['product', 'model', 'type'])
  .default('product');

function getPeriodDates(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  const end = endDate ? new Date(endDate) : now;

  if (period === 'custom' && startDate) {
    return { startDate: new Date(startDate), endDate: end };
  }

  const days =
    period === '1d'
      ? 1
      : period === '7d'
        ? 7
        : period === '30d'
          ? 30
          : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - days);

  return { startDate: start, endDate: end };
}

export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const url = new URL(req.url);
    const rawPeriod = url.searchParams.get('period') ?? '7d';
    const rawGroupBy = url.searchParams.get('group_by') ?? 'product';
    const rawAppId = url.searchParams.get('app_id') ?? undefined;
    const rawStartDate = url.searchParams.get('start_date') ?? undefined;
    const rawEndDate = url.searchParams.get('end_date') ?? undefined;

    const periodResult = periodSchema.safeParse(rawPeriod);
    const groupByResult = groupBySchema.safeParse(rawGroupBy);

    if (!periodResult.success || !groupByResult.success) {
      return Response.json(
        { error: 'validation_error', details: 'Invalid period or group_by parameter' },
        { status: 400 }
      );
    }

    const { startDate, endDate } = getPeriodDates(
      periodResult.data,
      rawStartDate,
      rawEndDate
    );

    const result = await getUsageSummary({
      userId: user.id,
      startDate,
      endDate,
      appId: rawAppId,
      groupBy: groupByResult.data,
    });

    return respData(result);
  } catch (e) {
    console.error('[GET /api/v1/usage/summary] error:', e);
    return respErr('Failed to fetch usage summary');
  }
}
