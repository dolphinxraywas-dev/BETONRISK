# NBA — Take the Throne (Telegram Mini App)

This folder is a standalone, mobile-first Telegram Web App prototype. It was added alongside the existing root `index.html`; the original TOP DICE project was not overwritten.

## Prototype features
- Six 3D-style dice animate and reveal results sequentially.
- Pick two numbers from 1–6; selecting the same number twice is supported.
- A bonus wheel animates to a random 1–6 result after a dice round.
- Local demo-token store, player profile, round history, and sample ranking entries explicitly marked as demos.
- Telegram Web App SDK initialization when opened in Telegram.
- No live payments, withdrawals, cash prizes, real wallet balances, or real-time player counts.

## Deploy as a Telegram Mini App
1. Enable GitHub Pages for this repository (Settings → Pages; deploy from branch `main`, folder `/ (root)` only serves the root index, so either use a Pages workflow that publishes this subfolder or copy this folder to a dedicated deployment branch/repository).
2. Publish this folder to a public HTTPS URL.
3. In Telegram, create/configure a bot with BotFather and set its Web App URL to the HTTPS deployment URL.
4. Test inside Telegram on mobile and desktop. The demo works in a regular browser too.

## Backend architecture (not yet deployed)
Suggested production stack: Supabase Postgres + Edge Functions, with the Edge Function as the only client entry point for game rounds, token ledger changes, and admin actions.

Required controls:
- Validate Telegram `initData` HMAC on the server using the bot token; reject stale `auth_date`. Never trust `initDataUnsafe` for authorization.
- Store the bot token and Supabase service-role key only as server secrets; never in frontend JavaScript or Git.
- Use server-side randomness for authoritative rounds, and persist round results before returning them.
- Keep wallet changes in an append-only ledger, in a database transaction; use idempotency keys to prevent duplicate credits.
- Use a server-side allowlist of Telegram numeric IDs for admin authorization, plus audit logs and rate limits. A password embedded in HTML is not secure.
- Enable Row Level Security. Do not grant clients direct insert/update/delete access to wallet, ledger, round outcomes, payment requests, or admin audit tables.
- Before connecting any paid tokens, prizes, cash-out, or gambling mechanics, get legal advice and use approved payment providers. This prototype deliberately uses only non-redeemable demo tokens.

## Database
See `supabase/schema.sql`. It is a starting schema, not a deployed or audited backend. Configure and test RLS policies and server functions before using any real accounts or balances.
