# Behavior Analytics + Personalization (Umami + Supabase) - Product Requirements Document (PRD)

> **Version**: 0.2  
> **Last Updated**: 2026-01-04  
> **Status**: Draft  
> **Owner**: Lijen / Leander  
> **Parent Document**: `../completed/DATA_INTELLIGENCE.md`

本 PRD 彙整目前專案與討論結論，目標是用「瀏覽/停留時間 + 文章/商品/Gallery + Likes」支援：

1) **內容層級洞察**：挑出最值得做 LLM 分析/推薦的內容（先不用 LLM 也能產出可解釋理由）  
2) **個人化**：未登入以 `anon_id`（cookie）識別、profile 存 localStorage；登入後合併到 `user_id`，做到跨裝置一致

本文件只定義**決策與邊界**（不動程式碼）。所有棄用方案已移除，避免模糊。

---

## TL;DR（決策鎖定版）

- **Canonical**：Supabase 是 canonical（以 `content_id` 為主鍵）；Umami Cloud（Hobby，免費）只做 dashboard，不做 ETL 回 Supabase。
- **停留時間（dwell）**：單次 `sendBeacon` + server 端日聚合，不做 heartbeat、不存逐筆 events。
- **下一篇（Next content）**：用「轉移統計表」做 `A → B` 的 next 內容分析（只存聚合、不存個人日記），可回答「看過 A 的人下一篇通常看什麼」。
- **內容候選清單（最佳方案）**：採「多榜單並列（Multi-list Union）」取代單一加權分數；候選清單由 `Top Growth` / `High Stickiness` / `Low Interaction` 三榜 union 去重，並保留每篇被選中的原因標籤（可解釋）。
- **內容 mapping**：tracking payload **直接帶** `content_type + content_id (UUID)`；不做 URL/slug mapping table、也不把 id 放進 URL。
- **個人化**：browser-first（上限小檔案）+ 登入合併到 `user_id`（節流 + opt-out）。
- **Likes（Reactions）**：posts/products/gallery 都支援 Like（同一顆按鈕再次點擊即取消；不做單獨 Unlike 按鈕）；採 **Cloudflare Worker → Next API → Supabase**（edge gate + server 控制）。
- **AI Analysis（Admin-only）**：後台提供三種輸出模式（A 規則/特徵、B 雲端 LLM、C 離線本機 LLM）與三種 embeddings 模式（A 不用、B 重用 pgvector、C 離線產生），預設 A/A，並以「template default + per-report override」切換。
- **DB reset**：`COMBINED_*.sql` 以「模組 SQL 生成」避免 drift/重複；Seed 拆 core+demo，且都必須 idempotent。
- **Storage**：`content_engagement_daily` 與 `content_transition_daily` 日聚合保留 180 天；更舊 rollup 成月聚合後刪除日聚合。

---

## Design Tenets（10 條原則；用來避免需求漂移）

1. **Supabase 作為唯一 canonical**（分析/推薦/個人化都以 internal `content_id` join）。  
2. **第三方（Umami Cloud）只做觀測**，不做 ETL、不做 join 的唯一來源。  
3. **資料最小化**：優先聚合資料，不落逐筆 clickstream/event logs。  
4. **效能優先**：前台 request path 不同步做重計算/不同步跑 LLM。  
5. **匿名寫入必須防濫用**：edge gate + server-side validation + rate limit。  
6. **RLS 只當最後一道門**：匿名情境不把防濫用寄託在 RLS；直接 client write 不是預設路線。  
7. **可關閉（feature flags）**：analytics/personalization/LLM/embeddings 都必須可一鍵關閉。  
8. **idempotent first**：seed/rollup/job 必須可重跑，不依賴「只跑一次」。  
9. **免費額度為硬限制**：設計必須能在 Supabase 500MB / Umami 100K events / OpenRouter 50 req/day 下運作。  
10. **先可解釋、再自然語言**：先用規則/特徵產出可解釋結果，再選擇是否引入 LLM/embeddings 強化。

---

## Constraints（Free-tier Quota 快速表）

> **限制/額度**以官方頁面為準，最後查核：2026-01-04。

| Service | Free-tier 主要限制（節錄） | Source |
| --- | --- | --- |
| Supabase Free | Unlimited API requests、50k MAU、500 MB DB、5 GB egress、1 GB storage、2 active projects、閒置 1 週會 pause | https://supabase.com/pricing |
| Umami Cloud Hobby | $0/month、100K events/month、最多 3 websites、6 months retention、API access（Limited） | https://umami.is/pricing |
| Vercel Hobby | 1 million invocations、100 GB Fast Data Transfer（另有 CPU/Memory/Build 限制） | https://vercel.com/docs/limits/overview |
| Cloudflare Workers Free | 100,000 requests/day、1000 requests/min、CPU time 10 ms、128 MB memory | https://developers.cloudflare.com/workers/platform/limits/ |
| OpenRouter Free | 25+ free models、4 free providers、Free models only、50 requests/day、20 requests/min (rpm) | https://openrouter.ai/pricing |

---

## Configuration（後台可調參數；避免 hard-coded）

下列參數**必須**由後台可調（不寫死在程式碼），用於效能/額度/營運調優。

- **儲存位置（鎖死）**：匿名 profile 儲存在 **localStorage**（不是 cookie、不是 sessionStorage）；此項不做成可調參數，因為遷移涉及瀏覽器策略與工程變更。
- **配置來源（鎖死）**：所有可調參數都存放於 Supabase `company_settings`，並由 Admin Settings UI 編輯（owner/editor 角色）。
- **預設值（鎖死）**：若設定不存在或解析失敗，一律回退到本節列出的預設值。

| Key（company_settings.key） | Type | Default | Purpose | Guardrails |
| --- | --- | --- | --- | --- |
| `analytics_next_content_top_n` | int | 10 | 每個內容 A 顯示/計算的 next 內容數量（Top N） | 1–20 |
| `analytics_prev_content_ttl_minutes` | int | 30 | `prev_content` 有效時間（超過視為新 session，不記錄轉移） | 5–120 |
| `analytics_candidates_min_views_7d` | int | 20 | 內容候選清單：7 天 window 的最低 views 門檻（避免低樣本誤差） | 0–1000 |
| `personalization_recent_content_max` | int | 50 | 匿名 profile 內最近看過內容上限 | 10–100 |
| `personalization_top_tags_max` | int | 30 | 匿名 profile 內 top tags 上限 | 5–50 |
| `personalization_merge_throttle_hours` | int | 24 | 登入合併匿名歷史的最短間隔（節流） | 1–168 |
| `analytics_reaction_limit_rpm` | int | 10 | Reactions：每個 IP 每分鐘最多請求數（edge gate + server 都遵守） | 1–60 |
| `analytics_reaction_toggle_cooldown_ms` | int | 500 | Reactions：同一內容 toggle 最小間隔（毫秒） | 0–5000 |

> **隱私下限（鎖死）**：轉移統計在後台只顯示 `transition_count >= 10`，此值不做成可調參數（避免低流量推測風險）。

---

## Current Project Status（已落地 / 可復用）

本節列出「現在 repo 裡已經存在、可直接復用」的能力，讓本 PRD 的落地可以**接在既有模組上**。

| Capability | Status（以 repo 現況為準） | Reuse paths（入口） | Notes / Gaps |
| --- | --- | --- | --- |
| Page view tracking（聚合寫入） | 已落地（寫入 + 驗證）；Dashboard UI 尚未實作 | `app/api/analytics/pageview/route.ts`, `components/analytics/PageViewTrackerClient.tsx`, `lib/analytics/pageviews-io.ts`, `supabase/02_add/16_page_views.sql`, `doc/specs/completed/page-views-analytics-spec.md` | 現況 key 是 `(day, path, locale)`；內容層級 join 走獨立 ingestion（本 PRD 決策：payload 帶 `content_type + content_id`）。 |
| Reactions（匿名 likes + 限流） | 已落地（Next API + rate limit + service_role） | `app/api/reactions/route.ts`, `lib/reactions/io.ts`, `lib/utils/anon-id.ts`, `lib/security/ip.ts`, `supabase/02_add/05_reactions.sql` | 現況僅涵蓋 `gallery_item` + `comment`；DB 端 `anon` 有 `INSERT/DELETE` 且 delete policy 過鬆（`USING (true)`），必須收緊。PRD 決策：擴充到 `post`/`product` + Cloudflare Worker edge gate（Worker → Next API）。 |
| AI Analysis（後台面板 + reports/schedules） | 已落地（核心流程）；部分 UI 能力仍在 roadmap（見 `doc/SPEC.md`） | `app/[locale]/admin/(data)/ai-analysis/*`, `lib/modules/ai-analysis/*`, `supabase/02_add/12_ai_analysis.sql`, `doc/specs/completed/ai-analysis-spec.md`, `doc/runbook/ai-analysis.md` | 現況 templates/dataTypes 偏 shop + comments；要做 pageviews/dwell 需要擴充 dataset/dataTypes。 |
| OpenRouter（雲端 LLM 報告） | 已整合（AI Analysis 使用） | `doc/runbook/ai-analysis.md`, `lib/infrastructure/openrouter/*` | Free tier 50 req/day；只適合 admin on-demand + 快取/限流。 |
| Embeddings / Similar items（語意相似） | 已落地（pgvector + worker + UI 顯示相似內容） | `supabase/02_add/13_embeddings.sql`, `app/api/worker/embedding-queue/route.ts`, `supabase/functions/generate-embedding/index.ts`, `components/blog/SimilarPosts.tsx` | 目前 embeddings 依賴雲端 API（`OPENAI_API_KEY`）；要維持零成本需改離線產生（或只對 Top 內容存）。 |
| Import/Export jobs（工作追蹤/審計模式） | 已落地（可復用作 ETL/job 記錄） | `supabase/02_add/14_import_export_jobs.sql`, `lib/modules/import-export/*` | 用來追蹤 dwell 聚合、rollup、報告產生等批次 job（支援 idempotent）。 |
| Feature settings（功能開關） | 已落地（public read + admin 管理） | `supabase/02_add/06_feature_settings.sql`, `lib/features/io.ts`, `app/[locale]/admin/features/*` | analytics/personalization/LLM/embeddings 全部必須能由 feature gate 一鍵關閉。 |

---

## Scope

### In Scope

- 內容層級聚合：用 views + dwell（日聚合）挑選內容候選清單與理由
- 內容轉移（Next content）：用轉移統計表回答「看過 A 的人下一篇通常看什麼」（只存聚合；不存個人日記）
- 個人化：未登入以 `anon_id`（cookie）識別 + localStorage profile 個人化；登入合併到 `user_id`（跨裝置一致），且有 opt-out
- Likes：posts/products/gallery 都支援 Like（同一顆按鈕再次點擊即取消；不做單獨 Unlike 按鈕），信號用於內容分析/個人化
- AI Analysis（Admin-only）：提供內容層級分析 + 個人化洞察；後台內建輸出模式 A/B/C 與 embeddings 模式 A/B/C（template default + per-report override）
- DB reset/seed：`COMBINED_*.sql` 可穩定 reset；seed 可重複執行（idempotent）

### Out of Scope（Non-goals）

- 把 Umami 作為個人化/內容 join 的唯一資料源（URL-based join drift + API/配額問題）
- 長期保存逐筆事件（session/event logs）作為主要分析策略
- 即時（real-time）個人化：每次 scroll/heartbeat 都寫 DB
- 逐筆的瀏覽序列分析（session path / next-page sequence / clickstream）落地成「個人日記」
- 在前台 request path 同步呼叫雲端 LLM（效能/額度/資安風險都偏高）

---

## Analysis Coverage（PRD 要分析什麼 / 會輸出什麼）

### 內容層級（canonical）

- 來源：Supabase `content_engagement_daily`（`content_id` join）
- 會分析：
  - `view_count`、`dwell_seconds_total`、`avg_dwell_seconds`（由 `total/samples` 計）
  - 成長（WoW；以 7 天 window 估計）
  - 低互動（用於 Cleanup Candidate）
  - likes：`like_count`、`like_rate`（likes/views）
- 輸出：在 AI Analysis 面板產生「內容候選清單（Multi-list Union）」+ 可解釋理由（不依賴 LLM），由三個榜單組成並 union 去重：
  - `Top Growth`：限定 `view_count_7d >= analytics_candidates_min_views_7d`，以過去 7 天 `view_count` 的 WoW 成長率排序，取前 10 名
  - `High Stickiness`：限定 `view_count_7d >= analytics_candidates_min_views_7d`，`avg_dwell_seconds` ≥ 全站平均的 1.5 倍；依 `avg_dwell_seconds` 取前 10 名
  - `Low Interaction (Cleanup Candidate)`：
    - Gate：限定 `view_count_7d >= analytics_candidates_min_views_7d`，且 `view_count_7d` 位於全站前 10%（P90）
    - Label：在 gate 內，若 `like_rate` 落在倒數 10%（P10）**或** `avg_dwell_seconds` 落在倒數 10%（P10），即貼上 `low_interaction`
    - Select：按 `view_count_7d` 由高到低取 10 筆；同一內容若同時命中兩條件只佔 1 名額（dedupe by `content_id`）

**7 天 window 與統計口徑（已選定）**

- `view_count_7d`：過去 7 天（含當天）的 `view_count` 加總
- `views_last_7d`：同 `view_count_7d`
- `views_prev_7d`：再往前 7 天的 `view_count` 加總
- `growth_rate_wow`：使用 `signals_json.growth_rate_wow` 的公式
- 「全站平均」與 P90/P10：以同一 7 天 window、同一 `(locale, content_type)` 計算，且只納入 `view_count_7d >= analytics_candidates_min_views_7d` 的內容；統計為**未加權**（以內容為單位，不以 `view_count_7d` 加權）

### 內容轉移（Next content；聚合）

- 來源：Supabase `content_transition_daily`（聚合；不含 user/session identity）
- 會分析：
  - `next_content` 分佈：對每個 `from_content_id` 找出 top `analytics_next_content_top_n` 個 `to_content_id`（預設 10）
  - 轉移率：`transition_count(from→to) / view_count(from)`（估計值）
  - 退出（粗估）：`view_count(from) - sum(outgoing from)`（注意：因為是聚合與 beacon，屬於可接受的估計）
- 輸出：
  - AI Analysis 面板顯示「看過 A 的人下一篇通常看什麼」清單與理由（例如：top transitions + 類別/標籤相似）
  - 用於推薦候選補強（多樣化/關聯性）；仍以聚合為主
  - 隱私保護：後台只顯示 `transition_count >= 10`，避免低流量推測風險

### 個人化（省 DB）

- 來源：browser profile（recent ids/top tags/likes）+ `content_engagement_daily`
- 會輸出：推薦清單 + 理由（例如：你常看某些 tags、你按讚過的內容類別、最近停留時間最高的主題）
- 跨裝置：登入後合併到 `user_id`（profile 小檔案；節流；支援 opt-out）

### Umami（dashboard only）

Umami Cloud（Hobby，免費）只用於站務層觀測（PV、referrer/UTM、裝置/地區分佈、簡單事件），不作 canonical，不做 Umami → Supabase ETL，也不用 Umami 匯出 user-level 瀏覽序列驅動個人化/AI 分析。

### 明確不做（避免額度/隱私/DB 爆炸）

- 逐筆 session path / clickstream 的長期落地與分析（個人日記）  
  - 本 PRD 只做「轉移統計表」（聚合），不存 session id、不存逐筆事件。

---

## Requirements（用來開發與驗收）

### Functional (FR)

- FR-1: 系統可產生「內容候選清單（Multi-list Union）」：`Top Growth` / `High Stickiness` / `Low Interaction` 三榜並列，並 union 去重。
- FR-2: AI Analysis 面板必須輸出候選清單與可解釋理由；每筆候選需帶 `reason_tags`（固定值域；可同時命中多榜）與對應指標（`growth_rate_wow`、`avg_dwell_seconds`、`like_rate`、`view_count`）。
- FR-3: 未登入使用者可依匿名歷史得到個人化推薦（browser-first；不要求跨裝置）。
- FR-4: 使用者登入後可把匿名歷史合併到 `user_id`（跨裝置一致），且合併有節流（`last_merge_at`）。
- FR-5: posts/products/gallery 可 Like（同一顆按鈕再次點擊即取消；不做單獨 Unlike 按鈕）；likes 信號用於內容層級分析/個人化。
- FR-6: AI Analysis 輸出模式提供 A/B/C，後台必須提供選擇（template default + per-report override），預設模式為 A，且只在 Admin-only 流程中使用。
- FR-7: Embeddings 模式提供 A/B/C，後台必須提供選擇（template default + per-report override），預設模式為 A。
- FR-8: `npm run db:reset` 可成功執行；`npm run db:seed` 可連續執行至少 3 次都成功（idempotent）。
- FR-9: 系統可產生內容轉移統計（`A → B`），並在後台回答「看過 A 的人下一篇通常看什麼」（不存逐筆 clickstream）。
- FR-10: Admin Settings UI 必須可調整本文件 `Configuration` 表格列出的所有 `company_settings.key`，且系統不得 hard-code 這些值。

### `reason_tags`（固定值域；多選 enum）

`reason_tags` 是每筆候選都必須帶的多選標籤（array of enum）；值域固定如下：

| Tag | 觸發條件 |
| --- | --- |
| `top_growth` | 命中 `Top Growth` 榜單 |
| `high_stickiness` | 命中 `High Stickiness` 榜單 |
| `low_interaction` | 命中 `Low Interaction` 榜單 |
| `stale` | `signals_json.is_stale = true`（候選入榜時一併標記） |
| `trending` | `signals_json.is_trending = true`（本 PRD 中 `is_trending` 等同 `Top Growth` 命中；因此 `trending` 必須伴隨 `top_growth`） |

### Non-Functional (NFR)

- Performance:
  - Tracking 不可阻塞 SSR critical path（避免增加 TTFB）。
  - DB 寫入頻率需可控（聚合/批次/抽樣），避免 per-event insert。
  - 自然語言報告不得在前台 request path 同步執行（只允許後台 on-demand 或離線批次）。
- Security / Privacy:
  - 個人化資料需去識別化（pseudonymous），避免存 IP/UA 原文。
  - 匿名 likes 必須有 anti-abuse（edge gate + server rate limit + toggle cooldown）；不依賴「client 直連 + RLS」解決濫用。
  - Opt-out（鎖死定義）：啟用後停止所有被動 tracking（`view_count`/`dwell`/`transition`）與 localStorage profile 寫入（並立即清空），不再 merge 到 `user_behavior_profiles`；Likes 仍允許（主動互動），但不得用於該使用者的個人化推論。
  - 若使用雲端 LLM，input 必須只包含去識別化/聚合資料，避免送出 PII 與逐筆行為序列。
- Cost / Storage:
  - Supabase 500MB：避免 raw event logs；對 user-level data 設上限與 retention；`content_engagement_daily` 與 `content_transition_daily` 都做 retention + rollup。
  - Umami 100K events/month：不加 heartbeat；只做站務 dashboard。
  - OpenRouter 50 req/day：僅 admin on-demand；必須快取/限流；預設不依賴它。

---

## System Design（決策版；清楚邊界）

### 1) Analytics（內容層級聚合）

**資料來源**

- Umami Cloud（Hobby，免費）：僅作站務觀測 dashboard（PV/UTM/referrer）；不做 canonical、不做 ETL。
- Canonical：站內 ingestion 寫入 Supabase（以 `content_id` join）。

**Dwell 定義（已選定）**

- 只在 `pagehide/visibilitychange` 用 `navigator.sendBeacon()` 送一次 `active_seconds`（不 heartbeat）。
- server 端做日聚合累加：`view_count += 1`、`dwell_seconds_total += active_seconds`、`dwell_samples += 1`。
- Opt-out：啟用後不記錄 `view_count` 與 `dwell`（不送 tracking beacon）。

**內容 mapping（已選定）**

- payload 必帶 `content_type + content_id (UUID)`（例如 `post` + `post_id`）。
- 不做 URL/slug mapping table、不把 id 放進 URL。

**Canonical tables（本 PRD 會新增）**

- `content_engagement_daily(day, locale, content_type, content_id)`：
  - `view_count`
  - `dwell_seconds_total`
  - `dwell_samples`
  - `signals_json`（固定 schema；避免變成垃圾桶）
- `content_engagement_monthly(month, locale, content_type, content_id)`（rollup 產物；只需聚合欄位）
- `content_transition_daily(day, locale, from_content_type, from_content_id, to_content_type, to_content_id)`：
  - `transition_count`
- `content_transition_monthly(month, locale, from_content_type, from_content_id, to_content_type, to_content_id)`（rollup 產物）

**`signals_json` schema（已選定；固定 keys）**

| Key | Type | Description |
| --- | --- | --- |
| `is_trending` | boolean | 是否命中 `Top Growth` 規則 |
| `dwell_outlier` | boolean | 是否命中 `High Stickiness` 規則 |
| `is_stale` | boolean | `now() - content_last_updated_at >= 90 days` 且 `growth_rate_wow < 0` |
| `growth_rate_wow` | float | `((views_last_7d - views_prev_7d) / max(views_prev_7d, 1)) * 100` |

**`content_last_updated_at`（用於 `is_stale`）**

- `post`：`COALESCE(published_at, updated_at, created_at)`
- `product`：`COALESCE(updated_at, created_at)`
- `gallery_item`：`COALESCE(updated_at, created_at)`

**Transition 定義（已選定；聚合、不存個人日記）**

- 何時記錄：在內容頁送 beacon 時，帶上「上一個內容」（`prev_content_type + prev_content_id`），server 端把它累加到 `prev → current` 的轉移統計。
- client 來源：用 **sessionStorage** 保存「上一個內容」（`prev_content_type + prev_content_id`），不需要 user/session id；有效時間由 `analytics_prev_content_ttl_minutes` 控制（預設 30 分鐘）。
- 過濾：不記錄 `prev == current`；若距離上次內容超過 `analytics_prev_content_ttl_minutes`，視為新 session，不記錄轉移。
- 請求量：可設計成與 dwell/engagement 同一個 ingestion request 一起送（避免多打一支 API）。
- Opt-out：啟用後不記錄 `view_count` / `dwell` / `transition`（不送 tracking beacon）。

**Retention / Rollup（已選定）**

- `content_engagement_daily` 保留 180 天。
- 超過保留期：rollup 到 `content_engagement_monthly` 後刪除日聚合。
- `content_transition_daily` 保留 180 天，並 rollup 到 `content_transition_monthly` 後刪除日聚合。

---

### 2) Personalization（匿名 + 登入合併）

**識別（已選定）**

- 沿用既有 `anon_id`（cookie UUID；目前 reactions 已使用）。

**資料策略（已選定）**

- 未登入：個人化歷史存在 browser 的 **localStorage**，只保留：
  - 最近看過內容：最多 `personalization_recent_content_max`（預設 50）
  - top tags：最多 `personalization_top_tags_max`（預設 30）
- 登入後：一次合併到 Supabase `user_behavior_profiles(user_id)`，profile 必須是「有上限的小檔案」，並用 `last_merge_at` 節流（最短間隔由 `personalization_merge_throttle_hours` 控制；預設 24 小時）。
- Opt-out：提供 `personalization_opt_out`；啟用後立即清空 localStorage profile，並停止 profile 的寫入/合併；個人化引擎不得使用該使用者的 likes/profile 作推論。

**明確不做**

- 不落逐筆事件（page/session/clickstream）到 Supabase。

---

### 3) Reactions / Likes（posts + products + gallery；匿名可用）

**目標**

- Like（再次點擊即取消）為「強信號」：用於內容層級排序、個人化偏好、以及 AI Analysis 面板洞察。
  - UI：前台只提供單一 Like 按鈕（同一顆按鈕再次點擊即取消；不做單獨 Unlike 按鈕）。
- Opt-out：不阻擋 Like（主動互動仍允許）；但不得用於該使用者的個人化推論。

**單一 reactions 系統（已選定）**

- 擴充 `public.reaction_target_type`：新增 `post` / `product`（保留既有 `gallery_item` / `comment`）。
- DB triggers 維護 `like_count`（讀多寫少；對列表/詳情頁更省 DB）。

**請求路徑（已選定）**

- **Cloudflare Worker → Next API (`/api/reactions`) → Supabase**
  - Worker：先做 edge rate limit（`analytics_reaction_limit_rpm`）+ toggle cooldown（`analytics_reaction_toggle_cooldown_ms`）+ bot rule / allowlist；超限直接回 `429`（不觸發 Next API）。
  - Next API：做嚴格驗證（target 存在、類型白名單、toggle 冪等）+ server-side rate limit + 審計（防止繞過 edge gate）。
  - Supabase：只接受 server（service_role）寫入。

**RLS（必須收緊；避免濫用）**

- 既然預設路線是 server write：`anon` 不需要 `reactions` 的 `INSERT/DELETE` 權限。
- 目標狀態：`anon` 最多只需要 read（或 read aggregated like_count）；寫入只允許 service_role（由 Next API 執行）。

---

### 4) AI Analysis（Admin-only；先可解釋、再自然語言）

**內容層級分析（最適合先做）**

- 新增/擴充 AI Analysis template：直接讀 `content_engagement_daily`，輸出「內容候選清單（Multi-list Union）」與理由（規則可解釋；不依賴 LLM）：
  - `Top Growth`：限定 `view_count_7d >= analytics_candidates_min_views_7d`，過去 7 天 `view_count` WoW 成長率前 10 名
  - `High Stickiness`：限定 `view_count_7d >= analytics_candidates_min_views_7d`，`avg_dwell_seconds` ≥ 全站平均 1.5 倍；前 10 名
  - `Low Interaction (Cleanup Candidate)`：限定 `view_count_7d >= analytics_candidates_min_views_7d` 且 `view_count_7d` 位於全站前 10%（P90）；在此集合中若 `like_rate`（P10）或 `avg_dwell_seconds`（P10）命中倒數 10% 即入選，最後按 `view_count_7d` 由高到低取 10 筆（dedupe by `content_id`）
- 產出以 `content_id` 作唯一鍵，確保可復用到 embeddings/RAG/推薦/後台 tooling。

**個人化分析（本 PRD 會做；省 DB）**

- 用 `user_behavior_profiles`（小檔案）+ 內容聚合資料產生推薦/洞察；登入合併後做到跨裝置一致。

**輸出模式（A/B/C；預設 A）**

- A（預設）：非 LLM 可解釋（規則/特徵）
- B：雲端 LLM（沿用 OpenRouter；admin on-demand；限流/快取）
- C：本機/自管 LLM 離線批次（由本機執行批次；零 API 成本；資料不出站）

**Embeddings 模式（A/B/C；預設 A）**

- A（預設）：不依賴 embeddings（只用聚合+tags/likes）
- B：重用既有 pgvector embeddings（用於聚類/多樣化/RAG context）
- C：離線 embeddings（本機產生並寫回 DB；維持零 API 成本）

**Admin UX（已選定）**

- Template default + per-report override：模板有預設模式；單份報告可覆寫（避免全域單一模式造成「要嘛全開要嘛全關」）。

---

## DB / SQL Operations（COMBINED_*.sql；只談決策與風險）

### 1) `COMBINED_*.sql` 生成（已選定）

- `COMBINED_DROP.sql` / `COMBINED_ADD.sql` / `COMBINED_SEED.sql` 由 `supabase/01_drop/*`、`supabase/02_add/*`、`supabase/03_seed/*` 依固定排序拼接生成。
- `COMBINED_*` 視為 **generated artifact**（禁止手改），修改只在模組檔。
- generator 必做靜態檢查：
  - policy name 全域唯一（避免重名）
  - 禁止重複 include 同一模組
  - 依賴順序檢查（避免表/型別/函式先後錯）

### 2) Seed（已選定；必須 idempotent）

- core seed：必需資料（settings/feature toggles/admin allowlist/templates 等），永遠執行，必須 idempotent（`INSERT ... ON CONFLICT ... DO UPDATE/DO NOTHING`）。
- demo seed：示範資料（posts/products/gallery demo 等），必須「雙重鎖死」避免污染 production：
  - 指令鎖：`npm run db:seed` 只執行 core；`npm run db:seed:demo` 才會執行 demo。
  - 環境鎖：demo seed 只有在 `app.settings.env ∈ {local, preview}` 才會執行；在 `app.settings.env = production` 時必須 no-op。
  - demo seed 仍必須 idempotent（只補缺不覆蓋；以穩定 unique key upsert）。
- 輸出：`COMBINED_SEED.sql`（core）+ `COMBINED_SEED_DEMO.sql`（demo）。

### 3) 已知風險（以現況為準；需在實作前先校正）

- 現況：`supabase/COMBINED_ADD.sql` 中 embeddings 模組被收錄兩次（同檔案內出現兩段 `-- ADD: Embedding Module Tables (pgvector)`），會導致同名 `CREATE POLICY` 直接 error，讓 `db:add/db:reset` rollback。
- `supabase/02_add/05_reactions.sql` 目前允許 `anon` `INSERT/DELETE` 且 delete policy `USING (true)`；即使你走 server write，這仍是安全風險（需收緊）。
- 現況：reactions 路徑尚未有 Cloudflare Worker gate；若直接暴露 Next API，免費額度與濫用風險偏高。
- `supabase/README.sql` 需和現況模組依賴對齊，避免操作 drift。

---

## Acceptance Criteria（用來驗收，不是 step plan）

- AC-1: `npm run db:reset` 在空 DB 上可成功執行（drop → add → seed）。
- AC-2: `npm run db:seed` 可連續執行至少 3 次都成功，且 core seed 不重複、不漂移。
- AC-3: `COMBINED_ADD.sql` 中不存在重複 policy 名稱，且關鍵模組只有單一版本（不重複收錄）。
- AC-4: `content_engagement_daily` 可作為內容候選清單的 canonical 來源，且具備 retention + monthly rollup 策略（不會長期把 DB 撐爆）。
- AC-5: posts/products/gallery 可 Like（同一顆按鈕再次點擊即取消；不做單獨 Unlike 按鈕），且路徑為 Worker → Next API → Supabase，具備 edge gate + server rate limit。
- AC-6: 後台可設定 Template default 且單份報告可覆寫輸出模式（A/B/C）與 embeddings 模式（A/B/C）。
- AC-7: 系統可產生 `content_transition_daily` 並在後台回答「看過 A 的人下一篇通常看什麼」，且資料不含 user/session identity（僅聚合 + retention + rollup）。
- AC-8: AI Analysis 內容候選清單輸出為 `Top Growth` / `High Stickiness` / `Low Interaction` 三榜並列，並 union 去重；每筆候選包含 `reason_tags`（值域固定：`top_growth`/`high_stickiness`/`low_interaction`/`stale`/`trending`）與對應指標（`growth_rate_wow`/`avg_dwell_seconds`/`like_rate`/`view_count`），且 `Low Interaction` 選取規則為 OR（`like_rate` P10 或 `avg_dwell_seconds` P10），超過 10 筆時按 `view_count_7d` 取前 10。
- AC-9: `company_settings` 存在本 PRD `Configuration` 表列出的所有 keys，且後台可編輯並立即生效（未設定時回退預設值）。
- AC-10: Opt-out 啟用後不記錄 `view_count`/`dwell`/`transition` 且清空並停止寫入 localStorage profile；Likes 仍可使用，但不得用於該使用者的個人化推論。

---

## Technical Spec（連結）

- Docs index: `../README.md`
- Implemented behavior (SSoT): `../../SPEC.md`
- Security / RLS / secrets: `../../SECURITY.md`
- Ops / DB operations: `../../runbook/database-ops.md`
- AI Analysis PRD: `../completed/AI_ANALYSIS_v2.md`
- AI Analysis spec: `../completed/ai-analysis-spec.md`
- AI Analysis runbook: `../../runbook/ai-analysis.md`
- Data Intelligence PRD: `../completed/DATA_INTELLIGENCE.md`
- Embeddings/Queue spec: `../completed/embedding-queue-dispatcher-worker-spec.md`
- Page views analytics spec: `../completed/page-views-analytics-spec.md`

---

## Related

- Constraints: `../../../ARCHITECTURE.md`
- Drift tracker / stable `@see`: `../../../uiux_refactor.md`
