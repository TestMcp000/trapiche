# Step-by-Step Execution Plan — V15（CMS vNext：Nav/Blog Taxonomy/Events/Pages）

> 狀態: Active（本檔只寫「修復/新增的方案與步驟」，不在此直接改程式碼）  
> 最後更新: 2026-01-28  
> 現況 SSoT（已實作行為）: `doc/SPEC.md`  
> vNext PRD（decisions locked 2026-01-27）: `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`  
> Repo 驗證（2026-01-28）：請以本次 PR 的 `npm test`, `npm run lint`, `npm run type-check`, `npm run docs:check-indexes`, `npm run lint:md-links`, `npm run build` 為準  
> V15 完整快照（已歸檔）：`doc/archive/2026-01-28-step-plan-v15-cms-vnext-nav-blog-taxonomy-events-pages.md`

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

- Open drift items：0（2026-01-28）
- 若有新 drift：先寫到 `doc/TASKS.md` / `doc/ROADMAP.md`，需要可拆 PR 的 step-by-step 時再新增下一版（V16）。

---

## 2) Execution Plan（Active；以 PR 為單位；每 PR 可獨立驗收/回退）

> 本期以「CMS vNext」為主：先把 non-coder admin editor 補齊，再做 DB schema + public routes（避免一次改太大）。

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

## 3) 已完成（已歸檔）

- V15 完整快照（含已完成 PR-32..PR-43）已歸檔：`doc/archive/2026-01-28-step-plan-v15-cms-vnext-nav-blog-taxonomy-events-pages.md`
- 本檔只保留 active drift / 下一步；新增新 PR 請依 §2 的格式新增 `PR-XX`。
