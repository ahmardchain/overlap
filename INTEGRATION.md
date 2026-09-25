# Research integration

Server routes: GET /api/status, POST /api/interpret, POST /api/research.
Set CMC_API_KEY and TYPESAFE_API_KEY as secret production environment variables, then redeploy. Never place keys in browser code. Credentials were unavailable during implementation; live provider success and plan entitlements remain unverified.

CMC: https://coinmarketcap.com/api/documentation/pro-api-reference/cryptocurrency#ohlcv-historical
/v2/cryptocurrency/ohlcv/historical, stable IDs BTC=1 ETH=1027 SOL=5426 LINK=1975. Daily UTC close, time_start shifted back one day because it is exclusive. One bounded request per asset, no more than 366 calendar days. Incomplete current UTC day excluded. Provider errors or invalid response shapes stop the comparison. A returned valid empty quote array represents zero returned observations; no cause of omission is inferred. Data is not filled. Weekly is every seventh daily close from requested start, not weekly OHLCV. Output includes raw closes, excluded dates/assets, settings, retrieval timestamps and provider status metadata. Charts normalize at first shared date. No shared date yields no normalization.

Jev: https://docs.typesafe.ai/api.md and https://docs.typesafe.ai/cookbooks/function_calling.md
POST /v1/systemone with jev-latest. Parallel Choice questions select supported asset combinations, trailing duration, sampling, supported task. Includes no-match branches. Arbitrary date expressions and unlisted durations defer to manual controls. All accepted answers become a review proposal; only a human confirmation updates controls, and Inspect coverage is a separate request. Confidence threshold 0.8 is a provisional UI caution, not a tested correctness guarantee.

Source state remains session-only. No scheduled fetches. Site remains private. Before wider sharing, add per-user quotas and evaluate Jev prompts with real credentials.

Validation: 10 tests passed including shared-date normalization, invalid dates/IDs, provider shape failure, missing key handling, exclusive start and provenance, and Jev review-only behavior. Provider calls were mocked in tests. Browser verified that unconfigured live mode has no synthetic chart and returns an actionable error. Original export-download automation limitation remains.
