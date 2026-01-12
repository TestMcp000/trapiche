# Error Monitoring (Sentry)

> Canonical entry: `../RUNBOOK.md`

[Back to RUNBOOK index](../RUNBOOK.md)

> Scope: production-oriented error monitoring configuration + verification.

## Canonical configuration files

- Client: `sentry.client.config.ts`
- Server: `sentry.server.config.ts`
- Edge: `sentry.edge.config.ts`
- Instrumentation: `instrumentation.ts`

## Verification

1. Deploy to production with `SENTRY_DSN` configured
2. Check Sentry dashboard for incoming events
3. Optionally trigger a test error to verify integration
