import { z } from 'zod';

import { getUserInfo } from '@/shared/models/user';
import { getUsageLogs } from '@/shared/models/usage-log';
import { respData, respErr } from '@/shared/lib/resp';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  app_id: z.string().optional(),
  product: z.string().optional(),
  model: z.string().optional(),
  type: z.string().optional(),
  start_date: z.string().datetime({ offset: true }).optional(),
  end_date: z.string().datetime({ offset: true }).optional(),
});

export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsed = querySchema.safeParse(params);

    if (!parsed.success) {
      return Response.json(
        { error: 'validation_error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, app_id, product, model, type, start_date, end_date } =
      parsed.data;

    const { data, total } = await getUsageLogs({
      userId: user.id,
      appId: app_id,
      product,
      model,
      type,
      startDate: start_date ? new Date(start_date) : undefined,
      endDate: end_date ? new Date(end_date) : undefined,
      page,
      limit,
    });

    return respData({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error('[GET /api/v1/usage/logs] error:', e);
    return respErr('Failed to fetch usage logs');
  }
}
