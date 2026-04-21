'use client';

export interface ClientErrorPayload {
  source: string;
  message: string;
  stack?: string;
  componentStack?: string;
  route?: string;
  href?: string;
  userAgent?: string;
  timestamp?: string;
}

const HTTP_FALLBACK_ERROR_PREFIX = 'NEXT_HTTP_ERROR_FALLBACK:';

export function isIgnorableClientErrorMessage(message?: string) {
  if (!message) {
    return false;
  }
  return message.startsWith(HTTP_FALLBACK_ERROR_PREFIX);
}

export function reportClientError(payload: ClientErrorPayload) {
  if (isIgnorableClientErrorMessage(payload.message)) {
    return Promise.resolve(undefined);
  }

  const body = JSON.stringify({
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  });

  if (typeof window !== 'undefined') {
    window.localStorage.setItem('barbot:last-client-error', body);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/debug/client-error', blob);
    }
  }

  return fetch('/api/debug/client-error', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
