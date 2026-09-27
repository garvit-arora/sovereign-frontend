# Sovereign frontend

Standalone React website for the Sovereign optimization coordinator. This folder
has no Git repository. You can connect it to its own remote when ready.

Run `npm ci`, then `npm run dev` for a local preview at
`http://localhost:5173/`. Vite proxies `/api` to `http://127.0.0.1:8000` by
default. To use a different backend, set `SOVEREIGN_BACKEND_URL` before starting
Vite. The backend must allow the website's exact origin with
`SOVEREIGN_PUBLIC_ORIGIN=http://localhost:5173` in local development.

Run `npm run build` to typecheck and build into `dist/`, and `npm run lint` for
frontend lint checks. To deploy this folder on Vercel, set
`SOVEREIGN_BACKEND_URL` to the HTTPS origin of the separately deployed backend.
The `vercel.js` rewrite keeps `/api` on the website's origin. Set the backend's
`SOVEREIGN_PUBLIC_ORIGIN` to the deployed website URL. Deployment and GPU worker
instructions are in the backend repository's `VERCEL_DEPLOYMENT.md`.
