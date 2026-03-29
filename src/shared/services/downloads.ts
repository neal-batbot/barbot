import { getAllConfigs } from '@/shared/models/config';

export interface DownloadArtifact {
  platform: 'macos' | 'windows' | 'linux';
  arch: string;
  url: string;
  checksum?: string;
  size?: number;
}

export interface DownloadManifest {
  version: string;
  publishedAt?: string;
  artifacts: DownloadArtifact[];
}

const DEFAULT_FALLBACK_MANIFEST: DownloadManifest = {
  version: 'latest',
  artifacts: [],
};

function normalizeManifest(input: any): DownloadManifest {
  const artifacts = Array.isArray(input?.artifacts)
    ? input.artifacts
        .filter((item: any) => item?.platform && item?.url)
        .map((item: any) => ({
          platform: item.platform,
          arch: item.arch || 'universal',
          url: item.url,
          checksum: item.checksum || undefined,
          size: item.size || undefined,
        }))
    : [];

  return {
    version: String(input?.version || 'latest'),
    publishedAt: input?.publishedAt ? String(input.publishedAt) : undefined,
    artifacts,
  };
}

export async function getDownloadManifest(): Promise<{
  manifest: DownloadManifest;
  source: 'remote' | 'fallback';
}> {
  const configs = await getAllConfigs();
  const manifestUrl = configs.release_manifest_url || process.env.RELEASE_MANIFEST_URL;
  const fallbackJson =
    configs.release_manifest_fallback || process.env.RELEASE_MANIFEST_FALLBACK || '';

  if (manifestUrl) {
    try {
      const response = await fetch(manifestUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (response.ok) {
        const payload = await response.json();
        return {
          manifest: normalizeManifest(payload),
          source: 'remote',
        };
      }
    } catch (error) {
      console.warn('[downloads] fetch release manifest failed:', error);
    }
  }

  if (fallbackJson) {
    try {
      const parsed = JSON.parse(fallbackJson);
      return {
        manifest: normalizeManifest(parsed),
        source: 'fallback',
      };
    } catch (error) {
      console.warn('[downloads] parse fallback manifest failed:', error);
    }
  }

  return {
    manifest: DEFAULT_FALLBACK_MANIFEST,
    source: 'fallback',
  };
}
