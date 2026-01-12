# Agent Task List — PRD → `doc/meta/STEP_PLAN.md`

> Status: META（agent checklist）  
> Input: `doc/PRD_ACTIVE.md`（或使用者指定的 `doc/specs/completed/*.md`）  
> Output: `doc/meta/STEP_PLAN.md`

> 如果「PRD / SSoT / code」不一致：改用 `doc/meta/AGENT_PROMPT__STEP_PLAN__DRIFT.md`

## 0) 必讀文件（SSoT）

1. `ARCHITECTURE.md`
2. `doc/SPEC.md`
3. `doc/SECURITY.md`
4. `doc/RUNBOOK.md`（細節：`doc/runbook/*`）
5. `doc/GOVERNANCE.md`
6. `uiux_refactor.md`

## 1) 任務清單（照順序做）

1. 讀 PRD（預設：`doc/PRD_ACTIVE.md`），整理：
   - In Scope / Out of Scope
   - FR / NFR
   - 需要先決策的 Open Questions
2. 對齊現況（以 `doc/SPEC.md` 為準）：
   - 對照 PRD 的每個需求，標註「已存在 / 部分存在 / 不存在」
   - 每個結論附 evidence（檔案路徑 / route / DB table / SQL 檔名；不要貼大段 code）
3. 產出 `doc/meta/STEP_PLAN.md`（用既有模板結構）：
   - PR 粒度拆解（PR-1/PR-2/...）
   - 每個 PR 必含：Goal / Scope / Expected file touches / Steps / Verification / Docs updates / Rollback
   - Docs updates 依 `doc/GOVERNANCE.md` update matrix 列清單（links only）
   - 若需要新增/更新「單一功能契約/流程」：寫到 `doc/specs/{completed,proposed}/*-spec.md`（stable headings），其他文件只留連結
4. 同步 tracking docs（可選但建議）：
   - 外部依賴：更新 `doc/BLOCKERS.md`（只寫最小描述 + links）
   - 可立即開工：更新 `doc/TASKS.md`（PR-ready steps）
   - 狀態/風險：更新 `doc/ROADMAP.md`（what/why/status + links only）
5. 文件驗證（避免 broken links / index drift）：
   - `npm run docs:generate-indexes`
   - `npm run lint:md-links`
   - `npm run docs:check-indexes`

## 2) 禁止事項（避免 drift）

- 不要把 `doc/TASKS.md` / `doc/BLOCKERS.md` / `doc/ROADMAP.md` 當成現況 SSoT
- 不要複製貼上 SSoT 長段落；用「一句話 + link」即可
- 不要把單一功能的 contracts/flows 寫在 `doc/SPEC.md` / PRD / runbook；請寫到 `doc/specs/{completed,proposed}/*-spec.md` 後再引用
