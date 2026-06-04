# Production Deploy Readiness - 2026-06-04

## Summary

Production deploy is not ready to execute yet. The code and local gates are release-ready, but
production resources/secrets have not been created or configured.

## Read-Only GitHub Inventory

Production GitHub Environment:

- `gh api repos/mean-weasel/bugdrop-board/environments/production`: `404 Not Found`
- `gh secret list --repo mean-weasel/bugdrop-board --env production`: `404 Not Found`

Conclusion: GitHub Environment `production` does not exist yet, so production Environment secrets
are not configured.

Staging Environment remains configured by name only with:

- `BOARD_TOKEN_SECRET`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `ISSUE_ACCESS_TOKEN`

## Read-Only Cloudflare Inventory

`npx wrangler d1 list --json` listed only:

- `bugdrop-board-staging`
- id `e4bfc871-ace5-49b9-b795-1e85ce535b9f`

`npx wrangler deployments list --name bugdrop-board --json` failed with Cloudflare code `10007`,
which means production Worker `bugdrop-board` does not exist on the account.

`npx wrangler deployments list --name bugdrop-board-staging --json` listed current staging
deployments, including the `main` staging deploy version created at `2026-06-04T18:00:49Z`.

Conclusion: production D1 and production Worker are not provisioned yet.

## Local Readiness Proof

`npm run release:rehearsal` passed. This covered local provisioning, package dry-run, deploy
dry-run, local E2E, validation, knip, audit, and Actions guard.

The production deploy docs/config already define the required production shape:

- exact `ALLOWED_ORIGINS` instead of `*`
- Worker secrets for `BOARD_TOKEN_SECRET` and `GITHUB_ISSUE_ACCESS_TOKEN`
- remote D1 migration commands
- remote board provisioning
- deployed `/health` and `/board.js` smoke checks
- rollback by redeploying a previous known-good commit or Cloudflare Worker rollback

## Required Before Production Promotion

1. Create GitHub Environment `production`.
2. Create production D1 database, likely `bugdrop-board-production` or approved equivalent.
3. Add a Wrangler production environment or update top-level production config with:
   - Worker name
   - production D1 database id
   - exact host app origins
   - production token issuer/audience
4. Configure production GitHub Environment secrets:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
   - `BOARD_TOKEN_SECRET`
   - `ISSUE_ACCESS_TOKEN`
5. Decide the production board repo to mirror into.
6. Dispatch **Deploy Worker** only after explicit approval.

## Scope Audit

- No production deploy ran.
- No production GitHub Environment was created.
- No production secrets were written.
- No production Cloudflare resources were created.
- No npm publish ran.
- No hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, or new product
  behavior was added.
- No secret values are recorded in this receipt.
