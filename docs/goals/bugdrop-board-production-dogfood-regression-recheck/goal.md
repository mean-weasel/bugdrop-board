# BugDrop Board Production Dogfood Regression Recheck

## Goal

Recheck the live production dogfood path after the release-readiness workflow/docs conveyor landed,
without publishing, deploying, rotating credentials, cleaning dogfood data, or changing product
behavior.

## Oracle

The real embedded host at `https://bugdrop.dev/board-dogfood` and the production board Worker at
`https://board.bugdrop.dev` still support the core user loop:

- Viewer A loads the embedded board.
- Viewer B loads the embedded board.
- Viewer A creates a uniquely titled item.
- The item mirrors to a GitHub Issue in `mean-weasel/bugdrop-board-production-dogfood`.
- Viewer B sees the item through polling.
- Viewer B upvotes the item.
- Viewer A sees the one-upvote state after polling.
- Refresh preserves item, GitHub link, and viewer-specific upvote state.
- API and event readbacks agree with the browser proof.

## Scope

In scope:

- Non-mutating production deploy smoke.
- One uniquely titled dogfood item and one upvote in the existing production dogfood board.
- GitHub/API/event corroboration.
- Dated production dogfood receipt and GoalBuddy state.

Out of scope:

- Cloudflare deploys.
- npm publishes or package version bumps.
- Secret rotation or secret inspection.
- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, or runtime product
  behavior changes.
- Destructive cleanup of dogfood issues or D1 rows.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-production-dogfood-regression-recheck/goal.md.`
