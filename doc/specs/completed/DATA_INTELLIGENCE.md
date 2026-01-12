# Data Intelligence Platform - Unified PRD

> **Version**: 1.3  
> **Last Updated**: 2026-01-03  
> **Status**: Implemented - Reviewed (Modules A/B/C shipped; expansion tracked in `doc/ROADMAP.md`)  
> **Owner**: Site Owner (Single User)  
> **Supersedes**: 整合以下文件的核心決策與邊界（細節與契約請看各自的 SSoT）
>
> - `IMPORT_EXPORT.md` - Module A（資料匯入匯出）
> - `AI_ANALYSIS_v2.md` - Module B（AI 分析）
> - `SUPABASE_AI.md` - Module C（Vector / Embeddings / RAG）
> - `DATA_PREPROCESSING.md` - Module C Extension（前處理 pipeline）

本文件定位：只保留「整體願景/邊界/模組分工/關鍵決策」；避免把實作方法、步驟、code map 放在這裡（那些會 drift）。

---

## 決策摘要（核心）

| # | 決策項目 | 決定 |
|---|---|---|
| 1 | Import/Export 格式 | Blog=Markdown；其他=JSON；CSV 作為可選輸出格式 |
| 2 | 匯入安全 | 必須有 Dry Run preview + validation；失敗採用 transaction rollback |
| 3 | AI 分析成本控制 | 執行前顯示預估成本；資料過大時採樣；Owner 可強制確認後執行 |
| 4 | Preprocessing | 非同步 pipeline（clean → chunk → enrich → judge → rerank）以提升檢索品質 |
| 5 | Embeddings | 支援 semantic search + similar items + RAG retrieval；進階調參/analytics 走 roadmap |

---

## Implementation Status（2026-01-03）

> 本段不列 repo 現況細節；現況以 `doc/SPEC.md` 為準，計畫以 `doc/ROADMAP.md` 為準。

- Implemented behavior (SSoT): [Import/Export](../../SPEC.md#importexport-admin-only), [AI Analysis](../../SPEC.md#ai-analysis-admin-only), [Embeddings](../../SPEC.md#embeddings-and-semantic-search-admin-only), [Preprocessing](../../SPEC.md#preprocessing-admin-only)
- Pending / planned work: [ROADMAP.md](../../ROADMAP.md)
- Operational enablement / verification: [RUNBOOK.md](../../RUNBOOK.md)
- Security / RLS / secrets: [SECURITY.md](../../SECURITY.md)
- Historical logs / code maps: [Interfaces spec](data-intelligence-interfaces-spec.md), [A1/A2/A3 archived plan](../../archive/2026-01-03-data-intelligence-a1-a3-step-plan.md), [Archive index](../../archive/README.md)

---

## 願景 / 要解的問題

1. **資料可攜性**：可匯出備份、可批量匯入，避免被平台綁架。
2. **資料洞察**：用 AI 產出可執行的商業洞察（成本可控、可追溯）。
3. **智能搜尋與推薦**：用語意搜尋資料，並提供相似推薦與 RAG 檢索上下文。

---

## 系統邊界（不做什麼）

- 不做即時 analytics dashboard（另列功能）
- 不做自動化行銷/CRM（只產出洞察，不自動發信/投放）
- 不做圖片檔案搬移（僅處理 URL 與 metadata）
- 不做即時雙向同步（匯入/匯出為手動批次）

---

## 模組分工（SSoT Links）

| Module | 目的（一句話） | PRD | Technical Spec (SSoT) |
| --- | --- | --- | --- |
| A | 內容/商品/設定的匯入匯出（可攜性） | [IMPORT_EXPORT.md](./IMPORT_EXPORT.md) | [import-export-spec.md](import-export-spec.md) |
| B | AI 分析（洞察；成本可控） | [AI_ANALYSIS_v2.md](./AI_ANALYSIS_v2.md) | [ai-analysis-spec.md](ai-analysis-spec.md) |
| C | 向量/語意搜尋/RAG/相似推薦 | [SUPABASE_AI.md](./SUPABASE_AI.md) | [embeddings-semantic-search-spec.md](embeddings-semantic-search-spec.md) |
| C-ext | 前處理 pipeline（品質門檻） | [DATA_PREPROCESSING.md](./DATA_PREPROCESSING.md) | [data-preprocessing-pipeline-spec.md](data-preprocessing-pipeline-spec.md) |

Cross-module interfaces (Single Source): [data-intelligence-interfaces-spec.md](data-intelligence-interfaces-spec.md)

---

## Non‑Negotiables（只列會影響本平台的）

- 架構約束：`../../../ARCHITECTURE.md`（IO boundaries / server-only / bundle guardrails / validators）
- 安全規則：`../../SECURITY.md`（secrets handling / cron auth / RLS/RBAC）
- Ops：`../../RUNBOOK.md`（enablement / verification）

---

## Phase 7: 進階功能

> 本段只保留入口與分類；詳細 items/status 請以 `doc/ROADMAP.md` 為準。

- Hybrid search 調參 / deeper analytics
- 更完整的 control center（跨模組查詢/報表）
- 更細的成本/品質監控指標

---

## 成功指標（方向）

- 匯出/匯入可復原：資料一致性可驗證（以 spec + tests 為準）
- AI 分析可追溯：每次執行有成本估算、結果可回看、可分享（受控）
- 搜尋可用：語意搜尋與相似推薦能支撐 admin 工作流（可擴充）

---

## 風險（摘要）

- Provider/keys/production-only gating（例如 payments / 部分 secrets）→ `doc/BLOCKERS.md`
- 文件 drift（PRD/spec/SPEC 不一致）→ `doc/GOVERNANCE.md` + `uiux_refactor.md` §4
