/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['@anthropic-ai/sdk'] },
  async rewrites() {
    return [
      // Serve the Vite SPA at /behovsavklarer (no trailing slash)
      { source: '/behovsavklarer', destination: '/behovsavklarer/index.html' },
      // Serve the CV Generator SPA at /cv-generator
      { source: '/cv-generator', destination: '/cv-generator/index.html' },
    ]
  },
}
module.exports = nextConfig
