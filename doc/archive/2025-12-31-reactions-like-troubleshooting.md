# 按讚不會被記錄（Likes/Reactions）— 詳細修復步驟

> Date: 2025-12-31  
> Status: ARCHIVED / TROUBLESHOOTING GUIDE  
> Scope: reactions like write path (client → API → cookie → DB → triggers)

## Summary (When / What / Why / How)

- When: 2025-12-31
- What: troubleshooting playbook for “likes are not recorded”.
- Why: the failure can happen at multiple layers (client request, anon_id cookie, API write, schema/triggers, env secrets).
- How: diagnose in this order — Network → Cookies → DB rows → triggers → deployment env vars.
- Result: a reproducible checklist that identifies the failing layer and the corresponding fix.

---

## 0. 這套按讚系統怎麼運作（你要知道的最小背景）

- 前端按鈕：`components/reactions/LikeButton.tsx`  
  - 點擊後 `POST /api/reactions`，body: `{ targetType, targetId }`
- API：`app/api/reactions/route.ts`  
  - 讀取/產生 cookie：`anon_id`  
  - 做 rate limit（`reaction_rate_limits`）  
  - 呼叫 IO：`lib/reactions/io.ts` 來寫入/刪除 `reactions` 表
- DB：Supabase
  - `public.reactions`：一筆 like（unique: `target_type + target_id + anon_id`）
  - `public.reaction_rate_limits`：按讚速率限制（server-only）
  - `public.fn_apply_like_delta` + triggers：INSERT/DELETE reactions 後同步更新
    - `public.gallery_items.like_count`
    - `public.comments.like_count`
- 關鍵設計：目前「寫入 reactions」使用 **service role**（`createAdminClient()`），因此部署環境一定要有 `SUPABASE_SERVICE_ROLE_KEY`。

---

## 1. 先用 3 分鐘定位：到底壞在哪一層？

### 1.1 先看 Network：`POST /api/reactions` 回什麼？

1. 打開網站 → 開啟 DevTools → **Network**
2. 勾選 **Preserve log**
3. 點一次 ❤️ Like
4. 找到請求：`POST /api/reactions`

觀察 4 個重點：

- **Status code**
- **Response JSON**（預期有 `liked` / `likeCount`）
- **Response Headers** 是否有 `set-cookie: anon_id=...`
- Console 是否有 error（前端會 `console.error('Failed to toggle like')`）

接著照 Status code 走：

- `404` → 看 **2.1**
- `500` → 看 **2.2（最常見）**
- `429` → 看 **2.3**
- `200` 但 UI 還是「沒記錄」→ 往下做 **1.2 / 1.3**，再看 **2.4 / 2.5**

### 1.2 再看 Cookie：`anon_id` 有沒有被寫入/持久化？

1. DevTools → **Application** → **Cookies**
2. 找目前網域下是否有 `anon_id`

預期：

- 第一次按讚後，應該會看到 `anon_id`（UUID v4）
- 重新整理後 `anon_id` 仍存在（非 session cookie）

如果 **沒有** `anon_id`：

- 回到 Network 看 `POST /api/reactions` 的 response headers  
  - **沒有 `set-cookie`** → 看 **2.5**
  - **有 `set-cookie` 但瀏覽器不存** → 看 **2.6**

### 1.3 最後看 DB：`reactions` 表到底有沒有新增資料？

到 Supabase Dashboard → SQL Editor，按讚一次後跑：

```sql
select target_type, target_id, anon_id, created_at
from public.reactions
order by created_at desc
limit 20;
```

判讀：

- 有新增一筆 reactions row：**DB 有寫入**，但你可能看不到 like_count 或 likedByMe → 看 **2.4 / 2.6 / 2.7**
- 完全沒有新增：**API 寫入失敗** 或根本沒打到 DB → 看 **2.2 / 2.5**

---

## 2. 依現象修（最常見原因 → 罕見原因）

### 2.1 `POST /api/reactions` 回 `404`

**可能原因**

- 你實際打到的是 `/{locale}/api/reactions`（例如 `/zh/api/reactions`）而不是 `/api/reactions`
- 部署產物沒有包含 `app/api/reactions/route.ts`（建置/路由異常）

**怎麼確認**

- Network 裡看 Request URL：
  - 正確：`https://<domain>/api/reactions`
  - 錯誤：`https://<domain>/zh/api/reactions` 或 `.../en/api/reactions`

**怎麼修**

- 確認前端一律使用 **絕對路徑** `/api/reactions`（目前 `LikeButton.tsx` 已是這樣）
- 如果你的 i18n/middleware 有 rewrite，把 locale 加到 API：
  - 調整 middleware matcher / bypass，確保 API 不會被改寫成 `/{locale}/api/*`
- 重新部署，並在 Vercel 的 Function logs 確認 `/api/reactions` route 有被命中

### 2.2 `POST /api/reactions` 回 `500`（最可能）

**最常見根因：部署環境缺 `SUPABASE_SERVICE_ROLE_KEY`**

- `lib/supabase/admin.ts` 的 `createAdminClient()` 會讀：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- 少任何一個都會 `throw`，API 會被 `catch` → 回 `500`
- 若部署時漏掉 `SUPABASE_SERVICE_ROLE_KEY`（最常見），請回到 `doc/RUNBOOK.md` 的 Deployment（Step 5.3 環境變數）補齊，否則「按讚永遠失敗」。

**修復步驟（Vercel）**

1. Vercel → Project → **Settings** → **Environment Variables**
2. 新增變數：
   - Name：`SUPABASE_SERVICE_ROLE_KEY`
   - Value：到 Supabase Dashboard → Settings → API → 找 **service_role key**
   - Environment：至少勾 **Production**（建議 Preview 也勾）
3. 儲存後，回到 Deployments → **Redeploy**
4. 重新在網站按讚，確認 `POST /api/reactions` 變成 `200`

**補充建議**

- 這把 key 權限非常大，務必只放在 server 環境變數；不要用 `NEXT_PUBLIC_` 前綴，也不要寫進 repo。

### 2.3 `POST /api/reactions` 回 `429`

**原因**

- API 有 rate limit（`reaction_rate_limits`），同一 IP 一分鐘最多 60 次（`lib/reactions/io.ts`）。

**修復步驟**

- 先等待 1 分鐘再試
- 若是測試/自動化導致：
  - 調低測試頻率
  - 或在測試環境調整 RATE_LIMIT 參數（屬於程式碼修改）

### 2.4 `POST /api/reactions` 回 `200`，但 likeCount 永遠不變 / 重新整理後不顯示已按讚

這種情況要拆兩種：

#### 2.4.1 DB 有 `reactions` 記錄，但 `like_count` 不更新

**原因**

- `reactions` 觸發器（cross triggers）沒裝好，或你只套了部分 schema
- 例如少了：
  - `public.fn_apply_like_delta()`
  - triggers：`trg_reactions_like_insert` / `trg_reactions_like_delete`

**怎麼確認（Supabase SQL）**

```sql
select tgname
from pg_trigger
where tgname in ('trg_reactions_like_insert', 'trg_reactions_like_delete');
```

**怎麼修（擇一）**

- 用專案腳本補齊 reactions + triggers：
  - `npm run db:add -- --feature reactions`
  - （會跑 `supabase/02_add/05_reactions.sql` + `supabase/02_add/06_cross_triggers.sql`）
- 或直接用 psql 跑整包（會包含所有功能）：
  - `psql -v ON_ERROR_STOP=1 --single-transaction -f supabase/COMBINED_ADD.sql $SUPABASE_DB_URL`

修完後驗證：

```sql
select like_count from public.gallery_items where id = '<target_uuid>';
```

#### 2.4.2 DB 沒有 `reactions` 記錄，但 API 仍回 `200`

**原因**

- `lib/reactions/io.ts` 目前沒有嚴格處理 Supabase error（容易把真正的 insert 失敗「吞掉」），造成 API 看起來成功但其實沒寫入。

**修復步驟（需要改程式碼，照做即可）**

1. 在 `lib/reactions/io.ts` 的 insert/delete/update 後把 `error` 拿出來處理：
   - insert 若是 **非 unique 衝突**，應該直接 throw（讓 API 回 500）
   - delete / rate-limit update/insert 也要檢查 error
2. 建議把 toggle 寫法改成「先查有沒有 → 再 insert/delete」，避免用「insert 失敗就當成 conflict」這種不可靠判斷
3. 改完後用 Network 驗證：失敗時應該看到 `500`，而不是 `200` + 沒寫入

> 這段屬於「讓錯誤顯性化」的修復：先讓你能看見真正失敗原因，之後再對症下藥。

### 2.5 沒有 `set-cookie: anon_id=...`（第一次按讚也沒寫 cookie）

**可能原因**

- `POST /api/reactions` 根本沒有跑到「產生 anon_id」那段（例如 request body 驗證失敗直接 400）
- 或 API 在 set cookie 前就提前 return（例如 rate limited / feature gate）

**怎麼確認**

- Network 看 response：
  - `400`：檢查 body 是否有正確傳 `targetType` / `targetId`（UUID）
  - `429` / `404` / `500`：先修掉那些狀態（見上面各節）
- 若 `200` 但仍沒 set-cookie：
  - 代表 server 讀到一個「看起來有效」的 `anon_id`，所以 `shouldSetCookie=false`
  - 去 Application/Cookies 看是不是其實已存在（只是你看錯網域）

### 2.6 有 `set-cookie` 但瀏覽器就是不存（或存了但請求不帶）

**常見原因**

- **網域不一致**：你在 `quantumnexuslnk.com` 按讚，但下一頁跑到 `www.quantumnexuslnk.com`（或反過來）  
  - cookie 是 host-only，兩個網域不共用 → 你會覺得「按讚沒記錄」
- **HTTPS/secure**：
  - production 會設 `Secure` cookie；如果你用 `http://` 測試，瀏覽器不會存

**修復步驟**

1. 先決定 canonical 網域（建議只留一個：apex 或 www）
2. 設定平台層 redirect（Vercel Domains / DNS / 反向代理）讓另一個網域 301 到 canonical
3. 用 canonical 網域再測一次：
   - cookie 會穩定
   - likedByMe 也會穩定

> 另一種做法是把 `anon_id` cookie 設 `Domain=.quantumnexuslnk.com` 讓子網域共享（需要程式碼修改，且要評估風險/需求）。

### 2.7 DB schema 根本沒裝 reactions（表不存在）

**現象**

- Supabase SQL 查不到 `public.reactions` / `public.reaction_rate_limits`
- API 寫入永遠不會成功

**修復**

- 跑一次 reactions feature：
  - `npm run db:add -- --feature reactions`
  - 或 `npm run db:add`（整包）

---

## 3. 修完後的驗收清單（務必逐項勾）

- [ ] 點 ❤️ 時 `POST /api/reactions` 回 `200`
- [ ] 第一次按讚後，瀏覽器存在 cookie：`anon_id`
- [ ] Supabase `public.reactions` 會新增/刪除對應 row
- [ ] `gallery_items.like_count` 或 `comments.like_count` 會跟著變動（triggers 正常）
- [ ] 重新整理頁面後 `likedByMe` 仍正確（不會回到未按讚）
- [ ] 在 `/zh` 與 `/en` 都測過（路由不同但 API 應一致）
- [ ] 部署環境（Vercel）已設定 `SUPABASE_SERVICE_ROLE_KEY`，並完成 redeploy
