# Step-by-Step Execution Plan — V1 TODO（Admin 缺口補齊）

> 狀態: Draft / Active  
> 最後更新: 2026-01-19  
> 定位: 把「已落地但仍有缺口」拆成可驗收、可拆 PR 的 step-by-step 計畫（agent/workspace）  
> 現況 SSoT: `doc/SPEC.md`（本檔只寫 steps，不重複寫 spec/契約）

---

## 0) 必讀（SSoT / Guardrails）

- Architecture / 全域約束：`ARCHITECTURE.md`
- 已落地行為（SSoT）：`doc/SPEC.md`
- Security / RBAC / RLS / secrets：`doc/SECURITY.md`
- Ops / DB / go-live：`doc/RUNBOOK.md`（細節：`doc/runbook/*`）
- 文件分工 / update matrix：`doc/GOVERNANCE.md`
- Drift tracker + playbooks（stable `@see` index）：`uiux_refactor.md`

---

## 1) 現況與缺口（What exists now / evidence）

### 1.1 Users 後台（`/admin/users`）

已存在（證據）：

- Tag filtering + tag selection UI：`app/[locale]/admin/users/page.tsx`、`app/[locale]/admin/users/UsersClient.tsx`
- Admin notes preview（Raw/Preview；server-side Markdown→HTML）：`app/[locale]/admin/users/[id]/page.tsx`、`app/[locale]/admin/users/[id]/components/UserAdminNotesCard.tsx`

缺口（V1 TODO）：

- Users list 的 search/pagination 尚未實作（目前一次載入全量 users；UI 無搜尋/分頁控制；IO 未提供 limit/offset/search）

### 1.2 AI Analysis（後台）

已存在（證據）：

- Custom templates backend/IO：`lib/modules/ai-analysis/analysis-templates-io.ts`
- Type contract 已支援 `templateId='custom' + customTemplateId`：`lib/types/ai-analysis.ts`

缺口（V1 TODO）：

- Admin UI：Owner CRUD + selection 尚未串起來（目前模板來源為 `ANALYSIS_TEMPLATES` 常數；未讀取 DB templates）

### 1.3 Analytics（Page Views）

已存在（證據）：

- Ingestion：`app/api/analytics/pageview/route.ts`、`components/analytics/PageViewTrackerClient.tsx`、`lib/analytics/pageviews-io.ts`
- DB：`supabase/02_add/16_page_views.sql`（`page_view_daily` + `increment_page_view` RPC）
- Spec（契約）：`doc/specs/completed/page-views-analytics-spec.md`
- Admin Dashboard UI：`app/[locale]/admin/(data)/analytics/pageviews/page.tsx`（PR-3 完成）

缺口（V1 TODO）：

- ✅ 已完成：Admin dashboard UI（read-only）：`/admin/(data)/analytics/pageviews`

---

## 2) Non‑negotiables（必須符合 `ARCHITECTURE.md`）

- Server-first：public/admin pages 預設 server component；client components 僅做互動（`ARCHITECTURE.md` §2）
- IO 收斂：DB access 只能在 `lib/**/*-io.ts`（`ARCHITECTURE.md` §3.4、§3.7）
- Bundle 邊界：public UI 不得 import admin-only deps；heavy deps 僅能出現在 admin route 且需避免被 public bundle 引入（`ARCHITECTURE.md` §2）
- Input validation：任何 query/body 進入 IO/DB 前先 validate（`lib/validators/*`；pure）
- RLS 是最終安全邊界；UI gate 只做 UX（`doc/SECURITY.md`）

---

## 3) Execution Plan（以 PR 為單位）

### PR-1 — Users 後台：搜尋 + 分頁（server-side）✅ COMPLETED

> 完成日期: 2026-01-19
> 實作檔案:
> - `lib/validators/admin-users.ts` — query contract validator
> - `lib/modules/user/users-admin-io.ts` — 新增 `getUserListFilteredPaged()`
> - `app/[locale]/admin/users/page.tsx` — server page 更新
> - `app/[locale]/admin/users/UsersClient.tsx` — 搜尋 form + 分頁 UI
> - `messages/zh.json` — i18n 字串
> - `tests/validators/admin-users.test.ts` — validator 單元測試

Goal：

- `/admin/users` 支援 `?q=` 搜尋與 `?page=` 分頁，並與既有 `?tag=` 共存
- 避免一次載入全量 users（降低 loading / 提升可用性）

Scope：

- Search：支援 `email`、`user_id`，並支援 `short_id`（僅當 `q` 符合 `^C\\d+$` 時以「精準查詢」啟用）
- Pagination：server-side `limit/offset`；預設 `pageSize=50`（allowlist：20/50/100）
- 不做：client-side filtering、infinite scroll

Expected file touches：

- `app/[locale]/admin/users/page.tsx`
- `app/[locale]/admin/users/UsersClient.tsx`
- `lib/modules/user/users-admin-io.ts`
- `lib/validators/*`（新增 admin users query validator）
- `messages/**`（admin.users i18n）
- （可選）`tests/**`（validator unit tests）

Step-by-step：

1. 定義 query contract（本 PR 的 API 介面）
   - `tag?: string`（既有；trim；max len=64 續用）
   - `q?: string`（trim；max len 建議 100；空字串視為 undefined）
     - 若 `q`（trim 後）符合 `^C\\d+$`（case-insensitive；例如 `c12`/`C12`），則視為 `short_id` 精準查詢（不做模糊匹配）
     - 否則視為一般文字搜尋（`email`/`user_id`；模糊匹配）
   - `page?: number`（>= 1；預設 1）
   - `pageSize?: number`（allowlist：20/50/100；預設 50）
2. 新增 pure validator（建議：`lib/validators/admin-users.ts`）
   - 輸入：raw `searchParams`
   - 輸出：`{ tag?, q?, qMode: 'text' | 'short_id', page, pageSize, limit, offset }`
   - 規則：非法值 → fallback（或回傳 error 讓 page 做 redirect 到 canonical query）
3. 擴充 Users Admin IO（`lib/modules/user/users-admin-io.ts`）
   - 建議新增：`getUserListFilteredPaged(params): Promise<{ users: UserDirectorySummary[]; total: number }>`
    - 實作要點：
      - tag filtering 維持現有兩段式查詢（避免 `.or()` string 拼接風險）
      - search（一般文字，`qMode='text'`）：
        - 只支援 `email`/`user_id`（模糊匹配），且 **禁止**把 `q` 原字串直接拼進 `.or()` filter
        - 建議策略：validator 對 `q` 做字元 allowlist（避免 `, { }` 等破壞 PostgREST filter）；通過後再組合查詢
      - search（short id，`qMode='short_id'`）：
        - `q` normalize：`trim` + `toUpperCase()` 得到 `shortId`
        - 先查 `customer_profiles.short_id = shortId` 取得 `user_id`
        - 再用 `user_directory.in('user_id', userIds)` 查詢 users（維持既有 `customer_profiles!left(short_id)` join，確保列表仍有 `shortId`）
      - 回傳 `total`（可用 `select('*', { count: 'exact', head: true })` 或等價做法；以現有 Supabase client 能力為準）
4. 更新 server page（`app/[locale]/admin/users/page.tsx`）
   - parse → validate searchParams（用 step 2 validator）
   - `Promise.all` 同時取：`usersPaged` + `availableTags`
   - 以 props 傳給 client：`activeTag`、`q`、`pagination`（page/pageSize/total）
5. 更新 client UI（`app/[locale]/admin/users/UsersClient.tsx`）
    - Search：使用 `<form method="GET">`（server-first；不做 client fetch）
      - 保留 `tag`（hidden input）
      - Placeholder/label 建議明確提示：可輸入 email/user id；或輸入 `C12`（short id 精準查詢）
    - Pagination：用 `Link` 產生 `?page=`；保留 `tag/q/pageSize`
    - 仍維持：Tag Filter Bar（注意要 merge query；避免把 `q/page` 丟失）
6. i18n：補齊 `admin.users` 的搜尋/分頁字串（zh/en）
7. Tests（最小集合）
   - validator：page/q/tag 的 edge cases（空字串、超長、非法 page/pageSize）
8. Verification
   - `npm test`
   - `npm run type-check`
   - `npm run lint`
9. Docs sync（合併後）
   - `doc/SPEC.md#users-admin`：移除/調整「search/pagination 尚未實作」的限制敘述
   - `doc/ROADMAP.md`：更新對應項目狀態（Pending → In Progress / Complete）

Rollback：

- Revert PR；`/admin/users` query contract 回到原本（僅 tag filter）

---

### PR-2 — AI Analysis：Custom Templates 後台 UI（Owner CRUD + selection）✅ COMPLETED

> 完成日期: 2026-01-19
> 實作檔案:
> - `lib/validators/custom-template.ts` — template input validator
> - `tests/validators/custom-template.test.ts` — validator 單元測試
> - `app/[locale]/admin/(data)/ai-analysis/templates/page.tsx` — server page
> - `app/[locale]/admin/(data)/ai-analysis/templates/actions.ts` — server actions (CRUD)
> - `app/[locale]/admin/(data)/ai-analysis/templates/TemplatesClient.tsx` — client UI
> - `app/[locale]/admin/(data)/ai-analysis/page.tsx` — 增加 customTemplates fetch
> - `app/[locale]/admin/(data)/ai-analysis/AIAnalysisClient.tsx` — 增加 custom template selection UI

Goal：

- Owner 能在後台管理 custom templates（CRUD + enable/disable）
- AI Analysis 執行/排程可選用 custom template（`templateId='custom' + customTemplateId`）

Scope：

- CRUD 僅限 Owner；Editor 只可讀「enabled templates」（依 `analysis-templates-io.ts` 設計）
- UI 先以 admin-only route 實作（避免把複雜 UI 塞進單一大頁）

Expected file touches（建議拆兩個 PR，以降低風險）：

- PR-2A（管理頁）
  - `app/[locale]/admin/(data)/ai-analysis/templates/page.tsx`（new）
  - `app/[locale]/admin/(data)/ai-analysis/templates/actions.ts`（new；server actions）
  - `app/[locale]/admin/(data)/ai-analysis/templates/TemplatesClient.tsx`（new；client UI）
  - `lib/modules/ai-analysis/analysis-templates-io.ts`（只在需要補缺口時才改）
  - `lib/validators/*`（custom template input validator；name/promptText）
- PR-2B（串接選用）
  - `app/[locale]/admin/(data)/ai-analysis/page.tsx`（fetch templates into initialData）
  - `app/[locale]/admin/(data)/ai-analysis/AIAnalysisClient.tsx`（selection + request payload）
  - `lib/types/ai-analysis.ts`（若 UI 需要補 type）

PR-2A Step-by-step（管理頁）：

1. 新增 route：`/admin/(data)/ai-analysis/templates`
2. server page：
   - 取得 role（owner/editor）
   - 呼叫 `listTemplates(role)` 取得列表
3. server actions：
   - create：`createTemplate(data, userId)`
   - update：`updateTemplate(id, data)`
   - delete：`deleteTemplate(id)`
   - toggle：`toggleTemplateEnabled(id, isEnabled)`
4. UI（client component）：
   - List + Create modal + Edit modal（prompt text 用 textarea）
   - Owner-only buttons：Create/Edit/Delete/Enable
   - Editor：read-only（不 render 任何寫入操作）
5. Input validation：
   - name：trim；min/max（例如 1..80）
   - promptText：min length（避免空 prompt）
6. Verification：
   - `npm test`（至少跑 validators）
   - `npm run type-check` / `npm run lint`

PR-2B Step-by-step（串接選用）：

1. server page（`ai-analysis/page.tsx`）把 templates（`listTemplates(role)`）放進 `initialData`
2. AIAnalysisClient：
   - Template Selection 加一個 `Custom` 選項
   - 當 `selectedTemplate === 'custom'` 時顯示 template dropdown（來源：`initialData.customTemplates`）
   - Submit request：帶上 `templateId='custom'` + `customTemplateId`
   - Guardrail：custom template 未選 → disable submit + 顯示錯誤
3. 排程（schedules）：
   - 若 schedule UI 支援選模板：同上規則加入 custom template
4. Docs sync（合併後）：
   - `doc/SPEC.md#known-gaps-roadmap-links`：移除「custom templates Admin UI 待補」的缺口敘述
   - `doc/ROADMAP.md`：更新狀態

Rollback：

- PR-2A 可獨立回退（不影響既有 analysis flow）
- PR-2B 回退會回到「僅內建模板」；DB templates 不會被刪除

---

### PR-3 — Analytics：Page Views Dashboard（Admin-only）✅ COMPLETED

> 完成日期: 2026-01-19
> 實作檔案:
> - `lib/validators/page-views-admin.ts` — query contract validator
> - `tests/validators/page-views-admin.test.ts` — validator 單元測試
> - `lib/types/page-views.ts` — 新增 admin dashboard types
> - `lib/analytics/pageviews-admin-io.ts` — read IO with RLS
> - `app/[locale]/admin/(data)/analytics/pageviews/page.tsx` — server page (Option B)
> - `messages/zh.json` — i18n 字串

Goal：

- 增加 admin-only page views dashboard（read-only），把已落地的聚合資料做可視化/查詢

Scope（V1 最小可用）：

- 預設顯示最近 7/30 天的總覽（total views + top pages table）
- Query params（建議）：
  - `from` / `to`（YYYY-MM-DD）
  - `locale`（optional；allowlist：`all|zh|en`；預設 `all` = 合併彙總）
  - `page` / `pageSize`
- 不做（先保守）：複雜圖表/互動（避免引入 heavy chart deps）

Expected file touches：

- `app/[locale]/admin/(data)/analytics/page.tsx`（或 `app/[locale]/admin/(data)/analytics/pageviews/page.tsx`；new）
- `lib/analytics/pageviews-admin-io.ts`（new；read IO，走 RLS）
- `lib/validators/*`（admin dashboard query validator）
- （可選）`tests/**`（validator unit tests）

Step-by-step：

1. 決定 admin route 位置（建議放在 `(data)` group，避免塞進 `/admin` dashboard）
   - 方案 A：`/[locale]/admin/(data)/analytics`（之後可擴充其他 analytics）
   - 方案 B：`/[locale]/admin/(data)/analytics/pageviews`
2. 新增 read IO：`lib/analytics/pageviews-admin-io.ts`
    - 使用 authenticated supabase client（cookie context）+ admin guard（Owner/Editor）
    - query `page_view_daily`（date range + locale filter）後在 application layer 聚合（避免依賴複雜 SQL/group-by；做法可參考 `lib/modules/embedding/search-analytics-io.ts`）：
      - total views：`sum(view_count)`（在 TS reduce）
      - top pages：以 `Map<path, sum(view_count)>` 聚合後 sort（desc）+ paginate
      - locale=`all`：不加 locale filter，直接跨 locale 彙總；locale=`zh|en`：加 `.eq('locale', ...)`
3. 新增 validator（建議 `lib/validators/page-views-admin.ts`）
    - date range 正規化（from/to default）
    - page/pageSize allowlist
    - locale allowlist（`all|zh|en`；預設 `all`）
4. server page：
   - parse → validate searchParams
   - 呼叫 IO 取得 summary + list
   - Render：
     - totals（cards）
     - top pages table（含 view_count）
     - `<form method="GET">` 做日期/locale filter（避免 client bundle）
5. Verification：
   - `npm test`
   - `npm run type-check`
   - `npm run lint`
6. Docs sync（合併後）：
   - `doc/SPEC.md#known-gaps-roadmap-links`：移除「Dashboard UI 尚未實作」的缺口敘述
   - `doc/ROADMAP.md`：更新狀態

Rollback：

- 回退 PR（僅新增 read-only admin UI；不影響 ingestion）

---

## 4) 決策（已確認）

1. Users search：支援 `short_id`，但只在 `q` 符合 `^C\\d+$` 時啟用「精準查詢」；其餘情況只搜 `email/user_id`
2. Users pageSize：預設 50；allowlist 固定 20/50/100
3. AI Analysis custom templates UI：採獨立 route（`/admin/(data)/ai-analysis/templates`）做 Owner CRUD + selection
4. Analytics dashboard（V1）：先做 totals + table（不引入 charts/heavy deps）
5. Analytics locale：預設合併（All）+ 提供 filter（`all|zh|en`）
