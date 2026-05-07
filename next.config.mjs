import bundleAnalyzer from '@next/bundle-analyzer';
import { createMDX } from 'fumadocs-mdx/next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';

const withMDX = createMDX();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin({
  requestConfig: './src/core/i18n/request.ts',
});

const workspaceRoot = path.resolve(process.cwd(), '..', '..');
const piWebUiProxyOrigin = process.env.PI_WEB_UI_PROXY_ORIGIN?.replace(/\/$/, '');

const allowedImageHosts = (process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const strictSecurityHeaders = [
  {
    key: 'X-Frame-Options',
    value: process.env.SECURITY_HEADERS_X_FRAME_OPTIONS || 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: process.env.SECURITY_HEADERS_REFERRER_POLICY || 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Strict-Transport-Security',
    value: process.env.SECURITY_HEADERS_HSTS || 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value:
      process.env.SECURITY_HEADERS_CSP ||
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  reactStrictMode: false,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  transpilePackages: [
    '@mariozechner/pi-web-ui',
    '@mariozechner/pi-agent-core',
    '@mariozechner/pi-ai',
  ],
  images: {
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    qualities: [60, 70, 75],
    remotePatterns: allowedImageHosts.map((hostname) => ({
      protocol: 'https',
      hostname,
    })),
  },
  async redirects() {
    return [];
  },
  async rewrites() {
    if (!piWebUiProxyOrigin) {
      return [];
    }

    return {
      beforeFiles: [
        {
          source: '/chat',
          destination: `${piWebUiProxyOrigin}/chat`,
        },
        {
          source: '/chat/:path*',
          destination: `${piWebUiProxyOrigin}/chat/:path*`,
        },
        {
          source: '/:locale(zh|en)/chat',
          destination: `${piWebUiProxyOrigin}/:locale/chat`,
        },
        {
          source: '/:locale(zh|en)/chat/:path*',
          destination: `${piWebUiProxyOrigin}/:locale/chat/:path*`,
        },
        {
          source: '/@vite/:path*',
          destination: `${piWebUiProxyOrigin}/@vite/:path*`,
        },
        {
          source: '/src/:path*',
          destination: `${piWebUiProxyOrigin}/src/:path*`,
        },
        {
          source: '/node_modules/:path*',
          destination: `${piWebUiProxyOrigin}/node_modules/:path*`,
        },
        {
          source: '/@fs/:path*',
          destination: `${piWebUiProxyOrigin}/@fs/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: '/imgs/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: strictSecurityHeaders,
      },
    ];
  },
  turbopack: {
    // pnpm hoists real package paths to the shared workspace node_modules.
    // Turbopack must allow that root so it can resolve next/package.json correctly.
    root: workspaceRoot,
  },
  experimental: {
    externalDir: true,
    turbopackFileSystemCacheForDev: true,
    // Disable mdxRs for Vercel deployment compatibility with fumadocs-mdx
    ...(process.env.VERCEL ? {} : { mdxRs: true }),
  },
  reactCompiler: true,
};

export default withBundleAnalyzer(withNextIntl(withMDX(nextConfig)));
