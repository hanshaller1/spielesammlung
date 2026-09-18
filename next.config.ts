import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages serves this repository below a project path. Keep the
  // development/OpenAI Sites builds at / and enable the prefix only for the
  // dedicated Pages export.
  // Vinext 0.0.50's prerenderer requests routes without the configured
  // basePath. Vite's base plus the sitePath helper provide project-page URLs
  // while keeping prerendering compatible.
  basePath: "",
  output: process.env.GITHUB_PAGES === "true" ? "export" : undefined,
  trailingSlash: process.env.GITHUB_PAGES === "true",
  env: {
    NEXT_PUBLIC_BASE_PATH:
      process.env.GITHUB_PAGES === "true" ? "/spielesammlung" : "",
  },
};

export default nextConfig;
