import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack — use stable Webpack for production builds
  // to avoid OOM crashes on machines with limited RAM
  bundlePagesRouterDependencies: true,
};

export default nextConfig;