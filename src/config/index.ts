import packageJson from '../../package.json';

// Load .env files for scripts (tsx/ts-node) - but NOT in Edge Runtime or browser
// This ensures scripts can read DATABASE_URL and other env vars
// Check for real Node.js environment by looking at global 'process' properties
if (
  typeof process !== 'undefined' &&
  typeof process.cwd === 'function' &&
  !process.env.NEXT_RUNTIME // Skip if in Next.js runtime (already loaded)
) {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.development' });
    dotenv.config({ path: '.env', override: false });
  } catch (e) {
    // Silently fail - dotenv might not be available in some environments
  }
}

export type ConfigMap = Record<string, string>;

function resolveAuthSecret() {
  const explicit = (process.env.AUTH_SECRET ?? '').trim();
  if (explicit) {
    return explicit;
  }

  const fallback = (process.env.BETTER_AUTH_SECRET ?? '').trim();
  if (fallback) {
    return fallback;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'barbot-dev-auth-secret';
  }

  return '';
}

function resolveAuthUrl() {
  const envUrl =
    process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  if (typeof window === 'undefined') {
    return envUrl || 'http://localhost:3000';
  }

  const browserOrigin = window.location.origin;
  if (!envUrl) {
    return browserOrigin;
  }

  try {
    const parsed = new URL(envUrl);
    const envIsLoopback =
      parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const browserIsLoopback =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    if (
      envIsLoopback &&
      browserIsLoopback &&
      parsed.port === window.location.port &&
      parsed.hostname !== window.location.hostname
    ) {
      return browserOrigin;
    }
  } catch (e) {
    return browserOrigin;
  }

  return envUrl;
}

export const envConfigs = {
  app_url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  app_name: process.env.NEXT_PUBLIC_APP_NAME ?? 'Vector',
  theme: process.env.NEXT_PUBLIC_THEME ?? 'default',
  appearance: process.env.NEXT_PUBLIC_APPEARANCE ?? 'system',
  locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en',
  database_url: process.env.DATABASE_URL ?? '',
  database_provider: process.env.DATABASE_PROVIDER ?? 'postgresql',
  db_singleton_enabled: process.env.DB_SINGLETON_ENABLED || 'false',
  db_max_connections: process.env.DB_MAX_CONNECTIONS || '1',
  auth_url: resolveAuthUrl(),
  auth_secret: resolveAuthSecret(),
  version: packageJson.version,
};
