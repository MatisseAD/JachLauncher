/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @jach/shared est un package du workspace (TS/ESM) : on laisse Next le
  // transpiler au cas où il est consommé depuis les sources.
  transpilePackages: ["@jach/shared", "@jach/ui"],
};

export default nextConfig;
