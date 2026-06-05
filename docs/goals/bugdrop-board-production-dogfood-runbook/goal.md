# BugDrop Board Production Dogfood Runbook

## Goal

Document the approved production dogfood path using `https://bugdrop.dev` as the embedded host app
and `https://board.bugdrop.dev` as the board Worker.

## Oracle

A maintainer can follow the runbook to implement the host app dogfood page, deploy/provision the
production board Worker, run two-viewer browser proof, and record a durable receipt without
publishing npm, rotating secrets, deploying implicitly, or adding hosted control-plane behavior.

## Scope

In scope:

- Production dogfood runbook.
- README link to the runbook.
- GoalBuddy receipt for this planning tranche.

Out of scope:

- Editing the dirty `bugdrop` host repo checkout.
- Deploying production.
- Secret creation, rotation, or inspection.
- Runtime product changes.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-production-dogfood-runbook/goal.md.`
