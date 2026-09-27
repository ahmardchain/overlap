# Research integration

Routes: `GET /api/status`, `POST /api/interpret`, `POST /api/research`. Set `CMC_API_KEY` and `TYPESAFE_API_KEY` as server-side Vercel environment variables. Never expose keys to browser code or commits.

## CoinMarketCap data

`/v3/cryptocurrency/quotes/historical` is documented on Basic for up to one year of daily history: https://coinmarketcap.com/api/documentation/pro-api-reference/cryptocurrency#quotes-historical

One request per selected asset uses stable CMC IDs (BTC=1, ETH=1027, SOL=5426, LINK=1975). `time_start` is 23:59 UTC of the first requested date, `time_end` is 23:59:59 UTC of the last, and `interval=24h` requests an end-of-day price quote for each date. These historical prices are **not** OHLCV closing prices. The provider returns the nearest available quote to each target time. The app accepts positive USD prices on exactly the requested UTC dates, excludes dates missing a valid price for any selected asset, and indexes every asset to 100 at the first shared date. Weekly samples every seventh requested date, not a weekly candle. The export records the provider endpoint, retrieval times, raw prices, and excluded dates. Provider errors never turn into demo prices.

Only completed UTC dates within the past year are accepted to stay inside the Basic plan's documented daily limit. Quotes can be absent even within that span; an empty valid quote array becomes zero observations, without guessing a cause. A 403 can still reflect account-level restrictions, so a live 200 response is the final access check.

## TypeSafe Jev

The TypeSafe reference is https://docs.typesafe.ai/api.md. Jev turns a natural-language question into proposed supported assets, duration, and sampling. Code validates the proposal, requires a human confirmation, and only fetches CMC data when the person separately inspects coverage. Jev does not produce or alter the prices.

## Verification

Run `node --test tests/research.test.mjs tests/sites-worker.test.mjs` and `npm run build`. Tests use fixture provider responses. Live validation should confirm a 200 response and source metadata from CMC on the published `/api/research` route.
