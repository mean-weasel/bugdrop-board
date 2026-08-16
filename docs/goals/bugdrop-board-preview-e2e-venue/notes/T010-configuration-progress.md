# T010 configuration progress

Recorded 2026-08-15/16 without secret values.

## Completed preview-only configuration

- Created separate runtime and monitor GitHub Apps, installed only on
  `mean-weasel/bugdrop-board-widget-test`, with repository metadata read and Issues read/write.
- Hardened `preview-pr`, `preview-merge-queue`, and `preview-janitor` environments and installed the
  monitor credentials only in their intended destinations. `preview-janitor` has no Cloudflare,
  runtime-App, signer, deployment, or D1 authority.
- Protected companion `main` and `preview` through ruleset `20898114`: pull-request-only changes,
  required `check`, deletion and non-fast-forward protection, and no bypass. Approval count is zero
  to avoid a single-owner self-approval deadlock while retaining the PR and check gates.
- Disabled project-wide Vercel authentication so the fixed CI alias is credential-free. The signer
  and public venue configuration exist only in Vercel Production and Preview restricted to branch
  `preview`; Development and generic Preview branches have neither.
- Repaired the companion Node-ESM server runtime through protected pull requests 1 and 2. Demo
  commit `010770269c0bc0a1f6d80f5dc7375c2c91bb18a4` and fixed-CI commit
  `a9eba6e7f8770e997facdfa8e5edf406bafdc03a` both return HTTP 200 for health/config/JWKS and issue
  five-minute RS256 tokens. GET, non-empty bodies, and cross-alias origins are denied. A generic PR
  Preview has no configuration/signer and returns 503 for all server endpoints.
- Created only the Cloudflare Worker `bugdrop-board-preview` in account
  `341a3846c29902f6363c151395932f5a` as Wrangler's fail-closed bootstrap. The public origin returns
  a no-store 404 until the reviewed candidate is deployed.
- Installed only `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY` as Worker secrets on
  `bugdrop-board-preview`; Wrangler secret-name readback confirms both without revealing values.
- Created an expiring user API token restricted to Cloudflare account
  `341a3846c29902f6363c151395932f5a` with only `Workers Scripts:Edit` and `D1:Edit`, ending
  2026-09-15. The first credential was revoked after its value appeared in an automation
  diagnostic; it was replaced immediately and the replacement value was never printed, committed,
  snapshotted, or added to a receipt.
- Installed the replacement only as `CLOUDFLARE_API_TOKEN` in GitHub environments `preview-pr`
  and `preview-merge-queue`. GitHub name/timestamp readback recorded updates at
  2026-08-16T13:20:56Z and 2026-08-16T13:20:57Z respectively. `preview-janitor` has no Cloudflare
  token.
- Verified the replacement directly against Cloudflare: token verification, D1 database listing,
  and Workers script listing each returned HTTP 200 for the approved account. Both the browser and
  operating-system clipboards were cleared, and the temporary in-memory token binding was emptied.

## T010 outcome

The least-privilege preview configuration is complete. No production destination was changed. The
broader local Wrangler OAuth credential was not copied into GitHub and remains ineligible for CI.
