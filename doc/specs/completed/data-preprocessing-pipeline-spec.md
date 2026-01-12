# Data Preprocessing Pipeline — Technical Spec

> Status: Stable  
> Last Updated: 2026-01-02  
> Note: this is the canonical technical spec; design rationale lives in `DATA_PREPROCESSING.md`.

Links:

- Implemented behavior (SSoT): `../../SPEC.md#preprocessing-admin-only`
- PRD / design rationale: `DATA_PREPROCESSING.md`

---

## 1. 架構概觀

### 1.1 Pipeline 位置（The Refinery Pipeline）

數據進入管線後，需按順序通過以下「過濾站」，最終才寫入 embeddings 表。

```
┌─────────────┐    ┌──────────────────────────────────────────────────────────────────┐    ┌─────────────┐
│   Raw Data   │ →  │                    Data Refinery Pipeline                        │ →  │  Embedder   │
│  (Module A)  │    │                                                                  │    │ (Module C)  │
└─────────────┘    │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐  │    └─────────────┘
                   │  │Sanitization│→ │ Semantic  │→ │Enrichment │→ │ Quality Gate │  │
                   │  │  Stage    │  │ Chunking  │  │   Stage   │  │    Stage     │  │
                   │  └───────────┘  └───────────┘  └───────────┘  └───────────────┘  │
                   └──────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
                   ┌──────────────────────────────────────────────────────────────────┐
                   │                    RAG Retrieval Pipeline                         │
                   │  ┌─────────┐  ┌─────────┐  ┌─────────┐                           │
                   │  │ Query   │→ │ Coarse  │→ │  Fine   │→  LLM                     │
                   │  │ Expand  │  │ Search  │  │ Re-rank │                           │
                   │  └─────────┘  └─────────┘  └─────────┘                           │
                   └──────────────────────────────────────────────────────────────────┘
```

### 1.2 設計原則

| 原則 | 說明 |
|------|------|
| **可插拔（Pluggable）** | 每個處理階段可獨立替換或擴充 |
| **可觀測（Observable）** | 每個階段產出 metadata，可追蹤處理結果 |
| **Pure First** | 清洗/切片邏輯為純函式，可單測 |
| **Fail-safe** | 單筆失敗不影響整批處理 |
| **非同步執行** | 避免阻塞主程式，降低延遲感 |

---

## 2. 雜質剝離（Sanitization Stage）

### 2.1 Cleaner Interface

```typescript
// lib/modules/preprocessing/types.ts

/** 清洗器介面 */
interface ContentCleaner {
  name: string;
  priority: number;  // 執行順序（數字越小越先）

  /** 是否適用於此內容類型 */
  shouldApply(targetType: EmbeddingTargetType): boolean;

  /** 執行清洗 */
  clean(input: string): CleanResult;
}

interface CleanResult {
  output: string;
  removed: RemovedContent[];  // 被移除的內容（供 debug）
  metadata: Record<string, unknown>;
}

interface RemovedContent {
  type: 'html' | 'markdown' | 'emoji' | 'url' | 'whitespace' | 'noise' | 'custom';
  original: string;
  position: { start: number; end: number };
}
```

### 2.2 三階段淨化流程

#### 2.2.1 HTML/Markdown 淨化

移除所有標籤，但**保留標題層級結構**（如 `# 標頭`）作為切片依據。

```typescript
// 範例輸入
const input = `
<div class="nav">Home | About | Contact</div>
<h1>手工皮革包</h1>
<p>採用<strong>頂級牛皮</strong>，經過傳統工藝處理。</p>
<footer>© 2025 Company</footer>
`;

// 範例輸出
const output = `
# 手工皮革包

採用頂級牛皮，經過傳統工藝處理。
`;
```

#### 2.2.2 視覺噪音過濾

自動識別並刪除網頁導航列、底部宣告、廣告字串等與主題無關的文字。

| 噪音類型 | 範例 | 處理方式 |
|----------|------|----------|
| 導航元素 | `Home | About | Contact` | 移除 |
| 頁尾宣告 | `© 2025 Company` | 移除 |
| UI 提示 | `點此閱讀更多`, `Loading...` | 移除 |
| 廣告標籤 | `[AD]`, `Sponsored` | 移除 |

```typescript
// lib/modules/preprocessing/cleaners/noise-filter.ts

const NOISE_PATTERNS = [
  /^(Home|About|Contact|Products|Services)(\s*\|\s*.*)+$/gm,  // 導航列
  /©\s*\d{4}.*$/gm,                                            // 版權宣告
  /點此閱讀更多|Read more|Loading\.\.\./gi,                    // UI 提示
  /\[AD\]|\[廣告\]|Sponsored/gi,                               // 廣告標籤
];
```

#### 2.2.3 標準化

統一全形/半形符號、修正亂碼、統一大小寫。

| 項目 | Before | After |
|------|--------|-------|
| 全形數字 | `１２３` | `123` |
| 全形標點 | `，。！` | `, . !` |
| 混合空白 | `hello　world` | `hello world` |
| 大小寫 | `HELLO World` | `hello world`（可配置） |

### 2.3 內建 Cleaners

| Cleaner | Priority | 適用類型 | 說明 |
|---------|----------|----------|------|
| `HtmlStripper` | 10 | All | 移除 HTML 標籤，保留文字內容與標題結構 |
| `NoiseFilter` | 15 | All | 移除導航、頁尾、廣告等視覺噪音 |
| `MarkdownStripper` | 20 | Post, Product | 移除 Markdown 語法（保留標題層級） |
| `UrlRemover` | 30 | All | 移除 URLs（可選：替換為 `[LINK]`） |
| `EmojiNormalizer` | 40 | Comment | 移除或轉換 emoji 為文字描述 |
| `UnicodeNormalizer` | 45 | All | 統一 Unicode 格式（NFC），處理全形/半形 |
| `WhitespaceNormalizer` | 50 | All | 壓縮連續空白、移除首尾空白 |
| `LanguageSeparator` | 60 | Product, Post | 標記中英文邊界（供 chunker 參考） |

### 2.4 清洗規則配置

```typescript
// lib/modules/preprocessing/config.ts

const DEFAULT_CLEANING_CONFIG: CleaningConfig = {
  product: {
    cleaners: ['HtmlStripper', 'NoiseFilter', 'MarkdownStripper', 'UnicodeNormalizer', 'WhitespaceNormalizer'],
    preserveUrls: false,
    preserveEmoji: false,
    preserveHeadingStructure: true,  // 保留標題結構供切片
  },
  post: {
    cleaners: ['HtmlStripper', 'NoiseFilter', 'MarkdownStripper', 'UnicodeNormalizer', 'WhitespaceNormalizer'],
    preserveUrls: false,
    preserveEmoji: false,
    preserveHeadingStructure: true,
  },
  gallery_item: {
    cleaners: ['HtmlStripper', 'NoiseFilter', 'UnicodeNormalizer', 'WhitespaceNormalizer'],
    preserveUrls: false,
    preserveEmoji: false,
    preserveHeadingStructure: false,
  },
  comment: {
    cleaners: ['HtmlStripper', 'UrlRemover', 'EmojiNormalizer', 'UnicodeNormalizer', 'WhitespaceNormalizer'],
    preserveUrls: false,
    preserveEmoji: true,  // 保留 emoji 語意
    preserveHeadingStructure: false,
  },
};
```

### 2.5 自訂 Cleaner 擴充點

```typescript
// 範例：自訂 PII Redactor
class PiiRedactor implements ContentCleaner {
  name = 'PiiRedactor';
  priority = 5;  // 最先執行

  shouldApply(targetType: EmbeddingTargetType): boolean {
    return targetType === 'comment';  // 僅留言需要
  }

  clean(input: string): CleanResult {
    // 移除 email, phone, 身分證等
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
    const phonePattern = /09\d{8}|\d{2,4}-\d{6,8}/g;

    let output = input;
    const removed: RemovedContent[] = [];

    // ... 實作移除邏輯

    return { output, removed, metadata: { piiFound: removed.length } };
  }
}
```

---

## 3. 語義切片（Semantic Chunking Stage）

### 3.1 為什麼需要語義切片

| 問題 | 無 Chunking | 有 Semantic Chunking |
|------|-------------|----------------------|
| 長文章 embedding | 語意被稀釋 | 每個 chunk 聚焦單一主題 |
| RAG 檢索 | 回傳整篇文章，token 浪費 | 只回傳相關段落 |
| 精準度 | 低（雜訊多） | 高（上下文精準） |
| 語意完整性 | 可能切斷句子中間 | 保證邏輯邊界完整 |

### 3.2 Chunker Interface

```typescript
interface ContentChunker {
  name: string;

  /** 切片策略 */
  chunk(input: string, config: ChunkingConfig): ChunkResult;
}

interface ChunkingConfig {
  /** 目標 chunk 大小（tokens） */
  targetSize: number;

  /** chunk 間重疊大小（tokens），建議 10-20% */
  overlap: number;

  /** 切分依據 */
  splitBy: 'sentence' | 'paragraph' | 'semantic' | 'fixed';

  /** 最小 chunk 大小（避免過小） */
  minSize: number;

  /** 最大 chunk 大小（硬上限） */
  maxSize: number;

  /** 是否使用標題作為主要分界點 */
  useHeadingsAsBoundary: boolean;
}

interface ChunkResult {
  chunks: Chunk[];
  metadata: ChunkingMetadata;
}

interface Chunk {
  index: number;
  content: string;
  tokenCount: number;
  startOffset: number;  // 原文中的起始位置
  endOffset: number;
  headingContext?: string;  // 該 chunk 所屬的標題上下文
}

interface ChunkingMetadata {
  totalChunks: number;
  averageTokens: number;
  strategy: string;
}
```

### 3.3 語義切片核心邏輯

#### 3.3.1 邏輯邊界識別

優先以標題（H1-H3）或段落符號作為切分點：

```typescript
// lib/modules/preprocessing/chunkers/semantic.ts

const BOUNDARY_PRIORITIES = [
  { pattern: /^#{1,3}\s+.+$/gm, priority: 1, type: 'heading' },     // H1-H3 標題
  { pattern: /\n\n+/g, priority: 2, type: 'paragraph' },            // 段落分隔
  { pattern: /[。！？.!?]\s*/g, priority: 3, type: 'sentence' },    // 句子結尾
];
```

#### 3.3.2 滑動窗口（Sliding Window）

每個切片預留 10-20% 的內容重疊 (Overlap)，確保前後語境不因切片而中斷：

```
原文: [A][B][C][D][E][F][G][H]

Overlap = 20%:
  Chunk 1: [A][B][C][D]
  Chunk 2: [C][D][E][F]  ← 包含前一個 chunk 的最後 20%
  Chunk 3: [E][F][G][H]
```

#### 3.3.3 長度控制

目標長度 500-1000 tokens，若單一區塊過長則進行次級語義切分：

```typescript
function chunkLongSection(section: string, config: ChunkingConfig): Chunk[] {
  const tokens = estimateTokens(section);

  if (tokens <= config.maxSize) {
    return [createChunk(section)];
  }

  // 次級切分：優先找段落邊界，其次找句子邊界
  const subChunks: Chunk[] = [];
  let remaining = section;

  while (remaining.length > 0) {
    const boundary = findBestBoundary(remaining, config.targetSize);
    subChunks.push(createChunk(remaining.slice(0, boundary)));
    remaining = remaining.slice(boundary - config.overlap);
  }

  return subChunks;
}
```

### 3.4 切片策略對照

| 策略 | 適用場景 | 優點 | 缺點 |
|------|----------|------|------|
| `sentence` | 留言、短描述 | 語意完整 | chunk 大小不均 |
| `paragraph` | 文章、長描述 | 主題聚焦 | 段落可能過長 |
| `semantic` | 長文章（**推薦**） | 語意最佳 | 需額外模型判斷邊界 |
| `fixed` | 結構化資料 | 大小一致 | 可能切斷語意 |

### 3.5 各資料類型的 Chunking 設定

```typescript
const CHUNKING_CONFIG: Record<EmbeddingTargetType, ChunkingConfig> = {
  product: {
    targetSize: 300,
    overlap: 45,          // 15% overlap
    splitBy: 'semantic',
    minSize: 64,
    maxSize: 600,
    useHeadingsAsBoundary: true,
  },
  post: {
    targetSize: 500,
    overlap: 75,          // 15% overlap
    splitBy: 'semantic',
    minSize: 128,
    maxSize: 1000,
    useHeadingsAsBoundary: true,
  },
  gallery_item: {
    targetSize: 128,
    overlap: 20,          // ~15% overlap
    splitBy: 'sentence',
    minSize: 32,
    maxSize: 256,
    useHeadingsAsBoundary: false,
  },
  comment: {
    targetSize: 128,
    overlap: 0,           // 留言通常不需重疊
    splitBy: 'sentence',
    minSize: 16,
    maxSize: 256,
    useHeadingsAsBoundary: false,
  },
};
```

---

## 4. 語境增強（Enrichment Stage）

### 4.1 Enricher Interface

```typescript
interface ContentEnricher {
  name: string;

  /** 為 chunk 添加上下文資訊 */
  enrich(chunk: Chunk, context: EnrichmentContext): EnrichedChunk;
}

interface EnrichmentContext {
  targetType: EmbeddingTargetType;
  targetId: string;
  parentTitle?: string;      // 商品名/文章標題
  category?: string;         // 分類資訊
  tags?: string[];           // 標籤
  locale?: Locale;
}

interface EnrichedChunk extends Chunk {
  enrichedContent: string;   // 加入上下文後的內容
  enrichmentMetadata: Record<string, unknown>;
  keywords?: string[];       // 自動提取的關鍵字
  summary?: string;          // 自動生成的摘要
}
```

### 4.2 豐富策略

#### 4.2.1 標題注入（Header Injection）

在每個小切片開頭自動附加「文章大標題」與「分類」，提升檢索時的語義匹配度：

```
原始 Chunk:
  "採用頂級牛皮，經過傳統工藝處理，手感柔軟細膩。"

Enriched 後:
  "[商品: 手工皮革包] [分類: 皮件] [標籤: 手工, 皮革, 包包]
   採用頂級牛皮，經過傳統工藝處理，手感柔軟細膩。"
```

#### 4.2.2 Metadata 自動生成

自動提取關鍵字與摘要，存入 Metadata 欄位以利後續過濾：

```typescript
interface AutoGeneratedMetadata {
  keywords: string[];           // 從內容提取的關鍵字
  summary: string;              // 30 字以內的摘要
  language: 'en' | 'zh' | 'mixed';
  sentiment?: 'positive' | 'negative' | 'neutral';  // 留言適用
}
```

#### 4.2.3 層級上下文（Hierarchical Context）

對於文章類內容，加入層級上下文：

```
[Chapter 3 > Section 2 > 皮革保養] 本段討論如何延長皮革壽命...
```

### 4.3 內建 Enrichers

| Enricher | 說明 |
|----------|------|
| `TitlePrepend` | 在 chunk 前加入標題 |
| `CategoryTag` | 加入分類標籤 |
| `TagsInjector` | 加入內容標籤 |
| `HierarchyContext` | 加入層級上下文 |
| `KeywordExtractor` | 自動提取關鍵字 |
| `SummaryGenerator` | 生成簡短摘要（需 LLM） |

---

## 5. 品質門檻（Quality Gate Stage）

### 5.1 品質檢查流程

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  有效性檢查    │  →  │  語義一致性    │  →  │  最終判定      │
│  (Validity)   │     │  (Coherence)  │     │  (Verdict)    │
└───────────────┘     └───────────────┘     └───────────────┘
       │                     │                     │
       ▼                     ▼                     ▼
  字數 > 20?            LLM 評分              passed / failed
  無意義字元 < 30%?      > 0.7?               / incomplete
```

### 5.2 有效性檢查（Validity Check）

自動剔除不符合基本條件的切片：

| 檢查項目 | 條件 | 處理方式 |
|----------|------|----------|
| 字數過少 | < 20 字（中文）或 < 50 chars（英文） | 剔除 |
| 無意義字元比例 | > 30%（符號、空白、數字） | 剔除 |
| 重複內容 | 與其他 chunk 相似度 > 95% | 僅保留一個 |
| 純標點符號 | 無實質文字內容 | 剔除 |

```typescript
interface ValidityCheckResult {
  isValid: boolean;
  reason?: 'too_short' | 'too_noisy' | 'duplicate' | 'no_content';
  metrics: {
    charCount: number;
    wordCount: number;
    noiseRatio: number;
  };
}
```

### 5.3 語義一致性評分（LLM-as-a-Judge）

抽樣交由小模型（GPT-4o-mini）評分，若切片內容與標題完全無關，則標記為 `incomplete` 狀態：

```typescript
// lib/modules/preprocessing/quality/coherence-checker-io.ts

import 'server-only';

const COHERENCE_PROMPT = `
你是一個內容品質評估員。請評估以下切片內容與其標題的語義相關性。

標題：{title}
分類：{category}
切片內容：{chunk_content}

請回答：
1. 相關性分數（0-1，1 為完全相關）
2. 這個切片是否能獨立被讀者理解？（yes/no）
3. 簡短說明原因（20 字內）

回傳 JSON 格式：
{ "score": 0.85, "standalone": true, "reason": "內容與標題主題一致" }
`;

interface CoherenceResult {
  score: number;          // 0-1
  standalone: boolean;    // 能否獨立理解
  reason: string;
}

async function checkCoherence(
  chunk: EnrichedChunk,
  context: EnrichmentContext
): Promise<CoherenceResult> {
  // 呼叫 GPT-4o-mini 評估
  const response = await callLLM({
    model: 'gpt-4o-mini',
    prompt: COHERENCE_PROMPT
      .replace('{title}', context.parentTitle ?? '')
      .replace('{category}', context.category ?? '')
      .replace('{chunk_content}', chunk.content),
  });

  return JSON.parse(response);
}
```

### 5.4 品質狀態標記

| 狀態 | 條件 | 後續處理 |
|------|------|----------|
| `passed` | 有效 + 一致性 ≥ 0.7 | 正常寫入 embedding |
| `incomplete` | 有效 + 一致性 < 0.7 | 寫入但標記警告 |
| `failed` | 無效 | 不寫入，記錄失敗原因 |

### 5.5 抽樣策略

> **決策**: 按「原始內容」抽樣（20%），而非按 chunks 抽樣。避免長文章（chunk 多）被過度抽樣。

| 原始內容數量 | 抽樣比例 | 說明 |
|--------------|----------|------|
| < 50 筆 | 100% | 全部檢查 |
| 50-500 筆 | 20% | 隨機抽樣（每筆內容的所有 chunks 一起檢查） |
| > 500 筆 | 10% | 隨機抽樣 + 首尾必檢 |

**抽樣單位說明**：

```
✗ 錯誤：按 chunks 抽樣
  → 一篇 20 chunks 的長文章會被抽中多次，短文章可能漏檢

✓ 正確：按原始內容抽樣
  → 抽中一篇文章後，檢查該文章的所有 chunks
  → 每篇內容的抽中機率相同
```

---

## 6. 異步執行與監控架構

### 6.1 任務調度（Orchestration）

使用 `embedding_queue` 表管理任務狀態：

```sql
CREATE TABLE embedding_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  priority VARCHAR(10) DEFAULT 'normal',  -- 'high' | 'normal' | 'low'
  status VARCHAR(20) DEFAULT 'pending',   -- pending, processing, completed, failed
  attempts INT DEFAULT 0,
  error_message TEXT,
  quality_status VARCHAR(20),              -- passed, incomplete, failed
  processing_metadata JSONB,               -- 處理過程 metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,

  UNIQUE(target_type, target_id)
);

CREATE INDEX idx_embedding_queue_status
  ON embedding_queue(status, priority DESC, created_at);
```

### 6.2 優先順序（Priority）

| Priority | 使用場景 | 處理順序 |
|----------|----------|----------|
| `high` | 單筆編輯/新增文章（立即處理） | 最先 |
| `normal` | 批量匯入、一般更新 | 次之 |
| `low` | 定期重新索引、品質校準（Cron Job） | 最後 |

### 6.3 觸發方式

| 觸發器 | 觸發時機 | Priority |
|--------|----------|----------|
| Webhook | 內容新增/更新時立即觸發 | `high` |
| Cron Job | 每日定期品質校準 | `low` |
| Manual | Admin 手動重建 | `normal` |

### 6.4 處理規則

| 項目 | 設定 |
|------|------|
| 批次大小 | 10 筆/次 |
| 輪詢間隔 | 10 秒 |
| 最大重試 | 3 次 |
| 重試間隔 | 指數退避（10s, 30s, 90s） |
| 超時時間 | 單筆 20 秒 |

---

## 7. Embeddings 表結構

> **決策**: 從 Phase 1 開始即使用支援 Chunking 的完整結構，不需要 migration。
>
> 詳見 [SUPABASE_AI.md §2.1.1](embeddings-semantic-search-spec.md#211-embeddings-表設計)

### 7.1 完整結構（從 Phase 1 開始）

```sql
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(50) NOT NULL,       -- 'product' | 'post' | 'gallery_item' | 'comment'
  target_id UUID NOT NULL,
  chunk_index INT DEFAULT 0,              -- 第幾個 chunk（0 = 單一/完整內容）
  chunk_total INT DEFAULT 1,              -- 總共幾個 chunks
  embedding vector(1536) NOT NULL,
  content_hash VARCHAR(64) NOT NULL,      -- SHA256 of input text
  chunk_content TEXT,                     -- 該 chunk 的原始內容（供 debug）
  preprocessing_metadata JSONB,           -- 前處理 metadata
  enrichment_metadata JSONB,              -- 豐富化 metadata
  quality_status VARCHAR(20) DEFAULT 'passed',  -- passed, incomplete, failed
  quality_score DECIMAL(3,2),             -- 品質分數 0.00-1.00
  quality_check_at TIMESTAMPTZ,           -- 最後品質檢查時間
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(target_type, target_id, chunk_index)
);

-- 向量索引
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);

-- 業務查詢索引
CREATE INDEX idx_embeddings_target ON embeddings(target_type, target_id);
CREATE INDEX idx_embeddings_quality ON embeddings(quality_status, quality_score);
```

> **注意**: 不再需要 ALTER TABLE migration，因 DB 為空且未上線。

### 7.3 Metadata 範例

```json
{
  "preprocessing_metadata": {
    "cleaners_applied": ["HtmlStripper", "NoiseFilter", "MarkdownStripper", "UnicodeNormalizer"],
    "removed_content_count": 5,
    "noise_removed": ["nav_bar", "footer", "ad_block"],
    "original_length": 2500,
    "cleaned_length": 2100,
    "cleaning_ratio": 0.84,
    "normalized_at": "2025-12-30T10:00:00Z"
  },
  "enrichment_metadata": {
    "title_prepended": true,
    "category_tagged": true,
    "parent_context": "手工皮革包",
    "tags_included": ["手工", "皮革"],
    "keywords_extracted": ["牛皮", "傳統工藝", "手感"],
    "summary": "介紹頂級牛皮手工包的製作工藝"
  },
  "quality_metadata": {
    "validity_check": { "passed": true, "char_count": 156, "noise_ratio": 0.05 },
    "coherence_check": { "score": 0.92, "standalone": true, "reason": "內容與標題主題一致" },
    "checked_by": "gpt-4o-mini",
    "checked_at": "2025-12-30T10:01:00Z"
  }
}
```

---

## 8. RAG 精篩（Re-ranking）

> **決策**: Phase 1-5 不使用 Re-ranking（粗排已足夠），Phase 6+ 可選開啟 Cohere Re-rank。

### 8.0 Re-ranking 適用範圍

| 場景 | Re-ranking | 說明 |
|------|------------|------|
| **similar_items 推薦** | ❌ 不使用 | 預計算表，每日 Cron 計算，不需 query-time 精排 |
| **語意搜尋結果** | ✓ 可選 | Phase 6+ 可開啟，提升搜尋精準度 |
| **RAG 檢索** | ✓ 可選 | 對 AI 分析的 context 進行精排 |

**重要區分**：
- **similar_items（推薦）**: 不需要 query 詞，純粹基於向量相似度，預計算即可
- **搜尋/RAG**: 需要 query 詞與候選結果的交叉比對，必須 query-time 計算

### 8.1 兩階段檢索架構（Phase 6+）

```
用戶查詢: "適合送禮的皮革包"
           │
           ▼
    ┌──────────────┐
    │  Query 擴展   │  將查詢擴展為多個變體
    │  (Expansion)  │  → "禮物 皮革 包包", "送禮 皮件", ...
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  粗篩 (Coarse)│  Embedding 相似度搜尋（pgvector）
    │  Top-K = 50   │  快速取得候選集（Phase 1-5 到此為止）
    └──────┬───────┘
           │
           ▼ (Phase 6+ 可選)
    ┌──────────────┐
    │  精篩 (Fine)  │  Cohere Re-ranking API
    │  Top-N = 10   │  精確語意匹配
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  組合 Prompt  │  將 Top-N 結果送入 LLM
    └──────────────┘
```

### 8.2 Re-ranker Interface

```typescript
interface ReRanker {
  name: string;

  /** 對粗篩結果進行精排 */
  rerank(
    query: string,
    candidates: RetrievalCandidate[],
    topN: number
  ): Promise<RerankResult[]>;
}

interface RetrievalCandidate {
  targetType: EmbeddingTargetType;
  targetId: string;
  chunkIndex: number;
  content: string;
  coarseScore: number;  // embedding 相似度分數
}

interface RerankResult extends RetrievalCandidate {
  fineScore: number;    // re-rank 分數
  finalRank: number;
}
```

### 8.3 Re-ranking 策略選項

> **決策**: Phase 1-5 使用 No Re-rank，Phase 6+ 可選 Cohere Rerank。

| 策略 | 成本 | 精準度 | Phase | 說明 |
|------|------|--------|-------|------|
| **No Re-rank** | $0 | 中 | 1-5 | 預設，資料量小時足夠 |
| **Cohere Rerank** | ~$0.001/query | 高 | 6+ | Owner 可在設定中開啟 |
| ~~Cross-encoder Local~~ | - | - | - | 暫不支援（需 GPU） |
| ~~LLM-based Rerank~~ | - | - | - | 暫不支援（成本過高） |

**Phase 6+ 開啟 Re-ranking 的設定**：

```typescript
// Admin Settings → AI → Re-ranking
interface RerankingSettings {
  enabled: boolean;           // 預設 false
  provider: 'cohere';         // 目前僅支援 Cohere
  model: 'rerank-english-v3.0' | 'rerank-multilingual-v3.0';
  topK: number;               // 粗排取多少筆（預設 50）
  topN: number;               // 精排回傳多少筆（預設 10）
}
```

---

## 9. 監控儀表板指標（Monitoring Metrics）

### 9.1 Pipeline 監控指標

| 指標 | 說明 | 警告閾值 | 行動 |
|------|------|----------|------|
| `cleaning_loss_ratio` | 清洗損耗率（原始 vs 清洗後字數） | < 0.3 | 檢查是否過度清洗 |
| `avg_chunks_per_content` | 平均每筆內容產生的 chunk 數 | > 20 | 調整 chunk size |
| `avg_chunk_tokens` | 平均 chunk token 數 | < 64 或 > 1024 | 調整 min/max size |
| `quality_pass_rate` | 品質檢查通過率 | < 80% | 檢視清洗/切片邏輯 |
| `avg_coherence_score` | 平均語義一致性分數 | < 0.7 | 優化 enrichment |
| `processing_latency_p95` | 處理延遲 P95 | > 20s | 優化 pipeline |
| `rerank_latency_ms` | Re-ranking 延遲 | > 500ms | 減少 Top-K |

### 9.2 向量空間健康度

| 指標 | 說明 | 警告閾值 |
|------|------|----------|
| `embedding_coverage` | 有 embedding 的資料比例 | < 95% |
| `avg_similarity_score` | 平均檢索相似度 | < 0.7 |
| `vector_cluster_count` | 向量叢集數量 | 過於集中或分散 |

### 9.3 Admin UI 儀表板（Phase 7+）

```
┌─ Data Refinery Dashboard ───────────────────────────────────────────────────┐
│                                                                              │
│  ┌─ Pipeline Health ────────────────────────────────────────────────────┐   │
│  │ Today: 156 processed | 3 failed | 98% pass rate                       │   │
│  │ ████████████████████████████████░░ 95% coverage                       │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─ Quality Metrics ────────────────────────────────────────────────────┐   │
│  │ Cleaning Loss Ratio: 0.84 ✓        Avg Coherence: 0.89 ✓             │   │
│  │ Avg Chunks/Content: 4.2 ✓          Avg Chunk Tokens: 487 ✓           │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─ Retrieval Health ───────────────────────────────────────────────────┐   │
│  │ Avg Similarity Score: 0.78 ✓                                          │   │
│  │ ⚠ 12 queries with score < 0.5 in last 24h                            │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [View Failed Items]  [Rebuild All]  [Run Quality Audit]                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. 技術模組結構

### 10.1 目錄結構

```
lib/
├── preprocessing/
│   ├── index.ts                 # Pipeline orchestrator
│   ├── types.ts                 # 介面定義
│   ├── config.ts                # 預設配置
│   │
│   ├── cleaners/
│   │   ├── index.ts             # Cleaner registry
│   │   ├── html-stripper.ts     # (pure)
│   │   ├── noise-filter.ts      # (pure) - 視覺噪音過濾
│   │   ├── markdown-stripper.ts # (pure)
│   │   ├── url-remover.ts       # (pure)
│   │   ├── emoji-normalizer.ts  # (pure)
│   │   ├── unicode-normalizer.ts # (pure)
│   │   └── whitespace.ts        # (pure)
│   │
│   ├── chunkers/
│   │   ├── index.ts             # Chunker registry
│   │   ├── sentence.ts          # (pure)
│   │   ├── paragraph.ts         # (pure)
│   │   ├── semantic.ts          # (pure) - 基於標題/段落的語義切片
│   │   └── semantic-llm-io.ts   # (IO) - LLM 輔助邊界判斷
│   │
│   ├── enrichers/
│   │   ├── index.ts             # Enricher registry
│   │   ├── title-prepend.ts     # (pure)
│   │   ├── category-tag.ts      # (pure)
│   │   ├── tags-injector.ts     # (pure)
│   │   ├── hierarchy-context.ts # (pure)
│   │   ├── keyword-extractor.ts # (pure) - 基於 TF-IDF
│   │   └── summary-generator-io.ts  # (IO) - LLM 生成摘要
│   │
│   ├── quality/
│   │   ├── index.ts             # Quality gate orchestrator
│   │   ├── validity-checker.ts  # (pure) - 有效性檢查
│   │   ├── coherence-checker-io.ts  # (IO) - LLM 語義一致性評分
│   │   └── sampler.ts           # (pure) - 抽樣邏輯
│   │
│   └── rerankers/
│       ├── index.ts             # Reranker registry
│       ├── cohere-io.ts         # (IO - Cohere API)
│       └── llm-io.ts            # (IO - LLM API)
│
├── types/
│   └── preprocessing.ts         # Shared types
│
└── validators/
    └── preprocessing.ts         # 輸入驗證
```

### 10.2 架構約束對應

| 約束（from ARCHITECTURE.md） | 本功能對應 |
|------------------------------|------------|
| IO boundaries（§3.4） | 僅 `*-io.ts` 結尾的檔案為 IO 模組 |
| Pure modules（§4.3） | cleaners/chunkers/enrichers/quality 的非 IO 檔案皆為純函式 |
| Server-only（§4.5, §4.6） | IO 模組開頭 `import 'server-only';` |
| Bundle Guardrails（§4.5） | OpenAI/Cohere SDK 不進 client bundle |
| IO module size（§3.4） | 每個 `*-io.ts` 不超過 300 行 |

---

## 11. Pipeline 執行流程

### 11.1 Orchestrator

```typescript
// lib/modules/preprocessing/index.ts

import 'server-only';

export async function preprocessForEmbedding(
  input: PreprocessingInput
): Promise<PreprocessingOutput> {
  const config = getConfigForType(input.targetType);

  // Stage 1: Sanitization
  let content = input.rawContent;
  const cleaningResults: CleanResult[] = [];
  for (const cleanerName of config.cleaners) {
    const cleaner = getCleanerByName(cleanerName);
    if (cleaner.shouldApply(input.targetType)) {
      const result = cleaner.clean(content);
      content = result.output;
      cleaningResults.push(result);
    }
  }

  // Stage 2: Semantic Chunking
  const chunker = getChunkerByStrategy(config.chunkingStrategy);
  const chunkResult = chunker.chunk(content, config.chunking);

  // Stage 3: Enrichment
  const enrichedChunks = chunkResult.chunks.map(chunk =>
    enrichChunk(chunk, input.context)
  );

  // Stage 4: Quality Gate
  const qualifiedChunks = await qualityGate(enrichedChunks, input.context, {
    sampleRate: getSampleRate(chunkResult.chunks.length),
  });

  return {
    chunks: qualifiedChunks.filter(c => c.qualityStatus !== 'failed'),
    metadata: {
      cleaning: summarizeCleaningResults(cleaningResults),
      chunking: chunkResult.metadata,
      quality: {
        total: qualifiedChunks.length,
        passed: qualifiedChunks.filter(c => c.qualityStatus === 'passed').length,
        incomplete: qualifiedChunks.filter(c => c.qualityStatus === 'incomplete').length,
        failed: qualifiedChunks.filter(c => c.qualityStatus === 'failed').length,
      },
    },
  };
}
```

### 11.2 與 Module C 整合點

```typescript
// lib/modules/embedding/embedding-generate-io.ts（修改）

import { preprocessForEmbedding } from '@/lib/preprocessing';

export async function generateEmbedding(
  targetType: EmbeddingTargetType,
  targetId: string,
  rawContent: string,
  context: EnrichmentContext
): Promise<void> {
  // Step 1: 前處理（含品質檢查）
  const preprocessed = await preprocessForEmbedding({
    targetType,
    rawContent,
    locale: context.locale,
    context,
  });

  // Step 2: 為每個通過品質檢查的 chunk 生成 embedding
  for (const chunk of preprocessed.chunks) {
    const embedding = await callOpenAIEmbedding(chunk.enrichedContent);

    await saveEmbedding({
      targetType,
      targetId,
      chunkIndex: chunk.index,
      chunkTotal: preprocessed.chunks.length,
      embedding,
      contentHash: hashContent(chunk.enrichedContent),
      preprocessingMetadata: preprocessed.metadata.cleaning,
      enrichmentMetadata: chunk.enrichmentMetadata,
      qualityStatus: chunk.qualityStatus,
      qualityScore: chunk.qualityScore,
    });
  }
}
```

---
