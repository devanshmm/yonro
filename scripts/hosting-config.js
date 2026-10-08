import { isIP } from 'node:net';

export function createVercelRouting(origin) {
  const backend = new URL(origin);
  if (
    backend.protocol !== 'https:' ||
    backend.username ||
    backend.password ||
    backend.pathname !== '/' ||
    backend.search ||
    backend.hash ||
    backend.hostname === 'localhost' ||
    backend.hostname.endsWith('.local') ||
    !backend.hostname.includes('.') ||
    isIP(backend.hostname.replace(/^\[|\]$/g, ''))
  ) {
    throw new Error('Provide the public HTTPS backend origin, without credentials or a path.');
  }

  return {
    rewrites: [
      { source: '/api/:path*', destination: `${backend.origin}/api/:path*` },
      { source: '/((?!api(?:/|$)).*)', destination: '/index.html' },
    ],
    headers: [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ],
  };
}
