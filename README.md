# Overlap

Coverage-aware crypto research workspace with Spectrum UI charts, CoinMarketCap historical-data adapter, and TypeSafe Jev settings proposals.

## Run

npm install
npm run dev -- --host 0.0.0.0

For local live calls, supply CMC_API_KEY and TYPESAFE_API_KEY as server process environment variables. Production uses Vercel server-side environment variables. See INTEGRATION.md for exact behavior and remaining validation.

## Verify

node --test tests/research.test.mjs tests/sites-worker.test.mjs
npm run build

## Current status

CMC and TypeSafe keys are configured on the Vercel deployment. Historical quotes use the Basic-access endpoint for the past year; live provider success must be confirmed with an actual request. Demo remains clearly labeled and selectable. Live mode never substitutes synthetic data. Jev always requires human review; manual controls remain available. Saved settings last only for the current session. JSON export implemented; native download delivery remains unverified by automation.

The earlier design-qa.md and preview images document the original design prototype. INTEGRATION.md describes the current backend validation. Spectrum attribution/license: THIRD_PARTY.md and public/licenses/spectrum-ui.txt.

Live site: https://overlap-research.vercel.app
