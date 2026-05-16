import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP, oneTap } from 'better-auth/plugins';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import * as schema from '@/config/db/schema';
import { VerificationCode } from '@/shared/blocks/email/verification-code';
import { getUuid } from '@/shared/lib/hash';
import { getEmailService } from '@/shared/services/email';

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
];

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
  addOrigin(process.env.PI_AGENT_WEB_URL);
  addOrigin(process.env.NEXT_PUBLIC_PI_WEB_UI_URL);
  addOrigin(process.env.PI_WEB_UI_PROXY_ORIGIN);
  addOrigin(process.env.SUPABASE_SSH_WEB_URL);
  addOrigin(process.env.FUMADOCS_WEB_URL);

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
  const emailService = await getEmailService(configs);
  const plugins = [];

  if (configs.google_client_id && configs.google_one_tap_enabled === 'true') {
    plugins.push(oneTap());
  }

  plugins.push(
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 5,
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        let subject = 'Verification code';
        if (type === 'sign-in') {
          subject = 'Sign in verification code';
        } else if (type === 'email-verification') {
          subject = 'Email verification code';
        } else if (type === 'forget-password') {
          subject = 'Reset password code';
        }
        await emailService.sendEmail({
          to: email,
          subject,
          react: VerificationCode({ code: otp }),
        });
      },
    })
  );

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
    plugins,
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
