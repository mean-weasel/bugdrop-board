# Closed Beta Acceptance Rehearsal - 2026-06-06

Status: passed for the production dogfood target.

Decision: **go for the existing `bugdrop.dev` dogfood target**. The first real beta invite remains
conditional on target-app operator proof and beta-user acceptance of the closed-beta limitations in
[Closed Beta Final Acceptance](../closed-beta-final-acceptance.md).

## Targets

- Host app: `https://bugdrop.dev/board-dogfood`
- Viewer A: `https://bugdrop.dev/board-dogfood?viewer=a`
- Viewer B: `https://bugdrop.dev/board-dogfood?viewer=b`
- Board Worker: `https://board.bugdrop.dev`
- Board id: `board_mean_weasel_bugdrop_board_production_dogfood`
- Mirror repo: `mean-weasel/bugdrop-board-production-dogfood`

## Preflight Proof

`npm run doctor:selfhost -- --env production --host-origin https://bugdrop.dev --repo mean-weasel/bugdrop-board-production-dogfood --board-id board_mean_weasel_bugdrop_board_production_dogfood --worker-url https://board.bugdrop.dev --token-endpoint https://bugdrop.dev/api/bugdrop-board-token?viewer=a`

Result: passed with 17 checks, 0 warnings, and 0 failures.

`npm run deploy:smoke -- --url https://board.bugdrop.dev --expect-environment production --cors-origin https://bugdrop.dev --cors-disallowed-origin https://evil.example --cors-board-id board_mean_weasel_bugdrop_board_production_dogfood --cors-token-endpoint https://bugdrop.dev/api/bugdrop-board-token?viewer=a`

Result:

- `/health` returned `status=ok` and `environment=production`.
- `/board.js` returned 200 with `content-type=text/javascript`.
- Allowed origin CORS returned `Access-Control-Allow-Origin: https://bugdrop.dev`.
- Disallowed origin CORS returned no allowed origin for preflight, items, or events.

`gh issue list --repo mean-weasel/bugdrop-board-production-dogfood --state open --limit 5 --json number,title,url`
returned current dogfood issues without mutation.

## Browser Proof

Browser driver: Playwright headless Chromium.

Viewer A created one new item:

- Title: `Closed beta acceptance rehearsal 20260607T014840Z`
- Description: `Final acceptance rehearsal proof for the closed-beta dogfood target.`
- Board item id: `item_a33f58acf757e85041d4be6e`
- GitHub issue: `https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/11`

The first browser script created the item and GitHub issue, then stopped on a stale test assertion
that expected link text `Issue #11`. The live widget correctly rendered `GitHub #11`. The second
browser script reused the same created item rather than creating another.

Passing browser proof:

- Viewer A saw the new item and `GitHub #11`.
- Viewer B saw the new item through polling.
- Viewer B clicked the target prioritize button.
- Viewer B saw `Prioritized 1` with `aria-pressed="true"`.
- Viewer A saw `Prioritize 1` with `aria-pressed="false"`.
- After refreshing both pages, Viewer A still saw `GitHub #11` and `Prioritize 1`.
- After refreshing both pages, Viewer B still saw `Prioritized 1`.
- Browser console/page error arrays were empty for both viewers during the passing proof.

## GitHub Proof

`gh issue view 11 --repo mean-weasel/bugdrop-board-production-dogfood --json number,title,state,url,createdAt,body`
reported:

- Issue number: `11`
- Issue state: `OPEN`
- Issue title: `Closed beta acceptance rehearsal 20260607T014840Z`
- Issue URL: `https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/11`
- Created at: `2026-06-07T01:48:46Z`
- Body includes `BugDrop Board item: item_a33f58acf757e85041d4be6e`
- Body states that upvotes are tracked in BugDrop Board, not GitHub reactions.

## API Proof

Board API read-back for Viewer A:

```json
{
  "id": "item_a33f58acf757e85041d4be6e",
  "githubIssueNumber": 11,
  "githubIssueUrl": "https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/11",
  "upvoteCount": 1,
  "viewerHasUpvoted": false,
  "updatedAt": "2026-06-07T01:49:58.026Z"
}
```

Board API read-back for Viewer B:

```json
{
  "id": "item_a33f58acf757e85041d4be6e",
  "githubIssueNumber": 11,
  "githubIssueUrl": "https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/11",
  "upvoteCount": 1,
  "viewerHasUpvoted": true,
  "updatedAt": "2026-06-07T01:49:58.026Z"
}
```

## Redaction Proof

The proof did not record token values, browser cookies, `.dev.vars`, `.deploy.secrets`, Worker
secret values, Cloudflare API tokens, GitHub tokens, database exports, private user data, or
screenshots of secret screens.

The deploy-smoke output recorded token shape only as `288.43`, not the token value.

## Scope Audit

This acceptance rehearsal did not perform:

- npm publish;
- package version bump;
- Cloudflare deploy;
- credential or secret change;
- destructive dogfood cleanup;
- D1 mutation outside the intended item creation and upvote writes;
- hosted control plane work;
- billing;
- realtime transport;
- comments;
- downvotes;
- GitHub Projects;
- status/admin workflow;
- monitoring implementation;
- backup/export/restore automation;
- product behavior change beyond the intended live dogfood item and upvote.

## Remaining Status

The production dogfood target satisfies the final acceptance packet's per-install proof. A first
real beta invite still requires the beta user's target app to complete the same proof and accept the
closed-beta limitations.
