import bundleAnalyzer from '@next/bundle-analyzer';
import { createMDX } from 'fumadocs-mdx/next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const withMDX = createMDX();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin({
  requestConfig: './src/core/i18n/request.ts',
});

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const piAiEntry = path.resolve(projectRoot, 'node_modules/@mariozechner/pi-ai/dist/index.js');
const piAgentCoreEntry = path.resolve(
  projectRoot,
  'node_modules/@mariozechner/pi-agent-core/dist/index.js',
);

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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
      },
    ],
  },
  async redirects() {
    return [];
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
    ];
  },
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      '@mariozechner/pi-ai': piAiEntry,
      '@mariozechner/pi-agent-core': piAgentCoreEntry,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@mariozechner/pi-ai': piAiEntry,
      '@mariozechner/pi-agent-core': piAgentCoreEntry,
    };
    return config;
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
