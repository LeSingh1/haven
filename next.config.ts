import type { NextConfig } from "next";

// Next 16 removed the build-time ESLint integration (no `eslint` config key /
// `ignoreDuringBuilds`), so there's nothing to disable here — `next build` does
// not run ESLint; lint runs separately via `npm run lint`.
const nextConfig: NextConfig = {};

export default nextConfig;
