import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lint still runs in the editor and via `npm run lint`; we just don't fail the
  // production build on it. Several pre-existing react-hooks v6 warnings in the
  // frontend (ref-in-render, set-state-in-effect) would otherwise block Vercel.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
