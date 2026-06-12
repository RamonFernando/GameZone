import { withSentryConfig } from "@sentry/nextjs";
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""} https://js.stripe.com https://www.paypal.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://shared.akamai.steamstatic.com https://cdn.akamai.steamstatic.com https://*.g2a.com https://media.rawg.io https://ddragon.leagueoflegends.com https://cdn1.epicgames.com https://www.minecraft.net https://images.igdb.com https://static.wikia.nocookie.net",
      "font-src 'self'",
      "connect-src 'self' https://api.stripe.com https://www.paypal.com https://*.ingest.de.sentry.io https://*.ingest.sentry.io",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://www.paypal.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

// Solo el origen propio puede llamar a la API (bloquea peticiones cross-origin no autorizadas).
const APP_ORIGIN = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "*";

const CORS_HEADERS = [
  { key: "Access-Control-Allow-Origin", value: APP_ORIGIN },
  { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/(.*)", headers: SECURITY_HEADERS },
      { source: "/api/(.*)", headers: CORS_HEADERS },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "shared.akamai.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "cdn.akamai.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "**.g2a.com",
      },
      {
        protocol: "https",
        hostname: "media.rawg.io",
      },
      {
        protocol: "https",
        hostname: "ddragon.leagueoflegends.com",
      },
      {
        protocol: "https",
        hostname: "cdn1.epicgames.com",
      },
      {
        protocol: "https",
        hostname: "www.minecraft.net",
      },
      {
        protocol: "https",
        hostname: "images.igdb.com",
      },
      {
        protocol: "https",
        hostname: "static.wikia.nocookie.net",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "gamezone-1r",

  project: "gamezone",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
