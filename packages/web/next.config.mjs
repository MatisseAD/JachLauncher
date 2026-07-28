import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const isDevelopment = process.env.NODE_ENV !== "production";
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(isDevelopment ? ["'unsafe-eval'"] : []),
  "https://pagead2.googlesyndication.com",
].join(" ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: workspaceRoot,
  // Le monorepo exécute ESLint explicitement avant le build (script `check`).
  // Évite le second passage intégré de Next, incompatible avec ESLint 10.
  eslint: { ignoreDuringBuilds: true },
  // @jach/shared est un package du workspace (TS/ESM) : on laisse Next le
  // transpiler au cas où il est consommé depuis les sources.
  transpilePackages: ["@jach/shared", "@jach/ui"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com; img-src 'self' https: data:; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src ${scriptSources}; connect-src 'self' https: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*`,
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
