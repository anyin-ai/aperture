import type { NextConfig } from 'next'

// /api/* is proxied to the FastAPI backend by the catch-all route handler at
// src/app/api/[...path]/route.ts (which reads BACKEND_URL at runtime). We only
// need to stop Next from stripping the client's trailing slash before that
// handler runs, since the backend's routes depend on the exact path.
const nextConfig: NextConfig = {
  // Standalone output is for the self-hosted Docker image; on Vercel, omit it so
  // Vercel produces its own optimized build output.
  output: process.env.VERCEL ? undefined : 'standalone',
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
}

export default nextConfig
