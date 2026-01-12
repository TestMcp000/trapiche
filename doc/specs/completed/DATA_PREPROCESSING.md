# Data Preprocessing Pipeline - Product Requirements Document (PRD)

> **Version**: 1.3  
> **Last Updated**: 2026-01-03  
> **Status**: Implemented - Reviewed (Phase 5.5–6.5 shipped; Phase 7+ tracked in `doc/ROADMAP.md`)  
> **Owner**: Site Owner (Quantum Nexus LNK LLC)  
> **Parent Document**: [DATA_INTELLIGENCE.md](./DATA_INTELLIGENCE.md) Module C Extension  
> **Alias**: Data Refinery Pipeline（數據煉製管線）

本文件定位：保留「為什麼要有 pipeline」與關鍵決策；pipeline contracts/流程以 `doc/specs/completed/data-preprocessing-pipeline-spec.md` 為準，避免重複造成 drift。

---

## 決策摘要

| 項目 | 決定 | 理由 |
| --- | --- | --- |
| 執行模式 | 非同步 (Asynchronous) | 避免阻塞主程式、利於批次處理 |
| 觸發方式 | Webhook + Cron Job | 即時更新 + 定期校準兼顧 |
| 切片策略 | 語義切片 (Semantic Chunking) | 保留語境、提升檢索品質 |
| 品質檢查 | LLM-as-a-Judge (GPT-4o-mini) | 自動評估切片語義完整度 |
| 架構約束 | IO 與 Pure 邏輯分離 | 可測試、降低耦合 |

---

## Technical Spec (Single Source)

- Canonical technical spec: `data-preprocessing-pipeline-spec.md`
- Key anchors（常用入口）:
  - Overview: `data-preprocessing-pipeline-spec.md#1-架構概觀`
  - Chunking: `data-preprocessing-pipeline-spec.md#3-語義切片semantic-chunking-stage`
  - Quality gate / Judge: `data-preprocessing-pipeline-spec.md#53-語義一致性評分llm-as-a-judge`
  - Orchestration: `data-preprocessing-pipeline-spec.md#6-異步執行與監控架構`
  - Re-ranking: `data-preprocessing-pipeline-spec.md#8-rag-精篩re-ranking`

---

## Implementation Status（2026-01-03）

> 本段不列 repo 現況細節；現況以 `doc/SPEC.md` 為準，計畫以 `doc/ROADMAP.md` 為準。

- Implemented behavior (SSoT): [Preprocessing](../../SPEC.md#preprocessing-admin-only)
- Pending / planned work: [ROADMAP.md](../../ROADMAP.md)
- Operational enablement / verification: [RUNBOOK.md](../../RUNBOOK.md)（details: `../../runbook/embeddings-preprocessing.md`）
- Security / RLS / secrets: [SECURITY.md](../../SECURITY.md)
- Historical logs / code maps: [Preprocessing spec](data-preprocessing-pipeline-spec.md), [Archive index](../../archive/README.md)

---

## 成功標準（Acceptance Criteria）

| 標準 | 驗收條件 |
| --- | --- |
| 雜訊排除 | 檢索結果不應出現 HTML 標籤或 UI 雜訊字眼 |
| 語義保留 | 切片需可獨立閱讀，不需回頭看全文 |
| 效能達成 | 非同步處理單筆內容在合理時間內完成（以 runbook/實測為準） |
| 零阻塞 | 清洗/產向量不影響 public SSR 讀取 |
| 品質達標 | Judge 通過率與平均分數維持在可接受區間（以監控與基準報告為準） |

---

## Related

- Parent: [DATA_INTELLIGENCE.md](./DATA_INTELLIGENCE.md)
- Module C: [SUPABASE_AI.md](./SUPABASE_AI.md)
- Constraints: `../../../ARCHITECTURE.md`
- Drift tracker (stable `@see`): `../../../uiux_refactor.md`
