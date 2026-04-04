/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    externalDir: true
  },
  transpilePackages: ["@cyber-sim/shared"]
};

export default nextConfig;
