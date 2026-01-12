# Admin i18n Toggle — Spec

> Status: Stable (Implemented)  
> Last Updated: 2026-01-04  
> Scope: admin bilingual toggle (EN / zh-Hant) + 翻譯檔 routing

背景：本 spec 原本與 Admin Error Log UX spec 一起撰寫；為了保持單一責任已拆分（需要可查 git history）。

相關文件：

- Error log spec: [Admin Error Log — Spec](admin-errorlog-spec.md)
- Implemented behavior (SSoT): [`doc/SPEC.md`](../../SPEC.md)
- Constraints: [`ARCHITECTURE.md`](../../../ARCHITECTURE.md)

---

## 1. 中英文切換功能

### 1.1 切換機制

| 項目     | 規格                                                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 觸發方式 | 後台側邊欄底部（登出按鈕上方）提供語言切換 Toggle                                                                            |
| 支援語言 | 繁體中文 (zh)、English (en)                                                                                                  |
| 預設語言 | 依優先順序：cookie → Accept-Language（SSR） / navigator.language（client fallback）                                          |
| 狀態保存 | 切換後記住選擇，下次登入自動套用                                                                                             |
| 切換範圍 | AdminSidebar + Admin Panel 內容（所有 admin routes）UI 文字；URL 維持原樣（routeLocale 不變，例如 `/zh/admin` 可顯示 EN UI） |

> **決策說明**：
>
> - Toggle 放側邊欄底部，因該區域已有用戶資訊，邏輯一致；頂部工具列目前不存在，新增成本高。
> - URL 維持原樣可避免 SSR hydration 問題；後台語言偏好屬於 client-side 顯示偏好。

### 1.2 翻譯範圍

需支援中英文切換的 UI 元素：

- 側邊欄導航選單（Dashboard、Blog、Shop、Gallery 等所有項目）
- Admin Panel 主內容區（頁面標題/副標題、卡片/區塊標題、說明文字、placeholder、validation/error 文案、toast、modal/dialog）
- Data Intelligence 相關頁面（Control Center、AI Analysis、Preprocessing Pipeline、Embeddings、Import/Export）所有 UI 文字
- 頁面標題與副標題
- 按鈕文字（新增、編輯、刪除、儲存、取消、確認等）
- 表單標籤與說明文字
- 表格欄位標題
- Tab 標籤
- 提示訊息與確認對話框
- 空狀態提示文字
- 分頁控制與篩選器文字
- Error Log 相關介面（若未實作，仍需先保留 key；避免後續補功能時又得回頭拆 namespace）

> **覆蓋範圍澄清（避免誤解）**：本 spec 的「中英文切換」不只針對側邊欄；所有 admin routes 的頁面內容都必須同一套 adminLocale 切換（避免出現「側邊欄已中文但頁面內容仍英文」的割裂狀態）。

> **UI icon 規則**：除 AdminSidebar 導航 icon 外，Admin Panel 內容區不使用 icon/emoji/svg（避免文案/版面 drift）。

### 1.3 專有名詞處理原則

#### 不翻譯的專有名詞（維持英文原文）

| 類別          | 保留原文的詞彙範例                                             |
| ------------- | -------------------------------------------------------------- |
| AI / ML 術語  | Embedding、RAG、Vector、Token、Prompt、Fine-tuning、LLM、Chunk |
| 技術術語      | API、SDK、Webhook、Endpoint、JSON、Markdown、SEO、SSL、Cache   |
| 資料庫/後端   | Schema、Query、Index、Migration                                |
| 產品/服務名稱 | Supabase、OpenAI、Stripe、PayPal、Vercel                       |
| 狀態碼        | HTTP 404、500、Rate Limit 等                                   |
| 程式相關      | Slug、Metadata、Cron、Worker、Queue                            |
| 縮寫          | CRUD、UUID、URL、CDN                                           |

#### 翻譯的一般詞彙

| 英文         | 中文   |
| ------------ | ------ |
| Dashboard    | 儀表板 |
| Settings     | 設定   |
| Create / New | 新增   |
| Edit         | 編輯   |
| Delete       | 刪除   |
| Save         | 儲存   |
| Cancel       | 取消   |
| Confirm      | 確認   |
| Search       | 搜尋   |
| Filter       | 篩選   |
| Export       | 匯出   |
| Import       | 匯入   |
| Status       | 狀態   |
| Actions      | 操作   |
| Preview      | 預覽   |
| Publish      | 發布   |

### 1.4 混合顯示範例

| 情境           | 英文模式                 | 中文模式            |
| -------------- | ------------------------ | ------------------- |
| 向量管理頁標題 | Embeddings               | Embedding 管理      |
| AI 分析按鈕    | Generate RAG Report      | 產生 RAG 報告       |
| 控制中心標題   | Control Center           | 控制中心            |
| 資料預處理     | Data Preprocessing       | 資料 Preprocessing  |
| 錯誤訊息       | API rate limit exceeded  | API 請求超過限制    |
| 功能開關       | Enable Embedding Search  | 啟用 Embedding 搜尋 |
| 佇列狀態       | Queue Status: Processing | Queue 狀態：處理中  |
| Token 使用量   | Token Usage              | Token 使用量        |

### 1.5 Toggle 按鈕設計

| 項目     | 規格                                               |
| -------- | -------------------------------------------------- |
| 位置     | 側邊欄底部，登出按鈕上方                           |
| 樣式     | 簡潔的雙選項切換：`EN` / `中`                      |
| 狀態指示 | 當前語言選項高亮或底色區分                         |
| 動畫     | 切換時平滑過渡（約 150ms），避免畫面閃爍或整頁重載 |

> **決策說明**：鍵盤快捷鍵（如 `Alt + L`）Phase 1 不實作，避免衝突問題

### 1.6 狀態持久化

| 項目     | 規格                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 儲存位置 | cookie（主要，供 SSR）+ localStorage（client 同步/備援）                |
| Key 名稱 | `admin-locale`                                                          |
| 有效期   | 長期保存（至少 1 年）                                                   |
| 同步機制 | 切換後立即更新 UI，無需重新整理頁面                                     |
| 優先順序 | cookie → Accept-Language（SSR） / navigator.language（client fallback） |

### 1.7 翻譯檔案結構

| 項目       | 規格                                                   |
| ---------- | ------------------------------------------------------ |
| 檔案位置   | 擴充現有 `messages/en.json` 與 `messages/zh.json`      |
| 命名空間   | 新增 `admin` namespace（如 `admin.sidebar.dashboard`） |
| 不另建檔案 | 維持單一來源，不新增 `admin-messages/*.json`           |

> **決策說明**：沿用現有 `messages/*.json` 並新增 `admin` 命名空間，符合 next-intl 原生支援，減少檔案複雜度

---

## 2. 驗收標準

### 2.1 中英文切換功能

#### 基本功能

- [x] Toggle 按鈕位於 AdminSidebar 可見位置
- [x] 點擊 Toggle 可正常在 EN / 中 之間切換
- [x] 切換後所有後台 UI 文字即時更新（包含 AdminSidebar + Admin Panel 內容；無需重載頁面）
- [x] 切換動畫平滑，無閃爍

#### 翻譯正確性

- [x] 側邊欄所有選單項目正確翻譯
- [x] 所有頁面標題/副標題正確翻譯
- [x] 所有頁面區塊標題/說明文字/空狀態文字正確翻譯
- [x] Data Intelligence 相關頁面（Control Center、AI Analysis、Preprocessing Pipeline、Embeddings、Import/Export）不再出現硬編碼英文 UI
- [x] 所有按鈕文字正確翻譯
- [x] 所有表單標籤正確翻譯
- [x] 所有 Tab 標籤正確翻譯
- [x] 所有提示訊息正確翻譯

#### 專有名詞處理

- [x] Embedding、RAG、Vector 等 AI 術語維持英文
- [x] API、Webhook、Endpoint 等技術術語維持英文
- [x] Slug、Metadata、Token 等程式術語維持英文
- [x] Supabase、OpenAI 等產品名稱維持英文

#### 狀態持久化

- [x] 語言偏好儲存至 localStorage 或 cookie
- [x] 重新整理頁面後，語言偏好維持不變
- [x] 關閉瀏覽器後再開啟，語言偏好維持不變
- [x] 前台語言設定不受後台切換影響

---

## 相關文件

- Constraints: `../ARCHITECTURE.md`
- Implemented behavior (SSoT): `../../SPEC.md`
- Drift tracker: `../uiux_refactor.md`
