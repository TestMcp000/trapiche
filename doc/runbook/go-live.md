# Go-Live (P0)

> Canonical entry: `../RUNBOOK.md`

[Back to RUNBOOK index](../RUNBOOK.md)


- Guardrails (tests/typecheck/lint/build): see `../../uiux_refactor.md` §2.
- Production DB alignment + verification queries: see [Database Operations](database-ops.md).
- Admin auth/RLS expectations + secrets hygiene: see `../SECURITY.md`.
- Theme Console manual verification (Owner/Editor) + evidence: see `../../uiux_refactor.md` §3.9.
- Cron endpoints + secrets (`CRON_SECRET`, `WORKER_SECRET`): see `../SECURITY.md` §3.5.
- AI Analysis enablement (OpenRouter + cron): see [AI Analysis](ai-analysis.md).
- Embeddings + Preprocessing enablement (Edge Functions + cron/worker): see [Embeddings + Preprocessing](embeddings-preprocessing.md).
- Payments readiness:
  - Webhook architecture: see [Payments](payments.md).
  - External dependencies / provider keys: see `../BLOCKERS.md`.

---
