import { z } from 'zod';
import { findApikeyByKey } from '@/shared/models/apikey';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getProviderConfig } from '@/shared/models/provider-config';
import { respData } from '@/shared/lib/resp';

const querySchema = z.object({
  product: z.string().min(1),
});

const FREE_PLAN = 'free';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ code: -1, message: 'unauthorized' }, { status: 401 });
    }

    const apiKeyValue = authHeader.slice(7);
    const apikeyRecord = await findApikeyByKey(apiKeyValue);
    if (!apikeyRecord) {
      return Response.json({ code: -1, message: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({ product: searchParams.get('product') });
    if (!parsed.success) {
      return Response.json({ code: -1, message: 'product parameter is required' }, { status: 400 });
    }

    const { product } = parsed.data;
    const userId = apikeyRecord.userId;

    const subscription = await getCurrentSubscription(userId);
    const planName = subscription?.planName ?? FREE_PLAN;

    const config = await getProviderConfig(planName, product);
    if (!config) {
      return respData({
        available: false,
        product,
        plan: planName,
        message: 'No provider configured for this plan',
      });
    }

    return respData({
      available: true,
      product,
      plan: planName,
      provider: config.providerName,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      modelName: config.modelName,
    });
  } catch (e) {
    console.error('[GET /api/v1/provider-config] error:', e);
    return Response.json({ code: -1, message: 'Failed to get provider config' }, { status: 500 });
  }
}
