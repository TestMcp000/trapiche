# 開發 Roadmap

> 最後更新: 2026-01-23  
> 狀態: Active  
> 範圍: **只寫 what/why/status + links**（不放 step-by-step、不放 SQL/commands、不放 code maps）

已落地行為（SSoT）：見 [SPEC.md](SPEC.md)。

上線/運維驗證（go-live）：見 [RUNBOOK.md](RUNBOOK.md) → [runbook/go-live.md](runbook/go-live.md)。

可立即開工的 steps：見 [TASKS.md](TASKS.md)（unblocked）與 [BLOCKERS.md](BLOCKERS.md)（blocked / external dependencies）。  
穩定的 technical specs：見 [`specs/README.md`](specs/README.md)。

---

## Priority 定義

| Priority | 定義 |
| -------- | ---- |
| P0       | 阻塞上線 |
| P1       | 上線必需 |
| P2       | 上線後優化 |
| P3       | Nice-to-have / tracking |

---

## P0 - Critical（阻塞上線）

### Production DB 對齊

- **狀態**: Pending
- **原因**: 避免 prod schema/RLS/RPC drift
- **連結**: `runbook/database-ops.md`、`../uiux_refactor.md` §3.9

### Pre-release Guardrails（上線前守門）

- **狀態**: In Progress
- **原因**: 部署前避免 regressions
- **連結**: `../uiux_refactor.md` §2（canonical checklist）

### Theme Console 手動驗證

- **狀態**: Pending
- **原因**: 確保 Owner/Editor flows 正確 + public 無 FOUC
- **連結**: `../uiux_refactor.md` §3.9、`SPEC.md`（Theme System）

---

## P1 - High（上線必需）

-（目前無 active P1 項目）

---

## P2 - Medium（上線後）

### Local 開發環境

- **狀態**: Deferred
- **原因**: 更安全的迭代（避免直接動 prod）
- **連結**: `runbook/database-ops.md`

---

## Tracking Items（追蹤項目）

| Item            | Status   | Notes                       |
| --------------- | -------- | --------------------------- |
| CSS Masonry     | Tracking | Waiting for browser support |
| Tailwind v4     | Tracking | Planned upgrade             |
| Containerization | Deferred | non-Vercel deployment       |

---

## Risk Registry（風險清單）

| Risk                    | Impact                    | Mitigation                       |
| ----------------------- | ------------------------- | -------------------------------- |
| Production DB drift     | Security/feature issues   | follow `runbook/database-ops.md` |

---

## Completed（歸檔）

- AI Analysis：Custom Templates 後台 UI（Owner CRUD + selection）— Implemented → `SPEC.md#known-gaps-roadmap-links`, `specs/completed/ai-analysis-spec.md`
- Analytics：Dashboard UI（Page Views）— Implemented → `SPEC.md#known-gaps-roadmap-links`, `specs/completed/page-views-analytics-spec.md`
- Users 後台：搜尋 / 分頁（`?q=` + `?page=`/`?pageSize=` + short_id 精準查詢）— Implemented → `SPEC.md#users-admin`
- See [archive/README.md](archive/README.md)

---

## 相關文件

- Docs hub：`README.md`
- Architecture：`../ARCHITECTURE.md`
- Implemented behavior：`SPEC.md`
- Security：`SECURITY.md`
- Ops runbook：`RUNBOOK.md`
