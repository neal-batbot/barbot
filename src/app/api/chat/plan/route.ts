import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import {
  resolveChatPlanView,
  resolvePlanPolicy,
} from '@/shared/services/model-supply';

/**
 * GET /api/chat/plan
 * Returns the current user's plan tier for frontend model access control.
 */
export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      const policy = resolvePlanPolicy('free');
      return respData({
        plan: policy.plan,
        allowedModels: policy.allowedModels,
        autoModelEnabled: policy.autoModelEnabled,
        quotaTokens: policy.quotaTokens,
        remainingTokens: policy.quotaTokens,
        overageEnabled: policy.overageEnabled,
      });
    }

    return respData(await resolveChatPlanView({ userId: user.id }));
  } catch (e: any) {
    return respErr(`Failed to resolve plan: ${e.message}`);
  }
}
