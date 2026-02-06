import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { oneTap } from 'better-auth/plugins';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import * as schema from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

function buildTrustedOrigins() {
  const originSet = new Set<string>();

  const addOrigin = (value?: string) => {
    if (!value) {
      return;
    }
    try {
      const parsed = new URL(value);
      originSet.add(parsed.origin);
      if (parsed.hostname === 'localhost') {
        originSet.add(`http://127.0.0.1:${parsed.port || '3000'}`);
      }
      if (parsed.hostname === '127.0.0.1') {
        originSet.add(`http://localhost:${parsed.port || '3000'}`);
      }
    } catch (e) {
      // Ignore invalid URLs
    }
  };

  addOrigin(envConfigs.app_url);
  addOrigin(envConfigs.auth_url);

  if (process.env.NODE_ENV !== 'production') {
    DEFAULT_DEV_ORIGINS.forEach((origin) => addOrigin(origin));
  }

  return Array.from(originSet);
}
import { grantCreditsForNewUser } from '@/shared/models/credit';

// Static auth options - NO database connection
// This ensures zero database calls during build time
const authOptions = {
  appName: envConfigs.app_name,
  baseURL: envConfigs.auth_url,
  secret: envConfigs.auth_secret,
  trustedOrigins: buildTrustedOrigins(),
  advanced: {
    database: {
      generateId: () => getUuid(),
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  logger: {
    verboseLogging: false,
    // Disable all logs during build and production
    disabled: true,
  },
};

// get auth options with configs
export async function getAuthOptions(configs: Record<string, string>) {
  return {
    ...authOptions,
    // Add database connection only when actually needed (runtime)
    database: envConfigs.database_url
      ? drizzleAdapter(db(), {
          provider: getDatabaseProvider(envConfigs.database_provider),
          schema: schema,
        })
      : null,
    databaseHooks: {
      user: {
        create: {
          before: async (user: any) => {},
          after: async (user: any) => {
            try {
              if (!user.id) {
                throw new Error('user id is required');
              }

              await grantCreditsForNewUser(user);
            } catch (e) {
              console.log('grant credits for new user failed', e);
            }
          },
        },
      },
    },
    emailAndPassword: {
      enabled: configs.email_auth_enabled !== 'false',
    },
    socialProviders: await getSocialProviders(configs),
    plugins:
      configs.google_client_id && configs.google_one_tap_enabled === 'true'
        ? [oneTap()]
        : [],
  };
}

// get social providers with configs
export async function getSocialProviders(configs: Record<string, string>) {
  const providers: any = {};

  // google auth
  if (configs.google_client_id && configs.google_client_secret) {
    providers.google = {
      clientId: configs.google_client_id,
      clientSecret: configs.google_client_secret,
    };
  }

  // github auth
  if (configs.github_client_id && configs.github_client_secret) {
    providers.github = {
      clientId: configs.github_client_id,
      clientSecret: configs.github_client_secret,
    };
  }

  return providers;
}

// convert database provider to better-auth database provider
export function getDatabaseProvider(
  provider: string
): 'sqlite' | 'pg' | 'mysql' {
  switch (provider) {
    case 'sqlite':
      return 'sqlite';
    case 'postgresql':
      return 'pg';
    case 'mysql':
      return 'mysql';
    default:
      throw new Error(
        `Unsupported database provider for auth: ${envConfigs.database_provider}`
      );
  }
}
