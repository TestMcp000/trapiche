# Database Operations (Supabase)

> Canonical entry: `../RUNBOOK.md`

[Back to RUNBOOK index](../RUNBOOK.md)

> One-click add / seed / drop / reset for Supabase DB
> Last Updated: 2025-12-31

This guide covers database schema management using the scripts in `supabase/`.

---

### Prerequisites

#### 1. Install psql

Verify installation:

```bash
psql --version
```

If not installed, install PostgreSQL client tools and add to PATH.

#### 2. Database Connection String

1. Supabase Dashboard -> Settings -> Database
2. Find Connection string -> Choose URI
3. Add to `.env.local` (gitignored):

```bash
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

#### 3. Enable Required Extensions

For shop/payment features, enable in Supabase Dashboard -> Database -> Extensions:

- `pg_cron`
- `vault`

Without these, you'll see errors like `schema "cron" does not exist`.

For Embeddings (pgvector):

- `supabase/COMBINED_ADD.sql` includes `CREATE EXTENSION IF NOT EXISTS vector;`
- If your project errors on `CREATE EXTENSION vector`, enable **vector** in Supabase Dashboard -> Database -> Extensions and re-run `db:add`.

---

### One-Click Commands

#### Using npm Scripts

```bash
npm run db:add     # Create tables + RLS + GRANT
npm run db:seed    # Insert default data
npm run db:drop    # Drop all tables (DANGEROUS)
npm run db:reset   # drop -> add -> seed
```

#### Using psql Directly (PowerShell)

```powershell
# Load connection string
$env:SUPABASE_DB_URL = (Select-String -Path .env.local -Pattern '^SUPABASE_DB_URL=').Line.Split('=', 2)[1]

# Execute scripts
psql -v ON_ERROR_STOP=1 --single-transaction -f supabase/COMBINED_ADD.sql  $env:SUPABASE_DB_URL
psql -v ON_ERROR_STOP=1 --single-transaction -f supabase/COMBINED_SEED.sql $env:SUPABASE_DB_URL
psql -v ON_ERROR_STOP=1 --single-transaction -f supabase/COMBINED_DROP.sql $env:SUPABASE_DB_URL
```

---

### Feature-Based Operations

#### List Available Features

```bash
npm run db -- list
```

#### Commands by Feature

```bash
npm run db -- add --feature <feature>
npm run db -- seed --feature <feature>
npm run db -- drop --feature <feature>
npm run db -- reset --feature <feature>
```

#### Feature Dependencies

> Note: `scripts/db.mjs` does **not** auto-run dependencies. Treat the table below as the required ordering when using `--feature`.

| Feature          | Dependencies                              |
| ---------------- | ----------------------------------------- |
| main             | None (base)                               |
| comments         | main                                      |
| reports          | main                                      |
| gallery          | main                                      |
| reactions        | main + comments + gallery                 |
| feature_settings | main                                      |
| shop             | main + feature_settings + pg_cron + vault |
| landing_sections | gallery                                   |
| theme            | main                                      |
| users            | main                                      |
| ai_analysis      | main + users + shop (includes templates)  |
| embedding        | main + feature_settings + theme + vector  |
| page_views       | main                                      |

> Note: `import_export_jobs`（Job History）目前包含在 `supabase/COMBINED_ADD.sql`（`supabase/02_add/14_import_export_jobs.sql`），但尚未在 `scripts/db.mjs` 暴露為獨立 `--feature`。同理，`ai_analysis_templates` 已整合進 `ai_analysis` feature，`page_views` 已作為獨立 feature 暴露。

---

<a id="admin-rbac-setup"></a>

### Admin RBAC Setup

RLS checks JWT `app_metadata.role`, not `ADMIN_ALLOWED_EMAILS` (which is only UI gate).

#### Role Sync Flow

1. Add email to `public.site_admins`
2. Trigger syncs role to `auth.users.raw_app_meta_data.role`
3. User re-logins to get new JWT with role
4. RLS now allows access

#### Setup Steps

1. Run at least `main` add first
2. Have Owner/Editor accounts login once (creates `auth.users` entries)
3. Run in SQL Editor:

```sql
insert into public.site_admins (email, role)
values ('owner@example.com', 'owner')
on conflict (email) do update
set role = excluded.role,
    updated_at = timezone('utc', now());
```

4. Each user logs out and back in (refreshes JWT)

---

### Verification

After add/seed, run these queries:

```sql
-- Theme singleton must exist
select * from public.site_config where id = 1;

-- Feature toggles should have 3+ rows
select feature_key, is_enabled from public.feature_settings order by display_order;

-- Landing sections should have default rows
select section_key, section_type, sort_order, is_visible
from public.landing_sections
order by sort_order;
```

For shop:

```sql
select public.is_shop_visible();
select * from public.shop_settings limit 1;
select count(*) from public.products;
```

---

### Common Errors

| Error                           | Solution                        |
| ------------------------------- | ------------------------------- |
| `psql` not found                | Install PostgreSQL client tools |
| `schema "cron" does not exist`  | Enable pg_cron extension        |
| `schema "vault" does not exist` | Enable vault extension          |
| `permission denied for table`   | Re-run `npm run db:add`         |
| `violates row-level security`   | Complete Admin RBAC Setup above |

---

### Related Documents

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Architecture constraints
- [ROADMAP.md](../ROADMAP.md) - Pending items
- Payments (webhooks): see [Payments](payments.md)
- AI enablement: see [AI Analysis](ai-analysis.md) and [Embeddings + Preprocessing](embeddings-preprocessing.md)

---
