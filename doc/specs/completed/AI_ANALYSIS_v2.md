# AI Analysis Feature - Product Requirements Document (PRD)

> **Version**: 2.3  
> **Last Updated**: 2026-01-03  
> **Status**: Approved PRD (implementation: `doc/SPEC.md`; remaining: `doc/ROADMAP.md`)  
> **Owner**: Site Owner (Single User)

本文件定位：只保留 **why / product boundary / decisions / acceptance**。  
單一功能的技術契約與流程（how, contracts, flows）請以 `ai-analysis-spec.md` 為準，避免在 PRD 重複寫造成 drift。

---  

## 決策摘要

| 項目 | 決定 |
| --- | --- |
| API Key 儲存 | 環境變數（server-only） |
| 背景執行 | Cron + job queue（不阻塞互動） |
| 報告呈現 | Markdown 報告（可追溯、可重跑） |
| 分析模板 | 預設模板 + Owner 自訂模板 |
| 成本控制 | 執行前顯示預估成本 + 門檻警告 + 採樣策略 |
| 分享 | Report share links（可撤銷/可過期；public noindex） |
| 隱私 | AI 僅接收去識別化資料（不含 PII） |

---  

## Scope

### In Scope

- Admin-only：建立/執行/查看 AI analysis reports
- Scheduled reports（cron）：自動產生 pending reports 並背景處理
- Custom templates（Owner-only CRUD；Editor read-only for selection）
- Share links（Owner-only create/revoke/expiry；public read-only viewer）

### Out of Scope

- 即時 analytics dashboard
- 自動化行銷/CRM（本功能只產出洞察，不自動發信/投放）

---  

## Technical Spec (Single Source)

- Canonical technical spec: `ai-analysis-spec.md`
- Key anchors:
  - Scheduled: `ai-analysis-spec.md#scheduled-reports`
  - Share links: `ai-analysis-spec.md#share-links`
- RAG retrieval contracts (Module C): `embeddings-semantic-search-spec.md#33-rag檢索增強生成`
- Ops enablement / smoke test: `../../runbook/ai-analysis.md`

---  

## Implementation Status（2026-01-03）

> 本段不列 repo 現況細節；現況以 `doc/SPEC.md` 為準，計畫以 `doc/ROADMAP.md` 為準。

- Implemented behavior (SSoT): `../../SPEC.md` → `#ai-analysis-admin-only`
- Pending / planned work: `../../ROADMAP.md`
- Ops / verification: `../../RUNBOOK.md` → `../../runbook/ai-analysis.md`
- Security / RLS / secrets: `../../SECURITY.md`
- Historical logs / code maps: `../../archive/2025-12-30-ai-analysis-implementation.md`, `../../archive/2025-12-31-ai-analysis-e2e-hardening.md`

---  

## Acceptance Criteria (DoD)

- 執行前一定能看到：資料量 + 預估成本 + 警告（若超過門檻）
- 不會把 PII 傳給 AI（以 `ai-analysis-spec.md` + `../../SECURITY.md` 的規則為準）
- 報告可追溯：可重跑、可刪除、可分享且可撤銷/可過期
- Public share viewer 必須 noindex 且不提供寫入能力

---  

## Related

- Parent: `DATA_INTELLIGENCE.md` (Module B)
- Constraints: `../../../ARCHITECTURE.md`
- Drift tracker (stable `@see`): `../../../uiux_refactor.md`
