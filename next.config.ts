import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to everything except /api (safe default).
        source: '/:path((?!api).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Allow embedding by self + localhost for dev + your domains.
            // Adjust https://*.host.com to your actual parent domains.
            value:
              "frame-ancestors 'self' http://localhost:3000 http://localhost:5173 https://*.host.com;",
          },
          // Override Next/Vercel's default X-Frame-Options=SAMEORIGIN.
          // We rely on CSP `frame-ancestors` as the real allowlist for embedding.
          // Using a non-standard value makes the header effectively ignored by modern browsers
          // while still preventing the platform from injecting SAMEORIGIN.
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;