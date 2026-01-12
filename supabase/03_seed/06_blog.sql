-- ============================================
-- SEED: 部落格假資料 (Blog Seed Data)
-- ============================================
--
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-22
--
-- 說明：插入部落格文章假資料
-- 使用 picsum.photos 作為封面圖片來源
--
-- ============================================


-- ============================================
-- PART 1: 部落格分類 (Blog Categories)
-- ============================================

INSERT INTO public.categories (name_en, name_zh, slug) VALUES
  ('Artificial Intelligence', '人工智慧', 'ai'),
  ('Web3 & Blockchain', 'Web3 與區塊鏈', 'web3')
ON CONFLICT (slug) DO NOTHING;


-- ============================================
-- PART 2: 部落格文章 (Blog Posts)
-- ============================================

-- AI Category: Post 1 - Token & Embedding
INSERT INTO public.posts (
  title_en, title_zh,
  slug,
  content_en, content_zh,
  excerpt_en, excerpt_zh,
  cover_image_url,
  cover_image_alt_en, cover_image_alt_zh,
  category_id,
  visibility,
  published_at,
  reading_time_minutes
) VALUES (
  'Understanding Tokens and Embeddings in LLMs',
  '理解大型語言模型中的 Token 與 Embedding',
  'tokens-and-embeddings-in-llms',
  '## What are Tokens?

Tokens are the fundamental units that large language models (LLMs) use to process text. Unlike humans who read word by word, LLMs break down text into smaller pieces called tokens. A token can be a word, part of a word, or even a single character.

For example, the word "embedding" might be a single token, while "embeddings" could be split into "embed" and "dings". This tokenization process is crucial for:

- **Vocabulary management**: Models have a fixed vocabulary size (e.g., 50,000 tokens)
- **Handling unknown words**: By breaking words into subwords, models can handle any text
- **Computational efficiency**: Processing fixed-size tokens is more efficient

## What are Embeddings?

Embeddings are dense vector representations of tokens. Each token is mapped to a high-dimensional vector (typically 768 to 4096 dimensions) that captures semantic meaning.

```python
# Example: Token to embedding
token = "king"
embedding = model.embed(token)  # Returns a vector like [0.1, -0.3, 0.8, ...]
```

### Why Embeddings Matter

1. **Semantic similarity**: Similar words have similar vectors
2. **Arithmetic properties**: king - man + woman ≈ queen
3. **Contextual understanding**: The same word can have different embeddings based on context

## The Embedding Process

1. **Tokenization**: Text → Tokens
2. **Lookup**: Tokens → Initial embeddings from embedding matrix
3. **Transformation**: Initial embeddings → Contextualized embeddings through transformer layers

This process allows LLMs to understand context and generate coherent responses.',
  '## 什麼是 Token？

Token 是大型語言模型 (LLM) 處理文字的基本單位。與人類逐字閱讀不同，LLM 會將文字分解成更小的片段，稱為 token。一個 token 可以是一個詞、詞的一部分，甚至是單一字元。

例如，「embedding」這個詞可能是單一 token，而「embeddings」可能被拆分為「embed」和「dings」。這種 tokenization 過程對於以下方面至關重要：

- **詞彙管理**：模型有固定的詞彙量（例如 50,000 個 token）
- **處理未知詞**：透過將詞拆分為子詞，模型可以處理任何文字
- **運算效率**：處理固定大小的 token 更有效率

## 什麼是 Embedding？

Embedding 是 token 的密集向量表示。每個 token 被映射到一個高維向量（通常是 768 到 4096 維），用於捕捉語義含義。

```python
# 範例：Token 轉換為 embedding
token = "國王"
embedding = model.embed(token)  # 回傳向量如 [0.1, -0.3, 0.8, ...]
```

### 為什麼 Embedding 重要

1. **語義相似性**：相似的詞有相似的向量
2. **算術特性**：國王 - 男人 + 女人 ≈ 女王
3. **上下文理解**：同一個詞根據上下文可以有不同的 embedding

## Embedding 流程

1. **Tokenization**：文字 → Token
2. **查詢**：Token → 從 embedding 矩陣獲取初始 embedding
3. **轉換**：初始 embedding → 經過 transformer 層的上下文化 embedding

這個過程讓 LLM 能夠理解上下文並生成連貫的回應。',
  'Deep dive into tokens and embeddings - the foundation of how large language models understand and process text.',
  '深入探討 token 與 embedding — 大型語言模型理解和處理文字的基礎。',
  'https://picsum.photos/seed/ai-tokens/1200/630',
  'Neural network visualization representing token embeddings', '代表 token embedding 的神經網路視覺化',
  (SELECT id FROM public.categories WHERE slug = 'ai'),
  'public',
  TIMEZONE('utc', NOW()) - INTERVAL '7 days',
  8
);

-- AI Category: Post 2 - Attention, Loss & Gradient
INSERT INTO public.posts (
  title_en, title_zh,
  slug,
  content_en, content_zh,
  excerpt_en, excerpt_zh,
  cover_image_url,
  cover_image_alt_en, cover_image_alt_zh,
  category_id,
  visibility,
  published_at,
  reading_time_minutes
) VALUES (
  'Attention Mechanism, Loss Functions, and Gradient Descent',
  '注意力機制、損失函數與梯度下降',
  'attention-loss-gradient',
  '## The Attention Mechanism

Attention is the core innovation that powers modern LLMs. It allows the model to focus on relevant parts of the input when generating each output token.

### Self-Attention Formula

```
Attention(Q, K, V) = softmax(QK^T / √d_k) × V
```

Where:
- **Q (Query)**: What am I looking for?
- **K (Key)**: What do I contain?
- **V (Value)**: What information do I provide?

### Multi-Head Attention

Instead of one attention function, transformers use multiple "heads" that attend to different aspects:

```python
MultiHead(Q, K, V) = Concat(head_1, ..., head_h) × W_O
where head_i = Attention(Q × W_Q_i, K × W_K_i, V × W_V_i)
```

## Loss Functions

Loss functions measure how wrong the model predictions are. For language models, we typically use:

### Cross-Entropy Loss

```python
loss = -sum(y_true * log(y_pred))
```

This measures the difference between:
- **y_true**: The actual next token (one-hot encoded)
- **y_pred**: The model probability distribution over vocabulary

### Perplexity

Perplexity = exp(average cross-entropy loss)

Lower perplexity = better model (less "perplexed" by the data).

## Gradient Descent

Gradient descent is how models learn - by adjusting weights to minimize loss.

### The Process

1. **Forward pass**: Compute predictions
2. **Compute loss**: How wrong are we?
3. **Backward pass**: Compute gradients (∂Loss/∂weights)
4. **Update weights**: weights = weights - learning_rate × gradients

### Challenges

- **Vanishing gradients**: Gradients become too small to learn
- **Exploding gradients**: Gradients become too large, destabilizing training
- **Local minima**: Getting stuck in suboptimal solutions

Modern techniques like Adam optimizer, gradient clipping, and layer normalization help address these challenges.',
  '## 注意力機制

注意力機制是驅動現代 LLM 的核心創新。它讓模型在生成每個輸出 token 時，能夠專注於輸入的相關部分。

### 自注意力公式

```
Attention(Q, K, V) = softmax(QK^T / √d_k) × V
```

其中：
- **Q（Query）**：我在尋找什麼？
- **K（Key）**：我包含什麼？
- **V（Value）**：我提供什麼資訊？

### 多頭注意力

Transformer 不是使用單一注意力函數，而是使用多個「頭」來關注不同方面：

```python
MultiHead(Q, K, V) = Concat(head_1, ..., head_h) × W_O
其中 head_i = Attention(Q × W_Q_i, K × W_K_i, V × W_V_i)
```

## 損失函數

損失函數衡量模型預測的錯誤程度。對於語言模型，我們通常使用：

### 交叉熵損失

```python
loss = -sum(y_true * log(y_pred))
```

這衡量了以下兩者之間的差異：
- **y_true**：實際的下一個 token（one-hot 編碼）
- **y_pred**：模型對詞彙表的機率分佈

### 困惑度 (Perplexity)

困惑度 = exp(平均交叉熵損失)

較低的困惑度 = 較好的模型（對資料較不「困惑」）。

## 梯度下降

梯度下降是模型學習的方式 — 透過調整權重來最小化損失。

### 過程

1. **前向傳播**：計算預測
2. **計算損失**：我們預測錯了多少？
3. **反向傳播**：計算梯度（∂Loss/∂weights）
4. **更新權重**：weights = weights - learning_rate × gradients

### 挑戰

- **梯度消失**：梯度變得太小而無法學習
- **梯度爆炸**：梯度變得太大，使訓練不穩定
- **局部最小值**：陷入次優解

現代技術如 Adam 優化器、梯度裁剪和層標準化有助於解決這些挑戰。',
  'Understanding the core mechanisms that enable neural networks to learn: attention, loss functions, and gradient descent.',
  '理解讓神經網路能夠學習的核心機制：注意力機制、損失函數與梯度下降。',
  'https://picsum.photos/seed/ai-attention/1200/630',
  'Gradient descent visualization on a loss landscape', '損失地形上的梯度下降視覺化',
  (SELECT id FROM public.categories WHERE slug = 'ai'),
  'public',
  TIMEZONE('utc', NOW()) - INTERVAL '3 days',
  12
);

-- Web3 Category: Post 1 - From Web2 CA to Decentralization
INSERT INTO public.posts (
  title_en, title_zh,
  slug,
  content_en, content_zh,
  excerpt_en, excerpt_zh,
  cover_image_url,
  cover_image_alt_en, cover_image_alt_zh,
  category_id,
  visibility,
  published_at,
  reading_time_minutes
) VALUES (
  'From Web2 Certificate Authorities to Decentralized Trust',
  '從 Web2 憑證授權到去中心化信任',
  'web2-ca-to-decentralization',
  '## The Web2 Trust Model: Certificate Authorities

In Web2, trust is established through a hierarchical system of Certificate Authorities (CAs). When you visit https://example.com, your browser trusts the connection because:

1. **Root CAs**: A small set of trusted organizations (Verisign, DigiCert, Let''s Encrypt)
2. **Chain of Trust**: Root CA → Intermediate CA → Server Certificate
3. **Browser Trust Store**: Browsers come pre-installed with ~100-150 root CA certificates

### Problems with Centralized Trust

- **Single points of failure**: If a CA is compromised, millions of certificates are at risk
- **Political control**: Governments can pressure CAs to issue fraudulent certificates
- **Cost barriers**: Traditional certificates were expensive, creating barriers to entry
- **Revocation challenges**: Certificate revocation lists (CRLs) are often slow and unreliable

## The Web3 Trust Model: Decentralization

Web3 replaces centralized trust with cryptographic and economic guarantees:

### 1. Public Key Infrastructure (PKI) Without CAs

```
Web2: CA verifies identity → Issues certificate → Browser trusts
Web3: Private key ownership = Identity (self-sovereign)
```

Your Ethereum address IS your identity. No third party needed.

### 2. Trust Through Consensus

Instead of trusting a single authority, we trust the consensus of thousands of nodes:

- **Proof of Work**: Trust the chain with the most computational work
- **Proof of Stake**: Trust the chain backed by the most economic value

### 3. Smart Contract Trust

Code replaces legal contracts. Trust is:
- **Transparent**: Anyone can read the code
- **Immutable**: Once deployed, behavior cannot change
- **Verifiable**: Execution can be verified by anyone

## The Transition

| Aspect | Web2 | Web3 |
|--------|------|------|
| Identity | CA-issued certificates | Self-sovereign keys |
| Trust | Hierarchical authorities | Distributed consensus |
| Verification | TLS handshake | On-chain verification |
| Recovery | Contact CA/admin | Recovery phrases (or lost forever) |

The future likely involves hybrid models, combining the user experience of Web2 with the trust guarantees of Web3.',
  '## Web2 信任模型：憑證授權機構

在 Web2 中，信任是透過階層式的憑證授權機構（CA）系統建立的。當你訪問 https://example.com 時，你的瀏覽器信任該連線是因為：

1. **根 CA**：一小組受信任的組織（Verisign、DigiCert、Let''s Encrypt）
2. **信任鏈**：根 CA → 中繼 CA → 伺服器憑證
3. **瀏覽器信任庫**：瀏覽器預裝約 100-150 個根 CA 憑證

### 中心化信任的問題

- **單點故障**：如果 CA 被入侵，數百萬個憑證都會面臨風險
- **政治控制**：政府可以向 CA 施壓以發行詐欺性憑證
- **成本障礙**：傳統憑證價格昂貴，造成進入門檻
- **撤銷挑戰**：憑證撤銷列表（CRL）通常緩慢且不可靠

## Web3 信任模型：去中心化

Web3 用密碼學和經濟保障取代中心化信任：

### 1. 無需 CA 的公鑰基礎設施（PKI）

```
Web2：CA 驗證身份 → 發行憑證 → 瀏覽器信任
Web3：私鑰所有權 = 身份（自主主權）
```

你的以太坊地址就是你的身份。不需要第三方。

### 2. 透過共識建立信任

我們不信任單一權威，而是信任數千個節點的共識：

- **工作量證明**：信任擁有最多運算工作量的鏈
- **權益證明**：信任由最多經濟價值支持的鏈

### 3. 智能合約信任

程式碼取代法律合約。信任是：
- **透明的**：任何人都可以閱讀程式碼
- **不可變的**：一旦部署，行為無法更改
- **可驗證的**：執行可以被任何人驗證

## 轉變

| 面向 | Web2 | Web3 |
|------|------|------|
| 身份 | CA 發行的憑證 | 自主主權金鑰 |
| 信任 | 階層式權威 | 分散式共識 |
| 驗證 | TLS 握手 | 鏈上驗證 |
| 復原 | 聯繫 CA/管理員 | 恢復片語（否則永久遺失）|

未來可能涉及混合模型，結合 Web2 的使用者體驗與 Web3 的信任保障。',
  'Exploring how Web3 replaces traditional certificate authorities with decentralized trust mechanisms.',
  '探索 Web3 如何用去中心化信任機制取代傳統憑證授權機構。',
  'https://picsum.photos/seed/web3-trust/1200/630',
  'Decentralized network nodes forming a trust graph', '形成信任圖的去中心化網路節點',
  (SELECT id FROM public.categories WHERE slug = 'web3'),
  'public',
  TIMEZONE('utc', NOW()) - INTERVAL '5 days',
  10
);

-- Web3 Category: Post 2 - Byzantine Fault Tolerance
INSERT INTO public.posts (
  title_en, title_zh,
  slug,
  content_en, content_zh,
  excerpt_en, excerpt_zh,
  cover_image_url,
  cover_image_alt_en, cover_image_alt_zh,
  category_id,
  visibility,
  published_at,
  reading_time_minutes
) VALUES (
  'Byzantine Fault Tolerance: The Foundation of Blockchain Consensus',
  '拜占庭容錯：區塊鏈共識的基石',
  'byzantine-fault-tolerance',
  '## The Byzantine Generals Problem

Imagine several Byzantine generals surrounding an enemy city. They must agree on a common plan: attack or retreat. But:

- Generals can only communicate via messengers
- Some generals might be traitors sending false messages
- All loyal generals must agree on the same plan

This is the **Byzantine Generals Problem**, first described by Lamport, Shostak, and Pease in 1982.

### Why It Matters for Blockchain

In blockchain networks:
- **Generals** = Nodes
- **Messages** = Transactions and blocks
- **Traitors** = Malicious or faulty nodes
- **Agreement** = Consensus on the blockchain state

## Byzantine Fault Tolerance (BFT)

A system is Byzantine Fault Tolerant if it can reach consensus despite some nodes being faulty or malicious.

### The 3f + 1 Rule

For a system to tolerate `f` Byzantine faults, it needs at least `3f + 1` nodes.

- **f = 1**: Need 4 nodes (can tolerate 1 traitor)
- **f = 2**: Need 7 nodes (can tolerate 2 traitors)
- **f = 33%**: Maximum Byzantine nodes a BFT system can tolerate

### Why 3f + 1?

```
Total nodes: n = 3f + 1
Honest nodes: n - f = 2f + 1 (majority)
```

With 2f + 1 honest nodes, even if f are offline and f are malicious, honest nodes still have majority.

## Practical BFT (PBFT)

PBFT is a classic BFT algorithm used in permissioned blockchains:

### Three Phases

1. **Pre-prepare**: Leader proposes a block
2. **Prepare**: Nodes broadcast their agreement
3. **Commit**: Once 2f + 1 prepare messages received, nodes commit

```
Client → Leader: Request
Leader → All: Pre-prepare(block)
All → All: Prepare(block_hash)
All → All: Commit(block_hash)
All → Client: Reply
```

### Pros and Cons

| Pros | Cons |
|------|------|
| Immediate finality | O(n²) message complexity |
| No forks | Doesn''t scale beyond ~100 nodes |
| Low energy | Requires known validator set |

## Modern Variations

### Tendermint (Cosmos)
- Simplified PBFT with two phases
- Used by Cosmos, Terra, Binance Chain

### HotStuff (Diem/Libra)
- Linear message complexity O(n)
- Three-phase protocol with leader rotation
- Inspired Facebook''s Diem blockchain

### Ethereum 2.0 (Casper FFG)
- Combines Proof of Stake with BFT finality
- Uses attestations instead of explicit votes
- Finalizes blocks in ~2 epochs (~13 minutes)

Byzantine Fault Tolerance remains the theoretical foundation for all blockchain consensus mechanisms, ensuring networks can function correctly even when some participants are malicious.',
  '## 拜占庭將軍問題

想像幾個拜占庭將軍包圍著一座敵城。他們必須就共同計劃達成一致：進攻或撤退。但是：

- 將軍們只能透過信使溝通
- 某些將軍可能是叛徒，會發送假訊息
- 所有忠誠的將軍必須就相同計劃達成一致

這就是**拜占庭將軍問題**，由 Lamport、Shostak 和 Pease 於 1982 年首次描述。

### 為什麼對區塊鏈重要

在區塊鏈網路中：
- **將軍** = 節點
- **訊息** = 交易和區塊
- **叛徒** = 惡意或故障節點
- **共識** = 對區塊鏈狀態的一致

## 拜占庭容錯（BFT）

如果系統能在某些節點故障或惡意的情況下達成共識，則該系統具有拜占庭容錯能力。

### 3f + 1 規則

要容忍 `f` 個拜占庭故障，系統至少需要 `3f + 1` 個節點。

- **f = 1**：需要 4 個節點（可容忍 1 個叛徒）
- **f = 2**：需要 7 個節點（可容忍 2 個叛徒）
- **f = 33%**：BFT 系統能容忍的最大拜占庭節點比例

### 為什麼是 3f + 1？

```
總節點數：n = 3f + 1
誠實節點：n - f = 2f + 1（多數）
```

有 2f + 1 個誠實節點，即使 f 個離線且 f 個惡意，誠實節點仍佔多數。

## 實用拜占庭容錯（PBFT）

PBFT 是許可制區塊鏈中使用的經典 BFT 演算法：

### 三個階段

1. **預準備**：領導者提議區塊
2. **準備**：節點廣播其同意
3. **提交**：收到 2f + 1 個準備訊息後，節點提交

```
客戶端 → 領導者：請求
領導者 → 全部：預準備(區塊)
全部 → 全部：準備(區塊雜湊)
全部 → 全部：提交(區塊雜湊)
全部 → 客戶端：回覆
```

### 優缺點

| 優點 | 缺點 |
|------|------|
| 即時最終性 | O(n²) 訊息複雜度 |
| 無分叉 | 無法擴展超過約 100 個節點 |
| 低能耗 | 需要已知驗證者集合 |

## 現代變體

### Tendermint（Cosmos）
- 簡化的兩階段 PBFT
- 被 Cosmos、Terra、幣安鏈使用

### HotStuff（Diem/Libra）
- 線性訊息複雜度 O(n)
- 具有領導者輪換的三階段協議
- 啟發了 Facebook 的 Diem 區塊鏈

### 以太坊 2.0（Casper FFG）
- 結合權益證明與 BFT 最終性
- 使用證明而非明確投票
- 在約 2 個 epoch（約 13 分鐘）內確定區塊

拜占庭容錯仍然是所有區塊鏈共識機制的理論基礎，確保網路即使在某些參與者惡意的情況下也能正確運作。',
  'Understanding Byzantine Fault Tolerance and how it enables blockchain networks to achieve consensus despite malicious actors.',
  '理解拜占庭容錯以及它如何使區塊鏈網路在存在惡意行為者的情況下達成共識。',
  'https://picsum.photos/seed/web3-bft/1200/630',
  'Byzantine generals around a fortified city representing distributed consensus', '圍繞堡壘城市的拜占庭將軍代表分散式共識',
  (SELECT id FROM public.categories WHERE slug = 'web3'),
  'public',
  TIMEZONE('utc', NOW()) - INTERVAL '1 day',
  15
);


-- ============================================
-- 完成 DONE
-- ============================================
