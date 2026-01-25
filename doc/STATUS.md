# Owner Dashboard（只看這份就好）

> Last Updated: 2026-01-23  
> Status: ACTIVE  
> Audience: Owner（只關心「沒做的」與「飄移」）

本檔定位：把「你需要知道的事」壓到一頁。  
細節（實作方法 / prompts / 步驟 / 歷史）全部交給 agent，請看各文件連結。

---

## 0) 入口（避免迷路）

- 現況（已落地行為）：`doc/SPEC.md`
- 計畫（what/why/status）：`doc/ROADMAP.md`
- 可立即開工的 steps：`doc/TASKS.md`（unblocked）
- 外部阻塞：`doc/BLOCKERS.md`

## 1) 已實作（現況 SSoT）

- 只看：`doc/SPEC.md`

---

## 2) 未實作 / 尚未完成（Next）

> 來源：`doc/ROADMAP.md`（what/why/status）+ `doc/BLOCKERS.md`（外部依賴）

### P0（上線阻塞）

- Production DB alignment：Pending → `doc/runbook/database-ops.md`
- Pre-release guardrails：In Progress → `uiux_refactor.md` §2（checklist）
- Theme console manual verification：Pending → `uiux_refactor.md` §3.9 + `doc/SPEC.md`（Theme System）

### P1（上線必需）

- （目前無 P1 項目）

### P2（上線後）
- （目前無 P2 active 項目）

---

## 3) Drift（文件 / 規則 / 程式碼不一致）

- Canonical drift tracker：`uiux_refactor.md` §4（in-code `@see` 會引用；不要改號）
- 現況：無 active drift（以 `uiux_refactor.md` §4 的狀態為準）
- 最近歸檔：Edge Functions auth hardening（`uiux_refactor.md` §4 item 20；snapshot：`doc/archive/2026-01-23-step-plan-v14-edge-functions-auth-hardening.md`）
- Build note：`npm run build` 需先設定 `.env.local`（至少 `NEXT_PUBLIC_SITE_URL`；見 `README.md` 與 `doc/runbook/e2e-acceptance.md`）
- 若你只想看結論：看 `uiux_refactor.md` §4 每個 item 的狀態（ACTIVE/ARCHIVED/COMPLETE）
- 現況：以 `uiux_refactor.md` §4 為準；落地 steps 以 `doc/meta/STEP_PLAN.md` 為準
- 若發現新 drift：把「一句話的 claim + evidence paths」新增到 `uiux_refactor.md` §4（細節落地記錄放 `doc/archive/*`）

---

## 4) 文件分工（你不用讀的）

- PRD（active workspace；agent input）：`doc/PRD_ACTIVE.md`  
- prompts / step plan（agent 工作區）：`doc/meta/*`
- 歷史實作與除錯紀錄（只留作證據）：`doc/archive/*`
- 設計/PRD（why，不是現況）：`doc/specs/completed/*`
- 單一功能的穩定 spec（常給 agent 或 in-code `@see` 用）：`doc/specs/*`
