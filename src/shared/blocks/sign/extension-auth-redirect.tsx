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
    image?: string | null;
  };
};

const ALLOWED_REDIRECT_SCHEMES = ['vscode', 'vscode-insiders', 'vscode-oss'];

function isAllowedRedirectUri(redirectUri: string) {
  try {
    const parsed = new URL(redirectUri);
    return ALLOWED_REDIRECT_SCHEMES.includes(parsed.protocol.replace(':', ''));
  } catch {
    return false;
  }
}

/**
 * Automatically redirects to the VSCode extension with an auth token
 * when the user has a valid session and the URL contains state + redirectUri.
 *
 * This handles two cases:
 * 1. User just logged in -- session is now available after sign-in redirect
 * 2. User was already logged in -- session exists on page load
 *
 * No sessionStorage "intent" flag is needed because this component only
 * renders on sign-in/sign-up pages when state & redirectUri are explicitly
 * provided (which only happens from the VSCode extension's auth request).
 */
export function ExtensionAuthRedirect({
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
    if (!isAllowedRedirectUri(redirectUri)) {
      toast.error('Invalid redirect URI.');
      return;
    }

    startedRef.current = true;

    const handle = async () => {
      try {
        console.log('[ExtensionAuthRedirect] Starting redirect process...');
        console.log('[ExtensionAuthRedirect] State:', state);
        console.log('[ExtensionAuthRedirect] RedirectUri:', redirectUri);
        console.log('[ExtensionAuthRedirect] Session user:', session?.user?.id);

        const resp = await fetch('/api/extension/token?aud=vector-vscode', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!resp.ok) {
          console.error('[ExtensionAuthRedirect] Token fetch failed:', resp.status);
          toast.error('Failed to fetch token.');
          return;
        }

        const data = (await resp.json()) as TokenResponse;
        if (!data.token) {
          console.error('[ExtensionAuthRedirect] Token missing in response');
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

        toast.success(
          `${t('extension_login_success')} ${t('extension_open_vscode')}`
        );
        
        console.log('[ExtensionAuthRedirect] Redirecting to:', redirectUrl.toString());
        
        const link = document.createElement('a');
        link.href = redirectUrl.toString();
        link.style.display = 'none';
        link.setAttribute('target', '_self');
        document.body.appendChild(link);
        
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
        });
        link.dispatchEvent(clickEvent);
        
        link.click();
        
        setTimeout(() => {
          try {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
          } catch (e) {
            // ignore
          }
        }, 1000);
      } catch (e) {
        console.error('[ExtensionAuthRedirect] Error:', e);
        toast.error('Unexpected error during authentication.');
      }
    };

    void handle();
  }, [isPending, redirectUri, session?.user, state, t]);

  return null;
}
