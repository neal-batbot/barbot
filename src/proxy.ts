import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import createIntlMiddleware from 'next-intl/middleware';

import { routing } from '@/core/i18n/config';

const intlMiddleware = createIntlMiddleware(routing);
const piWebUiProxyOrigin = process.env.PI_WEB_UI_PROXY_ORIGIN?.replace(/\/$/, '');

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const locale = pathname.split('/')[1];
  const isValidLocale = routing.locales.includes(locale as any);
  const pathWithoutLocale = isValidLocale
    ? pathname.slice(locale.length + 1)
    : pathname;
  const isProtectedPath =
    pathWithoutLocale.startsWith('/admin') ||
    pathWithoutLocale.startsWith('/settings') ||
    pathWithoutLocale.startsWith('/activity') ||
    pathWithoutLocale.startsWith('/dashboard') ||
    pathWithoutLocale.startsWith('/workspace') ||
    pathWithoutLocale.startsWith('/platform') ||
    pathWithoutLocale === '/chat' ||
    pathWithoutLocale.startsWith('/chat/');

  if (isProtectedPath) {
    const sessionCookie = getSessionCookie(request);

    if (!sessionCookie) {
      const signInUrl = new URL(
        isValidLocale ? `/${locale}/sign-in` : '/sign-in',
        request.url
      );
      signInUrl.searchParams.set(
        'callbackUrl',
        pathWithoutLocale + request.nextUrl.search
      );
      return NextResponse.redirect(signInUrl);
    }
  }

  if (piWebUiProxyOrigin) {
    const isChatPath =
      pathname === '/chat' ||
      pathname.startsWith('/chat/') ||
      pathname === '/zh/chat' ||
      pathname.startsWith('/zh/chat/') ||
      pathname === '/en/chat' ||
      pathname.startsWith('/en/chat/');
    const isViteRuntimePath =
      pathname.startsWith('/@vite/') ||
      pathname.startsWith('/src/') ||
      pathname.startsWith('/@fs/');

    if (isChatPath || isViteRuntimePath) {
      const rewriteUrl = new URL(
        `${piWebUiProxyOrigin}${pathname}${request.nextUrl.search}`
      );
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  // Handle internationalization first
  const intlResponse = intlMiddleware(request);

  intlResponse.headers.set('x-pathname', request.nextUrl.pathname);
  intlResponse.headers.set('x-url', request.url);

  // Remove Set-Cookie from public pages to allow caching
  // We exclude admin, settings, activity, and auth pages from this behavior
  if (
    !pathWithoutLocale.startsWith('/admin') &&
    !pathWithoutLocale.startsWith('/settings') &&
    !pathWithoutLocale.startsWith('/activity') &&
    !pathWithoutLocale.startsWith('/dashboard') &&
    !pathWithoutLocale.startsWith('/workspace') &&
    !pathWithoutLocale.startsWith('/platform') &&
    !pathWithoutLocale.startsWith('/chat') &&
    !pathWithoutLocale.startsWith('/sign-') &&
    !pathWithoutLocale.startsWith('/auth')
  ) {
    intlResponse.headers.delete('Set-Cookie');

    // Cache-Control header for public pages
    const cacheControl = 'public, s-maxage=3600, stale-while-revalidate=14400';

    intlResponse.headers.set('Cache-Control', cacheControl);
    intlResponse.headers.set('CDN-Cache-Control', cacheControl);
    intlResponse.headers.set('Cloudflare-CDN-Cache-Control', cacheControl);
  }

  // For all other routes (including /, /sign-in, /sign-up, /sign-out), just return the intl response
  return intlResponse;
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
