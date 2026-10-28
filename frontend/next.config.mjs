/**
 * Target used by the Next.js dev/prod proxy for `/api/*` requests.
 *
 * In Docker this must point at the compose service name (`backend:8000`).
 * Next.js evaluates `rewrites()` at BUILD time and bakes the result into
 * `routes-manifest.json`, so the value is supplied as a build argument.
 * Outside Docker the backend runs on the host, hence the localhost default.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET || "http://127.0.0.1:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
