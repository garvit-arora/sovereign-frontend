// Vercel hosts this static site. API requests are forwarded to the separately
// deployed coordinator, keeping browser requests and session cookies same-origin.
const backend = process.env.SOVEREIGN_BACKEND_URL?.replace(/\/+$/, '')
if (!backend || !/^https:\/\/[^/]+$/i.test(backend)) {
  throw new Error('Set SOVEREIGN_BACKEND_URL to the HTTPS origin of the backend before deploying.')
}

export const config = {
  framework: 'vite',
  rewrites: [
    { source: '/api/:path*', destination: `${backend}/api/:path*` },
  ],
}
