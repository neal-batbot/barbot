import { z } from 'zod';

import {
  resolvePlatformAuth,
  unauthorizedResponse,
} from '@/shared/lib/platform-auth';
import { respData } from '@/shared/lib/resp';
import {
  findPlanEntitlement,
  parseFeatures,
} from '@/shared/models/plan-entitlement';
import { getProviderConfigs } from '@/shared/models/provider-config';
import { getCurrentSubscription } from '@/shared/models/subscription';

const querySchema = z.object({
  product: z.string().min(1),
});

const FREE_PLAN = 'free';

export async function GET(req: Request) {
  try {
    const identity = await resolvePlatformAuth(req);
    if (!identity) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      product: searchParams.get('product'),
    });
    if (!parsed.success) {
      return Response.json(
        { code: -1, message: 'product parameter is required' },
        { status: 400 }
      );
    }

    const { product } = parsed.data;
    const userId = identity.userId;

    const subscription = await getCurrentSubscription(userId);
    const planName = subscription?.planName ?? FREE_PLAN;
    const entitlement =
      (await findPlanEntitlement(planName, product)) ??
      (planName !== FREE_PLAN
        ? await findPlanEntitlement(FREE_PLAN, product)
        : undefined);
    const features = parseFeatures(entitlement?.features ?? null);

    if (!entitlement?.isEnabled) {
      return respData({
        available: false,
        product,
        plan: planName,
        allowed: false,
        message: 'Product is not enabled for this plan',
      });
    }

    const configs = await getProviderConfigs(planName, product);
    if (configs.length === 0) {
      return respData({
        available: false,
        product,
        plan: planName,
        allowed: true,
        message: 'No provider configured for this plan',
      });
    }

    const toChannel = (config: (typeof configs)[number]) => ({
      channelId: config.channelId,
      provider: config.providerName,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      modelName: config.modelName ?? '',
      priority: config.priority,
      weight: config.weight,
      healthStatus: config.healthStatus,
      cooldownUntil: config.cooldownUntil,
      fallbackGroup: config.fallbackGroup,
      supportsStreaming: config.supportsStreaming,
      isDefaultAuto: config.isDefaultAuto,
    });
    const [primary, ...fallbacks] = configs.map(toChannel);
    const allowedModels = Array.isArray(features.allowed_models)
      ? features.allowed_models
      : Array.isArray(features.allowedModels)
        ? features.allowedModels
        : primary.modelName
          ? [primary.modelName]
          : [];

    return respData({
      available: true,
      product,
      plan: planName,
      allowed: true,
      primary,
      fallbacks,
      models: allowedModels,
      allowedModels,
      provider: primary.provider,
      baseUrl: primary.baseUrl,
      apiKey: primary.apiKey,
      modelName: primary.modelName,
    });
  } catch (e) {
    console.error('[GET /api/v1/provider-config] error:', e);
    return Response.json(
      { code: -1, message: 'Failed to get provider config' },
      { status: 500 }
    );
  }
}
