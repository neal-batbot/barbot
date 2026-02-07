import { respData } from '@/shared/lib/resp';

export async function GET() {
  return respData({ status: 'ok' });
}
