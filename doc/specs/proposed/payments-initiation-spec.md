# Payments Initiation Spec（Stripe / LINE Pay / ECPay）

> Status: DRAFT  
> Last Updated: 2026-01-03  
> Note: if referenced by in-code `@see`, keep headings stable (avoid renumbering/moving sections).

## 1. Purpose

定義「發起付款（initiation）」的行為與契約：從 checkout/request 入口開始，到產生 redirect/form、建立訂單 + 庫存保留、以及確保 webhook 能對齊訂單。

本 spec **不**重述 webhook 驗簽/冪等/審計細節（已在 runbook 與 code 內實作）。

## 2. Components（SSoT paths）

- Schema / DB scripts:
  - `supabase/02_add/07_shop.sql`（`orders`, `inventory_reservations`, `payment_provider_configs`）
  - `supabase/02_add/08_shop_functions.sql`（`create_order_with_reservation`, `process_payment_success`, `release_expired_reservations`）
- App endpoints:
  - Stripe checkout server action（stub）：`app/[locale]/shop/checkout/checkout-action.ts`
  - Webhooks（已實作）：`app/api/webhooks/stripe/route.ts`, `app/api/webhooks/linepay/route.ts`, `app/api/webhooks/ecpay/route.ts`
- IO modules:
  - Config + webhook facade：`lib/modules/shop/payment-io.ts`
  - Config IO：`lib/modules/shop/payment-config-io.ts`
  - Webhook IO：`lib/modules/shop/payment-webhook-io.ts`
  - Signature pure：`lib/modules/shop/payment-pure.ts`
- Tests:
  - `tests/shop/payment-pure.test.ts`
  - `tests/architecture-boundaries.test.ts`

## 3. Security Model（summary）

- Server-only:
  - payment secrets/SDK/vault access 僅允許在 server（`import 'server-only';`，IO module pattern 以 `../../../ARCHITECTURE.md` 為準）
- Secrets:
  - provider secrets 放 Supabase Vault（讀取規則以 `doc/SECURITY.md` 為準）
- Webhooks:
  - 驗簽（pure）→ 冪等（`webhook_events`）→ 審計（`payment_audit_logs`）→ RPC（`process_payment_success`）

## 4. Data Model / Contracts

### 4.1 Gateway identifiers（DB）

- `orders.gateway`：`'stripe' | 'linepay' | 'ecpay'`
- `orders.gateway_transaction_id`：
  - 可用於存 provider 的交易/會話 id（Stripe session id、LINE Pay transactionId…）
  - **付款成功**時會由 RPC `process_payment_success` 以 webhook payload 更新
- `orders.gateway_metadata`：存 provider raw metadata（debug/爭議處理；不可存 secrets）
- `orders.order_number`：人類可讀的訂單編號（ECPay webhook 目前用它做對齊）
- `inventory_reservations`：
  - `order_id` 是主要關聯（TTL release 與 paid transition 都依賴它）
  - `checkout_session_id` 目前由 `create_order_with_reservation(p_checkout_session_id)` 填入（不應放 secrets）

### 4.2 Closeable pattern（initiation contract）

- Provider 未設定或被禁用時：
  - initiation 必須「可關閉」：回傳明確錯誤碼（例如 `stripe_not_configured`），且**不建立訂單/保留庫存**
- Provider 已設定但第三方 API 失敗時：
  - 允許出現 `pending_payment` 訂單（視 flow 而定），但必須可被 TTL job 自動取消（`release_expired_reservations`）

## 5. Flows

<a id="stripe-checkout-session"></a>
### 5.1 Stripe — Checkout Session（initiation）

**Goal**：建立 Stripe Checkout Session → 建立訂單 + 庫存保留 → 確保 webhook 可對齊 order。

**Webhook correlation (current)**：`app/api/webhooks/stripe/route.ts` 透過 `metadata.order_id` 對齊 order（`extractStripeOrderId`）。

**Recommended flow**：

1. Validate (server):
   - user auth
   - cart items/price（server 端重算）
   - inventory availability
2. Load provider config：`getPaymentProviderConfig('stripe')`
3. Create Stripe Checkout Session（server-only）：
   - line_items 以 server 計算結果為準
   - success/cancel URLs 指向 localized pages
4. Create order + reservations：
   - 呼叫 RPC `create_order_with_reservation(p_gateway='stripe', p_checkout_session_id=session.id, ...)`
5. Ensure webhook can resolve order：
   - 建議做法：`stripe.checkout.sessions.update(session.id, { metadata: { order_id } })`
   - fallback（可選）：Stripe webhook 若缺少 `metadata.order_id`，改用 `session.id` lookup（`orders.gateway_transaction_id`）對齊
6. Return:
   - `checkoutUrl`（redirect）
   - `orderId`（internal）

**Failure paths**：

- Provider disabled → 回 `stripe_not_configured`，不寫 DB
- Session create 失敗 → 不寫 DB，回可辨識錯誤碼
- Order RPC 失敗（session 已存在）→ 回錯誤碼；依 TTL/job 或人工審計處理

<a id="line-pay-request-confirm"></a>
### 5.2 LINE Pay — Request/Confirm（initiation）

**Webhook correlation (current)**：`app/api/webhooks/linepay/route.ts` 依 `payload.orderId`（must be UUID）對齊 order。

**Recommended flow (align to current webhook)**：

1. Validate (server): auth + cart + inventory + totals
2. Create order + reservations（先建立 orderId 以便 request 綁定）：
   - RPC `create_order_with_reservation(p_gateway='linepay', p_checkout_session_id='<placeholder>', ...)`
   - `<placeholder>` 可為固定字串（例如 `linepay_pending`）或 request-scope id（不可放 secrets）
3. Call LINE Pay Request API（server-only）：
   - request body 的 `orderId` 使用 `order_id`（UUID string）
   - 成功時取得 `transactionId` + paymentUrl
4. Return:
   - redirect URL（paymentUrl）
5. (Optional) Persist `transactionId`：
   - 可寫入 `orders.gateway_metadata`（or update `gateway_transaction_id`）供追蹤（不要影響 webhook/RPC 的最終一致性）

**Failure paths**：

- Provider disabled → 不寫 DB
- Request API 失敗（已建 order）→ 允許留 `pending_payment`，由 TTL job 取消並釋放 reservations（或加一個「立即取消」RPC）

<a id="ecpay-request-flow"></a>
### 5.3 ECPay — Request（initiation）

**Webhook correlation (current)**：ECPay `MerchantTradeNo` → `orders.order_number`（`lib/modules/shop/payment-webhook-io.ts#getOrderIdByOrderNumber`）。

**Recommended flow**：

1. Validate (server): auth + cart + inventory + totals
2. Create order + reservations：
   - RPC `create_order_with_reservation(p_gateway='ecpay', p_checkout_session_id='<placeholder>', ...)`
3. Read `order_number`：
   - 用 service-role read `orders.order_number`（by `order_id`）
4. Build ECPay form params（pure-first）：
   - `MerchantTradeNo = order_number`
   - CheckMacValue 使用 `lib/modules/shop/payment-pure.ts`
5. Return:
   - auto-submit HTML form（或 server-rendered page）

**Failure paths**：

- Provider disabled → 不寫 DB
- Form param build 失敗（已建 order）→ 允許留 `pending_payment`，由 TTL job 取消並釋放 reservations（或加一個「立即取消」RPC）

## 6. Idempotency / Concurrency（initiation）

- Client 重複點擊 initiation：
  - Stripe：使用 Stripe idempotency key（server-only），避免重複建立 session
  - LINE Pay / ECPay：建議以「同一購物車 fingerprint + user」做短時間內的 dedupe（可選；若做需有明確 schema + RLS）
- 最終一致性：
  - 付款成功狀態轉移一律由 webhook → `process_payment_success` RPC 驅動（app/return page 不當作最終信任來源）

## 7. Related Docs

- Constraints: `../ARCHITECTURE.md`（§3.10 Payment Gateway Architecture）
- Security policies: `../../SECURITY.md`
- Implemented behavior (SSoT): `../../SPEC.md`
- Ops / verification: `../../RUNBOOK.md` → `../../runbook/payments.md`
- External dependencies (keys/accounts): `../../BLOCKERS.md`
- Tracking status (what/why/status): `../../ROADMAP.md`
- Implementation logs: `../../archive/README.md`
