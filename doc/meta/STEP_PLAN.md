# Step-by-Step Execution Plan — V2（Home UIUX + Gallery Hero/Hotspots + Hamburger Nav v2）

> 狀態: Active（Drift repair plan；本檔只寫「修復方案/步驟」，不在此直接改程式碼）  
> 最後更新: 2026-01-21（drift review refresh）  
> 現況 SSoT（已實作行為）: `doc/SPEC.md`  
> 目標 PRD（約束/合約）: `doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`（Implementation Contract）

---

## 0) 必讀（SSoT / Guardrails）

- Architecture / 全域約束：`ARCHITECTURE.md`
- 已落地行為（SSoT）：`doc/SPEC.md`
- 目標 PRD（contract）：`doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`
- Security / RBAC / RLS / secrets：`doc/SECURITY.md`
- Ops / DB / go-live：`doc/RUNBOOK.md`（細節：`doc/runbook/*`）
- 文件分工 / update matrix：`doc/GOVERNANCE.md`
- Drift tracker + playbooks（stable `@see` index）：`uiux_refactor.md`

---

## 1) Repo 現況（以工具輸出為準；2026-01-21）

- `npm test`：pass（含 `tests/architecture-boundaries.test.ts`）
- `npm run type-check`：pass（`tsconfig.typecheck.json`；exclude `uiux/` + `.next/**`）
- `npm run lint`：pass
- `npm run build`：若未設 `NEXT_PUBLIC_SITE_URL`，production collect phase 會 fail-fast（設計如此；見 `lib/site/site-url.ts` 與 `doc/runbook/deployment.md`）

---

## 2) Drift / Clean-code 問題清單（Active）

> 本節只列「尚未修復」的飄移/技術債；已完成項不再保留在本檔（避免干擾後續執行）。


### Drift-2：Admin Blog 仍產出 v1 internal links / revalidatePath（redirect chain / 一致性）

- 現況（SSoT）：
  - `app/[locale]/admin/(blog)/posts/page.tsx` 的 public preview link 仍使用 `/${locale}/blog/<category>/<slug>`。
  - `app/[locale]/admin/(blog)/posts/actions.ts` 的 `revalidatePath()` 仍對 v1 path 做精準 revalidate。
- 風險：
  - 內部鏈結依賴 `next.config.ts` 308 才到 v2（redirect chain + 觀感不一致）。
  - 若未完全依賴 tag invalidation，v2 page 的 cache/ISR 定位可能不精準。
- 修復：PR-10（Admin links 全量 canonical 化）✅ COMPLETED 2026-01-21

---

## 3) Execution Plan（Active；以 PR 為單位；每 PR 可獨立驗收/回退）

### PR-9 — Comments/Akismet permalink v2 canonical + 去重（SEO / 一致性）✅ COMPLETED 2026-01-21

Goal：所有 permalink（Akismet、admin feedback、debug output）與 sitemap/nav 的 v2 canonical 完全一致，避免 redirect chain 與雙軌。

**已完成：**

- [x] `permalink-io.ts`：使用 `buildBlogPostUrl()` / `buildGalleryItemUrl()` 產出 v2 canonical，locale 固定 `zh`
- [x] `feedback-admin-io.ts`：去重，改呼叫 `buildPermalink()` 而非自行組字串
- [x] 新增 `tests/comment-permalink.test.ts`（9 tests）驗證 v2 canonical patterns
- [x] `npm test`（1012 pass）、`npm run type-check`、`npm run lint` 全通過

---

### PR-10 — Admin Blog internal links 全量 canonical 化（避免 redirect chain）✅ COMPLETED 2026-01-21

Goal：admin 產出的 public preview links 一律為 v2 canonical（與 hamburger nav resolver / sitemap 一致）。

**已完成：**

- [x] `app/[locale]/admin/(blog)/posts/page.tsx`：public preview link 改為 `/${locale}/blog/posts/${slug}`
- [x] `app/[locale]/admin/(blog)/posts/actions.ts`：`revalidatePath()` 改為精準指向 v2 canonical `/${locale}/blog/posts/${slug}`
- [x] 簡化 revalidatePath 條件檢查（移除不必要的 category 檢查）
- [x] `npm test`（1012 pass）、`npm run type-check`、`npm run lint` 全通過

DoD：

- ✅ Admin UI 不再產出 v1 blog post path 作為 public preview link
- ✅ `revalidatePath()` 精準指向 v2 canonical post route

---

### PR-11 — Canonical redirects 永久化 + legacy routes 清理（SEO contract 對齊）✅ COMPLETED 2026-01-21

Goal：所有 canonicalization 都是永久 redirect（301/308），並移除會造成重複實作/混淆的 legacy pages。

**已完成：**

- [x] `app/[locale]/blog/page.tsx`：改為 `permanentRedirect()` for `?category=` canonicalization
- [x] `app/[locale]/gallery/page.tsx`：改為 `permanentRedirect()` for `?category=` canonicalization
- [x] `app/[locale]/gallery/[category]/page.tsx`：改為 `permanentRedirect()` for legacy category path
- [x] `app/[locale]/blog/[category]/[slug]/page.tsx`：已刪除（v1 → v2 redirect 由 `next.config.ts` 處理）
- [x] `app/[locale]/gallery/[category]/[slug]/page.tsx`：已刪除（v1 → v2 redirect 由 `next.config.ts` 處理）
- [x] `lib/seo/jsonld.ts`：SearchAction `urlTemplate` 改為 `?q=`
- [x] `tests/seo-jsonld.test.ts`：更新期望值以使用 `?q=`
- [x] `npm test`（1012 pass）、`npm run type-check`、`npm run lint` 全通過

DoD：

- ✅ 所有 canonicalization redirect 都是永久（301/308），不再是 307
- ✅ legacy v1 item pages 已刪除（僅保留 `next.config.ts` 的永久 redirect matrix）

---

### PR-12 — Comments UI folder refactor（提升內聚 / 降低跨 domain 耦合）✅ COMPLETED 2026-01-21

Goal：讓 comments UI 與 comments domain 一致，降低 blog/gallery 之間的 UI 耦合。

**已完成：**

- [x] 新增 `components/comments/` 目錄
- [x] 搬移 Comments UI 元件（4 tsx + 3 CSS modules）：
  - `ClientCommentSection.tsx`
  - `CommentSection.tsx`
  - `CommentForm.tsx`
  - `CommentItem.tsx`
  - `CommentSection.module.css`
  - `CommentForm.module.css`
  - `CommentItem.module.css`
- [x] 更新 `ClientCommentSection.tsx` 內部 dynamic import 路徑
- [x] 更新 `app/[locale]/blog/posts/[slug]/page.tsx` import 路徑
- [x] 更新 `app/[locale]/gallery/items/[category]/[slug]/page.tsx` import 路徑
- [x] `npm test`（1012 pass）、`npm run type-check`、`npm run lint` 全通過

DoD：

- ✅ comments UI 不再位於 `components/blog/*`
- ✅ Blog/Gallery 共同使用 comments UI 時，import path 與 domain 概念一致

---

## 4) 每 PR 驗證清單（不可省略）

- `npm test`
- `npm run lint`
- `npm run type-check`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run build`（routes/SEO/redirect 相關 PR 必跑）
