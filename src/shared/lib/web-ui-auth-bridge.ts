'use client';

import { signOut } from '@/core/auth/client';
import { WEB_UI_AUDIENCE } from '@/shared/lib/auth-bridge-constants';

export type WebUiBridgeUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

export type WebUiSessionResponse = {
  authenticated: boolean;
  user: WebUiBridgeUser | null;
};

export async function getWebUiSession(): Promise<WebUiSessionResponse> {
  const response = await fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`session_request_failed_${response.status}`);
  }

  const result = await response.json();
  const data = result?.data;
  return {
    authenticated: !!data?.authenticated,
    user: data?.user ?? null,
  };
}

export async function getWebUiAccessToken(
  audience: string = WEB_UI_AUDIENCE
): Promise<string> {
  const response = await fetch(
    `/api/extension/token?aud=${encodeURIComponent(audience)}`,
    {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }
  );
  if (!response.ok) {
    throw new Error(`token_request_failed_${response.status}`);
  }

  const data = await response.json();
  if (!data?.token) {
    throw new Error('token_missing');
  }
  return data.token as string;
}

export async function getWebUiUserInfo(token: string) {
  const response = await fetch('/api/extension/user-info', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`user_info_request_failed_${response.status}`);
  }

  const data = await response.json();
  if (!data?.data?.user) {
    throw new Error('user_info_missing');
  }
  return data.data;
}

export function redirectToWebUiSignIn(callbackPath?: string) {
  const callback =
    callbackPath ||
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '/');
  const signInUrl = `/sign-in?callbackUrl=${encodeURIComponent(callback)}`;
  window.location.assign(signInUrl);
}

export async function signOutFromWebUi(callbackPath: string = '/') {
  await signOut();
  window.location.assign(callbackPath);
}
