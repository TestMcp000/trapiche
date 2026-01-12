# AI Analysis (Enablement + Cron)

> Canonical entry: `../RUNBOOK.md`

[Back to RUNBOOK index](../RUNBOOK.md)


> Last Updated: 2026-01-02  
> Status: Active  
> Scope: AI Analysis (admin-only)

This section explains how to enable **AI Analysis** in production, including the AI provider (OpenRouter) and optional Scheduled Reports (cron).

> 中文重點：AI Analysis 要能跑起來，至少需要 `SUPABASE_SERVICE_ROLE_KEY` + `OPENROUTER_API_KEY`；要跑排程再補 `CRON_SECRET` 並設定兩個 cron endpoints。

---

### 0. Quick Checklist (Production)

- [ ] Production DB 已套用 AI Analysis schema（`ai_analysis_reports` / `ai_usage_monthly` / `ai_analysis_schedules`）
- [ ] 部署環境已設定 Supabase：`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- [ ] 部署環境已設定 OpenRouter：`OPENROUTER_API_KEY`（可選 `OPENROUTER_MODEL`）
- [ ] （要跑 Scheduled Reports）已設定 `CRON_SECRET` + 兩個 cron paths
- [ ] 已用本文的「Manual Verification」手動呼叫兩個 cron endpoints 測試

---

### 1. How It Works (Flow Overview)

AI Analysis 有兩種產出報告方式：

1. **Manual（Admin UI）**：在後台 `/{locale}/admin/ai-analysis` 建立/觸發 report，然後由後台操作觸發處理。
2. **Scheduled Reports（Cron）**：由 cron 定期呼叫兩個 endpoints 自動產生與處理報告。

Scheduled Reports 的流程如下：

```
Schedule due → /api/cron/ai-analysis-scheduler → create pending report rows
Pending rows → /api/cron/ai-analysis           → call OpenRouter → write results + usage
```

---

### 2. Prerequisites (Production DB + Supabase Secrets)

#### 2.1 Production DB Schema Is Applied

AI Analysis 需要以下 tables（在 production DB）：

- `public.ai_analysis_reports`
- `public.ai_usage_monthly`
- `public.ai_analysis_schedules`（只有你要用 Scheduled Reports 才需要）

Schema 來源：`supabase/02_add/12_ai_analysis.sql`  
DB 腳本/指令：請參考本文件的 **Database Operations**（上方）。

#### 2.2 Supabase Server-Side Credentials (Required)

這個功能的背景 worker 會用 **service role client** 寫入 Supabase（繞過 RLS），因此部署環境必須有：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

> [!IMPORTANT]
> `SUPABASE_SERVICE_ROLE_KEY` 必須是 **server-only**（絕不能出現在瀏覽器端環境變數 / 公開前端 bundle）。

---

### 3. AI Provider: OpenRouter (AI API Integration)

#### 3.1 OPENROUTER_API_KEY (Required)

OpenRouter 的 API key（用來呼叫 LLM 生成分析結果）。

1. 取得 key：[openrouter.ai](https://openrouter.ai/)
2. 設定到環境變數：
   - **Vercel**: Project Settings → Environment Variables
   - **Local**: `.env.local`

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
```

#### 3.2 OPENROUTER_MODEL (Optional)

若要全域固定模型，可設定：

- Default（未設定時）：`openai/gpt-4o-mini`
- UI 內選擇的 `modelId` 會優先於 `OPENROUTER_MODEL`（`OPENROUTER_MODEL` 只當 fallback）

```bash
OPENROUTER_MODEL=openai/gpt-4o-mini
```

#### 3.3 SITE_URL (Optional, Recommended)

用於對 OpenRouter 發送請求時的 `HTTP-Referer`（非必填，但建議在 production 設定成你的網域）。

> [!NOTE]
> 這裡的 `SITE_URL` 是 **server-only env var**，僅用於 OpenRouter request header；它不是 `NEXT_PUBLIC_SITE_URL`（後者是 SEO/metadata 的 canonical site URL single source）。

```bash
SITE_URL=https://your-domain.com
```

> [!NOTE]
> OpenRouter（本文件）≠ Supabase Edge Functions（Embeddings / Judge）。  
> Edge Functions 需要在 Supabase Dashboard 設定 `OPENAI_API_KEY` Secret，請看本文件的 **Database Operations**（上方）。

---

### 4. CRON_SECRET + Cron Endpoints (Scheduled Reports Only)

#### 4.1 CRON_SECRET

Scheduled Reports 需要用 `CRON_SECRET` 驗證 cron request：

```bash
CRON_SECRET=your-secure-random-string-here
```

產生方式（Node.js / Windows 也適用）：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

建議：

- 至少 16 字元（32+ 更好）
- dev/staging/prod 分開

#### 4.2 Endpoints (Both Required)

| Endpoint | Purpose | Auth |
| --- | --- | --- |
| `/api/cron/ai-analysis-scheduler` | Scheduler：找出到期 schedules，建立 pending reports | `Authorization: Bearer <CRON_SECRET>` |
| `/api/cron/ai-analysis` | Worker：處理 pending reports、呼叫 OpenRouter、寫回結果 | `Authorization: Bearer <CRON_SECRET>`（或 `x-cron-secret: <CRON_SECRET>`） |

> Scheduled Reports 必須兩個都跑：scheduler 只負責「產生 pending」，worker 才負責「真正跑 AI」。

---

### 5. Vercel Deployment (Recommended)

#### 5.1 Environment Variables (Vercel)

在 Vercel Project Settings → Environment Variables（Production）設定：

- Supabase（必填）：`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- OpenRouter（必填才能跑分析）：`OPENROUTER_API_KEY`
- Scheduled Reports（可選）：`CRON_SECRET`
- 可選：`OPENROUTER_MODEL`, `SITE_URL`

變更 env vars 後請 **Redeploy**，確保 Serverless Functions 讀到新值。

#### 5.2 Vercel Cron Configuration

只要你的 Vercel 專案有設定 `CRON_SECRET`，Vercel Cron 會在呼叫 cron endpoints 時自動帶上：

`Authorization: Bearer <CRON_SECRET>`

可透過 Dashboard 或 `vercel.json` 設定 cron jobs：

##### Option A: Vercel Dashboard

建立兩個 cron jobs（建議每 5 分鐘）：

- Path: `/api/cron/ai-analysis-scheduler`
- Path: `/api/cron/ai-analysis`

##### Option B: `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/ai-analysis-scheduler", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/ai-analysis", "schedule": "*/5 * * * *" }
  ]
}
```

> [!NOTE]
> Vercel Cron 通常需要付費方案（Pro/Enterprise）。若無法使用，請改用外部 scheduler 或後台手動觸發。

---

### 6. Non-Vercel Deployments (External Scheduler)

外部 scheduler 需要你自行加 `Authorization` header（scheduler endpoint **只接受** Authorization；worker 也支援 `x-cron-secret`，但建議統一用 Authorization）。

```bash
*/5 * * * * curl -X GET "https://your-domain.com/api/cron/ai-analysis-scheduler" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

*/5 * * * * curl -X GET "https://your-domain.com/api/cron/ai-analysis" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

### 7. Manual Verification (Smoke Test)

#### 7.1 Call Cron Endpoints (curl)

```bash
curl -i "https://your-domain.com/api/cron/ai-analysis-scheduler" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

curl -i "https://your-domain.com/api/cron/ai-analysis" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

常見回應：

- Scheduler：沒有到期 schedule 時會回 `processed: 0`
- Worker：沒有 pending report 時會回 `No pending reports`

如果 scheduler 一直是 `processed: 0`，請先在後台建立至少一個 enabled schedule（且 `next_run_at` 已到期），或先用 Admin UI 走一次手動 report 流程驗證 OpenRouter key 是否可用。

#### 7.2 PowerShell Examples

```powershell
$base = "https://your-domain.com"
$secret = "YOUR_CRON_SECRET"
$headers = @{ Authorization = "Bearer $secret" }

Invoke-RestMethod -Method Get -Uri "$base/api/cron/ai-analysis-scheduler" -Headers $headers
Invoke-RestMethod -Method Get -Uri "$base/api/cron/ai-analysis" -Headers $headers
```

#### 7.3 Verify DB State (SQL)

```sql
-- Latest reports
select status, created_at, completed_at, model_id, cost_usd, error_message
from public.ai_analysis_reports
order by created_at desc
limit 20;

-- Schedules (if enabled)
select name, is_enabled, schedule_cron, timezone, next_run_at, last_run_at, last_report_id
from public.ai_analysis_schedules
order by created_at desc
limit 20;

-- Monthly usage
select year_month, total_cost_usd, analysis_count, updated_at
from public.ai_usage_monthly
order by year_month desc
limit 12;
```

---

### 8. Troubleshooting

#### Reports Stay Pending

1. **Cron endpoints 沒有在跑**：確認兩個 cron jobs 都存在、且有被觸發（看 Vercel Functions logs）。
2. **CRON_SECRET 不一致**：外部 scheduler 確認 header 是 `Authorization: Bearer <CRON_SECRET>`；Vercel 確認 `CRON_SECRET` 有設定在正確的 Environment（Production/Preview）。
3. **沒有 schedule 到期**：scheduler 會回 `processed: 0`，代表 `next_run_at` 還沒到。
4. **worker 沒撿到 pending**：worker 回 `No pending reports`，代表 scheduler 沒有建立 pending rows。

#### API Key Issues (OpenRouter)

- `OPENROUTER_API_KEY` 未設定或錯誤
- OpenRouter 帳號額度不足
- report 內容會記錄 error（可從後台或 DB 查 `error_message`）

#### Supabase Admin Key Missing

若 Functions logs 出現缺少 Supabase env vars，請補齊：

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### 9. Security Notes

- `CRON_SECRET` / `OPENROUTER_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 都不應該 commit 到 repo
- 建議不同環境使用不同 secrets，並定期 rotate
- `SUPABASE_SERVICE_ROLE_KEY` 權限極高（繞過 RLS），請嚴格限制存取範圍

---
