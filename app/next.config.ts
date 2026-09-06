import type { NextConfig } from "next";

// GitHub Pages serves this as a project site under /2026-quitcode-01-agentic-engineering-hw/,
// not from the domain root, so every asset/route must be prefixed with that base path.
const repoBasePath = "/2026-quitcode-01-agentic-engineering-hw";

const nextConfig: NextConfig = {
  output: "export",
  basePath: repoBasePath,
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: {
    useLightningcss: true,
    lightningCssFeatures: { exclude: ["light-dark"] },
  },
};

export default nextConfig;
