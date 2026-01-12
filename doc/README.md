# Docs Hub

> Canonical doc root: `doc/`

## Project Snapshot (Only These 3 Things)

- **Owner dashboard (one page)**: `STATUS.md` (unimplemented + drift summary)
- **Architecture compliance**: `../ARCHITECTURE.md` + guardrail tests (`npm test`, see `tests/architecture-boundaries.test.ts`)
- **Done vs not done**: done = `SPEC.md` (SSoT), not done = `ROADMAP.md` + `BLOCKERS.md` + `TASKS.md`
- **Drift** (docs/code mismatch): `../uiux_refactor.md` (checklist §2, tracker §4)

## Reading Paths (Start Here)

- Want to **ship / go-live**: `RUNBOOK.md` → `runbook/go-live.md` (also see `runbook/deployment.md`, `runbook/database-ops.md`, `runbook/embeddings-preprocessing.md`)
- Want to **implement/change a feature**: `../ARCHITECTURE.md` → `SPEC.md` (and `SECURITY.md` if touching auth/RLS/secrets)
- Want to **turn a PRD into a step-by-step plan**: `meta/AGENT_PROMPT__STEP_PLAN.md` → `meta/STEP_PLAN.md`
- Want to **draft an active PRD** (agent input): `PRD_ACTIVE.md` (then run `meta/AGENT_PROMPT__STEP_PLAN.md`)
- Want the **owner view** (status + drift only): `STATUS.md`
- Want to **plan work** (status/risks only): `ROADMAP.md` (then `TASKS.md` for unblocked steps, `BLOCKERS.md` for blocked)
- Want to **fix drift** (code vs rules): `../uiux_refactor.md`
- Want to **understand design rationale**: `specs/README.md` → `specs/completed/*` (landed) / `specs/proposed/*` (unlanded) → `archive/*.md`
- Want the **docs governance / update matrix** (agent-facing): `GOVERNANCE.md`

## Core Docs (SSoT / Guardrails)

- Architecture (constraints): [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- Implemented behavior (SSoT): [`SPEC.md`](SPEC.md)
- Roadmap (what/why/status only): [`ROADMAP.md`](ROADMAP.md)
- Security / RLS / secrets: [`SECURITY.md`](SECURITY.md)
- Ops runbook (go-live / verification): [`RUNBOOK.md`](RUNBOOK.md)
- Drift tracker + stable `@see` index: [`../uiux_refactor.md`](../uiux_refactor.md)

## Ops / Reference

- Deployment / DB / Payments / AI enablement: [`RUNBOOK.md`](RUNBOOK.md) (index; details in `runbook/*`)
- External blockers (provider keys/approvals): [`BLOCKERS.md`](BLOCKERS.md)
- Actionable tasks (PR-ready steps, agent-facing): [`TASKS.md`](TASKS.md)

## Design / History

- Feature specs / PRDs: [`specs/README.md`](specs/README.md)
- Archive index: [`archive/README.md`](archive/README.md)

## Governance

- SRP / update matrix / reference rules: [`GOVERNANCE.md`](GOVERNANCE.md)
