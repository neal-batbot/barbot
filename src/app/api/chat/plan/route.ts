import { getUserInfo } from '@/shared/models/user';
import { resolveEntitlement } from '@/shared/services/entitlement';
import { respData, respErr } from '@/shared/lib/resp';

/**
 * GET /api/chat/plan
 * Returns the current user's plan tier for frontend model access control.
 */
export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respData({ plan: 'free', allowedModels: ['kimi-*', 'glm-*'] });
    }

    const entitlement = await resolveEntitlement(user.id);
    return respData({
      plan: entitlement.plan,
      allowedModels: entitlement.allowedModels,
    });
  } catch (e: any) {
    return respErr(`Failed to resolve plan: ${e.message}`);
  }
}
