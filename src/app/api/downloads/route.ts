import { getDownloadManifest } from '@/shared/services/downloads';
import { respData, respErr } from '@/shared/lib/resp';

export async function GET() {
  try {
    const { manifest, source } = await getDownloadManifest();
    return respData({
      source,
      version: manifest.version,
      publishedAt: manifest.publishedAt || null,
      artifacts: manifest.artifacts,
    });
  } catch (error) {
    console.error('[GET /api/downloads] error:', error);
    return respErr('Failed to load download manifest');
  }
}
