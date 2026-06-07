# BugDrop Board Self-Host Doctor

## Goal

Build Closed Beta Board 5: a non-mutating self-host setup doctor that catches the most common
installer/configuration problems before a beta operator deploys or dogfoods a board.

## Oracle

A closed-beta self-hoster can run one local doctor command and get actionable pass/warn/fail output
for runtime/tooling, package metadata, Wrangler/D1/env configuration, CORS origin alignment, repo and
board id shape, optional Cloudflare/GitHub reachability, and the exact follow-up smoke command.

Completion must prove:

- `npm run doctor:selfhost` exists and is non-mutating by default.
- The doctor has a unit-tested core that can run without real Cloudflare, GitHub, D1, deploys,
  secrets, or network.
- Static checks cover Node/npm/Wrangler expectations, package metadata, `.deploy.secrets` ignore,
  migration presence, target Wrangler env vars, remote D1 binding/id, exact allowed origins, repo
  shape, board id shape, and deploy smoke input completeness.
- Optional live checks are explicit opt-ins and remain non-mutating.
- README and closed-beta docs explain when to run the doctor and how to interpret failures.
- Standard repo gates, focused tests, GoalBuddy checker, and forbidden-scope scan pass.

## Scope

In scope:

- `doctor:selfhost` CLI and core helper.
- Focused tests for success, failure, warnings, and optional live-check behavior.
- README and closed-beta setup/runbook docs.
- GoalBuddy receipts.

Out of scope:

- Cloudflare deploys, D1 mutations, Worker secret changes, credential rotation, npm publish, package
  version bumps, or package publishing workflow changes.
- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects.
- Status/admin workflow, host token SDK/helpers, sorting/prioritization, accessibility audits, or
  product UX changes.
- Proving GitHub Issues write permission by creating a real issue.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-selfhost-doctor/goal.md.`
