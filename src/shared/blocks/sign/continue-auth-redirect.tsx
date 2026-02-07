'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';

type TokenResponse = {
  token: string;
  user?: {
    id: string;
    email?: string | null;
    name?: string | null;
  };
};

const ALLOWED_REDIRECT_SCHEMES = ['vscode', 'vscode-insiders', 'vscode-oss'];
const CONTINUE_AUTH_INTENT_PREFIX = 'continue:auth:intent:';

function getIntentKey(state?: string) {
  if (!state) {
    return null;
  }
  return `${CONTINUE_AUTH_INTENT_PREFIX}${state}`;
}

export function setContinueAuthIntent(state?: string) {
  const key = getIntentKey(state);
  if (!key) {
    return;
  }
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // ignore storage errors
  }
}

function hasContinueAuthIntent(state?: string) {
  const key = getIntentKey(state);
  if (!key) {
    return false;
  }
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function clearContinueAuthIntent(state?: string) {
  const key = getIntentKey(state);
  if (!key) {
    return;
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

function isAllowedRedirectUri(redirectUri: string) {
  try {
    const parsed = new URL(redirectUri);
    return ALLOWED_REDIRECT_SCHEMES.includes(parsed.protocol.replace(':', ''));
  } catch {
    return false;
  }
}

export function ContinueAuthRedirect({
  state,
  redirectUri,
}: {
  state?: string;
  redirectUri?: string;
}) {
  const { data: session, isPending } = useSession();
  const t = useTranslations('common.sign');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    if (!state || !redirectUri) {
      return;
    }
    if (isPending || !session?.user) {
      return;
    }
    if (!hasContinueAuthIntent(state)) {
      return;
    }
    if (!isAllowedRedirectUri(redirectUri)) {
      toast.error('Invalid redirect URI.');
      return;
    }

    startedRef.current = true;

    const handle = async () => {
      try {
        const resp = await fetch('/api/continue/token', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!resp.ok) {
          toast.error('Failed to fetch token.');
          return;
        }

        const data = (await resp.json()) as TokenResponse;
        if (!data.token) {
          toast.error('Token missing.');
          return;
        }

        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set('token', data.token);
        redirectUrl.searchParams.set('state', state);
        if (data.user?.id) {
          redirectUrl.searchParams.set('userId', data.user.id);
        }
        const userLabel = data.user?.name || data.user?.email;
        if (userLabel) {
          redirectUrl.searchParams.set('userLabel', userLabel);
        }

        clearContinueAuthIntent(state);
        toast.success(
          `${t('continue_login_success')} ${t('continue_open_vscode')}`
        );
        await new Promise((resolve) => setTimeout(resolve, 900));
        window.location.href = redirectUrl.toString();
      } catch (e) {
        toast.error('Unexpected error during authentication.');
      }
    };

    void handle();
  }, [isPending, redirectUri, session?.user, state]);

  return null;
}
