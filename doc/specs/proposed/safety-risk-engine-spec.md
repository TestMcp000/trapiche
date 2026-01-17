# AI Safety Risk Engine — Spec

> Status: DRAFT  
> Last Updated: 2026-01-17  
> Scope: comment UGC safety risk engine (V1: text only)

See also:

- Constraints: [`ARCHITECTURE.md`](../../../ARCHITECTURE.md)
- Implemented behavior (SSoT): [`doc/SPEC.md`](../../SPEC.md)
- Comments baseline: [`doc/SPEC.md#comments`](../../SPEC.md#comments)
- Reusable platform specs:
  - [`embeddings-semantic-search-spec.md`](../completed/embeddings-semantic-search-spec.md)
  - [`data-preprocessing-pipeline-spec.md`](../completed/data-preprocessing-pipeline-spec.md)

---

## 0. V1 決策（已選定 / 可直接開發）

你已選定以下方案（對應先前選項編號）：

- **(1A) Safety corpus 資料模型**：新建 `public.safety_corpus_items`（slang/case/draft→active→deprecated），作為 RAG corpus SSOT
- **(2A) Embeddings target types 擴充**：擴充 embeddings 的 `target_type`（新增 `safety_slang` / `safety_case`）並覆用既有 pgvector/RPC/queue
- **(3B) Safety 審核資料落點**：新建 `public.comment_safety_assessments`（保存歷史/可稽核），並在 `comment_moderation` 存放「latest pointer / 快速查詢欄位」
- **(4B) 流程順序（優先省 LLM 成本）**：Spam **local gate** → Spam external（Akismet / reCAPTCHA）→ Safety（只在 external 通過且候選公開時跑 RAG/LLM；**外部服務全部不可用**才 `pending`；但 **reCAPTCHA 啟用且 token 缺失 → 一律 `pending`**）
- **(5B) Safety settings SSOT**：新建 `public.safety_settings`（singleton）存 threshold/model/timeout/feature toggle + user-facing messages
- **(6A) Gemini 推論入口**：第三層推論改用 Gemini（Native JSON Mode：`responseMimeType` + `responseSchema`），Gemini API access 限定在 server-only `lib/infrastructure/gemini/**`；domain 只做 prompt/parse

---

## 1. 功能意圖與目標 (Functional Intent & Goals)

本安全系統的主要意圖是為用戶生成內容（UGC）提供一個**主動式、可演進的防禦機制**，專門針對高風險內容（特別是自我傷害與自殺意念）進行攔截，同時將對一般情感表達的干擾降至最低。

### 核心目標

1. **即時攔截 (Immediate Interception)**：即時阻止高風險內容公開發布。
2. **語境感知 (Contextual Awareness)**：區分日常誇飾用語（如：「笑死」）與真實的痛苦表達（如：「想永遠睡著」）。
3. **持續進化 (Continuous Evolution)**：系統必須能從新出現的黑話與諮商師回饋中學習，且優先透過資料更新完成閉環（不依賴頻繁程式碼部署）。

### 核心策略（Implementation Principles）

1. **Zero Regex Parsing**：第三層採用 Gemini Native JSON Mode（`responseMimeType` + `responseSchema`），以 constrained decoding 確保輸出結構穩定。
2. **雙軌進化 (Dual-Loop Evolution)**：
   - **快軌 (Fast Loop)**：更新 Safety corpus（RAG）即時修正新黑話/隱喻。
   - **慢軌 (Slow Loop)**：Fine-tuning / Prompt / Threshold 低頻迭代（見 §4.3）。
3. **Prompt Alignment**：在 prompt 內顯式列出 `risk_level` enum，避免 constrained decoding 下的輸出空間不對齊。

---

## 2. 系統邊界與範圍 (System Boundaries & Scope)

定義系統的 **IS / IS NOT**，以管理技術與預期落差。

### 納入範圍 (In Scope)

- **自殺與自傷偵測**：優先處理意圖傷害自己的內容。
- **極端暴力**：針對他人的明確威脅。
- **求救訊號 (Cry for Help)**：暗示深度痛苦的模糊語句（透過 RAG 上下文輔助判斷）。
- **純文字內容**：V1 僅限於 Blog / Gallery 的文字留言。

### 排除範圍 (由其他模組處理)

- **一般惡意攻擊/辱罵**：「你是白痴」等（由 spam / abuse 模組處理）。
- **垃圾廣告**：(由 Akismet / Honeypot / reCAPTCHA + 既有 spam pipeline 處理)。
- **醫療診斷**：系統僅識別風險指標，不做疾病診斷。
- **圖片分析**：Gallery 圖片內容不在 V1 分析範圍內。

### 技術/架構約束 (本 repo 必須遵守)

- **延遲預算 (Latency Budget)**：留言提交的同步決策必須在 **2000ms** 內完成；Safety Layer 2/3 與 LLM call 必須有嚴格 timeout；Safety 任一外部依賴錯誤/超時 → **Fail Closed → HELD**（不公開、轉人工）。
- **隱私權 (PII)**：任何送往外部 AI（包含 embeddings 與 LLM）之內容，必須在呼叫外部 API _之前_ 完成去識別化（避免 PII 外洩）。
- **Client bundle 零侵入**：所有 Safety/AI 相關程式碼必須 server-only（不得進入 client bundle；public UI 不得 import admin/AI deps）。
- **AI SDK/通道限制**（參考 `ARCHITECTURE.md`）：
  - Gemini SDK / API 只允許在 server-only `lib/infrastructure/gemini/**`
  - OpenRouter API 只允許在 server-only `lib/infrastructure/openrouter/**`
  - OpenAI SDK 只允許在 `supabase/functions/**`（本功能 V1 不新增新的 OpenAI Edge Function）

---

## 3. 架構：三層防禦網 (The 3-Layer Defense)

系統採用「瑞士起司模型 (Swiss Cheese Model)」，每一層負責過濾特定類型的風險訊號。

```mermaid
graph TD
    C[留言內容] --> L1{Layer 1: 關鍵字/規則}
    L1 -->|命中| H1[HELD]
    L1 -->|未命中| L2[Layer 2: RAG (Safety corpus)]
    L2 --> L3[Layer 3: Gemini Native JSON]
    L3 --> D1{risk_level}
    D1 -->|High_Risk| H2[HELD]
    D1 -->|Uncertain| H2
    D1 -->|Safe| D2{confidence >= threshold?}
    D2 -->|yes| A1[APPROVED]
    D2 -->|no| H3[HELD]
```

#### V1 Decision Rules（單一真相來源）

- `risk_level` = `High_Risk` / `Uncertain` → **永遠 `HELD`**
- `risk_level` = `Safe` 且 `confidence >= safety_settings.risk_threshold` → `APPROVED`
- 其餘（含 `confidence < threshold`、任一外部依賴 error/timeout/parse fail）→ `HELD`（Fail Closed）

### 3.0 在本 repo 的落點（乾淨分離、方便迭代、避免拖慢載入）

V1 以「pure engine + IO orchestration」模式落地（沿用既有 spam pipeline 的結構）。

- **API route 保持薄**：`app/api/comments/route.ts` 只做 parse/validate → 呼叫 `lib/*` → return response。
- **Comment write IO orchestrate**：安全引擎的同步判斷在 `createComment()` 內執行，避免散落在 route。
- **Safety Risk Engine 模組形狀（建議）**
  - Pure（無 IO、可單測）：
    - `lib/modules/safety-risk-engine/engine.ts`（layer 1/decision rules）
    - `lib/modules/safety-risk-engine/pii.ts`（去識別化：email/phone/地址/姓名等）
    - `lib/modules/safety-risk-engine/prompt.ts`（prompt 組裝/輸出 JSON 合約）
  - IO（server-only、可觀測）：
    - `lib/modules/safety-risk-engine/rag-io.ts`（RAG 檢索：semantic search + optional rerank）
    - `lib/modules/safety-risk-engine/llm-io.ts`（第三層推論：只呼叫 `lib/infrastructure/gemini/**` 的通用 runner）
    - `lib/modules/safety-risk-engine/admin-io.ts`（回饋寫入：新增黑話/標註結果）

此設計確保：不新增 client-side 依賴、不影響 public SSR/LCP；僅在「留言提交」的互動路徑消耗延遲預算。

### 第一層：決定性過濾（關鍵字/規則）

- **機制**：Aho-Corasick 或 RegExp 匹配 Safety Blocklist（獨立於 spam blacklist）。
- **目標**：明確、無歧義、可直接判定的高風險內容（例如具體方法、武器名稱 + 自傷意圖搭配）。
- **動作（V1）**：一律 `HELD`（不做 `REJECTED`；保留稽核/人工介入空間）。
- **成本**：~0ms（純計算）。

### 第二層：語意檢索（RAG）

#### 覆用決策（Embedding / Vector DB）

- **覆用既有 `public.embeddings` + semantic search RPC**（不另開 `safety_embeddings` 表）。
- Safety 語料以 **新增 `target_type`** 方式區分（例：`safety_slang` / `safety_case`），避免重複打造 RPC/queue/監控/權限。

#### Safety corpus SSOT（1A）

- 來源資料由 `public.safety_corpus_items` 管理（後台維護、可審核）。
- 當 corpus item 進入 `active` 狀態時，觸發 embeddings 建立（覆用既有 pipeline）。
- RAG 檢索時，只搜尋 targetTypes：`['safety_slang', 'safety_case']`（避免污染既有內容搜尋）。

#### 機制

- **粗檢索（coarse）**：沿用既有 semantic search（pgvector cosine similarity）。
- **可選精排（fine）**：沿用既有 rerank 模組（若已啟用）。

#### 內容來源（Safety Corpus）

- **黑話字典 (Slang Dictionary)**：已知自傷黑話與隱喻（可由諮商師快速新增）。
- **歷史案例 (Past Cases)**：去識別化後、經人工確認為高風險的案例片段（避免把一般情緒抒發誤當高風險）。

#### 重要約束：RAG query 也必須去識別化

第二層檢索會先對 query 生成 embedding（外部 API），因此 **用戶留言必須先經過去識別化** 再送去做 query embedding，以符合本 repo 的 AI/PII 約束。

### 第三層：推論（LLM）— V1 選擇 Gemini Native JSON（Server-only）

#### 架構選擇結論

V1 第三層推論 **直接使用 Gemini 模型作為推論入口**（Next.js server-only），並啟用 **Native JSON Mode + responseSchema** 取得穩定、可驗證的結構化輸出（避免 parsing/誤判；Zero Regex parsing）。

#### 理由（穩定輸出 + 更低誤差面）

- **Constrained Decoding**：用 `responseMimeType: "application/json"` + `responseSchema` 強制輸出結構，降低 parsing failure 與後處理成本。
- **Prompt Alignment**：在 prompt 內顯式列出 `risk_level` enum 選項，對齊 constrained decoding 的輸出空間，降低機率扭曲。
- **單一 runtime**：LLM、去識別化、timeout 策略跟著主站版本化，避免 drift。
- **可熱切換 model_id**：`safety_settings.model_id` 可填 `gemini-1.5-flash` 或 `tunedModels/*`（慢軌迭代）。

#### 目標/輸入/輸出

- **目標**：判讀語氣、意圖、上下文細節，避免僅靠關鍵字誤判。
- **輸入**：去識別化後的用戶留言 + RAG Top-K（建議 3）上下文。
- **輸出**：結構化 JSON：`risk_level`（`Safe`/`High_Risk`/`Uncertain`）、`confidence`、`reason`。

#### Fail Closed（超時與不可用）

- **LLM call 必須設定嚴格 timeout**（建議：1200–1500ms 內；可配置）。
- Gemini API 錯誤/超時、或 schema validation 失敗 → 整體決策 **預設 `HELD`**（交由人工審核）。

---

## 4. 生命週期與工作流 (Lifecycle & Workflows)

### 階段一：冷啟動（Initialization）

> 目標：先讓系統「可用且保守」，再逐步降低誤報。

1. **Safety corpus 播種**
   - 人工整理 `initial_slang`（黑話/隱喻）與少量已去識別化案例。
   - 透過既有 embeddings pipeline 建立向量（見 §3 第二層）。
2. **Blocklist 播種**
   - 建立初始高置信度關鍵字/規則（只放「不太可能誤報」的片段）。
3. **Prompt baseline**
   - 使用固定 JSON 合約的 prompt（見 §5.1），先追求穩定輸出與低延遲。

### 階段二：運作期（Runtime Decision Flow）

觸發點：`POST /api/comments`（整合於 `createComment()`；route 不放決策邏輯）

### 4.2.0 Moderation pipeline（4B：Spam local gate → Spam external → Safety）

本段是 V1 最重要的「順序定義」，用來清楚回答：

- **Akismet / reCAPTCHA 什麼時候會被呼叫？**
- **外部服務失效時怎麼辦？（全部不可用才 pending + retry）**
- **reCAPTCHA token 缺失怎麼辦？（一律 pending，防繞過）**
- **Safety 什麼時候會被同步跑？**

#### 定義：Spam local gate（不呼叫 Akismet / reCAPTCHA）

Spam local gate 指「不打任何外部服務」的部分（但可以包含 DB I/O，如 settings/blacklist/rate-limit）：

- rate limit / honeypot
- sanitize content（產出 `sanitized.content` + linkCount）
- blacklist / 重複內容 / 連結過多等本地規則
- moderation mode（auto/all/first_time）
- reCAPTCHA bypass guard：若 `enableRecaptcha=true` 但缺 `recaptchaToken` → **一律 `pending`**（防繞過；不呼叫外部服務，也不跑 Safety Layer 2/3）

Spam local gate 的輸出是 `candidateToPublish`：

- `candidateToPublish = true`：本來會立即公開（等同 `is_approved=true`）
- `candidateToPublish = false`：本來就不會公開（pending/spam/reject/rate_limited）

#### 定義：Spam external checks（Akismet / reCAPTCHA verify）

Spam external checks 指「會打外部服務」的 spam 檢查（但仍屬於 spam pipeline，而非 Safety Risk Engine）：

- Akismet
- reCAPTCHA verify

執行條件：

1. `candidateToPublish=true`（本地檢查後仍有機會立即公開）
2. 依據 comment settings 啟用狀態

> 目標：先用相對便宜的外部 spam 服務過濾，避免把 LLM 成本花在明顯垃圾留言。

#### 外部服務失效 → **全部不可用**才 `pending`（並重試）

當「已啟用的外部檢查」無法在 latency budget 內得到**可用結果**（含 timeout / network error / misconfigured），處理規則如下：

- **僅部分失效（degraded）**：只要「至少一個外部檢查結果可用」，就不因失效而直接 `pending`，而是：
  - 以可用結果做 spam decision（其他失效的檢查僅記錄）
  - 繼續進入 Safety（Layer 1 → Layer 2/3）
  - 寫入 `comment_moderation`：記錄哪個外部檢查失效（供後台可觀測）
- **全部失效（none usable）**：當「已啟用的外部檢查**全部**不可用」時，本次請求直接：
  - 決策：`pending`（不公開）
  - 不執行 Safety Layer 2/3（避免把 AI 成本花在本來就不會公開的留言）
  - 寫入 `comment_moderation`：記錄失效原因與 retry 狀態（供後台與重試 job 使用）

重試策略（建議）：

- Akismet：可在背景 job 以 backoff 重試（例如 5m/30m/2h；最多 3 次），成功後才進入 Safety 同步/或轉為可自動核准的狀態
- reCAPTCHA：token 具**短效/單次**特性，無法做「隔很久再驗」的可靠重試；建議只在請求內做少量快速重試（例如 2 次），否則維持 `pending` 交由管理員處理
- 若達重試上限仍失效：停止自動重試，維持 `pending`，由管理員手動審核處理

#### Safety 同步執行條件（在 external 通過後）

- Safety Layer 1（關鍵字/規則）**永遠同步執行**（純計算；不打外部）。
- Safety Layer 2/3（RAG/LLM）**只在 `candidateToPublish=true` 且 spam external checks 有可用結果（passed/degraded）、且 safety feature enabled 時同步執行**（把 AI 成本集中在「真的有機會公開」的留言）。

#### Akismet / reCAPTCHA 呼叫條件（清楚定義）

只有當以下條件都成立時，才會呼叫外部服務（且呼叫順序在 Safety 之前）：

1. `candidateToPublish=true`
2. 對應功能已啟用（comment settings）

在上述前提下：

- **Akismet**：`comment_settings.enableAkismet=true` 才呼叫（若 enabled 但未配置/不可用 → 標記為 unavailable；僅在 external checks 全部不可用時才 `pending`）
- **reCAPTCHA verify**：`comment_settings.enableRecaptcha=true` 且
  - `RECAPTCHA_SECRET_KEY` 存在
  - 前端提供 `recaptchaToken`
  - （建議）verify timeout 以短超時處理；timeout/network/misconfigured 視為 unavailable（僅在 external checks 全部不可用時才 `pending`；score 低則仍 `pending`）

若 enableRecaptcha=true 但 token 缺失：為防繞過，本次請求直接 `pending`（此行為在 Spam local gate 內決定）。
若 enableRecaptcha=true 但 secret 缺失：不呼叫 Google（reCAPTCHA 視為 unavailable），仍可依 Akismet（若可用）與本地規則做決策；只有當 external checks 全部不可用時才導向 `pending`。

#### 決策與落庫語意（對應現有 comments 模型）

- `REJECTED`：不落庫（回 400）。（Safety Risk Engine V1 不使用 `REJECTED`；保留給 spam pipeline 或未來 policy）
- `PENDING`：落庫但不可公開（`is_approved=false`；通常用於 external checks 全部不可用或 reCAPTCHA token 缺失，等待重試/人工處理）
- `HELD`：落庫但不可公開（`is_approved=false`，進 safety queue；訊息可由 safety settings 控制）
- `APPROVED`：代表 spam external checks 已通過且 Safety 同步評估通過，落庫為可公開狀態（`is_approved=true`）

```mermaid
graph TD
    A[用戶留言] --> S1[Spam local gate<br/>(no Akismet/recaptcha)]
    S1 -->|candidateToPublish=false| P1[落庫: pending/spam<br/>（既有 Comments 審核）]
    S1 -->|candidateToPublish=true| E1[Spam external checks<br/>(Akismet/recaptcha)]
    E1 -->|all unavailable| P2[落庫: pending<br/>（external 失效 + retry）]
    E1 -->|spam/pending/reject| P1
    E1 -->|passed / degraded| K1[Safety Layer 1: 關鍵字/規則]
    K1 -->|命中| H1[決策: HELD]
    K1 -->|未命中| D1[去識別化 (PII)]
    D1 --> R2[Safety Layer 2: RAG (Safety corpus)]
    R2 --> L3[Safety Layer 3: LLM (Gemini + timeout)]
    L3 -->|timeout/error/parse fail| H2[落庫: HELD<br/>（safety settings）]
    L3 --> D2{risk_level}
    D2 -->|High_Risk / Uncertain| H2
    D2 -->|Safe| D3{confidence >= threshold?}
    D3 -->|no| H2
    D3 -->|yes| F1[落庫: approved]
```

### 階段三：進化期（Feedback Loops）

#### A. 快軌更新（RAG Update）— 即時修正（主要迭代手段）

- **觸發**
  - 諮商師標記 `True Positive / False Positive`（或框選新黑話）。
- **動作**
  - 將新片語/案例去識別化 → 寫入 Safety corpus → 觸發 embeddings 建立（覆用既有 pipeline）。
- **目標延遲**
  - < 1 分鐘（可允許 queue/worker；必要時可提供「立即生成」按鈕直接呼叫 embedding Edge Function）。

#### B. 慢軌更新（Fine-tuning / Prompt Tuning）— 低頻迭代

慢軌提供兩種手段（低頻、但能顯著改善語氣/語境判讀）：

1. **Prompt / Threshold**：版本化 prompt + 調整 `safety_settings.risk_threshold`（可熱更新）。
2. **Fine-tuning（Google AI Studio）**：V1 即納入（可執行/可產出資料）；透過「訓練表」沉澱高品質樣本，再匯出到 AI Studio 微調取得 `tunedModels/*`，最後更新 `safety_settings.model_id`。

#### B1. 雙表架構（Operational Log → Training Dataset）

Slow loop 採用 ETL（Extract / Transform / Load）流程：

- **Step 1: 來源表（Operational）**：`public.comment_safety_assessments`
  - 用途：記錄每次 safety 判斷的稽核資料（「發生過什麼」）。
  - 新增欄位：`human_reviewed_status`（`pending|verified_safe|verified_risk|corrected`；預設 `pending`）。
- **Step 2: 篩選與清洗（Transform）**
  - 只選 `human_reviewed_status != 'pending'` 的資料。
  - 去重：同一筆來源（或同一段 input）不重複進訓練集（見 §9.6 unique/index 建議）。
  - 格式化：組合成 fine-tuning 需要的 `input_messages`（messages array，JSONB）/ `output_json`（JSONB）。匯出給 Gemini 時可在 script 端將 messages render 成單一字串。
- **Step 3: 訓練表（Training）**：`public.safety_training_datasets`
  - 用途：存放「可直接拿去訓練」的高品質樣本（與線上稽核資料解耦）。

補充（V1 規則）：

- Promote API 必須收到 **諮商師修正後** 的 `output_json`（不得缺 reason；若前端未傳，後端應直接拒絕晉升）
- `dataset_batch` 不手填：由 `safety_settings.training_active_batch`（Active Batch）自動帶入，避免資料歸檔混亂

#### B2. SOP（訓練 Model_v2）

1. 後台審核：將 `comment_safety_assessments.human_reviewed_status` 設為 `verified_safe / verified_risk / corrected`（並由 promote 動作產出訓練樣本）。
2. 產生訓練資料：從 `safety_training_datasets` 依 `dataset_batch` 撈出樣本匯出（建議平衡 safe/risk）；`dataset_batch` 來源為 `safety_settings.training_active_batch`（Active Batch）。
3. 上傳 Google AI Studio 進行 fine-tuning。
4. 取得 Model ID（例：`tunedModels/gemini-safety-v2`）。
5. 更新 `safety_settings.model_id` 使其生效（不需重新部署）。

---

## 5. 資料合約 (Data Contracts)

### 5.1 LLM Prompt（Gemini Native JSON）結構範例

Gemini call 必須設定：

- `responseMimeType: "application/json"`
- `responseSchema: SafetySchema`（Constrained Decoding）

#### JSON Schema（Strict Output）

```typescript
const SafetySchema = {
  type: SchemaType.OBJECT,
  properties: {
    risk_level: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["Safe", "High_Risk", "Uncertain"],
    },
    reason: { type: SchemaType.STRING },
    confidence: { type: SchemaType.NUMBER },
  },
  required: ["risk_level", "reason", "confidence"],
};
```

> `SchemaType` 來自 Gemini SDK（例如 `@google/generative-ai`）；若改用 REST 直接呼叫 Gemini API，請使用等價的 JSON schema 物件。

#### Prompt Engineering（Alignment）

**關鍵規範**：prompt 文字中必須顯式列出 schema enum 選項，確保 constrained decoding 的輸出空間對齊。

```text
你是一個危機預防助手。請參考以下 [已知案例] 來判斷 [用戶留言] 的風險。

[已知案例 / RAG Context]
... (由 Layer 2 插入) ...

[用戶留言]
${user_input}

[指令]
請評估風險等級。
你必須嚴格從以下三個選項中選擇一個作為 risk_level：
1. "Safe" (安全/無害/玩笑)
2. "High_Risk" (有自傷意圖/求救訊號)
3. "Uncertain" (無法判斷/語意模糊)

請以 JSON 格式回答。
```

### 5.2 風險評估物件（建議存於 DB）

> V1 選擇 3B：`comment_safety_assessments` 保存歷史（可稽核/可回放），`comment_moderation` 只存 latest pointer / 快速查詢欄位（避免 admin list 查詢成本過高）。

```ts
interface CommentSafetyAssessment {
  id: string;
  comment_id: string;
  created_at: string; // ISO 8601
  decision: "APPROVED" | "HELD" | "REJECTED";

  // Layer 1
  layer1_hit: string | null;

  // Layer 2
  layer2_context: Array<{
    text: string;
    label: string;
    score: number; // similarity / rerank score
  }>;

  // Layer 3 (LLM)
  provider: "gemini";
  model_id: string; // e.g. "gemini-1.5-flash" | "tunedModels/*"
  ai_risk_level: "High_Risk" | "Uncertain" | "Safe";
  confidence: number; // 0.0-1.0
  ai_reason: string;
  latency_ms?: number;

  // Feedback loop
  human_label?:
    | "True_Positive"
    | "False_Positive"
    | "True_Negative"
    | "False_Negative";
  human_reviewed_status?: "pending" | "verified_safe" | "verified_risk" | "corrected";
  reviewed_by?: string;
  reviewed_at?: string; // ISO 8601
}
```

---

## 6. 故障模式與降級策略 (Failure Modes & Fallbacks)

| 情境                                         | 行為                                                      | 用戶體驗                   |
| -------------------------------------------- | --------------------------------------------------------- | -------------------------- |
| Vector DB/RPC 不可用                         | 跳過第二層，直接進第三層；若仍不確定 → `HELD`             | 正常，準確度略降           |
| Embedding API 不可用（query embedding 失敗） | 視同第二層不可用；繼續第三層                              | 正常，準確度略降           |
| Gemini API 超時/離線                         | **Fail Closed → `HELD`**                                  | 顯示「您的留言正在審核中」 |
| 外部依賴速率限制                             | 直接 `HELD`（或放入 queue 非同步補判；V1 先以 Held 為主） | 顯示「審核中」             |
| 結果模糊（低信心）                           | `HELD` 轉人工審核                                         | 顯示「等待審核中」         |

---

## 7. 覆用 / 不建議覆用清單（本 repo 現況）

| 能力                         | 建議                                  | 理由                                                                                                       | 對應模組                                                                   |
| ---------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Embeddings + semantic search | **覆用**                              | 已有 pgvector schema/RPC/queue/權限與守門；只需新增 `target_type`                                          | `lib/modules/embedding/**`, `supabase/**`                                  |
| Preprocessing pipeline       | **覆用**                              | 清洗/切片/品質閘門已可插拔；Safety 可加強 PII redactor                                                     | `lib/modules/preprocessing/**`                                             |
| RAG retrieval orchestration  | **覆用底層、不覆用 ai-analysis 實作** | `analysis-rag-io.ts` 是分析模板導向且目前 chunk content placeholder；Safety 需 query=留言、corpus=安全語料 | `lib/modules/embedding/**` + 新 `lib/modules/safety-risk-engine/rag-io.ts` |
| De-identification（PII）     | **建議抽共用 pure util**              | Safety/AI Analysis 都需要；避免 Node/Deno 重複實作                                                         | 可抽到 `lib/security/*`（pure）再被各 domain 依賴                          |

---

## 8. 後台 UI（人工審核 / 人工標註 / 語料維護）

### 8.0 佈局決策：合併在 Comments 下，但以子頁面獨立設計

建議 **不要塞進既有 `/admin/comments` 清單頁**（避免 UI 過度複雜、bundle 變大、互相影響操作動線），而是：

- **導航仍歸屬 Comments**（認知上「這是留言審核的一部分」）
- **實作為獨立子頁面**（只在需要時載入對應 client component）

對應到本 repo 的路由結構（建議）：

- `app/[locale]/admin/(blog)/comments/page.tsx`：既有留言審核（spam / pending / approved）
- `app/[locale]/admin/(blog)/comments/settings/page.tsx`：既有留言設定（honeypot/akismet/recaptcha/blacklist）
- `app/[locale]/admin/(blog)/comments/safety/page.tsx`：Safety queue（待人工審核/標註）
- `app/[locale]/admin/(blog)/comments/safety/[commentId]/page.tsx`：Safety detail（單筆詳情 + 標註 + 操作）
- `app/[locale]/admin/(blog)/comments/safety/corpus/page.tsx`：Safety corpus 維護（slang/cases）
- `app/[locale]/admin/(blog)/comments/safety/settings/page.tsx`：Safety engine 設定（threshold/model/timeout/feature toggle）

> 為了「不佔載入速度」：Safety 相關 client component 不應被既有 `CommentsClient.tsx` import；用獨立 route chunk 讓它只在進入 safety 子頁時才載入。

### 8.1 Safety Queue（審核/標註）核心功能

- **Queue filters**
  - `status`: `HELD`（Safety 引擎擋下）
  - `risk_level`: High_Risk / Uncertain / Safe（通常只列 High_Risk 或 Uncertain，或依 confidence 篩選）
  - `confidence` 範圍、日期範圍、targetType（post/gallery_item）
- **List row（最小可用資訊）**
  - 留言摘要、目標內容（post/gallery item）、時間、使用者顯示名
  - `risk_level` / `confidence` / `ai_reason`（截斷）
- **Detail view（可稽核 + 可操作）**
  - 原文（必要時顯示 thread context）
  - Layer 1 命中資訊（若有）
  - Layer 2 RAG Top-K（顯示去識別化片段 + score + label）
  - Layer 3 模型/耗時/輸出 JSON（含 reason）

### 8.2 人工操作（Review Actions）

- **Approve**：將留言從 `HELD` 放行（對應 comments 既有 approve 流程；保留 safety_assessment 供稽核）
- **Reject**：拒絕發布（依產品策略：可刪除留言或標記為不可公開；V1 可沿用 delete）
- **Label**（供進化期使用）
  - `True_Positive` / `False_Positive` / `True_Negative` / `False_Negative`
  - `reviewed_by`（諮商師/管理員識別；需符合 RLS）
- **Promote to Corpus**
  - 從留言中框選片語 → 加入 `safety_slang` corpus
  - 對該 corpus item 觸發 embedding（覆用既有 pipeline）

### 8.3 UI 與後端的邊界（避免把 AI/DB 邏輯塞進 UI）

- UI 只做：呈現 + 觸發 server actions（延用既有 admin comments 的模式）
- 所有 DB/外部 API：在 `lib/modules/safety-risk-engine/*-io.ts`（server-only）完成
- UI 端不得 import OpenRouter/OpenAI/Gemini SDK；不得在 client component 直接呼叫外部 AI

### 8.4 權限與資料安全

- Safety queue / corpus / settings：**Admin-only**（沿用 `comment_moderation` 的 admin-only RLS 原則）
- 公開 API (`/api/comments`) 不回傳任何 safety_assessment 細節（只回 public-safe fields）

---

## 9. DB Schema（Proposed, aligned with 1A/2A/3B/5B）

本段定義 V1 的 DB 變更（一次到位），以避免開發時反覆改 schema。

### 9.1 `public.safety_corpus_items`（1A：RAG corpus SSOT）

- 用途：管理 slang / cases（支援 draft→active→deprecated），並作為 embeddings 的內容來源
- `target_id`：使用 `id(uuid)` 作為 embeddings 的 target_id
- 核心欄位（最小）：`id`, `kind(slang|case)`, `status(draft|active|deprecated)`, `label`, `content`, `created_by`, `updated_by`, `created_at`, `updated_at`
- 寫入/審核建議：
  - editor/owner 可新增 draft
  - 僅 owner 可把 draft 升級為 active（避免 corpus 汙染）

### 9.2 `public.safety_settings`（5B：SSOT, singleton）

- 用途：集中管理 safety feature toggle、threshold、model、timeout、user-facing messages
- 建議為 singleton row（`id=1`），並提供預設值（避免 null 分支）
- 核心欄位（最小）：`is_enabled`, `model_id`, `timeout_ms`, `risk_threshold`, `training_active_batch`, `held_message`, `rejected_message`, `layer1_blocklist`

### 9.3 `public.comment_safety_assessments`（3B：歷史/稽核）

- 用途：保存每次 Safety 評估的完整輸出（layer details + model/latency），供審核、回饋、迭代
- 補充（V1 fine-tuning）：新增 `human_reviewed_status`（`pending|verified_safe|verified_risk|corrected`）作為 ETL 的來源篩選欄位（見 §4.3.B1 與 §9.6）
- 建議關聯：
  - `comment_id` → `public.comments.id`（ON DELETE CASCADE）
  - human label/ reviewer 欄位可直接存此表（或之後拆 review log）

### 9.4 `public.comment_moderation`（3B：latest pointer）

在 `comment_moderation` 增加最小欄位，讓 admin list/queue 可快速篩選：

- `safety_latest_assessment_id`（指向 `comment_safety_assessments.id`）
- `safety_latest_decision`（APPROVED/HELD/REJECTED）
- `safety_latest_risk_level`（High_Risk/Uncertain/Safe）
- `safety_latest_confidence`（0-1）

### 9.5 `public.embeddings`（2A：擴充 target_type check constraint）

既有 embeddings schema 有 `target_type IN ('post','gallery_item','comment')` 的 CHECK constraint；
為了存 safety corpus embeddings，需擴充為：

- `('post','gallery_item','comment','safety_slang','safety_case')`

同時需確保：

- `supabase/functions/generate-embedding` 的 `targetType` allowlist 同步擴充
- `lib/modules/embedding/embedding-target-content-io.ts` 能 fetch `safety_*` 的 raw content（來源：`safety_corpus_items`）
- `public.embedding_queue` 的 `target_type` CHECK constraint 也需同步擴充（否則無法 enqueue corpus embeddings）

### 9.6 `public.safety_training_datasets`（V1：Fine-tuning training set）

- 用途：存放「可直接拿去訓練」的高品質樣本（與線上稽核資料解耦）
- 核心欄位（建議）：
  - `input_messages`：訓練輸入（messages array, JSONB；system + user；user 內含去識別化留言 + RAG context）
  - `output_json`：諮商師修正後的目標 JSONB（`{risk_level, confidence, reason}`）
  - `source_log_id`：回鏈到 `comment_safety_assessments.id`（方便除錯/回溯）
  - `dataset_batch`：資料批次/版本（由 `safety_settings.training_active_batch` 提供；例：`2026-01_cold_start`, `2026-02_slang_update`）
- 去重建議：
  - `(source_log_id, dataset_batch)` unique（避免同一來源重複匯入同一批次）
  - 或新增 `input_hash`（sha256）並對 `(input_hash, dataset_batch)` unique（避免多筆來源生成相同 input）

---

## 10. 文件維護 (Maintenance)

### 10.1 與其他文件的關係

- 既有行為的單一事實來源（SSoT）：`doc/SPEC.md`
- 本文件：Safety Risk Engine 的設計、資料合約與 schema（供實作與稽核對齊）

### 10.2 升級到 completed（可選）

若要把本規格從 `proposed/` 升級到 `completed/`，建議流程：

1. 移動或複製到 `doc/specs/completed/safety-risk-engine-spec.md`
2. 更新 `doc/specs/README.md` 的索引列
3. 更新 `doc/SPEC.md` 中的 spec link（並確保本文件內的章節編號/標題維持穩定，避免破壞 in-code `@see`）
