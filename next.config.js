/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['@anthropic-ai/sdk', 'pg', 'cheerio'] },
  webpack(config, { webpack }) {
    // The CV recorder is cross-imported from the Vite SPA into the Next share
    // page. It can lazily pull in pdfjs-dist for the agency-side CV-walkthrough
    // composite — but that mode is never used on the share page, and pdfjs's
    // `new URL('pdf.worker.min.mjs', import.meta.url)` makes webpack emit the ESM
    // worker as an asset, which Next's Terser pass then fails to minify
    // ("'import'/'export' cannot be used outside of module code"). Keep pdfjs out
    // of the Next bundle entirely; the lazy import rejects and the composite
    // gracefully falls back to camera-only. The Vite SPA build is unaffected.
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^pdfjs-dist(\/|$)/ }))
    return config
  },
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
