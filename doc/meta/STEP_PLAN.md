# Step-by-Step Execution Plan — V14（No Active Drift；Ready for next drift）

> 狀態: Active（Drift repair plan；本檔只寫「修復方案/步驟」，不在此直接改程式碼）  
> 最後更新: 2026-01-23  
> 現況 SSoT（已實作行為）: `doc/SPEC.md`  
> Repo 驗證（2026-01-23）：請以本次 PR 的 `npm test`, `npm run lint`, `npm run type-check`, `npm run docs:check-indexes`, `npm run lint:md-links`, `npm run build` 為準  
> 歷史 snapshots（已完成只留 archive）：`doc/archive/README.md`（最新：`doc/archive/2026-01-23-step-plan-v14-edge-functions-auth-hardening.md`）

---

## 0) 必讀（SSoT / Guardrails）

- Architecture / 全域約束：`ARCHITECTURE.md`
- 已落地行為（SSoT）：`doc/SPEC.md`
- Security / RBAC / RLS / secrets：`doc/SECURITY.md`
- Ops / DB / go-live：`doc/RUNBOOK.md`（細節：`doc/runbook/*`）
- 文件分工 / update matrix：`doc/GOVERNANCE.md`
- Drift tracker + playbooks（stable `@see` index）：`uiux_refactor.md`

---

## 1) Drift / Clean-code 問題清單（Active）

> 本節只列「尚未修復」的飄移/技術債；已完成項一律歸檔到 `doc/archive/*`。

- None（2026-01-23）：Open drift items 以 `uiux_refactor.md` §4 為準。

---

## 2) Execution Plan（Active；以 PR 為單位；每 PR 可獨立驗收/回退）

> 當發現新 drift 時（docs/code mismatch），請先照 `uiux_refactor.md` §2/§3 做快速確認，再在本節新增可拆 PR 的落地步驟。

新增 PR item 的最小格式（**務必寫死到檔名/函式/指令；避免模糊**）：

1. Title：`PR-XX — <Domain>：<1 句話描述 drift 修復>`
2. Evidence（必填）：列出 `rg` 指令與命中的檔案路徑（至少 1 個）
3. Violates（必填）：引用 `ARCHITECTURE.md`/`doc/SPEC.md`/對應 spec 的章節或 anchor
4. Fix steps（必填）：
   - 明確列出要新增/修改的檔案路徑（逐一列出）
   - 明確列出要移除的舊呼叫點（逐一列出）
   - 若涉及 cache/SEO：明確列出要補的 `revalidateTag`/`revalidatePath` 與 canonical/redirect 行為
5. DoD（必填）：
   - `npm test`, `npm run lint`, `npm run type-check`
   - 針對 drift 的 grep 應為 0 命中（列出指令）
6. Post-merge（必填）：
   - 更新 `uiux_refactor.md` §4 item 狀態（不得改號）
   - 把本檔的已完成 PR steps 移到 `doc/archive/<date>-step-plan-vX-*.md`
   - `npm run docs:generate-indexes` + `npm run lint:md-links`

---
## 3) 每 PR 驗證清單（不可省略）

- `npm test`
- `npm run lint`
- `npm run type-check`
- Docs：`npm run docs:generate-indexes`, `npm run docs:check-indexes`, `npm run lint:md-links`
- `npm run build`（routes/SEO/redirect 相關 PR 必跑；先確認 `.env.local` 已設 `NEXT_PUBLIC_SITE_URL` + Supabase public env）
