# Payments (Architecture & Webhooks)

> Canonical entry: `../RUNBOOK.md`

[Back to RUNBOOK index](../RUNBOOK.md)


> Scope: Payment-related architecture, webhook verification, idempotency, and audit logging
> Status: Active (webhook layer implemented; request/checkout initiation may still be gated per ROADMAP)
> Related: `../../ARCHITECTURE.md` (§3.10 Payment Gateway Architecture), `../specs/proposed/payments-initiation-spec.md` (initiation), `../ROADMAP.md` (status)

---

### Shared Principles (All Providers)

1. **Server-only**: payment SDKs/secrets must never enter client bundle
2. **Verify before trust**: every webhook must be signature-verified (pure)
3. **Idempotency**: record event id in `webhook_events` to prevent double processing
4. **Audit log**: store raw payloads in `payment_audit_logs` (even failures like `signature_invalid`)
5. **Atomic state**: success handling uses RPC to update order + inventory consistently

Reference implementation:

- Pure functions: `lib/modules/shop/payment-pure.ts`
- IO functions: `lib/modules/shop/payment-io.ts`
- Webhook routes: `app/api/webhooks/*/route.ts`

---

### Section 1 — ECPay Webhook (綠界)

#### 1.1 Webhook Route Flow

Implemented in `app/api/webhooks/ecpay/route.ts`:

1. Parse form data (`request.formData()`)
2. Validate `CheckMacValue`
3. Idempotency check (`webhook_events`)
4. Resolve order by `MerchantTradeNo` → `orders.order_number`
5. Write audit log (`payment_audit_logs`)
6. If `RtnCode === '1'`, process payment success (RPC)
7. Return `1|OK` (or error string expected by ECPay)

#### 1.2 CheckMacValue (Signature) — Example (used by tests)

This example exists so the algorithm implementation can be regression-tested.

- HashKey: `pwFHCqoQZGmho4w6`
- HashIV: `EkRm7iFT261dpevs`

Input parameters (example):

```json
{
  "MerchantID": "3002607",
  "MerchantTradeNo": "TEST1234567890",
  "MerchantTradeDate": "2024/01/15 12:00:00",
  "PaymentType": "aio",
  "TotalAmount": "100",
  "TradeDesc": "TestOrder",
  "ItemName": "TestItem",
  "ReturnURL": "https://example.com/callback",
  "ChoosePayment": "ALL",
  "EncryptType": "1"
}
```

Expected `CheckMacValue`:

```
A02A0A97A58D025AB74A2F4F4D86BCE9BDAACB802DBC7E91043003E4D36C1E81
```

Test reference: `tests/shop/payment-pure.test.ts` (`generateEcpayCheckMacValue`).

---

### Section 2 — LINE Pay Webhook

#### 2.1 Webhook Route Flow

Implemented in `app/api/webhooks/linepay/route.ts`:

1. Read raw body (`request.text()`) and parse JSON
2. Validate HMAC-SHA256 signature (pure)
3. Idempotency check (`webhook_events`)
4. Extract/validate `orderId` (must be UUID)
5. Write audit log (`payment_audit_logs`)
6. If `returnCode === '0000'`, process payment success (RPC)
7. Return `200 { ok: true }`

#### 2.2 Signature Validation

All signature logic is implemented in `lib/modules/shop/payment-pure.ts` and is unit-tested.

---

### Section 3 — Stripe Webhook (Summary)

Stripe webhook flow follows the same shared principles:

- signature verification (pure)
- idempotency (`webhook_events`)
- audit logging (`payment_audit_logs`)
- RPC-driven state transitions

If checkout initiation is enabled later, order creation must happen **after** Checkout Session creation (closeable pattern; see `../../ARCHITECTURE.md` and `../ROADMAP.md`).

---

<a id="references"></a>
## References

- Docs hub: [`doc/README.md`](../README.md)
- Security policies: [`doc/SECURITY.md`](../SECURITY.md)
- Pending work / provider deps: [`doc/ROADMAP.md`](../ROADMAP.md), [`doc/BLOCKERS.md`](../BLOCKERS.md), [`doc/specs/proposed/payments-initiation-spec.md`](../specs/proposed/payments-initiation-spec.md)
