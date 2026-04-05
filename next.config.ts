import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.weatherapi.com' },
      { protocol: 'https', hostname: 'openweathermap.org' },
    ],
  },
};

export default nextConfig;
