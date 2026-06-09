# Hosted Production Dogfood Cutover

Date: 2026-06-08

Status: passed.

## Targets

- Host app: `https://bugdrop.dev/board`
- Board Worker: `https://board.bugdrop.dev`
- Board id: `board_mean_weasel_bugdrop_board_production_dogfood`
- Tenant id: `tenant_mean_weasel`
- App id: `app_mean_weasel_bugdrop_dogfood`
- Dogfood repo: `mean-weasel/bugdrop-board-production-dogfood`
- GitHub App installation id: `121164211`

## Cutover Steps

1. Confirmed the GitHub App installation includes
   `mean-weasel/bugdrop-board-production-dogfood`.
2. Applied production D1 migration `0003_hosted_control_plane.sql`.
3. Provisioned hosted dogfood rows for the Mean Weasel tenant, BugDrop Dogfood app, exact allowed
   origins, HMAC legacy verifier, GitHub App installation, and board config.
4. Added host token claims in `mean-weasel/bugdrop` so
   `https://bugdrop.dev/api/bugdrop-board-token` emits `tenantId` and `appId`.
5. Added `BOARD_GITHUB_APP_ID` and `BOARD_GITHUB_APP_PRIVATE_KEY` to the `bugdrop-board`
   production GitHub Environment.
6. Deployed the production Board Worker through the `Deploy Worker` workflow.
7. Fixed GitHub App private-key import to support GitHub-downloaded PKCS#1
   `BEGIN RSA PRIVATE KEY` PEM files as well as PKCS#8 `BEGIN PRIVATE KEY` PEM files.
8. Redeployed the production Board Worker and reran live hosted smoke checks.

No private keys, token values, bearer tokens, cookies, `.dev.vars`, or `.deploy.secrets` contents
were recorded in this receipt.

## Workflow Proof

- Host app PR: <https://github.com/mean-weasel/bugdrop/pull/218>
- Host app production deploy:
  <https://github.com/mean-weasel/bugdrop/actions/runs/27177243752>
- Board deploy secret mapping PR: <https://github.com/mean-weasel/bugdrop-board/pull/73>
- Board PKCS#1 key support PR: <https://github.com/mean-weasel/bugdrop-board/pull/74>
- Board production deploy after hosted secrets:
  <https://github.com/mean-weasel/bugdrop-board/actions/runs/27177476115>
- Board production deploy after PKCS#1 key fix:
  <https://github.com/mean-weasel/bugdrop-board/actions/runs/27177724385>

## API Proof

Live token endpoint proof decoded only non-secret payload claims:

- `boardId`: `board_mean_weasel_bugdrop_board_production_dogfood`
- `tenantId`: `tenant_mean_weasel`
- `appId`: `app_mean_weasel_bugdrop_dogfood`
- `aud`: `bugdrop-board`
- `iss`: `bugdrop-board-production-host`
- TTL: `300` seconds

Authenticated read:

- `GET https://board.bugdrop.dev/boards/board_mean_weasel_bugdrop_board_production_dogfood/items`
- Result: `200`
- `Access-Control-Allow-Origin`: `https://bugdrop.dev`

Disallowed-origin CORS:

- `OPTIONS` from `https://evil.example`
- Result: `204`
- `Access-Control-Allow-Origin`: absent

## Create And GitHub Mirror Proof

API create smoke:

- Item id: `item_4f8e13c6f5114d1e3a020ab6`
- GitHub issue:
  <https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/12>
- Issue state: `OPEN`
- Issue label: `enhancement`
- Issue body includes the board item id.

Browser UI create smoke:

- Title: `Browser dogfood smoke 2026-06-09T01:32:27Z`
- Item id: `item_f41a649d486ed269094a27c3`
- GitHub issue:
  <https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/13>
- Issue state: `OPEN`
- Issue label: `enhancement`

## Vote Proof

Live hosted upvote against `item_4f8e13c6f5114d1e3a020ab6`:

- Response: `200`
- `Access-Control-Allow-Origin`: `https://bugdrop.dev`
- Response item: `upvoteCount: 1`, `viewerHasUpvoted: true`
- D1 readback: `upvote_count = 1`

## Browser Proof

Automated browser dogfood against `https://bugdrop.dev/board` proved:

- the public landing page loads the embedded board;
- the kanban board renders Open, Planned, Building, and Shipped lanes;
- upvote counts are visible in the UI;
- the composer opens through the visible `Add idea` affordance;
- labeled title and description fields are keyboard/addressable through accessible labels;
- submitting through the UI adds the item back into the live board;
- the UI-created item appears in D1 and the dogfood GitHub repo.

Screenshot artifact during the run:

- `/tmp/bugdrop-board-live-after-submit.png`

The screenshot was not committed because it is transient dogfood proof, not a product asset.

## Key Format Finding

GitHub downloaded the App private key as `BEGIN RSA PRIVATE KEY` (PKCS#1). The hosted GitHub issue
client initially accepted only `BEGIN PRIVATE KEY` (PKCS#8), causing live creates to fail with:

```text
atob() called with invalid base64-encoded data
```

PR #74 fixed this by wrapping PKCS#1 RSA private key DER as PKCS#8 before WebCrypto import. The
regression test uses a generated test-only RSA key fixture, not the production key.

## Scope Audit

This cutover created two dogfood issues and one dogfood upvote in the existing production dogfood
board. It deployed the existing hosted beta path and a compatibility fix for GitHub App key import.

It did not publish an npm package, bump a package version, add billing, add realtime transport, add
comments, add downvotes, add GitHub Projects, destructively clean dogfood data, or add a self-service
hosted control plane.

## Next

- Curate or reset the production dogfood board before showing it broadly; it now contains explicit
  smoke-test items.
- Decide whether the next hosted beta board should use JWKS/public-key verification instead of the
  dogfood-only HMAC legacy verifier.
- Turn this cutover into a first external hosted-beta checklist before inviting a non-dogfood tenant.
