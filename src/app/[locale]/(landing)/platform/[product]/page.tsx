import { randomUUID } from 'crypto';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { defaultLocale } from '@/config/locale';
import { getAuth } from '@/core/auth';
import {
  FUMADOCS_WEB_AUDIENCE,
  SUPABASE_SSH_WEB_AUDIENCE,
} from '@/shared/lib/auth-bridge';

const DEFAULT_PI_AGENT_WEB_URL = 'http://localhost:5173';
const DEFAULT_SUPABASE_SSH_WEB_URL = 'http://localhost:3001';
const DEFAULT_FUMADOCS_WEB_URL = 'http://localhost:3002';

function localizedPath(locale: string, path: string) {
  return locale === defaultLocale ? path : `/${locale}${path}`;
}

function getPiAgentWebUrl() {
  return (
    process.env.PI_AGENT_WEB_URL ||
    process.env.NEXT_PUBLIC_PI_WEB_UI_URL ||
    process.env.PI_WEB_UI_PROXY_ORIGIN ||
    DEFAULT_PI_AGENT_WEB_URL
  );
}

function getPlatformAuthorizePath({
  locale,
  audience,
  redirectUri,
}: {
  locale: string;
  audience: string;
  redirectUri: string;
}) {
  const params = new URLSearchParams({
    state: randomUUID(),
    redirectUri,
    audience,
  });
  return localizedPath(locale, `/authorize-extension?${params.toString()}`);
}

export default async function PlatformEntryPage({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, product } = await params;

  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect(
      localizedPath(
        locale,
        `/sign-in?callbackUrl=${encodeURIComponent(`/platform/${product}`)}`
      )
    );
  }

  switch (product) {
    case 'pi-agent':
      redirect(getPiAgentWebUrl());

    case 'coding-agent':
      redirect(localizedPath(locale, '/workspace'));

    case 'supabase-ssh':
      redirect(
        getPlatformAuthorizePath({
          locale,
          audience: SUPABASE_SSH_WEB_AUDIENCE,
          redirectUri:
            process.env.SUPABASE_SSH_WEB_URL || DEFAULT_SUPABASE_SSH_WEB_URL,
        })
      );

    case 'fumadocs':
      redirect(
        getPlatformAuthorizePath({
          locale,
          audience: FUMADOCS_WEB_AUDIENCE,
          redirectUri: process.env.FUMADOCS_WEB_URL || DEFAULT_FUMADOCS_WEB_URL,
        })
      );

    default:
      notFound();
  }
}
