import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  httpAgentOptions: {
    keepAlive: false,
  },
  serverExternalPackages: ['systeminformation'],
};

export default nextConfig;
