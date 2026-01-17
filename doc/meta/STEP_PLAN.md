# Step-by-Step Execution Plan — AI Safety Risk Engine (Comments) V1

> Status: **COMPLETE ✅ (Maintenance Mode)**  
> Last Updated: 2026-01-17  
> Owner: Site Owner  
> Audience: executor agent（照本檔逐項驗證/維護；若引入 drift，先照 §3 playbook 修復）  
> Mode: **Maintenance**（V1 已落地；本檔保留 constraints + playbooks）

## 1) Scope（IS / IS NOT）

In Scope（V1）:

- Blog / Gallery 的文字留言（`POST /api/comments`）
- 三層防禦：Layer 1 rules → Layer 2 RAG → Layer 3 LLM（Gemini）
- Safety corpus（slang/cases）後台維護 + embeddings（覆用既有 pipeline）
- Safety queue（HELD）後台人工審核/標註 + 快軌 promote-to-corpus
- Fine-tuning dataset（ETL）：review → `safety_training_datasets`（`input_messages`/`output_json` JSONB；batch 由 `safety_settings.training_active_batch`）→ export → Google AI Studio

Out of Scope（由其他模組處理 / V2）:

- 一般辱罵/惡意攻擊（spam/abuse）
- 圖片分析（Gallery image）
- LoRA / 自架模型

---

## 2) Inputs（SSoT / constraints）

- Architecture / global constraints: `ARCHITECTURE.md`
- Implemented behavior baseline (SSoT): `doc/SPEC.md#comments`
- Security / RLS / secrets: `doc/SECURITY.md`
- Ops / DB scripts: `doc/RUNBOOK.md`（details: `doc/runbook/*`）
- Drift tracker + remediation playbooks: `uiux_refactor.md`（stable `@see` index）
- Spec (design + contracts): `doc/specs/proposed/safety-risk-engine-spec.md`
- Reusable platform specs:
  - `doc/specs/completed/embeddings-semantic-search-spec.md`
  - `doc/specs/completed/data-preprocessing-pipeline-spec.md`
  - `doc/specs/completed/embedding-queue-dispatcher-worker-spec.md`

---

## 3) Current Entry Points（Implementation Map）

### Public Submit Path（Spam → Safety → Persist）

- HTTP entrypoint: `app/api/comments/route.ts`
- Orchestration use-case: `lib/use-cases/comments/create-comment.ts`（`createCommentWithSafety()`）
- DB writes:
  - Comment insert + moderation record: `lib/modules/comment/comments-write-io.ts`（`insertCommentWithModeration()`）
  - Safety assessment + pointers: `lib/modules/safety-risk-engine/admin-io.ts`（`persistSafetyAssessment()`）

### Safety Engine (Layered)

- Orchestrator: `lib/modules/safety-risk-engine/safety-check-io.ts`（`runSafetyCheck()`）
- Layer 1 (pure): `lib/modules/safety-risk-engine/engine.ts`
- Layer 2 RAG: `lib/modules/safety-risk-engine/rag-io.ts`
- Layer 3 LLM IO: `lib/modules/safety-risk-engine/llm-io.ts`
- PII redaction (pure): `lib/modules/safety-risk-engine/pii.ts`
- Settings IO: `lib/modules/safety-risk-engine/settings-io.ts`

### Embeddings / Preprocessing (Shared Platform)

- Non-module embedding facade (for module isolation): `lib/embeddings/index.ts`
- Target content fetcher: `lib/modules/embedding/embedding-target-content-io.ts`
- Queue dispatcher/worker entrypoints:
  - Dispatcher: `app/api/cron/embedding-queue/route.ts`
  - Worker: `app/api/worker/embedding-queue/route.ts`

### Admin UI

- Safety queue: `app/[locale]/admin/(blog)/comments/safety/page.tsx`
- Safety detail: `app/[locale]/admin/(blog)/comments/safety/[commentId]/page.tsx`
- Safety corpus: `app/[locale]/admin/(blog)/comments/safety/corpus/page.tsx`
- Safety settings: `app/[locale]/admin/(blog)/comments/safety/settings/page.tsx`
  - `training_active_batch`（Active Batch）：用於「加入訓練集」時自動填入 `dataset_batch`

---

## 4) Constraints（Non‑Negotiables）

- **Latency budget**：Safety layer 1–3 同步路徑必須在 **2000ms** 內完成；任何 timeout/unavailable → **Fail Closed → HELD**
- **PII**：任何送往外部 AI（embeddings / Gemini）前必須先去識別化（pure）
- **Bundle boundary**：Safety/AI code 必須 server-only；public UI 不得 import admin/AI deps
- **AI SDK boundaries**：
  - Gemini SDK / API access：只允許在 `lib/infrastructure/gemini/**`（server-only）
  - OpenRouter API access：只允許在 `lib/infrastructure/openrouter/**`（server-only）
  - OpenAI SDK：只允許在 `supabase/functions/**`
- **IO boundaries**：API routes 保持薄（parse/validate → call use-case/lib → return）；IO modules 必須 `import 'server-only';`
- **Modules isolation**：`lib/modules/*` 禁止跨模組依賴；跨 domain orchestration 一律放 `lib/use-cases/**`
- **RLS**：為最終安全邊界；UI gate 只做 UX

---

## 5) Drift Remediation Playbooks（Detailed, Non‑fuzzy）

### 5.1 Architecture drift — `lib/modules/*` cross-module imports（Fix code）

> Drift claim（SSoT）：`ARCHITECTURE.md` 附錄 A（依賴規則）規定 `lib/modules/*` 禁止跨模組依賴；違規會導致循環依賴與難以測試。

#### Goal

- `lib/modules/<domain>/**` 不再 import `lib/modules/<other-domain>/**`
- `embedding <-> preprocessing` 不再互相依賴（避免 cycle）
- Guardrail tests 能自動阻擋回歸

#### Step-by-step

1) **列出所有違規點（evidence）**

- Command: `rg -n "@/lib/modules/" lib/modules --no-heading`
- 逐條判斷：import 發生在 `lib/modules/<A>`，但 path 指向 `lib/modules/<B>` 且 `A != B`

2) **把違規分類（決定修復策略）**

- `auth` / RBAC helpers 被多模組使用 → 移到 cross-cutting（`lib/auth/*`）
- Embedding/search/queue 被多模組使用 → 提供 non-module facade（`lib/embeddings/*`）
- Landing × Gallery、Comments submit（Spam × Safety × Persist）等跨 domain orchestration → 移到 `lib/use-cases/**`
- Import/Export 需要讀多張表 → 在 Import/Export 模組內直接 query（不要 import 其他 modules）

3) **執行 refactor（具體到檔案/操作）**

- RBAC helpers：
  - 新增 `lib/auth/index.ts`（server-only）作為 canonical
  - `lib/modules/*` 內的 admin gates 改用 `@/lib/auth`
  - 保留 `lib/modules/auth/index.ts` 作為 legacy re-export（避免破壞既有 imports）
- Embeddings reuse：
  - 新增 `lib/embeddings/index.ts`（server-only）re-export embedding/search/queue/pure
  - `lib/modules/preprocessing/**`, `lib/modules/ai-analysis/**`, `lib/modules/safety-risk-engine/**` 改用 `@/lib/embeddings`
- Landing × Gallery：
  - 把 `fetchGalleryDataForSections` 從 `lib/modules/landing/io.ts` 移出到 `lib/use-cases/landing/gallery-data.ts`
  - Cache wrapper 置於 `lib/use-cases/landing/cached.ts`
  - `app/[locale]/page.tsx` 改 import 來源（不要讓 landing module import gallery module）
- Comments submit（Spam → Safety）：
  - 新增 `lib/use-cases/comments/create-comment.ts`（`createCommentWithSafety()`）
  - `app/api/comments/route.ts` 改呼叫 use-case
  - `lib/modules/comment/comments-write-io.ts` 移除 safety imports，只保留 comment insert + moderation write（`insertCommentWithModeration()`）
- Break cycle（embedding <-> preprocessing）：
  - `EnrichmentContext` 移到 `lib/types/embedding.ts`
  - `lib/modules/preprocessing/types.ts` 改為 re-export + 使用新型別
  - `lib/modules/embedding/embedding-io.ts` 移除對 `lib/modules/preprocessing/judge-io.ts` 的 re-export（避免反向依賴）
- Import/Export cross-domain IO：
  - `lib/modules/import-export/export-blog-io.ts` / `export-gallery-io.ts` 直接 query `posts/categories/gallery_*`（不要 import blog/gallery modules）
  - 修正 schema table 名稱錯誤（例：`blog_posts` → `posts`）

4) **加 guardrail test（避免文件宣稱 enforced 但現況沒擋）**

- Update: `tests/architecture-boundaries.test.ts`
- Add test: `lib/modules/* do not cross-import other lib/modules/* domains`

5) **驗證（不可省略）**

- `npm test`
- `npm run type-check`
- `npm run lint`

6) **Docs sync（避免 drift）**

- Update: `ARCHITECTURE.md`（附錄 A tree + 依賴規則 + guardrails）
- Update: `doc/SPEC.md`（實作 entrypoints、routes、module inventory）
- 若新增/修復 drift：把最小 evidence + paths 更新到 `uiux_refactor.md` §4

---

### 5.2 Supabase drift — schema duplication / RLS overexposure（Correctness + Security）

#### Goal

- Fresh install 不會因 `IF NOT EXISTS` + 重複 schema block 造成「先跑舊版、後面新欄位被跳過」
- 公開角色（`anon`）不得擁有可濫用的寫入權限（尤其是 reactions / likes）

#### Step-by-step

1) **找出重複 schema blocks**

- Command: `rg -n \"^CREATE TABLE\" supabase/COMBINED_ADD.sql`
- 特別檢查是否有同一張表（例如 `public.embeddings` / `public.embedding_queue`）被定義兩次

2) **確保 canonical 定義唯一**

- 若存在重複 block：保留 canonical 定義，將舊 block 明確停用（以 `/* ... */` 包住並加註解原因）
- 對照來源：`supabase/02_add/*.sql`（單表增量檔應為 SSoT）

3) **審核 RLS policies（尤其是寫入）**

- Command: `rg -n \"CREATE POLICY|ALTER TABLE .* ENABLE ROW LEVEL SECURITY\" supabase/02_add supabase/COMBINED_ADD.sql`
- 檢查：
  - `anon` 是否被授權 `INSERT/UPDATE/DELETE`
  - `USING (true)` / `WITH CHECK (true)` 是否讓任何 authenticated/anon 可任意刪改

4) **以「寫入走 server/service_role」收斂**

- Public route 僅允許讀（或有限條件寫入）
- 對於 likes/reactions：通常只允許 `SELECT`（其餘由 server actions / API route + service_role 代理）

5) **同步 grants / combined scripts**

- 若 `02_add/*.sql` 有改動：同步 `COMBINED_ADD.sql` + `COMBINED_GRANTS.sql`
- 最終以 `COMBINED_*` 能 fresh install 為準（runbook 見 `doc/RUNBOOK.md`）
