# Supabase AI / pgvector - Product Requirements Document (PRD)

> **Version**: 1.4  
> **Last Updated**: 2026-01-03  
> **Status**: Implemented - Reviewed (Phase 5–6 shipped; Phase 7+ tracked in `doc/ROADMAP.md`)  
> **Owner**: Site Owner (Single User)  
> **Parent Document**: [DATA_INTELLIGENCE.md](./DATA_INTELLIGENCE.md) Module C

本文件定位：保留「Module C 的產品邊界與決策」；pgvector/embeddings/search/RAG 的技術契約以 `doc/specs/completed/embeddings-semantic-search-spec.md` 為準，避免重複造成 drift。

---

## Technical Spec (Single Source)

- Canonical technical spec: `embeddings-semantic-search-spec.md`
- Key anchors（常用入口）:
  - Capabilities: `embeddings-semantic-search-spec.md#1-pgvector-能力說明`
  - Embedding strategy: `embeddings-semantic-search-spec.md#2-embedding-內容策略`
  - Search / Similar / RAG: `embeddings-semantic-search-spec.md#3-功能規格`
  - Auto updates: `embeddings-semantic-search-spec.md#4-自動更新機制`
  - Security: `embeddings-semantic-search-spec.md#6-安全性`

---

## Implementation Status（2026-01-03）

> 本段不列 repo 現況細節；現況以 `doc/SPEC.md` 為準，計畫以 `doc/ROADMAP.md` 為準。

- Implemented behavior (SSoT): [Embeddings & Semantic Search](../../SPEC.md#embeddings-and-semantic-search-admin-only)
- Pending / planned work: [ROADMAP.md](../../ROADMAP.md)
- Operational enablement / verification: [RUNBOOK.md](../../RUNBOOK.md)（details: `../../runbook/embeddings-preprocessing.md`）
- Security / RLS / secrets: [SECURITY.md](../../SECURITY.md)
- Historical logs / code maps: [Embeddings spec](embeddings-semantic-search-spec.md), [Archive index](../../archive/README.md)

---

## Scope (Product Boundary)

### In Scope

- Admin semantic search / hybrid search UI（Control Center）
- Similar items precompute（推薦基礎）
- RAG context retrieval for AI Analysis

### Out of Scope

- 即時 analytics 儀表板（另列功能）
- 第三方向量資料庫（Pinecone 等）整合（可作為未來選項）

---

## Phase 7: 進階功能（Tracked）

> 本段只保留入口；詳細以 `doc/ROADMAP.md` 為準。

- Tuning / deeper analytics / hybrid scoring variants

---

## Related

- Parent: [DATA_INTELLIGENCE.md](./DATA_INTELLIGENCE.md)
- Pipeline: [DATA_PREPROCESSING.md](./DATA_PREPROCESSING.md)
- Constraints: `../../../ARCHITECTURE.md`
- Drift tracker (stable `@see`): `../../../uiux_refactor.md`
- External refs: https://supabase.com/docs/guides/ai, https://github.com/pgvector/pgvector
