/** @type {import('next').NextConfig} */

// Fix: Node.js 25+ exposes a broken localStorage global.
// Remove it before any library tries to use it.
if (typeof globalThis.localStorage !== 'undefined' && typeof globalThis.localStorage.getItem !== 'function') {
  delete globalThis.localStorage;
}

const nextConfig = {
  // Security: disable x-powered-by header
  poweredByHeader: false,

  // Allow dev access from local network
  allowedDevOrigins: ['http://100.76.204.87:3000', 'http://100.76.204.87'],

  // Security: add security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
          },
        ],
      },
    ];
  },

  // Production optimizations
  reactStrictMode: true,
  
  // Disable source maps in production
  productionBrowserSourceMaps: false,
};

export default nextConfig;
