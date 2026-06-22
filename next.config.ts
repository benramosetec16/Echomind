import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Permite que a Vercel faça o build mesmo com erros de TypeScript
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
