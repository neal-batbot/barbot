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
      console.log('[ContinueAuthRedirect] No auth intent found for state:', state);
      return;
    }
    if (!isAllowedRedirectUri(redirectUri)) {
      toast.error('Invalid redirect URI.');
      return;
    }

    startedRef.current = true;

    const handle = async () => {
      try {
        console.log('[ContinueAuthRedirect] Starting redirect process...');
        console.log('[ContinueAuthRedirect] State:', state);
        console.log('[ContinueAuthRedirect] RedirectUri:', redirectUri);
        console.log('[ContinueAuthRedirect] Session user:', session?.user?.id);

        const resp = await fetch('/api/continue/token', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!resp.ok) {
          console.error('[ContinueAuthRedirect] Token fetch failed:', resp.status);
          toast.error('Failed to fetch token.');
          return;
        }

        const data = (await resp.json()) as TokenResponse;
        if (!data.token) {
          console.error('[ContinueAuthRedirect] Token missing in response');
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
        
        console.log('[ContinueAuthRedirect] Redirecting to:', redirectUrl.toString());
        
        // 使用创建隐藏的 <a> 标签并点击的方法来触发 VSCode 协议链接
        // 这是最可靠的方法，因为浏览器会正确处理用户交互触发的协议链接
        const link = document.createElement('a');
        link.href = redirectUrl.toString();
        link.style.display = 'none';
        link.setAttribute('target', '_self');
        document.body.appendChild(link);
        
        // 触发点击事件
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
        });
        link.dispatchEvent(clickEvent);
        
        // 也尝试直接调用 click() 方法
        link.click();
        
        // 延迟后移除链接元素
        setTimeout(() => {
          try {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
          } catch (e) {
            // 忽略错误
          }
        }, 1000);
      } catch (e) {
        console.error('[ContinueAuthRedirect] Error:', e);
        toast.error('Unexpected error during authentication.');
      }
    };

    void handle();
  }, [isPending, redirectUri, session?.user, state, t]);

  return null;
}
