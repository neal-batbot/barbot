import { getUserInfo } from '@/shared/models/user';
import {
  AppTokenStatus,
  createAppToken,
  generateAppTokenValue,
  listUserAppTokens,
} from '@/shared/models/app-token';
import { respData, respErr } from '@/shared/lib/resp';

export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const records = await listUserAppTokens(user.id);
    return respData(
      records.map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        tokenPrefix: item.tokenPrefix,
        lastUsedAt: item.lastUsedAt,
        createdAt: item.createdAt,
      }))
    );
  } catch (error) {
    console.error('[GET /api/app-tokens] error:', error);
    return respErr('Failed to list app tokens');
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const body = await req.json().catch(() => ({}));
    const name =
      typeof body?.name === 'string' && body.name.trim()
        ? body.name.trim()
        : 'Harvey Desktop';

    const tokenValue = generateAppTokenValue();

    const record = await createAppToken({
      userId: user.id,
      name,
      tokenHash: tokenValue.tokenHash,
      tokenPrefix: tokenValue.tokenPrefix,
      status: AppTokenStatus.ACTIVE,
    });

    return respData({
      id: record.id,
      name: record.name,
      token: tokenValue.rawToken,
      tokenPrefix: record.tokenPrefix,
      status: record.status,
      createdAt: record.createdAt,
    });
  } catch (error) {
    console.error('[POST /api/app-tokens] error:', error);
    return respErr('Failed to create app token');
  }
}
