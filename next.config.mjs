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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.paypal.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://shared.akamai.steamstatic.com https://cdn.akamai.steamstatic.com https://*.g2a.com https://media.rawg.io https://ddragon.leagueoflegends.com https://cdn1.epicgames.com https://www.minecraft.net https://images.igdb.com https://static.wikia.nocookie.net",
      "font-src 'self'",
      "connect-src 'self' https://api.stripe.com https://www.paypal.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://www.paypal.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
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

export default nextConfig;
