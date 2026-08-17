# Closed Beta Ops Runbook

Use this runbook when a self-hosted closed-beta install needs support, triage, rollback, or manual
data-protection guidance. It is intentionally operator-facing and documentation-only: it does not
add monitoring, alerting, incident tooling, backup automation, restore automation, deploys, D1
mutations, or credential changes.

## First Response

1. Identify the affected install:
   - host app origin;
   - host app page URL;
   - board Worker URL;
   - board id;
   - mirror repo;
   - Worker commit or deployment identifier;
   - time window and user impact.
2. Classify the failure:
   - setup or deploy;
   - token or authentication;
   - CORS;
   - GitHub mirror;
   - D1 persistence;
   - polling or upvote;
   - styling, copy, or embed placement.
3. Capture only safe evidence before changing anything.
4. Decide whether the operator should hide the host embed, roll back the Worker, or keep the board
   live while diagnosis continues.

Do not paste token values, browser cookies, `.dev.vars`, `.deploy.secrets`, Worker secret values,
Cloudflare API tokens, GitHub tokens, or screenshots of secret screens into receipts, issues, chat,
or support notes.

## Safe Evidence

Record:

- exact command names and pass/fail summaries;
- Worker URL, host origin, board id, and mirror repo;
- `/health` response environment, without secrets;
- `deploy:smoke` result summary;
- browser console errors with token values removed;
- HTTP status codes and route names;
- GitHub Issue URL and number;
- D1 database name/id location, not secret values;
- screenshot of the board UI only when it does not expose tokens, cookies, private user data, or
  secret screens.

Redact:

- `Authorization` headers;
- `Cookie` headers;
- host-signed board tokens;
- token endpoint responses;
- secret values and secret-management screens;
- raw `.dev.vars` and `.deploy.secrets` contents;
- private user identifiers that are not needed for the support decision.

## Baseline Checks

Start with local, non-mutating checks:

```bash
npm run doctor:selfhost -- \
  --env production \
  --host-origin https://app.example.com \
  --repo owner/name \
  --board-id board_owner_name \
  --worker-url https://bugdrop-board.example.workers.dev \
  --token-endpoint https://app.example.com/api/bugdrop-board-token
```

Then check deployed public surfaces:

```bash
npm run deploy:smoke -- \
  --url https://bugdrop-board.example.workers.dev \
  --expect-environment production \
  --cors-origin https://app.example.com \
  --cors-disallowed-origin https://evil.example \
  --cors-board-id board_owner_name \
  --cors-token-endpoint https://app.example.com/api/bugdrop-board-token
```

The deployed request must fetch `/board.js` from the actual Worker origin. Local browser tests use
the dummy host's `/board.js`; they are interaction proof, not a substitute for this per-install
asset check. Worker hosting is the sole supported widget distribution path.

When diagnosing a dependency-security concern, run the full `npm audit --json` against the committed
lockfile. The verified hardening baseline contained zero vulnerabilities. Record any later advisory,
dependency path, fix availability, owner, and beta disposition without treating a severity threshold
as a clean audit.

For a target-app readiness decision, finish the [Closed Beta Dogfood Script](closed-beta-dogfood-script.md)
with two signed-in viewers.

## Failure Isolation

### Setup Or Deploy

- Run `npm run doctor:selfhost` and fix failed static checks before remote work.
- Confirm the Worker URL serves `/health` and `/board.js`.
- Confirm `/health` reports the expected environment.
- Confirm `wrangler.toml` has exact `ALLOWED_ORIGINS`, the intended `BOARD_TOKEN_AUDIENCE`, the
  intended `BOARD_TOKEN_ISSUER`, and a real D1 `database_id` for the target environment.
- Confirm remote migrations were applied to the same D1 database named in the target environment.

### Token Or Authentication

- Confirm the host page calls the token endpoint with browser credentials.
- Confirm the token endpoint returns `{ "token": "payload.signature" }`.
- Confirm the token payload uses the expected `boardId`, audience, issuer, stable `externalUserId`,
  and short `exp`.
- Confirm `exp` is not farther in the future than `BOARD_TOKEN_MAX_TTL_SECONDS`.
- If tokens fail only in the browser, inspect host-app cookie and CORS behavior for the token
  endpoint. Do not copy the token value into the receipt.

### CORS

- Confirm `ALLOWED_ORIGINS` contains the exact host app origin, including scheme and host.
- Run deployed smoke with both `--cors-origin` and `--cors-disallowed-origin`.
- Treat CORS as browser containment only. A valid bearer token remains the Worker authorization
  boundary.

### GitHub Mirror

- Confirm the board was provisioned for the intended `owner/name` repo.
- Confirm the GitHub token can create Issues in that repo and is not scoped to the wrong repo.
- Confirm valid item creation creates the GitHub Issue before D1 persistence.
- If GitHub rejects the request, record the status and message summary, not the token.

### D1 Persistence

- Confirm the target environment points at the intended remote D1 database id.
- Confirm migrations were applied against the explicit target environment.
- Use the board id, item id, or GitHub Issue number to narrow the row being inspected.
- Do not run manual SQL writes during beta support unless the maintainer explicitly approves a
  repair plan and records rollback expectations.

### Polling Or Upvote

- Use two signed-in viewers from separate browser contexts.
- Confirm Viewer B sees Viewer A's item after polling without a full page reload.
- Confirm the upvote count changes for both viewers while selected state remains viewer-specific.
- Confirm refresh preserves the item, GitHub link, count, and viewer-specific upvote state.
- Check for closed-beta throttling before assuming a product defect.

### Embed Or Customization

- Confirm `data-board-id`, `data-api-url`, `data-token-endpoint`, `data-layout`, `data-density`,
  `data-composer`, `data-empty-lane-display`, and `data-issue-links` are correct.
- Confirm `data-mount-selector` exists when the host app expects inline placement.
- Confirm the host customization JSON, if used, is valid JSON and uses documented keys.
- Keep host styling outside private Shadow DOM internals.

## Rollback

Rollback is operator-controlled.

- Hide or remove the host app embed when the beta page should stop showing the board immediately.
- Redeploy a previous known-good Worker commit, or use Cloudflare Worker rollback when the operator
  manages deploys through Cloudflare.
- Restore previous Worker secrets only when a secret replacement caused the issue and the operator
  has the previous secret value through their own secret-management process.
- Re-run `deploy:smoke` and the dogfood script after rollback.
- Record the rollback command or UI action summary, not secret values.

This runbook does not execute rollback, deploys, D1 mutations, or credential changes.

## Manual Backup And Export Boundary

Closed beta has no built-in backup/export/restore automation. Before a high-risk operator action,
the operator should use their Cloudflare D1 account controls or Wrangler-supported export workflow
for the target database and store the resulting artifact according to their own data-retention
policy.

Record:

- D1 database name/id location;
- export method used;
- export timestamp;
- storage location owner;
- restore owner and approval requirement.

Do not commit database exports, user data, token values, or secret files to this repository. Do not
attempt restore during support unless the maintainer explicitly approves the restore target, data
loss expectations, and post-restore verification.

## Support Handoff

Use this template for a support note:

```md
# BugDrop Board Closed Beta Support: <app or repo>

- Date:
- Reporter:
- Host origin:
- Worker URL:
- Board id:
- Mirror repo:
- Worker commit or deployment identifier:
- Impact:
- Failure class:
- Doctor result:
- Deploy smoke result:
- Dogfood result:
- GitHub Issue proof:
- D1 database name/id location, without secrets:
- Safe evidence links:
- Redactions confirmed:
- Rollback decision:
- Backup/export status:
- Current blocker:
- Next owner:
```

Share the accepted limitations and any no-go condition from [Closed Beta Risks](closed-beta-risks.md)
with the beta user before resuming a paused beta.
