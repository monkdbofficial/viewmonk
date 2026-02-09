import type { NextConfig } from "next";

// Use static export only for Tauri desktop builds
const isTauriBuild = process.env.TAURI_BUILD === 'true';

const nextConfig: NextConfig = {
  ...(isTauriBuild && {
    output: 'export',
    trailingSlash: true,
  }),
  images: {
    unoptimized: true,
  },
  // Turbopack-compatible configuration
  turbopack: {},
};

export default nextConfig;
