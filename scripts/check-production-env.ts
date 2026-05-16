import { config as loadEnv } from 'dotenv';

const envFiles = [
  '.env.production.local',
  '.env.production',
  '.env.local',
  '.env',
  '.env.development',
];

for (const file of envFiles) {
  loadEnv({ path: file, override: false });
}

type Check = {
  name: string;
  ok: boolean;
  level: 'error' | 'warn';
  message: string;
};

const checks: Check[] = [];

function env(name: string) {
  return (process.env[name] ?? '').trim();
}

function addCheck(
  ok: boolean,
  level: Check['level'],
  name: string,
  message: string
) {
  checks.push({ name, ok, level, message });
}

function requireEnv(name: string, description: string) {
  addCheck(Boolean(env(name)), 'error', name, description);
}

function requireOneOf(names: string[], description: string) {
  addCheck(
    names.some((name) => Boolean(env(name))),
    'error',
    names.join(' | '),
    description
  );
}

function warnIfLocalhost(name: string, description: string) {
  const value = env(name);
  if (!value) {
    return;
  }
  addCheck(
    !/localhost|127\.0\.0\.1/.test(value),
    'warn',
    name,
    description
  );
}

function warnIfNotHttps(name: string, description: string) {
  const value = env(name);
  if (!value) {
    return;
  }
  addCheck(value.startsWith('https://'), 'warn', name, description);
}

function enabled(configs: Record<string, string>, name: string) {
  return configs[name] === 'true' || env(name.toUpperCase()) === 'true';
}

function envEnabled(name: string) {
  return env(name.toUpperCase()) === 'true';
}

function configValue(configs: Record<string, string>, name: string) {
  return env(name.toUpperCase()) || configs[name] || '';
}

async function main() {
  const strict = process.argv.includes('--strict');

  requireEnv('DATABASE_URL', 'PostgreSQL connection string is required.');
  requireOneOf(
    ['AUTH_SECRET', 'BETTER_AUTH_SECRET'],
    'Better Auth production secret is required.'
  );
  requireOneOf(
    ['DIFY_API_URL', 'DIFY_BASE_URL'],
    'Dify API base URL is required for Barbot and Pi BFF.'
  );
  requireEnv('DIFY_API_KEY', 'Dify app API key is required.');
  requireEnv(
    'BARBOT_USAGE_TOKEN',
    'Server-side usage reporting token is required for Pi BFF -> Barbot.'
  );
  requireOneOf(
    ['PI_AGENT_WEB_URL', 'NEXT_PUBLIC_PI_WEB_UI_URL'],
    'Pi Agent Web UI URL is required for platform routing.'
  );

  warnIfLocalhost(
    'NEXT_PUBLIC_APP_URL',
    'Production app URL should not point to localhost.'
  );
  warnIfLocalhost(
    'PI_AGENT_WEB_URL',
    'Production Pi Agent URL should not point to localhost.'
  );
  warnIfLocalhost(
    'NEXT_PUBLIC_PI_WEB_UI_URL',
    'Public Pi Agent URL should not point to localhost.'
  );
  warnIfNotHttps('NEXT_PUBLIC_APP_URL', 'Production app URL should use HTTPS.');
  warnIfNotHttps('PI_AGENT_WEB_URL', 'Pi Agent URL should use HTTPS.');
  warnIfNotHttps(
    'NEXT_PUBLIC_PI_WEB_UI_URL',
    'Public Pi Agent URL should use HTTPS.'
  );

  const paymentProviders = ['stripe', 'creem', 'paypal', 'alipay'];
  const envEnabledProviders = paymentProviders.filter((provider) =>
    envEnabled(`${provider}_enabled`)
  );

  let configs: Record<string, string> = {};
  if (envEnabledProviders.length === 0) {
    try {
      const { getAllConfigs } = await import('@/shared/models/config');
      configs = await getAllConfigs();
    } catch (error) {
      addCheck(
        false,
        'warn',
        'config table',
        `Could not read DB-backed settings: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const enabledProviders = paymentProviders.filter((provider) =>
    enabled(configs, `${provider}_enabled`)
  );

  addCheck(
    enabledProviders.length > 0,
    'error',
    'payment provider',
    'At least one payment provider must be enabled in config table or env.'
  );

  if (enabled(configs, 'stripe_enabled')) {
    addCheck(
      Boolean(configValue(configs, 'stripe_publishable_key')),
      'error',
      'stripe_publishable_key',
      'Stripe publishable key is required when Stripe is enabled.'
    );
    addCheck(
      Boolean(configValue(configs, 'stripe_secret_key')),
      'error',
      'stripe_secret_key',
      'Stripe secret key is required when Stripe is enabled.'
    );
    addCheck(
      Boolean(configValue(configs, 'stripe_signing_secret')),
      'error',
      'stripe_signing_secret',
      'Stripe webhook signing secret is required when Stripe is enabled.'
    );
  }

  if (enabled(configs, 'creem_enabled')) {
    addCheck(
      Boolean(configValue(configs, 'creem_api_key')),
      'error',
      'creem_api_key',
      'Creem API key is required when Creem is enabled.'
    );
    addCheck(
      Boolean(configValue(configs, 'creem_signing_secret')),
      'error',
      'creem_signing_secret',
      'Creem webhook signing secret is required when Creem is enabled.'
    );
  }

  if (enabled(configs, 'paypal_enabled')) {
    addCheck(
      Boolean(configValue(configs, 'paypal_client_id')),
      'error',
      'paypal_client_id',
      'PayPal client ID is required when PayPal is enabled.'
    );
    addCheck(
      Boolean(configValue(configs, 'paypal_client_secret')),
      'error',
      'paypal_client_secret',
      'PayPal client secret is required when PayPal is enabled.'
    );
  }

  if (enabled(configs, 'alipay_enabled')) {
    addCheck(
      Boolean(configValue(configs, 'alipay_app_id')),
      'error',
      'alipay_app_id',
      'Alipay app ID is required when Alipay is enabled.'
    );
    addCheck(
      Boolean(configValue(configs, 'alipay_private_key')),
      'error',
      'alipay_private_key',
      'Alipay private key is required when Alipay is enabled.'
    );
    addCheck(
      Boolean(configValue(configs, 'alipay_public_key')),
      'error',
      'alipay_public_key',
      'Alipay public key is required when Alipay is enabled.'
    );
    addCheck(
      Boolean(configValue(configs, 'alipay_notify_url')),
      'error',
      'alipay_notify_url',
      'Alipay notify URL is required when Alipay is enabled.'
    );
  }

  const failures = checks.filter((check) => !check.ok);
  const errors = failures.filter((check) => check.level === 'error');
  const warnings = failures.filter((check) => check.level === 'warn');

  for (const check of checks) {
    const status = check.ok ? 'ok' : check.level;
    console.log(`[${status}] ${check.name}: ${check.message}`);
  }

  if (warnings.length > 0) {
    console.log(`\nWarnings: ${warnings.length}`);
  }

  if (errors.length > 0 || (strict && warnings.length > 0)) {
    console.error(
      `\nProduction environment check failed: ${errors.length} error(s), ${warnings.length} warning(s).`
    );
    process.exit(1);
  }

  console.log('\nProduction environment check passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
