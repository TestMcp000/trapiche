import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

// Bundle analyzer setup - only loads when ANALYZE=true
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config: NextConfig) => config;

// Security headers for production
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
        pathname: '/**',
      },
    ],
  },

  // Redirect old/legacy paths to new routes (v1 → v2 canonical)
  async redirects() {
    return [
      // Handle /index.html → /
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
      // Handle locale-prefixed index.html
      {
        source: '/:locale(zh)/index.html',
        destination: '/:locale',
        permanent: true,
      },
      // =================================================================
      // Blog v1 → v2 Canonical Redirects (301 Permanent)
      // =================================================================
      // Blog post: /blog/[category]/[slug] → /blog/posts/[slug]
      {
        // NOTE: Exclude current v2 canonical routes and taxonomy routes to avoid redirect loops.
        // - /blog/posts/[slug]
        // - /blog/categories/[slug]
        // - /blog/tags/[slug]
        // - /blog/groups/[slug]
        source: '/:locale(zh)/blog/:category((?!posts|categories|tags|groups)[^/]+)/:slug',
        destination: '/:locale/blog/posts/:slug',
        permanent: true,
      },
      // Blog search query: search → q (unified)
      {
        source: '/:locale(zh)/blog',
        has: [{ type: 'query', key: 'search' }],
        destination: '/:locale/blog?q=:search',
        permanent: true,
      },
      // =================================================================
      // Gallery v1 → v2 Canonical Redirects (301 Permanent)
      // =================================================================
      // Gallery item: /gallery/[category]/[slug] → /gallery/items/[category]/[slug]
      {
        source: '/:locale(zh)/gallery/:category/:slug',
        destination: '/:locale/gallery/items/:category/:slug',
        permanent: true,
      },
      // NOTE: Gallery category redirect is handled by middleware to avoid
      // conflicts with /gallery/items/* and /gallery/categories/* paths
    ];
  },

  // Add security headers in production
  async headers() {
    // Skip security headers in development
    if (process.env.NODE_ENV === 'development') {
      return [];
    }

    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

// Apply plugins: next-intl -> bundle-analyzer -> sentry
const configWithPlugins = withBundleAnalyzer(withNextIntl(nextConfig));

// Sentry configuration options
// @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
export default withSentryConfig(configWithPlugins, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Hides source maps from generated client bundles
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Webpack-only options (new path; avoids Sentry deprecation warnings)
  webpack: {
    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },

    // Enables automatic instrumentation of Vercel Cron Monitors
    automaticVercelMonitors: true,
  },
});
