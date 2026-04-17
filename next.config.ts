import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Vidéos jusqu'à 500 MB via server actions
      bodySizeLimit: '500mb',
    },
  },
};

export default nextConfig;
