/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Pi tunnel URLs to be embedded in iframes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
    ]
  },
}

module.exports = nextConfig
