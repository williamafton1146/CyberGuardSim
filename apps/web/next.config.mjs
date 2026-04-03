/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true
  },
  transpilePackages: ["@cyber-sim/shared"]
};

export default nextConfig;
