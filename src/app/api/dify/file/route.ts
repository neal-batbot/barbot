import { getAllConfigs } from '@/shared/models/config';

// ---------------------------------------------------------------------------
// In-memory console token cache (survives across requests in the same process)
// ---------------------------------------------------------------------------
let cachedConsoleToken: string | null = null;
let consoleTokenExpiresAt = 0; // unix timestamp in ms

/**
 * Login to Dify console API and return an access_token.
 */
async function loginDifyConsole(
  baseUrl: string,
  email: string,
  password: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/console/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.access_token || data?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Get a (possibly cached) Dify console access token.
 * Returns null if credentials are not configured or login fails.
 */
async function getConsoleToken(baseUrl: string): Promise<string | null> {
  // Return cached token if still valid (with 60s safety margin)
  if (cachedConsoleToken && Date.now() < consoleTokenExpiresAt - 60_000) {
    return cachedConsoleToken;
  }

  let email: string | undefined;
  let password: string | undefined;

  try {
    const configs = await getAllConfigs();
    email = configs.dify_console_email || process.env.DIFY_CONSOLE_EMAIL;
    password = configs.dify_console_password || process.env.DIFY_CONSOLE_PASSWORD;
  } catch {
    email = process.env.DIFY_CONSOLE_EMAIL;
    password = process.env.DIFY_CONSOLE_PASSWORD;
  }

  if (!email || !password) return null;

  const token = await loginDifyConsole(baseUrl, email, password);
  if (token) {
    cachedConsoleToken = token;
    // Dify console tokens typically expire in 24h; cache for 2h to be safe
    consoleTokenExpiresAt = Date.now() + 2 * 60 * 60 * 1000;
  }
  return token;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract Dify file ID from a URL like /Files/{uuid}/file-preview or /files/{uuid}/... */
function extractFileId(url: string): string | null {
  const match = url.match(
    /\/[Ff]iles\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
  return match ? match[1] : null;
}

/** Build a successful proxy Response from upstream fetch result. */
function buildProxyResponse(upstream: globalThis.Response): Response {
  const h = new Headers();
  for (const key of ['Content-Type', 'Content-Length', 'Content-Disposition']) {
    const v = upstream.headers.get(key);
    if (v) h.set(key, v);
  }
  h.set('Cache-Control', 'public, max-age=600');
  return new Response(upstream.body, { headers: h });
}

// ---------------------------------------------------------------------------
// GET /api/dify/file?url=...
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return new Response('Missing url', { status: 400 });
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return new Response('Invalid url', { status: 400 });
    }

    // ---- Load configuration ----
    const apiKeys: string[] = [];
    let difyBaseUrl = ''; // e.g. http://156.224.28.114
    let needsAuth = false;

    try {
      const configs = await getAllConfigs();
      const difyApiUrl = configs.dify_api_url || process.env.DIFY_API_URL;
      const globalKey = configs.dify_api_key || process.env.DIFY_API_KEY;

      if (difyApiUrl) {
        // Derive the base URL (without /v1 suffix)
        const parsed = new URL(difyApiUrl);
        difyBaseUrl = `${parsed.protocol}//${parsed.host}`;
        needsAuth = parsed.host === new URL(url).host;
      }

      if (globalKey) apiKeys.push(globalKey);

      // Collect bot-specific API keys
      if (configs.dify_bots) {
        try {
          const bots = JSON.parse(configs.dify_bots);
          for (const bot of bots) {
            if (bot.api_key && !apiKeys.includes(bot.api_key)) {
              apiKeys.push(bot.api_key);
            }
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }

    // ---- Strategy 1: Console API (most reliable for knowledge-base files) ----
    if (needsAuth && difyBaseUrl) {
      const fileId = extractFileId(url);
      if (fileId) {
        const consoleToken = await getConsoleToken(difyBaseUrl);
        if (consoleToken) {
          try {
            const consoleUrl = `${difyBaseUrl}/console/api/files/${fileId}/preview`;
            const upstream = await fetch(consoleUrl, {
              headers: { Authorization: `Bearer ${consoleToken}` },
            });
            if (upstream.ok && upstream.body) {
              return buildProxyResponse(upstream);
            }
            // If 401, invalidate cached token so next request re-logs in
            if (upstream.status === 401) {
              cachedConsoleToken = null;
              consoleTokenExpiresAt = 0;
            }
          } catch { /* fall through */ }
        }
      }
    }

    // ---- Strategy 2: Direct fetch with app API keys ----
    if (needsAuth && apiKeys.length > 0) {
      // Also try with case-corrected URL (/Files/ → /files/)
      const urlVariants = [url];
      if (/\/Files\//i.test(url)) {
        urlVariants.push(url.replace(/\/Files\//i, '/files/'));
      }

      for (const tryUrl of urlVariants) {
        for (const key of apiKeys) {
          try {
            const upstream = await fetch(tryUrl, {
              headers: { Authorization: `Bearer ${key}` },
            });
            if (upstream.ok && upstream.body) {
              return buildProxyResponse(upstream);
            }
            if (upstream.status === 401 || upstream.status === 403) continue;
            // 400/404 - move to next URL variant
            break;
          } catch { continue; }
        }
      }
    }

    // ---- Strategy 3: Fetch without auth (public files / fallback) ----
    const upstream = await fetch(url);
    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text().catch(() => '');
      return new Response(errorText || 'Upstream error', { status: upstream.status });
    }
    return buildProxyResponse(upstream);
  } catch (error) {
    console.error('Dify file proxy error:', error);
    return new Response(
      error instanceof Error ? error.message : 'Internal server error',
      { status: 500 },
    );
  }
}
