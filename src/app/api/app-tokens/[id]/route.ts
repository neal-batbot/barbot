import { getUserInfo } from '@/shared/models/user';
import { revokeAppToken } from '@/shared/models/app-token';
import { respData, respErr } from '@/shared/lib/resp';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const { id } = await params;
    if (!id) {
      return respErr('invalid id');
    }

    const record = await revokeAppToken({
      id,
      userId: user.id,
    });

    if (!record) {
      return respErr('token not found');
    }

    return respData({
      id: record.id,
      status: record.status,
    });
  } catch (error) {
    console.error('[DELETE /api/app-tokens/:id] error:', error);
    return respErr('Failed to revoke app token');
  }
}
