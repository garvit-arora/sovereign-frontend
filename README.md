# Sovereign frontend

Standalone React website for the Sovereign optimization coordinator. Its Git
remote is `https://github.com/garvit-arora/sovereign-frontend.git`.

Run `npm ci`, then `npm run dev` for a local preview at
`http://127.0.0.1:5173/`. Vite proxies `/api` to `http://127.0.0.1:8000` by
default. To use a different backend, set `SOVEREIGN_BACKEND_URL` before starting
Vite. The development proxy handles the backend's origin check and session
cookie on loopback. Open `http://127.0.0.1:5173/` when Vite runs.

For a local website connected to the deployed Render coordinator, put this in
`.env.local` (which Git ignores), then run `npm run dev`:

```text
SOVEREIGN_BACKEND_URL=https://sovereign-we6b.onrender.com
```

Sign in with the **Render** workspace key. A key from a local backend will not
authenticate against Render. The GPU worker can connect to the local website
address while this preview stays running, or directly to the Render URL.

If the website reports `Set SOVEREIGN_ADMIN_TOKEN`, add that environment
variable to the Render service with a random value of at least 24 characters,
then redeploy or restart it. Generate one with
`python -c "import secrets; print(secrets.token_urlsafe(32))"`. The local
frontend cannot set a secret inside the Render service.

Run `npm run build` to typecheck and build into `dist/`, and `npm run lint` for
frontend lint checks. To deploy on Vercel, push this folder and use the included
`vercel.json`. It rewrites `/api/*` to `https://sovereign-we6b.onrender.com`.
Set the backend's `SOVEREIGN_PUBLIC_ORIGIN` to your deployed Vercel URL.
Deployment and GPU worker instructions are in the backend repository's
`VERCEL_DEPLOYMENT.md`.
