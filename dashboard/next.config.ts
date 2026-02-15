import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  httpAgentOptions: {
    keepAlive: false,
  },
  serverExternalPackages: ['systeminformation'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
