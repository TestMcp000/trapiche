# RUNBOOK (Ops)

> Scope: production-oriented checklists and operational verification. No product spec here.
> Canonical details live in `doc/runbook/*` (this file stays small and stable).

## Quick Navigation

- [Go-Live (P0)](#go-live)
- [Deployment](#deployment)
- [Database Operations](#database-ops)
- [AI Analysis](#ai-analysis)
- [Embeddings + Preprocessing](#embeddings-preprocessing)
- [Error Monitoring](#error-monitoring)
- [Payments](#payments)
- [References](#references)

---

<a id="go-live"></a>

## Go-Live (P0)

Canonical checklist: [`runbook/go-live.md`](runbook/go-live.md)

---

<a id="deployment"></a>

## Deployment (Production Checklist)

Canonical checklist: [`runbook/deployment.md`](runbook/deployment.md)

---

<a id="database-ops"></a>

## Database Operations (Supabase)

Canonical operations guide: [`runbook/database-ops.md`](runbook/database-ops.md)

---

<a id="ai-analysis"></a>

## AI Analysis (Enablement + Cron)

Canonical enablement guide: [`runbook/ai-analysis.md`](runbook/ai-analysis.md)

---

<a id="embeddings-preprocessing"></a>

## Embeddings + Preprocessing (Cron + QStash)

Canonical enablement guide: [`runbook/embeddings-preprocessing.md`](runbook/embeddings-preprocessing.md)

---

<a id="error-monitoring"></a>

## Error Monitoring (Sentry)

Canonical configuration + verification: [`runbook/error-monitoring.md`](runbook/error-monitoring.md)

---

<a id="payments"></a>

## Payments (Architecture & Webhooks)

Canonical webhook architecture: [`runbook/payments.md`](runbook/payments.md)

---

<a id="references"></a>

## References

- Docs hub: [`README.md`](README.md)
- Implemented behavior (SSoT): [`SPEC.md`](SPEC.md)
- Security policies: [`SECURITY.md`](SECURITY.md)
- Roadmap (status/risks only): [`ROADMAP.md`](ROADMAP.md)
- Tasks (unblocked steps, agent-facing): [`TASKS.md`](TASKS.md)
- Blockers (external deps): [`BLOCKERS.md`](BLOCKERS.md)
- Architecture constraints: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- Drift tracker + playbooks: [`../uiux_refactor.md`](../uiux_refactor.md)
