# BugDrop Board Closed Beta Ops Runbook

## Goal

Build the next closed-beta conveyor board: manual operator operations guidance for self-hosted beta
installs only.

## Oracle

A closed-beta self-host operator can use documented, non-secret, non-mutating-by-default runbooks to
triage setup/runtime failures, capture safe support evidence, choose rollback actions, and understand
manual backup/export/restore boundaries without any new product behavior or hosted service.

Completion must prove:

- A closed-beta operations runbook exists and is linked from normal maintainer paths.
- The runbook covers triage entry points, safe evidence capture, health/smoke checks, token/CORS/
  GitHub/D1/polling failure isolation, rollback choices, support handoff, and manual backup/export/
  restore guidance.
- The runbook never asks operators to paste secrets, browser cookies, raw tokens, `.dev.vars`, or
  `.deploy.secrets` into receipts.
- The README, closed-beta runbook, readiness matrix, and risk handoff point to the operations guide.
- Verification proves formatting, required sections, GoalBuddy receipts, and no forbidden-scope
  implementation drift.

## Scope

In scope:

- `docs/closed-beta-ops-runbook.md`.
- Links from `README.md`, `docs/closed-beta-runbook.md`, `docs/closed-beta-readiness.md`, and
  `docs/closed-beta-risks.md`.
- GoalBuddy receipts for this board.

Out of scope:

- Runtime monitoring, alerting, incident response tooling, backup/export/restore automation, product
  behavior, hosted control plane, billing, realtime, comments, downvotes, GitHub Projects,
  status/admin workflow, package publishing, version bumps, Cloudflare deploys, D1 mutations, and
  credential or secret changes.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-closed-beta-ops-runbook/goal.md.`
