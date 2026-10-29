# TOP DICE backend setup (chat foundation)

The existing `index.html` remains the current demo frontend. This branch adds a separate backend foundation for authenticated host–user messaging. It does **not** enable real-money deposits, wagers, payouts, or withdrawals.

## 1. Create the database
1. Create a Supabase project.
2. Open SQL Editor and run `server/schema.sql`.
3. Copy the project URL and service-role key into your backend host's secret settings. The service-role key is server-only and must never be placed in frontend JavaScript or committed to Git.

## 2. Deploy the API
1. Deploy this repository to a Node.js host that supports a persistent web service.
2. Set the service root directory to `server`, build command to `npm install`, and start command to `npm start`.
3. Set the environment variables listed in `server/.env.example`. Use your actual BotFather token only in the hosting secret manager.
4. Set `HOST_TELEGRAM_IDS` to the host's numeric Telegram user ID(s), not a username.
5. Set `ALLOWED_ORIGIN` to the exact HTTPS origin where the Mini App is served.
6. Visit `/health` to check that the service is running.

## 3. Telegram authentication
The Mini App must send its raw `Telegram.WebApp.initData` in the `Authorization: tma <initData>` header. The API validates Telegram's HMAC signature and rejects old auth data. Never authenticate using `initDataUnsafe` or a user ID supplied in an ordinary request body.

## 4. Chat endpoints
- `GET /api/me` — verified Telegram user and host flag.
- `GET /api/messages` — a user sees their own conversation; a host supplies `?userId=<telegram-id>`.
- `POST /api/messages` — JSON `{ "message": "Hello" }` for users, or `{ "userId": "123", "message": "Hello" }` for hosts.
- Send the header `Authorization: tma <Telegram.WebApp.initData>` on every API call.

This is an initial chat API, not yet connected to a chat screen in `index.html`. Add the UI only after the API is deployed and tested. For production, add a proper host inbox, unread counts, delivery notifications, retention policy, moderation/reporting, monitoring, backups and automated tests.

## 5. Real-money gaming and payment status
Real-money deposits, betting, winnings and withdrawals are intentionally not implemented in this branch. Before enabling them, obtain jurisdiction-specific legal advice and written approval from a payment provider that expressly supports the exact gambling use case. Telegram Stars are for eligible digital goods/services and are not a workaround for betting or cash-out restrictions. Do not treat demo coins as money or advertise them as redeemable.

## 6. Safe rollout
- Keep the `main` branch unchanged while testing this branch.
- Rotate any bot token that was ever exposed in source code, screenshots or chat.
- Use separate test and production projects/secrets.
- Add database backups and audit logs before handling real users.
