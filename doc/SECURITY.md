# Security Guidelines

> 安全策略、RLS 規則、認證流程、敏感資料處理
> Last Updated: 2026-01-19
> Status: Enforced

---

## 1. 認證與授權

### 1.1 Google OAuth 2.0

- 使用 Supabase Auth 整合 Google OAuth
- Admin 登入限制：僅白名單內的 Email 可進入後台
- 環境變數：`ADMIN_ALLOWED_EMAILS`

### 1.2 Admin Role 判斷

```typescript
// 判斷流程（優先順序）
1. JWT `app_metadata.role` === 'owner' || 'editor' // 正式環境（RBAC 單一真相）
2. site_admins 表包含該 email                       // 資料庫查詢
3. ADMIN_ALLOWED_EMAILS 包含該 email               // 環境變數 fallback（本機/過渡）
```

> **Note**: If a user enters the admin panel via environment variable but JWT role is empty, a warning banner will be displayed indicating that DB operations may be rejected by RLS.

---

## 2. Row Level Security (RLS)

### 2.1 核心原則

- **RLS 為最終安全邊界**：UI gate 只做 UX，真正的權限由 RLS 控制
- **所有 Supabase 表格都啟用 RLS**
- **Policy 名稱不可任意變更**：以利審計與追蹤

### 2.2 Supabase Client 選擇

| Client                   | 用途                               | RLS     |
| ------------------------ | ---------------------------------- | ------- |
| `lib/infrastructure/supabase/client.ts` | Client component 即時互動          | Enabled |
| `lib/infrastructure/supabase/server.ts` | Server component with user session | Enabled |
| `lib/infrastructure/supabase/anon.ts`   | Public cached reads                | Enabled |
| `lib/infrastructure/supabase/admin.ts`  | Webhooks/system ops (service role) | Bypass  |

### 2.3 Server-Only Tables

以下表格只允許 service role 存取，不開放 authenticated RLS policy：

- `comment_rate_limits` — 評論速率限制
- `spam_decision_log` — 垃圾郵件判斷記錄
- `comment_blacklist` — 評論黑名單
- `comment_moderation` — 評論審核資料（含 safety pointer fields）
- `comment_safety_assessments` — 安全評估歷史記錄（admin 可讀/標註）
- `safety_settings` — 安全引擎設定（singleton, admin-only）
- `safety_corpus_items` — 安全語料庫（slang/case，admin-only CRUD）

**存取方式**：必須使用 `createAdminClient()`

---

## 3. 敏感資料處理

### 3.1 Comments API 保護

此段規則屬於「全域安全不變條件」，請以 `../ARCHITECTURE.md` 的 Comments 章節為準：

- Canonical constraints: `../ARCHITECTURE.md` §3.12（Comments API Sensitive Data Protection）
- Implemented behavior (SSoT): `SPEC.md` → Comments section

### 3.2 Ownership 顯示規則

- Public API 不回傳 `userId`（避免可關聯識別）
- 若 UI 需要「是否本人」，回傳 `isMine` boolean（server 計算）

### 3.3 環境變數安全

| 變數            | 類型 | 說明                      |
| --------------- | ---- | ------------------------- |
| `NEXT_PUBLIC_*` | 公開 | 可在 client bundle 中使用 |
| 其他            | 私密 | 僅 server-side 可存取     |

**禁止**：

- 將 API secrets 放入 `NEXT_PUBLIC_*` 變數
- 在 `.env.local` 以外的地方存放 secrets
- 將 `.env.local` 提交到 Git

### 3.4 Service Role Key（極敏感）

- `SUPABASE_SERVICE_ROLE_KEY` 具備 **繞過 RLS** 的能力（等同資料庫最高權限），必須視為最高等級機密。
- 只允許存在於 server runtime（例如 Vercel Environment Variables / Supabase Edge Functions runtime），不可出現在 client bundle。
- 程式碼層面必須遵循 `ARCHITECTURE.md` 的 guardrails（`createAdminClient()` 只允許在 `lib/**/io.ts` 與 `lib/**/*-io.ts`，且需 `import 'server-only';`）。

### 3.5 Cron Secret（背景工作安全）

- `CRON_SECRET` 用來保護 `/api/cron/*` endpoints（避免被外部任意觸發造成成本/資料風險）。
- 必須用 `Authorization: Bearer <CRON_SECRET>`（或支援的自訂 header）驗證；缺失視為 misconfiguration。
- 任何可觸發 AI/Embedding 等昂貴操作的 endpoint 都必須驗證 secret（UI gate 只做 UX）。
- `WORKER_SECRET` 用來保護 `/api/worker/*` endpoints（由 cron dispatcher 內部呼叫；避免外部直接觸發重型工作）。
  - Header：`x-worker-secret: <WORKER_SECRET>` 或 `Authorization: Bearer <WORKER_SECRET>`
  - 建議與 `CRON_SECRET` 使用不同值（降低單點洩漏風險）。

### 3.6 AI / Embeddings（隱私 + SDK 邊界）

- **OpenRouter**（AI Analysis）：`OPENROUTER_API_KEY` 只能放在 server 環境變數，禁止進 client bundle。
- **OpenAI**（Embeddings / Judge）：`OPENAI_API_KEY` 存於 Supabase Edge Functions Secrets，僅 Edge Functions 可讀取。
- **Gemini**（Safety Risk Engine）：`GEMINI_API_KEY` 只能放在 Next.js server runtime 的環境變數（例如 Vercel env var），禁止進 client bundle。
- **送往 LLM 的資料必須去識別化**（避免 PII 外洩；具體約束與守門測試見 `ARCHITECTURE.md` 與 `tests/architecture-boundaries.test.ts`）。
- SDK 位置硬性約束：
  - Gemini SDK / API access：只允許在 `lib/infrastructure/gemini/**`（server-only）
  - OpenRouter API access：只允許在 `lib/infrastructure/openrouter/**`（server-only）
  - OpenAI SDK：只允許在 `supabase/functions/**`（Edge Functions；與 Next.js runtime 隔離）
- **Supabase Edge Functions（OpenAI cost hardening）必須 service_role-only**：
  - 目的：避免任何人用公開的 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 直接呼叫 `supabase/functions/*` 觸發 OpenAI cost，或透過 function 內部 service role 寫入污染資料。
  - 規則：
    - `supabase/functions/generate-embedding/*` 與 `supabase/functions/judge-preprocessing/*` 必須拒絕 `anon` / `authenticated` JWT。
    - Next.js server-only 呼叫端必須使用 `SUPABASE_SERVICE_ROLE_KEY`（例如 `createAdminClient().functions.invoke(...)`），不得以 anon key 直連 `/functions/v1/*`。
    - Supabase Edge Functions 請保持 JWT verification enabled（若關閉，role 判斷將失去意義）。

---

## 5. XSS 與輸入驗證

### 5.1 輸入清理

- 使用 `lib/security/sanitize.ts` 清理使用者輸入
- User-submitted Markdown 內容渲染前必須經過 sanitize

### 5.2 Validators

所有 API endpoint 使用 `lib/validators/*` 進行輸入驗證：

- `api-common.ts` — UUID、分頁驗證
- `comments.ts` — 評論 API 驗證
- `gallery-api.ts` — Gallery API 驗證
- `reactions.ts` — Reactions 驗證
- `page-views.ts` — Page view tracking 驗證

---

## 6. Rate Limiting

| 功能              | 限制                              |
| ----------------- | --------------------------------- |
| Reactions（按讚） | 有速率限制（防止濫用）            |
| Comments          | 使用 `comment_rate_limits` 表追蹤 |

---

## 7. Analytics Ingestion

### 7.1 Page View Tracking

Canonical spec: `specs/completed/page-views-analytics-spec.md`  
Security invariant: privacy-first（no PII; aggregated counters only）

### 7.2 AI Analysis Share Links

Canonical spec: `specs/completed/ai-analysis-spec.md#share-links`  
Rules: token must be unguessable + noindex + revocation/expiry enforced server-side (RPC), not UI.

---

## 8. 生產環境建議

1. **定期更新依賴**：`npm update` 並檢查安全漏洞
2. **啟用 Supabase 2FA**：Account → Settings → Security
3. **檢查 Auth Logs**：Authentication → Logs
4. **定期備份資料庫**：Settings → Database → Backup
5. **監控錯誤日誌**：整合 Sentry 或其他 APM

---

## 相關文件

- [ARCHITECTURE.md](../ARCHITECTURE.md) — 架構約束
- [SPEC.md](SPEC.md) — 功能規格
- [RUNBOOK.md](RUNBOOK.md) — Ops index (see [runbook/deployment.md](runbook/deployment.md), [runbook/database-ops.md](runbook/database-ops.md), [runbook/ai-analysis.md](runbook/ai-analysis.md))
