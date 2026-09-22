# Production recovery — 2026-09-22

## Verified findings

- Production database health answered `connected`; public quotes contained only five older instruments. A working DB health check does not establish that history migrations are applied.
- Faraz public `get-data` returned all nine configured instruments. Public `chart-history` returned 200 daily bars per configured symbol. Neither call required account credentials.
- The symbol-history handler incorrectly read `?symbol=` instead of the `[symbol]` route parameter, causing 404 before querying PostgreSQL. Fixed with a regression test.
- Root `loading.tsx` hid streamed homepage content indefinitely without JavaScript. Removed that boundary; nested market/admin/login loading boundaries remain.
- Malformed characters before the theme `:root` selector broke legacy token aliases in light mode. Fixed and checked in both themes.
- Quote ingestion no longer automatically runs the expensive history backfill. Admin has separate quote/history actions; history uses one parameterized upsert batch per symbol.

## Production steps requiring authorized Vercel/DB access

1. Link the existing project (`zar-signal-ir`, team `naviddigit-5944`), then pull production environment into ignored `.env.production.local`. Never print or commit it.
2. Run `prisma migrate status`, then `prisma migrate deploy` outside the Vercel build, against the verified production connection. If a direct connection is required, supply it to the CLI as `DATABASE_URL`; the current schema does not read `DIRECT_URL` automatically. Do not reset, use `db push`, or change applied migration SQL.
3. With production environment loaded explicitly:

   ```powershell
   $env:NODE_ENV = 'production'
   node --env-file=.env.production.local --import tsx scripts/production-market.ts --enable-faraz --history
   ```

4. Verify all nine quote timestamps, `/api/public/markets/gold_melted/history?days=90&resolution=1D`, and `/api/public/bubbles/history?formula=GOLD_BUBBLE&range=24h` on the live deployment.
5. Keep the existing market worker running on a persistent host or connect an authenticated external scheduler to `/api/cron/market`. `pollSeconds` alone does not schedule execution on Vercel. `vercel.json` deliberately has no Hobby-incompatible minute cron.

## Data limitations preserved

- Faraz's public quote payload supplies one `price`, not independent bid/ask or an exchange timestamp. Existing mapping remains unchanged; `observedAt` currently represents our observation, not a source-provided trade timestamp. Canonical bid/ask governance remains a separate approval item.
- Historical OHLC is not historical bubble. Bubble history starts with captured synchronized inputs; it is not reverse-engineered from old prices.
- No financial formula, threshold, or silver calculation was invented in this recovery.

Local verification is not proof that production migrations or ingestion have run. Report those separately.
