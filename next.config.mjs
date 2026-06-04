/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "shared.akamai.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "**.g2a.com",
      },
      {
        protocol: "https",
        hostname: "media.rawg.io",
      },
    ],
  },
};

export default nextConfig;
