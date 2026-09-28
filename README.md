# Overlap

**Compare crypto assets on the dates they actually share.** A chart can make a new asset look comparable with years of history it does not have. Overlap shows the requested dates, the observations returned for each asset, the shared set, and exactly which dates were excluded. Missing values are never filled.

- **Live app:** https://overlap-research.vercel.app/
- **Track:** Build with CMC: API Hackathon — Data and Visualisation
- **Source of prices:** CoinMarketCap Pro API, `GET /v3/cryptocurrency/quotes/historical`
- **Optional interpretation:** TypeSafe Jev proposes supported research settings. A person confirms the proposal and separately inspects coverage before comparing.

## See the problem in a minute

1. Open the app in **CoinMarketCap history** mode and compare BTC, ETH and TREAD over 90 completed UTC dates.
2. Inspect the requested count, per-asset observations and shared count. The shorter history of TREAD limits the comparison; the excluded dates are visible.
3. Remove TREAD and inspect again. The shared period changes because the actual input set changed.
4. Open **Method** or export the study JSON to inspect UTC dates, raw returned prices, excluded dates and retrieval metadata. The separate illustrative demo mode is labeled and never substitutes prices after a live request fails.

The exact counts depend on the dates and data available when you run it. A missing quote is reported as missing; Overlap does not claim why the provider omitted it.

## What the CMC API makes possible, and its boundary

The historical quotes endpoint supplies USD price observations and timestamps for each selected CMC asset ID. Overlap makes the *intersection of observed UTC dates* explicit, then indexes each asset to 100 at the first shared date. It does not predict prices, infer missing history, or offer trading advice. These are historical quotes near the requested time, **not OHLCV daily close candles**. Weekly mode samples every seventh requested day; it is not a weekly candle. The endpoint and account plan can limit historical access, so a provider error stops the live comparison instead of silently switching to sample data. See [INTEGRATION.md](INTEGRATION.md) for the exact sampling and error rules.

## Reproduce a real call and inspect the response

The deployed server keeps `CMC_API_KEY` private and exposes a narrow same-origin research route. Use two completed UTC dates within the past year. For example, from 28 September 2026:

```sh
curl -sS https://overlap-research.vercel.app/api/research \
  -H 'Content-Type: application/json' \
  --data '{"ids":["btc","eth"],"start":"2026-09-20","end":"2026-09-26","currency":"USD","interval":"Daily"}'
```

The response contains `settings`, `days`, `sharedDates`, `excluded`, `raw` prices, and `provenance` with `provider: "CoinMarketCap"`, `endpoint`, `fetchedAt`, and provider status timestamps. A successful live response is the evidence; a fixture test response is not proof that the deployed provider key works. If this example ages past the one-year window, select recent completed UTC dates. [The server implementation](worker/index.js) constructs the upstream request using `X-CMC_PRO_API_KEY`; [the adapter test](tests/research.test.mjs) asserts its path and parameters without publishing credentials. Do not publish a full API key or request header in screenshots.

## Run locally

Requires a recent Node.js release with `fetch`, `Response.json` and `AbortSignal.timeout` (Node 20+ recommended).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set `CMC_API_KEY` and `TYPESAFE_API_KEY` as **server-side** environment variables on the deployment. `VITE_` variables are embedded in browser bundles and must not be used for secrets. The Vite development server displays the frontend; for local live API testing, serve the Worker/API adapter with a compatible runtime or use the deployed app. Without provider keys, the labeled illustrative mode remains available; a live request returns a configuration error.

## Verify the code

```sh
npm test
npm run build
```

The tests cover shared-date indexing, newly tracked assets, invalid settings, missing credentials, request construction, Jev review without automatic CMC calls, and the Sites worker. They use fixtures; use the deployed request above to verify real provider access. Production Vercel routes live in `api/`, shared validation and provider logic in `worker/index.js`, and the React interface in `src/`.

## Limitations and credits

Supported assets: BTC, ETH, SOL, LINK and TREAD; two to four per study, USD, completed UTC dates within the past year. Saved settings last for the current page session. Jev is optional and proposes settings only; its confidence is not a correctness guarantee. If the CMC plan or historical endpoint stops returning this range, live research will show an error. [Third-party attributions](THIRD_PARTY.md) include the Spectrum UI chart components.
