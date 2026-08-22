/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" produces a minimal server bundle, which keeps the Docker image small.
  // Vercel ignores this setting and builds the app natively.
  output: 'standalone',
};

module.exports = nextConfig;
