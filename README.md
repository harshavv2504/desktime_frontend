# Independent Desk Time frontend

This package targets backend `https://api.example.com`. It contains no database or Storage credentials.

On the backend, set DESKTIME_FRONTEND_URL to the exact dashboard HTTPS origin and restart it. Keep DESKTIME_PUBLIC_URL set to the backend HTTPS origin; employee apps connect to that backend URL.

Vercel (selected hosting): Import this directory as its own Vercel project, framework preset Other, no build command, output directory public. The included vercel.json forwards /api and /downloads. Add your domain in Project Settings > Domains and apply the DNS records Vercel supplies. Do not upload the main backend repository or secrets. Configure DESKTIME_FRONTEND_URL for the production domain before signing in; preview domains are intentionally not authorized.

Option A: Deploy this directory to Netlify with publish directory `public` and no build command, or upload the contents of `public`. The included _redirects forwards /api and /downloads. Add your custom domain through your host, then set the DNS records it provides. Configure DESKTIME_FRONTEND_URL for that custom domain before signing in.

Option B: On a separate Docker server, copy .env.example to .env, set DESKTIME_FRONTEND_DOMAIN to your dashboard hostname, point its DNS to that server, allow 80/443, and run `docker compose up -d --build`. Caddy serves the static dashboard and forwards API/download requests to the backend.

Other hosts must provide equivalent reverse-proxy rewrites for /api/* and /downloads/*, preserving methods, paths, query strings, request bodies, Origin, Cookie and Set-Cookie. Disable caching of those responses. A redirect (301/302) is not a proxy rewrite. Static-only hosts without proxy support cannot run this authentication setup on their own.

The browser makes same-origin requests to your dashboard; the frontend host forwards them server-to-server. HttpOnly, Secure, SameSite=Strict cookies and CSRF checks remain enabled. Do not add database credentials, Supabase keys or administrator passwords to this package.

Full deployment and screenshot steps are in SPLIT-HOSTING.md and SCREENSHOT-STORAGE.md in the main project.
