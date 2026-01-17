# Specs / PRDs Index

> Scope: single-feature technical specs with **stable headings** (often referenced by in-code `@see`) + PRD/design docs (why/decisions).  
> Canonical behavior (what exists now): `../SPEC.md`  
> Historical implementation logs: `../archive/`

Folders:

- `completed/` — 已落地（landed / implemented）
- `proposed/` — 未落地（planned / not shipped yet）

Templates:

- Technical spec template: `TEMPLATE.md`
- PRD template: `PRD_TEMPLATE.md`

---

## Completed（已落地）

<!-- AUTO-GENERATED:SPECS_COMPLETED:START -->

| File | Type | Status | Last Updated | Title |
| --- | --- | --- | --- | --- |
| [AI_ANALYSIS_v2.md](completed/AI_ANALYSIS_v2.md) | PRD | Approved PRD (implementation: `doc/SPEC.md`; remaining: `doc/ROADMAP.md`) | 2026-01-03 | AI Analysis Feature - Product Requirements Document (PRD) |
| [ai-analysis-spec.md](completed/ai-analysis-spec.md) | Spec | Stable | 2026-01-11 | AI Analysis Spec（Admin-only） |
| [DATA_INTELLIGENCE.md](completed/DATA_INTELLIGENCE.md) | PRD | Implemented - Reviewed (Modules A/B/C shipped; expansion tracked in `doc/ROADMAP.md`) | 2026-01-03 | Data Intelligence Platform - Unified PRD |
| [DATA_PREPROCESSING.md](completed/DATA_PREPROCESSING.md) | PRD | Implemented - Reviewed (Phase 5.5–6.5 shipped; Phase 7+ tracked in `doc/ROADMAP.md`) | 2026-01-03 | Data Preprocessing Pipeline - Product Requirements Document (PRD) |
| [data-intelligence-interfaces-spec.md](completed/data-intelligence-interfaces-spec.md) | Spec | Stable | 2026-01-03 | Data Intelligence — Module Interfaces Spec |
| [data-preprocessing-pipeline-spec.md](completed/data-preprocessing-pipeline-spec.md) | Spec | Stable | 2026-01-02 | Data Preprocessing Pipeline — Technical Spec |
| [embedding-queue-dispatcher-worker-spec.md](completed/embedding-queue-dispatcher-worker-spec.md) | Spec | Stable (referenced by in-code `@see`; keep headings stable) | — | Embedding Queue Orchestration Spec (Dispatcher / Worker) |
| [embeddings-semantic-search-spec.md](completed/embeddings-semantic-search-spec.md) | Spec | Stable | 2026-01-02 | Embeddings & Semantic Search (pgvector) — Technical Spec |
| [IMPORT_EXPORT.md](completed/IMPORT_EXPORT.md) | PRD | Implemented - Reviewed (see `doc/SPEC.md`) | 2026-01-03 | Import/Export Feature - Product Requirements Document (PRD) |
| [import-export-spec.md](completed/import-export-spec.md) | Spec | Stable | 2026-01-12 | Import/Export (Admin-only) — Technical Spec |
| [page-views-analytics-spec.md](completed/page-views-analytics-spec.md) | Spec | DRAFT | 2026-01-03 | Page Views Analytics Spec |
| [SUPABASE_AI.md](completed/SUPABASE_AI.md) | PRD | Implemented - Reviewed (Phase 5–6 shipped; Phase 7+ tracked in `doc/ROADMAP.md`) | 2026-01-03 | Supabase AI / pgvector - Product Requirements Document (PRD) |

<!-- AUTO-GENERATED:SPECS_COMPLETED:END -->

---

## Proposed（未落地）

<!-- AUTO-GENERATED:SPECS_PROPOSED:START -->

| File | Type | Status | Last Updated | Title |
| --- | --- | --- | --- | --- |
| [admin-errorlog-spec.md](proposed/admin-errorlog-spec.md) | Spec | DRAFT | 2026-01-02 | Admin Error Log — Spec |
| [admin-i18n-toggle-spec.md](proposed/admin-i18n-toggle-spec.md) | Spec | Stable (Implemented) | 2026-01-04 | Admin i18n Toggle — Spec |
| [ANALYTICS_PERSONALIZATION_UMAMI.md](proposed/ANALYTICS_PERSONALIZATION_UMAMI.md) | PRD | Draft | 2026-01-04 | Behavior Analytics + Personalization (Umami + Supabase) - Product Requirements Document (PRD) |
| [safety-risk-engine-spec.md](proposed/safety-risk-engine-spec.md) | Spec | DRAFT | 2026-01-17 | AI Safety Risk Engine — Spec |

<!-- AUTO-GENERATED:SPECS_PROPOSED:END -->

---

## Rules

- If a spec is referenced by in-code `@see`, keep headings stable (avoid renumbering/moving sections).
- Implemented behavior is single-sourced in `../SPEC.md`; avoid duplicating contracts/flows in other docs.
- Keep PRD/spec/runbook/SPEC drift-free via links (see `../GOVERNANCE.md`).
