import { respData } from '@/shared/lib/resp';
import { db } from '@/core/db';
import { sql } from 'drizzle-orm';
import { getAllConfigs } from '@/shared/models/config';
import { envConfigs } from '@/config';

export async function GET() {
  const startedAt = Date.now();
  const checks: Record<string, { ok: boolean; detail?: string }> = {
    app: { ok: true },
    db: { ok: false },
    dify: { ok: false },
  };

  try {
    await db().execute(sql`SELECT 1`);
    checks.db = { ok: true };
  } catch (e: any) {
    checks.db = { ok: false, detail: e?.message || 'db check failed' };
  }

  try {
    const configs = await getAllConfigs();
    const rawDifyUrl = (configs.dify_api_url || process.env.DIFY_API_URL || '').replace(/\/+$/, '');
    const difyBase = rawDifyUrl
      ? (rawDifyUrl.endsWith('/v1') ? rawDifyUrl : `${rawDifyUrl}/v1`)
      : '';
    const difyKey = configs.dify_api_key || process.env.DIFY_API_KEY;
    if (!difyBase) {
      checks.dify = { ok: false, detail: 'missing dify_api_url' };
    } else if (!difyKey) {
      checks.dify = { ok: false, detail: 'missing dify_api_key' };
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const resp = await fetch(`${difyBase}/parameters`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${difyKey}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      checks.dify = {
        ok: resp.ok || resp.status === 401 || resp.status === 403,
        detail: `status=${resp.status}`,
      };
    }
  } catch (e: any) {
    checks.dify = { ok: false, detail: e?.message || 'dify check failed' };
  }

  const allOk = checks.app.ok && checks.db.ok && checks.dify.ok;
  return respData({
    status: allOk ? 'ok' : 'degraded',
    version: envConfigs.version,
    build: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'unknown',
    latencyMs: Date.now() - startedAt,
    checks,
  });
}
