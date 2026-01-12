# Deployment (Production Checklist)

> Canonical entry: `../RUNBOOK.md`  
> Last Updated: 2026-01-03  
> Audience: executor agent / ops

[Back to RUNBOOK index](../RUNBOOK.md)

## 0. TL;DR

- Supabase: create project → enable extensions (`pg_cron`, `vault`, `vector`) → apply DB scripts (see [Database Operations](database-ops.md))
- Auth: Google OAuth client + Supabase Google provider + URL Configuration (redirect to `/auth/callback`)
- Media: Cloudinary keys
- Vercel: deploy → set env vars (use `../../README.md`) → set `NEXT_PUBLIC_SITE_URL` → redeploy
- Post-deploy: admin login → RBAC (`public.site_admins`) → enable features → run [Go-Live (P0)](go-live.md)

## 1. Secrets / Where They Live (AI-related)

| Purpose | Name | Where | Notes |
| --- | --- | --- | --- |
| AI Analysis (OpenRouter) | `OPENROUTER_API_KEY` | Vercel env var | required only if enabling AI Analysis |
| OpenRouter referer header (optional) | `SITE_URL` | Vercel env var | server-only; used only for OpenRouter `HTTP-Referer` |
| Embeddings / Judge (Edge Functions) | `OPENAI_API_KEY` | Supabase → Edge Functions → Secrets | used only by Supabase Edge Functions |
| Cron endpoints auth | `CRON_SECRET` | Vercel env var | protects `/api/cron/*` (`doc/SECURITY.md` §3.5) |
| Worker endpoints auth | `WORKER_SECRET` | Vercel env var | protects `/api/worker/*` (`doc/SECURITY.md` §3.5) |

> Never put secrets into `NEXT_PUBLIC_*` or commit them to git.

## 2. Supabase Setup (Required)

1. Create a Supabase project.
2. Copy API keys (Supabase Dashboard → Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
3. Enable extensions (Supabase Dashboard → Database → Extensions):
   - `pg_cron`, `vault`, `vector`
4. Apply schema + seed:
   - Recommended: `npm run db:reset` (fresh DB), or follow [Database Operations](database-ops.md)

## 3. Google OAuth Setup (Required)

1. Google Cloud Console: create an OAuth Client (Web application)
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://<your-domain>`
   - Authorized redirect URI (Supabase callback):
     - `https://<project-ref>.supabase.co/auth/v1/callback`
2. Supabase Dashboard:
   - Authentication → Providers → Google: set Client ID / Secret
   - Authentication → URL Configuration:
     - Site URL: `http://localhost:3000` (dev), `https://<your-domain>` (prod)
     - Redirect URLs: `http://localhost:3000/auth/callback`, `https://<your-domain>/auth/callback`

Troubleshooting (historical): `../archive/2025-12-24-oauth-troubleshooting.md`

## 4. Cloudinary Setup (Required for uploads)

Create a Cloudinary account and set env vars per the template in `../../README.md`.

## 5. Vercel Deploy (Required)

1. Import the repo into Vercel (Next.js).
2. Set env vars using the template in `../../README.md`.
3. Deploy.
4. Set `NEXT_PUBLIC_SITE_URL` to the production URL (Vercel URL or custom domain) and redeploy.

## 6. Post-Deploy Verification (Required)

1. Admin login: visit `/<locale>/admin` and login via Google.
2. RBAC/RLS:
   - Complete [Database Operations → Admin RBAC Setup](database-ops.md#admin-rbac-setup)
   - Logout/login to refresh JWT claims
3. Enable features (if needed):
   - `/<locale>/admin/features` → enable `blog`, `gallery`, `shop`
4. Run the go-live checklist: [Go-Live (P0)](go-live.md)

## 7. Custom Domain (Optional)

If you attach a custom domain, update:

- Vercel: domain configuration (see Vercel docs)
- `NEXT_PUBLIC_SITE_URL` (Vercel env var) → redeploy
- Google OAuth origins
- Supabase URL Configuration (Site URL + Redirect URLs)
