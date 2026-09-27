# Desk Time manager dashboard

React 19, TypeScript and Vite. Includes cookie-authenticated manager login, employee enrollment and revocation, attendance, application and website reports, activity timelines, project reports, CSV export, screenshot viewing, work policy settings, classification rules and account administration.

## Development

Use Node 24 and run:

```sh
npm ci
npm run dev
```

Vite forwards `/api` and `/downloads` to the local Python backend at `http://127.0.0.1:8765`. Configure that backend with `DESKTIME_FRONTEND_URL=http://localhost:5173` and local development cookie settings. Open the dashboard at `http://localhost:5173`.

```sh
npm test
npm run build
```

The production bundle is generated in `dist/`. Component tests use mocked API responses; live deployment integration requires the actual backend URL.

## Vercel + Google Cloud Run

1. Import this repository into Vercel. Use **Vite**, install command `npm ci`, build command `npm run build`, output `dist`.
2. Replace **both** `https://api.example.com` destinations in `vercel.json` with your Cloud Run HTTPS origin. This placeholder cannot sign in.
3. On Cloud Run, set `DESKTIME_FRONTEND_URL` to the exact stable Vercel production origin and `DESKTIME_PUBLIC_URL` to the Cloud Run origin. Redeploy both services.
4. Add your custom domain later in Vercel and update the backend's frontend origin to match.

The browser calls same-origin `/api/*`; Vercel forwards requests and cookies to Cloud Run. HttpOnly/Secure/SameSite cookies and CSRF checks remain enabled. No database credentials, Supabase secret keys or manager passwords belong in frontend environment variables or source files. Employee apps connect directly to the backend.

For optional Netlify deployment, the build output is also `dist`; update `public/_redirects`. For Docker/Caddy, update the upstream in `Caddyfile`, configure `.env` from `.env.example`, and run `docker compose up -d --build`.

Source lives in `src/`; the old vanilla JavaScript dashboard is removed from this repository. Screenshot storage setup is documented in `SCREENSHOT-STORAGE.md` in the backend repository.
