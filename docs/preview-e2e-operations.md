# Preview E2E Operations

This runbook covers the isolated BugDrop Board preview Worker used by the companion venue and CI.
It is not a staging or production deployment path.

## Fixed contract

| Resource                        | Approved value                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------- |
| Worker                          | `https://bugdrop-board-preview.neonwatty.workers.dev`                             |
| D1                              | `bugdrop-board-preview` / `d8b341bd-8be8-45f3-90d8-231abe398781`                  |
| Mirror repository               | `mean-weasel/bugdrop-board-widget-test` (`R_kgDOT5iiFg`)                          |
| Demo venue                      | `https://bugdrop-board-widget-test.vercel.app`                                    |
| Protected CI venue              | `https://bugdrop-board-widget-test-git-preview-jermwatts-projects.vercel.app`     |
| Tenant / app                    | `tenant_preview` / `app_preview_board`                                            |
| Demo / CI boards                | `board_preview_demo` / `board_preview_ci`                                         |
| Verifier                        | RS256, `preview-2026-01`, `https://bugdrop-board-widget-test.vercel.app/api/jwks` |
| Issuer / audience / maximum TTL | demo venue origin / `bugdrop-board` / 300 seconds                                 |

The two venue origins are the entire CORS allowlist. Generic Vercel preview URLs, wildcard origins,
null origins, staging, and production are forbidden. The fixed CI alias is attached only to the
protected `preview` branch; it must not be assigned to arbitrary pull-request deployments.

## Local validation and dry runs

Run the fail-closed contract validator and deployment build without changing Cloudflare:

```sh
npm run validate:preview
npm run deploy:check:preview
npm run provision:preview -- --installation-id "$BUGDROP_BOARD_PREVIEW_RUNTIME_INSTALLATION_ID" --dry-run
npm run reset:preview -- --board-id board_preview_ci --confirm-board board_preview_ci --dry-run
```

The checked-in all-zero `BUILD_SHA` is only a valid-shaped dry-run sentinel. A live deployment must
override it with the exact lowercase 40-character candidate SHA. Never deploy that sentinel.

## First provisioning or deliberate repair

These commands mutate only the named preview Worker/D1. Obtain the normal action-time approval and
confirm the current Cloudflare account before running them:

```sh
npx wrangler d1 migrations apply DB --remote --env preview
npm run provision:preview -- --installation-id "$BUGDROP_BOARD_PREVIEW_RUNTIME_INSTALLATION_ID" --remote
npm run build:widget
npx wrangler deploy --env preview --var "BUILD_SHA:$GITHUB_SHA"
```

Provisioning is deterministic and idempotent. It creates two explicit board IDs for the same
dedicated mirror repository, activates exactly the two approved origins, one RS256/JWKS verifier,
and one repository-scoped runtime GitHub connection. It disables stale origins, verifiers,
connections, and unexpected board configurations inside the dedicated preview app. It never reads
or writes staging/production resources.

The Worker requires `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY` as Cloudflare secrets before live
item creation. Keep deployment credentials, the runtime GitHub App, the monitor/cleanup GitHub App,
and the Vercel `BOARD_TOKEN_PRIVATE_JWK` separate. No private key or bearer token belongs in browser
configuration, logs, traces, screenshots, artifacts, or repository variables.

## Provenance gate before mutation

Build locally from the exact candidate checkout, deploy with `BUILD_SHA=$GITHUB_SHA`, then run:

```sh
npm run deploy:smoke -- \
  --url https://bugdrop-board-preview.neonwatty.workers.dev \
  --expect-environment preview \
  --expect-build-sha "$GITHUB_SHA" \
  --local-board-path public/board.js \
  --cors-origin https://bugdrop-board-widget-test-git-preview-jermwatts-projects.vercel.app \
  --cors-disallowed-origin https://evil.example \
  --cors-board-id board_preview_ci \
  --cors-token-endpoint 'https://bugdrop-board-widget-test-git-preview-jermwatts-projects.vercel.app/api/board-token?mode=ci&viewer=ada'
```

The smoke check fails before mutation unless `/health`, authenticated API responses, and
`/board.js` expose the exact `X-BugDrop-Build-Sha`, health returns the same `buildSha`, and the
deployed widget SHA-256 equals the local `public/board.js`. It obtains a token with exactly one
`POST application/json` request whose body is `{}` and checks allowed plus denied CORS behavior.

## CI-board reset and non-interference

Live jobs are serialized. Reset immediately before and in `always()` cleanup after every canary:

```sh
npm run reset:preview -- \
  --board-id board_preview_ci \
  --confirm-board board_preview_ci \
  --remote
```

The command refuses every other board ID. Its SQL deletes only votes, events, and items whose
`board_id` is `board_preview_ci`; it does not delete either board/configuration row. The command
captures demo/CI counts before and after, fails unless demo counts are identical, and fails unless
all CI counts are zero. This D1 reset does not replace the independently authenticated Issue
cleanup and two-zero-observation sweep owned by the downstream live-canary workflow.

## Rotation and rollback

- Rotate the venue RS256 key only during the companion venue's documented single-key maintenance
  window. Update the Vercel private JWK and the fixed `preview-2026-01` configuration together, then
  rerun token/JWKS negative tests before enabling canaries.
- Roll back the Worker by redeploying the last reviewed commit with its own exact `BUILD_SHA`, then
  rerun the provenance smoke. Never label old assets with a new SHA.
- If provisioning or reset proof fails, disable live canaries, retain the preview D1 for inspection,
  and do not substitute staging or production resources.
- If CORS, JWKS, alias binding, build identity, widget hash, GitHub target, or demo non-interference
  differs from this runbook, stop before any create/upvote mutation.

## Live workflow and trust boundary

`.github/workflows/preview-live.yml` owns the stable `Preview E2E` check on `pull_request` and
`merge_group`. A same-repository, non-Dependabot pull request can enter the live critical section
only after approval through `preview-pr`. A merge-group candidate uses `preview-merge-queue` and
the exact merge SHA. Forks and Dependabot receive only checkout, install, and contract-test access;
the workflow never uses `pull_request_target`. The candidate workflow has no schedule or janitor
job.

`.github/workflows/preview-janitor.yml` is the only scheduled/manual janitor. It uses the dedicated
`preview-janitor` environment, accepts only the repository default branch, and checks out the exact
default-branch event SHA with persisted checkout credentials disabled. Configure that environment
to allow only the default branch, with no required reviewer so the schedule can recover unattended.
Give it only `BUGDROP_BOARD_PREVIEW_MONITOR_APP_ID` and
`BUGDROP_BOARD_PREVIEW_MONITOR_PRIVATE_KEY`, plus the public repository ID, runtime-bot login, and
label variables used to attribute synthetic Issues. Do not add Cloudflare account/token values,
the runtime App installation or private key, the venue signing key, venue/browser configuration,
or CI-board reset authority. A manual dispatch from any non-default ref skips the janitor job.

All Worker/D1 mutations and the monitor-only janitor share `bugdrop-board-shared-preview` with
cancellation disabled. The live critical section applies preview migrations, provisions the fixed
boards, deploys the exact candidate, proves Worker/widget/CORS provenance, resets only
`board_preview_ci`, runs the browser proof, independently verifies the Issue, closes attributable
Issues, performs a final prefix sweep, and resets the CI board again. The default-branch janitor can
repeat the attributable prefix sweep after a cancelled or failed run; it does not deploy, sign,
reset D1, or run pull-request/merge-group code. If the janitor itself is cancelled, rerun it from the
default branch: cleanup is selector-bound and idempotent, and the shared non-cancelling mutex keeps
it from overlapping the live critical section.

Every third-party action in both privileged workflows is pinned to the reviewed 40-character
upstream commit. Upgrade a pin only after independently resolving the intended upstream release to
a new immutable commit and updating the workflow contract fixture; never replace a pin with a
branch or major-version tag.

The browser step receives only these public values:

- fixed repository name and node ID;
- fixed Worker, venue, and CI board identifiers;
- run marker, expected Worker/widget identities, and venue commit/config version;
- a runner-temporary result-file path.

It never receives Cloudflare credentials, either GitHub App private key, a monitor token, or the
Vercel signing key. Playwright disables screenshots, traces, and video. The retained evidence file
contains only run ID, attempt, SHA, and marker; raw responses, headers, tokens, and browser output
are not uploaded.

## Synthetic Issue attribution and cleanup

The monitor App must be installed only on `mean-weasel/bugdrop-board-widget-test` with Issues write
permission. Its token is minted separately from the Worker runtime App and is passed only to the
preflight, independent verifier, exact cleanup, and final sweep steps. Configure:

- `BUGDROP_BOARD_PREVIEW_REPOSITORY=mean-weasel/bugdrop-board-widget-test`
- `BUGDROP_BOARD_PREVIEW_REPOSITORY_ID=R_kgDOT5iiFg`
- `BUGDROP_BOARD_PREVIEW_RUNTIME_BOT` as the exact runtime App bot login
- `BUGDROP_BOARD_PREVIEW_LABELS` as the exact JSON label array, currently `["enhancement"]`
- monitor App ID/private key and Cloudflare token only as environment secrets named in the setup
  inventory

The reserved title prefix is `[BugDrop Board CI canary]`. A valid marker is
`bugdrop-board-ci:<run-id>:<run-attempt>:<40-character-worker-sha>`. Verification requires exactly
one non-pull-request Issue plus the exact repository node ID, runtime bot author, title, structured
body marker, Worker SHA, venue commit/config version, labels, item ID, open state, and canonical URL.
Cleanup first applies those same repository/author/prefix/valid-marker/body gates. It performs a
close readback, permits one bounded retry after an ambiguous write, and requires two consecutive
zero-open observations. It cannot select ordinary user Issues, a similarly named repository, a
wrong-author Issue, or an invalid/missing marker.

Run the non-live contract proofs with:

```sh
npm run test:preview-canary-fixture
npm run test:preview-fork-gates
npx playwright test --config playwright.preview.config.ts --list
```

These commands do not deploy, install secrets, call GitHub, or mutate D1. If independent
verification, duplicate rejection, either cleanup, the final reset, or any provenance gate fails,
the `Preview E2E` bridge fails closed. Disable live canaries and use the rollback procedure above;
do not substitute staging or production resources.
