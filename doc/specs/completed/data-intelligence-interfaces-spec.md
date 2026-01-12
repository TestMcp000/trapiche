# Data Intelligence — Module Interfaces Spec

> Status: Stable  
> Last Updated: 2026-01-03  
> Note: this is the canonical technical spec; design rationale lives in `DATA_INTELLIGENCE.md`.

Links:

- PRD / design rationale: `DATA_INTELLIGENCE.md`
- Import/Export spec: `import-export-spec.md`
- Embeddings spec: `embeddings-semantic-search-spec.md`

---

## 模組間介面契約

### Module A → Module B（匯出資料 → AI 分析）

| 項目     | 說明                                                                      |
| -------- | ------------------------------------------------------------------------- |
| 觸發方式 | Control Center UI 按鈕 → 呼叫 AI Analysis action                          |
| 傳遞資料 | `{ filters, dataTypes, records[] }`                                       |
| 詳細規格 | [ai-analysis-spec.md](ai-analysis-spec.md#templates-data-types) |

### Module A → Module C（匯入 → Embedding 生成）

| 項目     | 說明                                                                              |
| -------- | --------------------------------------------------------------------------------- |
| 觸發方式 | 匯入完成後寫入 `embedding_queue`，由 Cron Job 非同步處理                          |
| 處理頻率 | 每 1 小時輪詢 + 每日 03:00 UTC 全面掃描                                           |
| 前置條件 | `OPENAI_API_KEY` 環境變數存在                                                     |
| 詳細規格 | [SUPABASE_AI.md §4.3](embeddings-semantic-search-spec.md#43-批量匯入後的-embedding-生成策略)        |

### Module C → Module B（RAG 增強 AI 分析）

| 項目     | 說明                                                       |
| -------- | ---------------------------------------------------------- |
| 觸發方式 | AI 分析時選擇 RAG 模式                                     |
| 資料流   | 語意搜尋 → 相關記錄 → 組合 Prompt → 呼叫 LLM               |
| 詳細規格 | [SUPABASE_AI.md §3.3](embeddings-semantic-search-spec.md#33-rag檢索增強生成) |

---

### 介面定義（TypeScript）

以下為 Module 間傳遞的核心資料結構；SSoT types 已落地於：

- Module B（AI Analysis）：`lib/types/ai-analysis.ts`
- Module C（Embeddings/RAG）：`lib/types/embedding.ts`

```typescript
// ===== Module A → Module B =====

/** Control Center 傳遞給 AI Analysis 的請求 */
export interface AnalysisRequest {
  templateId:
    | "user_behavior"
    | "sales"
    | "rfm"
    | "content_recommendation"
    | "custom";
  /** Required when templateId = 'custom' */
  customTemplateId?: string; // UUID
  filters: DataFilters;
  dataTypes: DataType[];
  mode: "standard" | "rag"; // Phase 6+
  /** Model ID from OpenRouter (e.g., 'openai/gpt-4o-mini') */
  modelId: string;
  /** RAG configuration (required when mode = 'rag') */
  ragConfig?: { topK: number; threshold: number };
}

export interface DataFilters {
  productIds?: string[]; // UUID[]
  memberIds?: string[]; // UUID[]
  dateRange?: { from: string; to: string }; // ISO date strings
  includeSensitive?: boolean;
}

export type DataType = "products" | "orders" | "members" | "comments";

// ===== Module A → Module C =====

/** 匯入完成後觸發 Embedding 生成的請求 */
export interface EmbeddingQueueRequest {
  items: EmbeddingTargetItem[];
  priority: "normal" | "high";
}

/**
 * priority 使用場景：
 * - "high"：單筆編輯（Admin 編輯單一商品/文章/Gallery 後立即觸發）
 * - "normal"：批量操作（匯入 100 筆、批次初始化、Cron Job 重建）
 *
 * 處理優先順序：high 優先於 normal（Edge Function 每批先處理 high）
 */
export interface EmbeddingTargetItem {
  targetType: "product" | "post" | "gallery_item" | "comment";
  targetId: string; // UUID
}

// ===== Module C → Module B =====

/** RAG 檢索結果 */
export interface RagRetrievalResult {
  targetType: "product" | "post" | "gallery_item";
  targetId: string;
  similarity: number; // 0-1
  contentSnippet: string; // 用於組合 prompt 的摘要
}

// ===== 共用 =====

/** 匯出資料的統一信封格式 */
export interface ExportEnvelope<T> {
  exportedAt: string; // ISO timestamp
  type: string; // e.g. 'products', 'orders'
  filters?: DataFilters;
  includeSensitive?: boolean;
  data: T[];
}
```

---

### 模組呼叫規則

為確保架構邊界清晰，模組間的呼叫必須遵守以下規則：

| 呼叫方              | 被呼叫方 | 允許的呼叫方式                   | 禁止                                  |
| ------------------- | -------- | -------------------------------- | ------------------------------------- |
| Control Center (UI) | Module A | Server Action                           | 直接 import `lib/modules/import-export/*-io.ts` |
| Control Center (UI) | Module B | Server Action                           | 直接 import `lib/modules/ai-analysis/*-io.ts`   |
| Module A            | Module C | 內部呼叫 `lib/modules/embedding/*-io.ts` | -                                               |
| Module B            | Module C | 內部呼叫 `lib/modules/embedding/*-io.ts` | -                                               |
| Module A            | Module B | ❌ 不可直接呼叫                  | 必須由 UI 觸發                        |
| Module C            | Module A | ❌ 不可直接呼叫                  | -                                     |
| Module C            | Module B | ❌ 不可直接呼叫                  | 只提供資料，不主動呼叫                |

**原則**：

- UI 層透過 Server Actions 觸發各模組
- Module A/B 可呼叫 Module C（作為 utility）
- Module C 是被動的，只回應查詢，不主動觸發其他模組

---

### Cron Job 排程摘要

| Job 名稱 | 排程 | 模組 | 說明 |
|----------|------|------|------|
| `embedding-hourly` | 每小時 | C | 處理 `embedding_queue` 中的 pending 項目 |
| `embedding-daily-sweep` | 每日 03:00 UTC | C | 掃描漏網之魚，確保所有內容都有 embedding |
| `similar-items-daily` | 每日 04:00 UTC | C | 計算/更新 `similar_items` 表（UPSERT） |
| `quality-audit-weekly` | 每週日 05:00 UTC | C | 抽樣品質檢查（Phase 6+） |

> **成本說明**: 這些 Cron Job 主要是 DB 查詢與 OpenAI Embedding API 呼叫，成本極低：
> - Embedding API: ~$0.0001/1K tokens
> - Supabase Cron: 免費（Pro 方案已包含）
> - 每月估算: < $1 USD（假設 1000 筆內容）

---
