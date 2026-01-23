# 2026-01-23 - Step Plan V11（Build + SEO URL Builders）(Archive)

> Date: 2026-01-23  
> Status: COMPLETE ✅ (Archived snapshot; active plan lives in ../meta/STEP_PLAN.md)  
> Scope: Build fix (Gallery empty routes) + SEO internal links canonicalization (Blog/Gallery)  
> Implemented behavior (SSoT): ../SPEC.md  
> Constraints: ../../ARCHITECTURE.md

## Summary

- What shipped: PR-32 (Gallery routes non-empty + legacy redirects), PR-30/PR-33 (Blog/Gallery internal links migrated to lib/seo/url-builders.ts)
- Why archive: doc/meta/STEP_PLAN.md should only keep active drift / next steps
- Repo verification (2026-01-23): 
pm test（1115 pass）, 
pm run type-check, 
pm run lint, 
pm run docs:check-indexes, 
pm run lint:md-links passed; 
pm run build requires .env.local (at least NEXT_PUBLIC_SITE_URL) per README.md

## Archived Snapshot（verbatim）
# Step-by-Step Execution Plan — V11（Active Drift: Build + SEO URL Builders）

> 狀態: Active（Drift repair plan；本檔只寫「修復方案/步驟」，不在此直接改程式碼）  
> 最後更新: 2026-01-22  
> 現況 SSoT（已實作行為）: `doc/SPEC.md`  
> 目標 PRD（約束/合約）: `doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`（Implementation Contract）  
> Repo 驗證（2026-01-22）：`npm test`（1115 pass）, `npm run lint`, `npm run type-check` 通過；`npm run build` **失敗**（Gallery routes 空 module；見 §1 item 1）  
> 歷史 snapshots（已完成只留 archive）：`doc/archive/README.md`

---

## 0) 必讀（SSoT / Guardrails）

- Architecture / 全域約束：`ARCHITECTURE.md`
- 已落地行為（SSoT）：`doc/SPEC.md`
- 目標 PRD（contract）：`doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`
- Security / RBAC / RLS / secrets：`doc/SECURITY.md`
- Ops / DB / go-live：`doc/RUNBOOK.md`（細節：`doc/runbook/*`）
- AI / OpenRouter ops：`doc/runbook/ai-analysis.md`
- 文件分工 / update matrix：`doc/GOVERNANCE.md`
- Drift tracker + playbooks（stable `@see` index）：`uiux_refactor.md`

---

## 1) Drift / Clean-code 問題清單（Active）

> 本節只列「尚未修復」的飄移/技術債；已完成項一律歸檔到 `doc/archive/*`。

1. **[ARCHIVED ✅][P0] Build broken：Gallery routes 存在空的 page modules，`npm run build` 直接失敗**
   - Status: **已修復**（PR-32：2026-01-22）
   - Fix:
     - `app/[locale]/gallery/page.tsx`（145 lines：list page + legacy `?category=` redirect）
     - `app/[locale]/gallery/categories/[slug]/page.tsx`（147 lines：category page）
     - `app/[locale]/gallery/[category]/page.tsx`（38 lines：legacy 308 redirect）

2. **[ARCHIVED ✅][P1] SEO drift：Blog 的 internal links 未全面使用 URL builders（避免 SEO drift）**
   - Status: **已修復**（PR-33：2026-01-23）
   - Evidence
     - `rg -n "\\$\\{locale\\}/blog" app components -S`
       - Blog 命中（節選）：`components/Header.tsx`, `components/Footer.tsx`, `components/blog/*`, `app/[locale]/blog/*`, `app/[locale]/admin/(blog)/*/actions.ts`
   - Violates
     - `ARCHITECTURE.md` §3.11（v2 canonical path builders：Blog canonical path 僅允許 `lib/seo/url-builders.ts` / `lib/site/nav-resolver.ts` 產出）
   - Note: Gallery drift 已於 PR-30（2026-01-23）修復

---

## 2) Execution Plan（Active；以 PR 為單位；每 PR 可獨立驗收/回退）

> 當發現新 drift 時（docs/code mismatch），請先照 `uiux_refactor.md` §2/§3 做快速確認，再在本節新增可拆 PR 的落地步驟。

新增 PR item 的最小格式（**務必寫死到檔名/函式/指令；避免模糊**）：

1. Title：`PR-XX — <Domain>：<1 句話描述 drift 修復>`
2. Evidence（必填）：列出 `rg` 指令與命中的檔案路徑（至少 1 個）
3. Violates（必填）：引用 `ARCHITECTURE.md`/`doc/SPEC.md`/對應 PRD 的章節或 anchor
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

### PR-32 — Build/Availability：補齊 Gallery routes（移除空 module）+ legacy redirects 對齊 `doc/SPEC.md` ✅ COMPLETED (2026-01-22)

1. Evidence
   - `Get-ChildItem app -Recurse -File -Include *.ts,*.tsx,*.mts | Where-Object { $_.Length -eq 0 }`
2. Violates
   - `doc/SPEC.md` §「圖庫」→ Routes
3. Fix steps
   - `app/[locale]/gallery/page.tsx`（new server page; 不可空檔）
     - `searchParams` 支援：`category?`, `q?`, `tag?`, `sort?`
     - 若存在 `searchParams.category`（legacy）：使用 `permanentRedirect(buildGalleryCategoryUrl(locale, categorySlug, { q, tag, sort }))`
       - URL builder：`import { buildGalleryCategoryUrl } from '@/lib/seo/url-builders'`
     - Feature gate：`await isGalleryEnabledCached()` false → `notFound()`
     - 初始資料 fetch（server-side；public reads 必須走 cached modules）：
       - `getVisibleGalleryCategoriesCached()`
       - `getVisibleGalleryPinsCached('gallery')`
       - `getVisibleGalleryItemsPageCached({ limit: 24, offset: 0, q, tag, sort })`
     - likedByMe overlay（不污染 public cache；僅在 page layer 做）：
       - `const anonId = (await cookies()).get(ANON_ID_COOKIE_NAME)?.value`
       - `const likedIds = await getLikedGalleryItemIds(anonId, [...initialItemsIds, ...pinnedItemIds])`
       - 將 `likedByMe` merge 回 `initialItems` 與 pins 的 `pin.item`
     - Render：
       - `Header` / `Footer`
       - `GalleryMasonry` props：`initialItems`, `initialTotal`, `initialQuery`, `categories`, `pins`, `locale`
     - `generateMetadata()`：
       - `getMetadataAlternates('/gallery', locale)`
   - `app/[locale]/gallery/categories/[slug]/page.tsx`（new server page; 不可空檔）
     - `params.slug` → `categorySlug`
     - 確認分類存在且可見：
       - `const categories = await getVisibleGalleryCategoriesCached()`
       - `if (!categories.some((c) => c.slug === categorySlug)) notFound()`
     - 初始資料 fetch：`getVisibleGalleryItemsPageCached({ categorySlug, limit: 24, offset: 0, q, tag, sort })`
     - likedByMe overlay（同 PR-32 list page）
     - `generateMetadata()`：
       - `getMetadataAlternates(\`/gallery/categories/${categorySlug}\`, locale)`
   - `app/[locale]/gallery/[category]/page.tsx`（legacy redirect-only; 不可空檔）
     - `params.category` → `categorySlug`
     - `permanentRedirect(buildGalleryCategoryUrl(locale, categorySlug, { q, tag, sort }))`
4. DoD
   - `Get-ChildItem app -Recurse -File -Include *.ts,*.tsx,*.mts | Where-Object { $_.Length -eq 0 }` → 0 hits
   - `npm test`, `npm run lint`, `npm run type-check`, `npm run build`
5. Post-merge
   - `doc/SPEC.md`：Gallery routes 需回寫為「可 build / 可運作」的現況（或移除不實宣稱）
   - `uiux_refactor.md` §4：新增/更新 drift item（Build broken → ARCHIVED ✅）
   - `npm run docs:generate-indexes` + `npm run lint:md-links`

---

### PR-30 — SEO/Consistency：Gallery canonical URL / internal links 全面改用 URL builders ✅ COMPLETED (2026-01-23)

1. Evidence
   - `rg -n "\\$\\{locale\\}/gallery" app components -S`
2. Violates
   - `ARCHITECTURE.md` §3.11（v2 canonical path builders）
3. Fix steps
   - `components/Header.tsx`
     - `href: \`/${locale}/gallery\`` → `href: buildGalleryListUrl(locale)`
   - `components/Footer.tsx`
     - `href: \`/${locale}/gallery\`` → `href: buildGalleryListUrl(locale)`
   - `components/gallery/GalleryCard.tsx`
     - `const href = \`/${locale}/gallery/items/${categorySlug}/${item.slug}\`` → `buildGalleryItemUrl(locale, categorySlug, item.slug)`
   - `components/gallery/SimilarGalleryItems.tsx`
     - `const href = \`/${locale}/gallery/items/${categorySlug}/${item.slug}\`` → `buildGalleryItemUrl(locale, categorySlug, item.slug)`
   - `components/sections/GallerySection.tsx`
     - `href={\`/${locale}/gallery/items/${categorySlug}/${item.slug}\`}` → `href={buildGalleryItemUrl(locale, categorySlug, item.slug)}`
   - `app/[locale]/gallery/items/[category]/[slug]/page.tsx`
     - `permanentRedirect(\`/${locale}/gallery/items/${...}\`)` → `permanentRedirect(buildGalleryItemUrl(locale, matches[0].category.slug, slug))`
     - Breadcrumb / category / tag links 全改用：
       - `buildGalleryListUrl(locale)`
       - `buildGalleryCategoryUrl(locale, categorySlug)`
       - `buildGalleryListUrl(locale, { tag })`
   - `app/[locale]/admin/**/actions.ts`（Gallery revalidation）
     - `revalidatePath(\`/${locale}/gallery\`)` → `revalidatePath(buildGalleryListUrl(locale))`
4. DoD
   - `rg -n "\\$\\{locale\\}/gallery" app components -S` → 0 hits
   - `npm test`, `npm run lint`, `npm run type-check`, `npm run build`
5. Post-merge
   - 更新 `uiux_refactor.md` §4（新增一筆 ARCHIVED ✅ 記錄，並保留 item number 不改號；可新增新 item 但不可改舊 item 號）
   - `npm run docs:generate-indexes` + `npm run lint:md-links`

---

### PR-33 — SEO/Consistency：Blog canonical URL / internal links 全面改用 URL builders ✅ COMPLETED (2026-01-23)

1. Evidence
   - `rg -n "\\$\\{locale\\}/blog" app components -S`
2. Violates
   - `ARCHITECTURE.md` §3.11（v2 canonical path builders）
3. Fix steps
   - `components/Header.tsx`
     - `href: \`/${locale}/blog\`` → `href: buildBlogListUrl(locale)`
   - `components/Footer.tsx`
     - `href: \`/${locale}/blog\`` → `href: buildBlogListUrl(locale)`
   - `components/blog/SimilarPosts.tsx`, `components/blog/RelatedPosts.tsx`
     - `href={\`/${locale}/blog/posts/${post.slug}\`}` → `href={buildBlogPostUrl(locale, post.slug)}`
   - `components/blog/BlogCategorySidebar.tsx`
     - `return \`/${locale}/blog/categories/${categorySlug}...\`` → `return buildBlogCategoryUrl(locale, categorySlug, { q, sort })`
     - `return \`/${locale}/blog...\`` → `return buildBlogListUrl(locale, { q, sort })`
   - `components/blog/BlogSearch.tsx`
     - `router.push(\`/${locale}/blog?... \`)` → `router.push(buildBlogListUrl(locale, { q, sort }))`
   - `app/[locale]/blog/posts/[slug]/page.tsx`
     - Breadcrumb / category links：`buildBlogListUrl(locale)`, `buildBlogCategoryUrl(locale, categorySlug, { q, sort })`, `buildBlogPostUrl(locale, slug)`
   - `app/[locale]/blog/categories/[slug]/page.tsx`, `app/[locale]/blog/page.tsx`
     - `href={\`/${locale}/blog...\`}` 全面改用 `buildBlogListUrl()` / `buildBlogCategoryUrl()`
   - `app/[locale]/admin/(blog)/**/actions.ts`（Blog revalidation）
     - `revalidatePath(\`/${locale}/blog\`)` → `revalidatePath(buildBlogListUrl(locale))`
4. DoD
   - `rg -n "\\$\\{locale\\}/blog" app components -S` → 0 hits
   - `npm test`, `npm run lint`, `npm run type-check`, `npm run build`
5. Post-merge
   - 更新 `uiux_refactor.md` §4（新增一筆 ARCHIVED ✅ 記錄，並保留 item number 不改號；可新增新 item 但不可改舊 item 號）
   - `npm run docs:generate-indexes` + `npm run lint:md-links`

---

## 3) 每 PR 驗證清單（不可省略）

- `npm test`
- `npm run lint`
- `npm run type-check`
- Docs：`npm run docs:generate-indexes`, `npm run lint:md-links`
- `npm run build`（routes/SEO/redirect 相關 PR 必跑；先確認 `.env.local` 已設 `NEXT_PUBLIC_SITE_URL` + Supabase public env）

