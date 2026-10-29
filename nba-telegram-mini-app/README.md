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
1. A GitHub Actions deployment workflow is included at `.github/workflows/deploy-nba-mini-app.yml`; it publishes only the static app HTML, not the backend source.
2. In GitHub repository Settings → Pages, set the build/deployment source to **GitHub Actions** if it is not already set. The workflow runs on pushes to the app and can be run manually from Actions.
3. After a successful deployment, the expected URL is `https://dolphinxraywas-dev.github.io/BETONRISK/` (confirm the exact URL in the workflow deployment output).
4. In Telegram, create/configure your bot with BotFather and set its Web App URL to the deployed HTTPS URL. This step requires access to your bot/BotFather; no bot token is stored in this repository.
5. Test inside Telegram on mobile and desktop. The demo works in a regular browser too.

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
See `supabase/schema.sql`, `supabase/config.toml`, and `supabase/functions/game-round/index.ts`. The Edge Function verifies Telegram `initData` freshness/signature and generates demo dice on the server, but it is only a starter endpoint: it does not persist rounds or update a wallet. Deploy with Supabase CLI after linking a Supabase project, set the `TELEGRAM_BOT_TOKEN` secret on the server, and call the function with the raw `Telegram.WebApp.initData` string (not `initDataUnsafe`). The frontend still runs in local demo mode until it is deliberately wired to this endpoint. Configure and test RLS policies, atomic ledger transactions, idempotency, admin allowlists, and rate limits before using real accounts or balances.
