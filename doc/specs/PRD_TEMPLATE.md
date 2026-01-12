# <Feature> - Product Requirements Document (PRD)

> **Version**: 0.1  
> **Last Updated**: YYYY-MM-DD  
> **Status**: Draft  
> **Owner**: <name/role>  
> **Parent Document**: (optional) `./DATA_INTELLIGENCE.md`

本模板目標：讓 proposal **保持精簡**、避免與 `doc/SPEC.md` / `doc/specs/*` / `doc/archive/*` 重複而 drift。

---

## TL;DR

- 一句話說明這個功能要解什麼問題
- 一句話說明交付後會長什麼樣

---

## Decisions（關鍵決策；避免寫成 step plan）

| Topic | Decision | Why |
| --- | --- | --- |
| … | … | … |

---

## Scope

### In Scope

- …

### Out of Scope（Non-goals）

- …

---

## Requirements

### Functional (FR)

- FR-1: …
- FR-2: …

### Non-Functional (NFR)

- Performance: …
- Security: …
- Accessibility: …
- Observability: …

---

## Open Questions

- …

---

## Technical Spec（可選；若已有 specs，這裡只放連結）

- If this feature has stable contracts, create or link a single-feature spec under `doc/specs/{completed,proposed}/*-spec.md` and reference it here.

---

## Implementation Status（YYYY-MM-DD）

> **不要在這裡列 repo 現況明細**，避免與 `../SPEC.md` / `../ROADMAP.md` / `../TASKS.md` / `../BLOCKERS.md` 重複。

- Implemented behavior (SSoT): link to the exact section(s) in `../SPEC.md` (prefer anchors)
- Pending / planned work: `../ROADMAP.md`
- Operational enablement / verification: `../RUNBOOK.md`
- Security / RLS / secrets: `../SECURITY.md`
- Historical logs / code maps: `../archive/README.md` (optionally link specific `../archive/*.md`)

---

## Related

- Constraints: `../../ARCHITECTURE.md`
- Drift tracker / stable `@see`: `../../uiux_refactor.md`
- Docs hub: `../README.md`
