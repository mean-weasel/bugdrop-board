# BugDrop Board Staging Cloudflare/GitHub Dogfood

## Goal

Execute the next staging dogfood tranche for BugDrop Board using Codex Chrome Extension plus CLIs:
configure or verify Cloudflare/GitHub staging resources, run the package dry-run and staging deploy
workflows, embed the staging board in a signed-token host app, and capture rigorous proof without
publishing to npm or deploying production.

## Oracle

Completion is true only when a maintainer can point to a durable staging dogfood receipt proving all
of the following:

- GitHub and Cloudflare CLI/browser access are authenticated for the intended Mean Weasel resources.
- Required GitHub Environment/repository secrets are configured without exposing secret values.
- The dogfood mirror repo exists and the Worker token can create Issues in it.
- A staging Wrangler environment is explicitly configured and dry-run verified without default
  config fallback.
- The `Package Widget` workflow ran with dry-run enabled and logged the expected package contents.
- The `Deploy Worker` workflow ran against GitHub Environment `staging` and Wrangler environment
  `staging`, applied remote migrations, provisioned the dogfood board, and deployed the staging
  Worker.
- HTTP smoke passes for the staging Worker `/health` and `/board.js` endpoints.
- A signed-token host app embeds the staging Worker with exact-origin CORS.
- Two independent browser sessions prove item creation, GitHub Issue mirroring, upvote, and polling
  visibility from a second viewer.
- Rollback path is recorded.
- Final audit confirms no hosted control plane, billing, realtime, comments, downvotes, GitHub
  Projects, npm publish, production deploy, or unrelated product behavior was added or executed.

## Scope

In scope:

- Cloudflare account/D1/Worker staging setup and verification.
- GitHub repo, GitHub Environment, and secret configuration for staging.
- GitHub Actions workflow dispatch and log inspection.
- Codex Chrome Extension browser proof against the signed-token host app.
- CLI-driven proof capture and a committed staging result receipt.
- Small docs/config fixes that are required to make the staging run safe and reproducible.

Out of scope:

- npm publish.
- Production deploy.
- Hosted control plane or tenant management.
- Billing.
- Realtime transport.
- Comments.
- Downvotes.
- GitHub Projects.
- New product behavior beyond staging/dogfood infrastructure and proof.

## Execution Requirements

- Use the Codex Chrome Extension for browser work that depends on signed-in host app state or Chrome
  profile/cookies.
- Use CLIs for GitHub and Cloudflare where possible: `gh`, `wrangler`, `npm`, `curl`.
- Do not print, commit, or summarize secret values.
- Prefer read-only inventory before mutating remote systems.
- If any remote credential is missing or insufficient, record the exact missing permission/resource
  and stop that branch of work without guessing.
- Keep all receipts in repository docs; keep secret values outside the repository.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-staging-cloudflare-github/goal.md.`
