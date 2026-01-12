# Page Views Analytics Spec

> Status: DRAFT  
> Last Updated: 2026-01-03  
> Note: if referenced by in-code `@see`, keep headings stable (avoid renumbering/moving sections).

## 1. Purpose

定義 Page Views（瀏覽量）收集的**技術契約**：public ingestion endpoint、輸入驗證、privacy-first 聚合儲存、以及 admin-only 可見性。

> 本功能是「analytics ingestion」，不是行為追蹤；不存 PII、不存 user identifiers，只存每日聚合計數。

## 2. Components（SSoT paths）

- Schema / DB scripts:
  - `supabase/02_add/16_page_views.sql`（`page_view_daily` + `increment_page_view` RPC）
- App endpoints:
  - API route: `app/api/analytics/pageview/route.ts`
  - Client tracker: `components/analytics/PageViewTrackerClient.tsx`
- IO modules:
  - `lib/analytics/pageviews-io.ts`（service_role RPC）
- Types / validators:
  - Types (SSoT): `lib/types/page-views.ts`
  - Validators (pure): `lib/validators/page-views.ts`
- Tests:
  - `tests/validators/page-views.test.ts`

## 3. Security / Privacy Model

- Public endpoint: no auth required（避免 friction；僅寫入聚合資料）
- Input validation only:
  - path format + locale + excluded paths（reject `/admin`, `/api`, `/_next`）
- No PII stored:
  - 不存 IP、user id、email、device fingerprint、UA
- Write path:
  - API route → server-only IO → `SECURITY DEFINER` RPC（service_role）
- Read path:
  - `page_view_daily` RLS: admin-only SELECT（Owner/Editor）

## 4. Data Model / Contracts

### 4.1 Table: `public.page_view_daily`

- Primary key: `(day, path, locale)`
- Columns:
  - `day`: UTC date
  - `path`: canonical path（no locale prefix; regex `^/[a-zA-Z0-9/_-]*$`; max 500）
  - `locale`: `'en' | 'zh'`
  - `view_count`: aggregated counter

### 4.2 RPC: `public.increment_page_view(p_day, p_path, p_locale)`

- Atomic upsert:
  - insert if missing; else increment `view_count`
- Must use UTC:
  - IO layer computes `day = now.toISOString().slice(0,10)`

### 4.3 Request contract: `POST /api/analytics/pageview`

Payload（JSON）:

```json
{ "path": "/blog/my-post", "locale": "en" }
```

Responses:

- `204`: success (no content)
- `400`: invalid body/path/locale/excluded path
- `500`: server error

## 5. Flow

<a id="page-view-tracking"></a>

1. Client observes navigation (`usePathname`)
2. Client parses locale + canonical path (`parsePathname`)
3. Client dedupes per-session (`Set<locale:path>`)
4. Client sends request (`sendBeacon` preferred; `fetch` fallback)
5. Server validates (`validatePageViewRequest`)
6. Server records aggregated view (`recordPageView` → `increment_page_view`)

## 6. Feature Gate / Abuse Mitigation

- Default off:
  - Client-side gate: `NEXT_PUBLIC_ENABLE_PAGEVIEWS === 'true'`
- Noise reduction:
  - Excluded prefixes: `/admin`, `/api`, `/_next`
- Rate limiting:
  - Not implemented (by design); if abuse occurs, add server-side throttling later

## 7. Related Docs

- Implemented behavior (SSoT): `../../SPEC.md`（SEO/Analytics sections）
- Security policies: `../../SECURITY.md`
- Constraints: `../../../ARCHITECTURE.md`
- Implementation logs: `../../archive/README.md`
