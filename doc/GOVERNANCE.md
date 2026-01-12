# Documentation Governance（讓後續 Agent 一看就懂）

> Last Updated: 2026-01-02  
> Status: ACTIVE  
> Audience: future agents + maintainers  
> Canonical doc root: `doc/`  
> Goal: 一份文件就能快速檢視「所有文檔的定位、約束、更新規則與索引」。

## Quick Navigation

- [0. Non‑Negotiables](#0-nonnegotiables)
- [1. Repo Map](#1-repo-map)
- [2. Document Map（清單 + 定位）](#2-document-map清單--定位)
- [2.8 現況結論](#28-現況結論2026-01-02)
- [3. SRP / Include / Exclude（文件責任邊界）](#3-srp--include--exclude文件責任邊界)
- [4. Update Matrix（改了什麼 → 要更新哪些文件）](#4-update-matrix改了什麼--要更新哪些文件)
- [5. Reference Rules（連結與 `@see` 規範）](#5-reference-rules連結與-see-規範)
- [6. Maintenance Workflow（PR 流程）](#6-maintenance-workflowpr-流程)
- [7. Doc IA Improvements（已做/待做）](#7-doc-ia-improvements已做待做)

---

## 0. Non‑Negotiables

1. **SRP（單一職責）**：一份文件只能有一個存在理由；不要把「規格 / 操作 / 進度 / 歷史」混在同一份。
2. **DRY（禁止重複敘述）**：只保留一個 Single Source；其他地方用連結引用。
3. **SSoT 優先序**（遇到衝突以此為準）：
   - 架構/全域約束：`../ARCHITECTURE.md`
   - 已實作行為（現況）：`SPEC.md`
   - 安全策略：`SECURITY.md`
   - 上線/運維：`RUNBOOK.md`
   - 進度/風險（what/why/status）：`ROADMAP.md`
   - Drift / 修復 playbook / stable `@see`：`../uiux_refactor.md`
4. **Stable `@see`（程式碼註解可引用）**：
   - 允許：`ARCHITECTURE.md`、`uiux_refactor.md`、`doc/SPEC.md`、`doc/specs/**/*.md`、`doc/archive/*.md`
   - 避免：`TASKS.md`、`BLOCKERS.md`、`ROADMAP.md`（內容會被清理/重排，容易斷鏈）
5. **`../uiux_refactor.md` 穩定性約束**：`§4` item numbers 與 `§6.*` headings 會被 in-code `@see` 引用，禁止改號/搬動。

---

## 1. Repo Map

> 目的：快速知道「文件對應到哪一層」。

```
myownwebsite/
  app/           # Next.js App Router（pages, route handlers, server actions）
  components/    # UI（public + admin）
  hooks/         # client-only hooks（frontend bridge）
  lib/           # domain logic（pure / io / cached / validators）
  supabase/      # DB scripts + edge functions
  tests/         # unit tests + architecture guardrails
  doc/           # docs + archive + runbook + meta + specs
```

---

## 2. Document Map（清單 + 定位）

### 2.1 Core（每天會用、且需要維持一致）

| File | 主要用途（一句話） |
| --- | --- |
| `README.md` | Docs Hub（閱讀路徑 + 入口連結） |
| `STATUS.md` | Owner dashboard（只看「沒做的」與「飄移」；非 SSoT） |
| `../ARCHITECTURE.md` | 架構約束 / 分層 / guardrails（what must be true） |
| `SPEC.md` | 已實作行為（what exists now） |
| `SECURITY.md` | Auth/RLS/RBAC/secrets 安全規則 |
| `RUNBOOK.md` | Ops runbook index（細節在 `runbook/*`） |
| `ROADMAP.md` | 高階計畫與風險（what/why/status + links only） |
| `../uiux_refactor.md` | Drift tracker + 修復手冊 + stable `@see` index |

### 2.2 Work Tracking（任務分流）

| File | 主要用途 |
| --- | --- |
| `TASKS.md` | 可立即拆 PR 的 step-by-step（unblocked） |
| `BLOCKERS.md` | 外部依賴/阻塞（providers/keys/approval）導致暫時做不了的 TODO |

### 2.3 Design / Rationale（設計依據，不是現況）

| Folder/File | 主要用途 |
| --- | --- |
| `specs/README.md` | Specs/PRD 索引（已落地 vs 未落地） |
| `specs/completed/*.md` | 已落地：PRD（why）+ 單一功能契約/流程（how） |
| `specs/proposed/*.md` | 未落地：PRD（why）+ 單一功能契約/流程（how） |

### 2.4 History / Audit Trail（歷史記錄）

| Folder/File | 主要用途 |
| --- | --- |
| `archive/README.md` | Archive 索引（按時間列 completed logs） |
| `archive/*.md` | implementation logs / troubleshooting / code maps（不承擔現況語意） |

### 2.5 Single‑Feature Specs（穩定規格；常作為 `@see`）

| Folder/File | 主要用途 |
| --- | --- |
| `specs/README.md` | specs 索引（每份 spec 的定位與狀態） |
| `specs/{completed,proposed}/*-spec.md` | 單一功能規格（標 DRAFT/Stable；heading 需穩定） |

### 2.6 Process / CI

| File | 主要用途 |
| --- | --- |
| `../.github/PULL_REQUEST_TEMPLATE.md` | PR checklist（含「哪些變更要同步哪些文件」） |

---

### 2.7 Meta / Agent Prompts（不屬於產品/系統規格）

| File | 主要用途 | Rule |
| --- | --- | --- |
| `PRD_ACTIVE.md` | Active PRD workspace（預設 agent input；用來產出 step plan） | 不是 SSoT；PRD 穩定/核准後請另存到 `specs/proposed/*.md`（落地後移到 `specs/completed/*.md`） |
| `meta/AGENT_PROMPT__STEP_PLAN.md` | 讀 PRD → 產出 step-by-step 計畫（常態模式） | 不要被 `@see`；輸出結果以 `meta/STEP_PLAN.md` 呈現 |
| `meta/AGENT_PROMPT__STEP_PLAN__DRIFT.md` | PRD / Docs / Code 不對齊時的 prompt（先對齊再產 plan） | drift/alignment mode；不要混進產品規格 |
| `meta/STEP_PLAN.md` | 詳細步驟計畫（含約束/邊界/SSoT） | 不是 tracking docs；完成後把可執行項摘到 `TASKS.md` / `BLOCKERS.md` |

---

## 2.8 現況結論（2026-01-02）

- 文檔結構以「Core + Work Tracking + Specs + Archive」分層，避免把 status/steps/歷史塞進同一份文件。
- 最大風險不是缺文件，而是 **重複敘述造成 drift**：因此本文件集中「更新矩陣 + 引用規則」，其他地方以連結導覽為主。

---

## 3. SRP / Include / Exclude（文件責任邊界）

> 如果你不確定「該寫哪裡」，先看這張表（然後用連結，不要複製貼上）。

| Document | Include | Exclude |
| --- | --- | --- |
| `../ARCHITECTURE.md` | 硬性約束、分層、命名、guardrails、測試守門準則 | roadmap/status、drift 清單、runbook 步驟 |
| `SPEC.md` | 已實作行為（feature、路由、資料模型、實作定位） | TODO/blocked、step-by-step、外部依賴 |
| `ROADMAP.md` | what/why/status/risks + links | SQL/commands、實作步驟、檔案 code map |
| `SECURITY.md` | auth/RLS/RBAC、secrets handling、安全期待 | 產品規格、部署步驟（改放 RUNBOOK） |
| `RUNBOOK.md` | Ops 入口（index；細節在 `runbook/*`：部署/DB ops/驗證/Payments/AI） | 產品規格、長篇設計 rationale |
| `../uiux_refactor.md` | drift tracker、修復手冊、stable `@see` index | roadmap backlog、任務清單（改 TASKS/BLOCKERS） |
| `TASKS.md` | 可拆 PR 的「怎麼做」任務清單（unblocked） | 長期規格、已完成歷史（改 archive） |
| `BLOCKERS.md` | 外部阻塞 + DoR/DoD + minimal links | 完整 implementation steps（改 TASKS/RUNBOOK） |
| `specs/{completed,proposed}/*.md` | design/PRD（why）與單一功能契約/流程（how） | 現況宣稱若已落地需回寫 `SPEC.md` |
| `archive/*.md` | historical records / code maps / troubleshooting | active TODOs / 現況宣稱 |

---

## 4. Update Matrix（改了什麼 → 要更新哪些文件）

| 你做的變更 | 必須更新的文件 | 典型連帶檢查 |
| --- | --- | --- |
| 新增/調整全域架構規則（IO boundaries、cache、bundle guard） | `../ARCHITECTURE.md` | `../tests/architecture-boundaries.test.ts` 是否需同步 |
| 新增/修改 feature 行為/路由/資料模型 | `SPEC.md` | 更新 Module Inventory / Related Docs links |
| 新增 env vars、secrets 或調整 secrets flow | `../README.md`（env template）、`SECURITY.md`、必要時 `RUNBOOK.md` | 確認沒有進 `NEXT_PUBLIC_*` |
| 變更部署流程、DB scripts、verification queries | `RUNBOOK.md`（更新對應 `runbook/*` 子頁） | `../scripts/db.mjs` 是否與文件一致 |
| 新增/調整 cron/worker/webhook endpoints | `RUNBOOK.md`（更新對應 `runbook/*` 子頁）+ `SECURITY.md`（auth headers） | `CRON_SECRET`/`WORKER_SECRET` 規則一致 |
| 新增/調整 RLS、RBAC、admin gate 規則 | `SECURITY.md` | `../ARCHITECTURE.md`（RLS is final boundary）是否被違反 |
| 新增提案/PRD | `specs/README.md` | 在 `SPEC.md` 加上 mapping 或「尚未落地」連結 |
| 完成一段大型重構/修復 | `archive/<date>-*.md` | `../uiux_refactor.md` 移除已完成 drift，保留索引 |
| Roadmap 狀態變更（只改狀態/風險） | `ROADMAP.md` | 不要塞 steps/SQL/檔案細節 |

---

## 5. Reference Rules（連結與 `@see` 規範）

1. **Canonical paths**
   - `doc/*.md` 連到 root 檔案用 `../...`
   - root 檔案連到 docs 用 `doc/...`
2. **Link over duplication**：同一段流程/規則不要在多份文件重寫，改成「一句話 + 連結」。
3. **Stable `@see` targets（給程式碼註解用）**
   - 優先：`ARCHITECTURE.md`、`uiux_refactor.md`、`doc/specs/**/*.md`
   - 次選：`doc/SPEC.md`、`doc/archive/*.md`
4. **不要把 `@see` 指到 tracking 文件**：`TASKS.md` / `BLOCKERS.md` / `ROADMAP.md` 會被清理/重排，不穩定。

---

## 6. Maintenance Workflow（PR 流程）

1. **先決定文件類型**（SRP）：這是「現況」→ `SPEC.md`；是「怎麼上線」→ `RUNBOOK.md`；是「安全規則」→ `SECURITY.md`；是「計畫」→ `ROADMAP.md`。
2. **只在一個地方寫清楚**，其他地方改連結。
3. **完成後做歸檔**：重構/除錯過程放 `archive/`；`../uiux_refactor.md` 只留 active drift + stable index。
4. **PR 時用模板自檢**：`../.github/PULL_REQUEST_TEMPLATE.md` 的 doc checklist 需要逐項勾。

---

## 7. Doc IA Improvements（已做/待做）

### 7.1 已做（本次更新）

- 將治理文件收斂到 `GOVERNANCE.md`（本檔），`doc/README.md` 只保留閱讀路徑與入口連結。
- 將工作追蹤分流到：
  - `TASKS.md`（可立即拆 PR steps）
  - `BLOCKERS.md`（外部阻塞）
- `meta/` 收斂成「2 prompts + 1 output」的最小集合，降低 agent routing 歧義。
- 增加 CI：Markdown link check（relative targets + `#anchor`）：
  - Local: `npm run lint:md-links`
  - CI: `.github/workflows/ci.yml` 會執行
- Docs indexes 自動生成（避免索引漂移）：
  - Local update: `npm run docs:generate-indexes`
  - CI check: `npm run docs:check-indexes`
  - Managed sections: `specs/README.md`、`archive/README.md`（AUTO-GENERATED block）
- 移除 root legacy stubs（`improve.md` / `markdown.md` / `PENDING.md`），讓 docs root 更單純。
- 建立固定模板（降低格式漂移）：
  - `archive/TEMPLATE.md`
  - `specs/PRD_TEMPLATE.md`
  - `specs/TEMPLATE.md`
