# BLOCKERS（外部依賴 / 暫時做不了）— Payments（Stripe / LINE Pay / ECPay）

> Last Updated: 2026-01-03  
> Status: ACTIVE  
> Scope: **只追蹤外部依賴/解鎖條件**（accounts/keys/approval/production）。不放 implementation steps（避免與 `TASKS.md` / specs 混在一起）。

**Technical spec（when unblocked）**：[`specs/proposed/payments-initiation-spec.md`](specs/proposed/payments-initiation-spec.md)  
**Webhook architecture (implemented)**：[`runbook/payments.md`](runbook/payments.md)  
**Constraints**：[`../ARCHITECTURE.md`](../ARCHITECTURE.md)（§3.10 Payment Gateway Architecture）  
**Security**：[`SECURITY.md`](SECURITY.md)（webhook 驗簽/冪等/審計）  
**Status / planning**：[`ROADMAP.md`](ROADMAP.md)

---

## Summary

| Item | Status | Blocked by | Unblock (Definition of Ready) |
| --- | --- | --- | --- |
| Stripe Checkout Session | Blocked | Stripe account + production keys | Vault secrets present + provider enabled |
| LINE Pay Request/Confirm | Blocked | LINE Pay channel credentials | Vault secrets present + provider enabled |
| ECPay Request Flow | Blocked | ECPay merchant credentials | Vault secrets present + provider enabled |

---

## Stripe

- Blockers:
  - Stripe account approval / 啟用 Checkout
  - Supabase Vault secrets：`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - 後台 provider 設定：`payment_provider_configs`（`provider='stripe'`）→ `is_enabled=true`（以及 `test_mode`）
- When unblocked:
  - 依 `specs/proposed/payments-initiation-spec.md` 完成 checkout initiation（不在此列 steps）
  - 依 `runbook/payments.md` 驗證 webhook + audit + RPC state transition

---

## LINE Pay

- Blockers:
  - LINE Pay channel credentials（channel id / secret / merchant config）
  - Supabase Vault secrets（以 `SECURITY.md` 的 secrets policy 為準）
  - 後台 provider 設定：`payment_provider_configs`（`provider='linepay'`）→ `is_enabled=true`（以及 `test_mode`）
- When unblocked:
  - 依 `specs/proposed/payments-initiation-spec.md` 完成 request/confirm/return flow（不在此列 steps）

---

## ECPay

- Blockers:
  - ECPay merchant credentials（MerchantID / HashKey / HashIV）
  - Supabase Vault secrets（以 `SECURITY.md` 的 secrets policy 為準）
  - 後台 provider 設定：`payment_provider_configs`（`provider='ecpay'`）→ `is_enabled=true`（以及 `test_mode`）
- When unblocked:
  - 依 `specs/proposed/payments-initiation-spec.md` 完成 request flow（MerchantTradeNo mapping 等）
