# Deployment (Production Checklist)

> Canonical entry: `../RUNBOOK.md`  
> Last Updated: 2026-01-23  
> Audience: executor agent / ops

[Back to RUNBOOK index](../RUNBOOK.md)

## 0. TL;DR

- Supabase: create project → enable extensions (`pg_cron`, `vault`, `vector`) → apply DB scripts (see [Database Operations](database-ops.md))
- Auth: Google OAuth client + Supabase Google provider + URL Configuration (redirect to `/auth/callback`)
- Media: Cloudinary keys
- Vercel: deploy → set env vars (use `../../README.md`) → set `NEXT_PUBLIC_SITE_URL` → redeploy
- Post-deploy: admin login → RBAC (`public.site_admins`) → enable features → run [Go-Live (P0)](go-live.md)

## 1. Vercel Environment Variables（依 feature 拆開；ops 必讀）

> Env template（可直接複製貼上）：`../../README.md`（以該檔為準）  
> 原則：`NEXT_PUBLIC_*` 會進 client bundle；secrets 一律 server-only（見 `doc/SECURITY.md`）。  
> 變更 env vars 後請 **Redeploy**（確保 Serverless Functions 讀到新值）。

### 1.1 Base（必填）

- Site/SEO：`NEXT_PUBLIC_SITE_URL`（production 必填；no trailing slash）
- Supabase（必填）：`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`（server-only）
- Admin allowlist（fallback；建議 production 仍填）：`ADMIN_ALLOWED_EMAILS`（正式 RBAC 以 `public.site_admins` 為準）

### 1.2 Uploads / Media（用到上傳才需要）

- Cloudinary：`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_CLOUDINARY_API_KEY`

### 1.3 Comments / Anti-spam（建議 production 必開；否則容易被灌）

- Akismet：`AKISMET_API_KEY`, `AKISMET_BLOG_URL`
- reCAPTCHA：`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`
- Privacy hardening：`IP_HASH_SALT`（勿用預設值）

### 1.4 Cron / Workers（有啟用 AI Analysis 排程、Embeddings/Preprocessing、similar-items 才需要）

- 必填：`CRON_SECRET`, `WORKER_SECRET`
- 推薦（async dispatch）：`QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`

### 1.5 AI / Data Intelligence（依啟用功能擇一）

- AI Analysis（Admin-only）：
  - 必填：`OPENROUTER_API_KEY`
  - 可選：`OPENROUTER_MODEL`, `SITE_URL`（server-only；OpenRouter `HTTP-Referer`）
  - Enablement runbook：`runbook/ai-analysis.md`
- Embeddings + Preprocessing（Admin-only；Cron + Worker + Supabase Edge Functions）：
  - Supabase（Edge Functions secrets）：`OPENAI_API_KEY`（見 `runbook/embeddings-preprocessing.md`）
  - Vercel（server-only）：`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `WORKER_SECRET`（+ optional `QSTASH_*`）
  - Cost hardening：Edge Functions（`generate-embedding`/`judge-preprocessing`）為 service_role-only（見 `doc/SECURITY.md`）
  - Enablement runbook：`runbook/embeddings-preprocessing.md`
- Safety Risk Engine（Comments safety；Admin-only operations）：
  - 必填：`GEMINI_API_KEY`
  - Spec：`specs/completed/safety-risk-engine-spec.md`

### 1.6 Monitoring（可選；建議 production）

- Sentry：`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

---

## 2. Supabase Setup（必做）

1. Create a Supabase project.
2. Copy API keys (Supabase Dashboard → Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
3. Enable extensions (Supabase Dashboard → Database → Extensions):
   - `pg_cron`, `vault`, `vector`
4. Apply schema + seed:
   - Recommended: `npm run db:reset` (fresh DB), or follow [Database Operations](database-ops.md)
5. （若啟用 Embeddings/Preprocessing）Supabase Edge Functions：
   - Secrets：`OPENAI_API_KEY`（Supabase Dashboard → Edge Functions → Secrets）
   - Deploy：`supabase/functions/generate-embedding/`, `supabase/functions/judge-preprocessing/`
   - Runbook：`runbook/embeddings-preprocessing.md`

## 3. Google OAuth Setup（Supabase Auth；必做）

> App flow：`/[locale]/login`（client-side OAuth）→ redirect `/auth/callback`（`app/auth/callback/route.ts`）→ `/[locale]/admin`

1. Google Cloud Console: create an OAuth Client (Web application)
   - （若第一次設定）先完成 OAuth consent screen（Internal/External 依公司規範）
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
3. Verification（production 建議做一次完整鏈路）：
   - `https://<your-domain>/<locale>/login` → Sign in with Google
   - 應導到 `https://<your-domain>/auth/callback` 並最後回到 `/<locale>/admin`

Troubleshooting (historical): `../archive/2025-12-24-oauth-troubleshooting.md`

Troubleshooting (common):
- If the redirect ends up on `/<locale>/login?error=no_code#error=server_error...Unable+to+exchange+external+code...`:
  - This is **Supabase failing to exchange the Google authorization code** (provider-side), not an app-side `exchangeCodeForSession()` bug.
  - Check Supabase Dashboard → Authentication → Providers → Google: Client ID/Secret are correct (re-copy the Client Secret if rotated).
  - Check Google Cloud Console → OAuth client (Web application):
    - Authorized redirect URI is exactly `https://<project-ref>.supabase.co/auth/v1/callback` (no typo / no trailing slash).
    - OAuth consent screen is configured and the signing-in account is allowed (Testing → test users, or Published).
  - Inspect Supabase Auth logs to see the underlying reason (e.g. `invalid_grant`, `unauthorized_client`).

## 4. Vercel Deploy（必做）

1. Import the repo into Vercel (Next.js).
2. Set env vars（Production）using `../../README.md` template + 本檔 §1 feature checklist。
3. Deploy.
4. Set `NEXT_PUBLIC_SITE_URL` to the production URL (Vercel URL or custom domain) and redeploy.

## 5. Post-Deploy Verification（必做）

1. Admin login: visit `/<locale>/admin` and login via Google.
2. RBAC/RLS:
   - Complete [Database Operations → Admin RBAC Setup](database-ops.md#admin-rbac-setup)
   - Logout/login to refresh JWT claims
3. Enable features (if needed):
   - `/<locale>/admin/features` → enable `blog`, `gallery`
4. Run the go-live checklist: [Go-Live (P0)](go-live.md)

## 6. Custom Domain（可選）

If you attach a custom domain, update:

- Vercel: domain configuration (see Vercel docs)
- `NEXT_PUBLIC_SITE_URL` (Vercel env var) → redeploy
- Google OAuth origins
- Supabase URL Configuration (Site URL + Redirect URLs)
