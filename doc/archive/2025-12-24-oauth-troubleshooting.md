# 2025-12-24 - OAuth Login Redirect Mismatch (Archive)

> Date: 2025-12-24  
> Status: COMPLETE ✅  
> Scope: Supabase OAuth redirect whitelist mismatch caused auth callback to land on the wrong route

## Summary (When / What / Why / How)

- When: 2025-12-24
- What: fixed admin login failures where the OAuth callback returned to `/{locale}?code=...` instead of `/auth/callback`.
- Why: Supabase redirect allowlist matching is strict; the original flow relied on a query-string redirect target that didn’t match the allowlist.
- How: stored post-auth destination in a cookie (so `redirectTo` has no query string) and added middleware fallback to force `/auth/callback` when a `code` appears on other routes.
- Result: login succeeds even if Supabase falls back to the site URL; the callback code is always exchanged on `/auth/callback`.

## Root Cause

- Original `redirectTo` included `?next=...` (query string).
- Supabase allowlist entry was `/auth/callback` (no query string).
- When the redirect target didn’t match, Supabase fell back to the site URL (e.g. `/zh?code=...`), where `exchangeCodeForSession()` was not executed.

## Fix (Implemented)

1. Store `next` (post-auth path) in a cookie before redirect.
2. Use `redirectTo=/auth/callback` (no query string).
3. Add middleware safeguard: if `code` is present and path is not `/auth/callback`, redirect to `/auth/callback`.

