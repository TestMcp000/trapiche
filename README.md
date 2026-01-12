# Quantum Nexus LNK Website

Modern bilingual corporate website (EN / zh-Hant) built with Next.js (App Router) + Supabase.

---

## Docs

- Docs hub (SRP + navigation): `doc/README.md`
- Owner dashboard (status + drift only): `doc/STATUS.md`
- Docs governance / update matrix (agent-facing): `doc/GOVERNANCE.md`
- Tasks (PR-ready steps, agent-facing): `doc/TASKS.md`
- Blockers (external dependencies): `doc/BLOCKERS.md`
- Implemented behavior (SSoT): `doc/SPEC.md`
- Roadmap (what/why/status): `doc/ROADMAP.md`
- Security / RLS / secrets: `doc/SECURITY.md`
- Ops runbook (go-live checklist): `doc/RUNBOOK.md`
- Drift tracker + playbooks (stable `@see` index): `uiux_refactor.md`
- Single-feature specs index (stable): `doc/specs/README.md`

## Production Go-Live

- Go-live checklist + verification links: `doc/runbook/go-live.md`
- Step-by-step deployment walkthrough (non-technical): `doc/runbook/deployment.md`
- Embeddings + preprocessing enablement (cron + worker + optional QStash): `doc/runbook/embeddings-preprocessing.md`

---

## Features

- **Bilingual**: EN / zh-Hant, SEO-friendly (`hreflang`)
- **Blog**: Markdown editor (GFM + code highlight + math), categories, SEO metadata
- **Gallery**: masonry layout, infinite scroll, anonymous reactions
- **Shop**: products/variants/cart/coupons + payment webhooks (checkout wiring: `doc/ROADMAP.md`)
- **Admin CMS**: content/landing/theme/features/users + data modules (Import/Export, AI Analysis, Preprocessing)
- **Security**: Google OAuth, Supabase RLS, admin allowlist, server-only secrets

---

## Tech Stack

| Category  | Technology                                      |
| --------- | ----------------------------------------------- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling   | Tailwind CSS 3.4.x                              |
| i18n      | next-intl (en/zh)                               |
| Database  | Supabase (PostgreSQL + Auth + RLS)              |
| Images    | Cloudinary                                      |
| Deploy    | Vercel                                          |

---

## Quick Start（Local Dev）

**Prerequisites**

- Node.js 20+ (recommended)
- A Supabase project (remote) + required env vars

```bash
# 1) Install deps
npm install

# 2) Create .env.local (see template below)
# 3) Start dev server
npm run dev
```

Open `http://localhost:3000`.

---

## Environment Variables（.env.local）

> `NEXT_PUBLIC_*` variables are exposed to the client bundle. Secrets must be server-only.

**Template**

```bash
# Site / SEO (required in production; no trailing slash)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Admin allowlist (required for admin access fallback)
ADMIN_ALLOWED_EMAILS=you@example.com,other@example.com

# Cloudinary (required if you use uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key

# Comments / anti-spam (recommended for production)
AKISMET_API_KEY=your_akismet_key
AKISMET_BLOG_URL=https://your-domain.com
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

# Privacy hardening (recommended for production; do not keep default salt)
IP_HASH_SALT=your-random-salt

# Cron / background workers (required if you enable scheduled processing)
CRON_SECRET=your-secure-random-string
WORKER_SECRET=your-secure-random-string

# Optional: Upstash QStash (recommended for embedding queue dispatcher → worker)
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_qstash_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_qstash_next_signing_key

# AI Analysis (required if you enable AI Analysis)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
# Optional: override default model
OPENROUTER_MODEL=openai/gpt-4o-mini
# Optional: OpenRouter `HTTP-Referer` override (server-only; defaults to `http://localhost:3000`)
SITE_URL=https://your-domain.com

# Optional: Cohere reranker (only if enabled by your preprocessing config)
COHERE_API_KEY=your_cohere_key

# Optional: Page view analytics (disabled by default)
NEXT_PUBLIC_ENABLE_PAGEVIEWS=true

# Optional: Error monitoring (Sentry)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project

# Optional: DB scripts helper (only used by scripts/db.mjs; not required on Vercel runtime)
SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres
```

---

## Deployment（Vercel + Supabase）

- Follow the end-to-end walkthrough: `doc/runbook/deployment.md`.
- DB operations and extensions: `doc/runbook/database-ops.md`.
- Security/RLS expectations: `doc/SECURITY.md`.
- Implemented behavior (SSoT): `doc/SPEC.md`.
- Pending work / blockers: `doc/ROADMAP.md`.

Canonical ops entrypoint: `doc/RUNBOOK.md` (index).

---

## Project Structure

```
myownwebsite/
  app/           # Next.js App Router (routes, API, actions)
  components/    # React components (public + admin)
  hooks/         # Client-only React Hooks
  lib/           # Domain logic (pure + IO)
  messages/      # i18n translation files (en.json, zh.json)
  supabase/      # DB scripts (COMBINED_ADD/SEED)
  tests/         # Architecture boundary tests + unit tests
  doc/           # Specs, roadmap, archives, runbook
```

---

## Scripts

```bash
npm run dev         # Start dev server (Turbopack)
npm run build       # Production build
npm run start       # Start production server
npm test            # Run test suite (Node test runner)
npm run type-check  # TypeScript check
npm run lint        # ESLint
npm run analyze     # Bundle analyzer build
```

---

## Contact

| Item    | Info                                    |
| ------- | --------------------------------------- |
| Company | Quantum Nexus LNK Limited Liability Co. |
| Email   | QuantumNexusLNK@gmail.com               |
| Website | http://quantumnexuslnk.com/             |
| GitHub  | https://github.com/LeanderKuo           |

---

## License

License not specified yet (add a `LICENSE` file before open-sourcing).
