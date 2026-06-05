# Release Handoff Audit

Date: 2026-06-05

Status: current after Install Smoke workflow proof.

## Current State

- Current `main`: `753d83f84fc9f649a44713bb9dd911c5cbac61f7`
- Published package: `@mean-weasel/bugdrop-board@0.1.2`
- Production Worker: `https://board.bugdrop.dev`
- Package install proof: `Install Smoke` workflow on GitHub Actions now passes from `main`

## Merged Work

- PR #37: <https://github.com/mean-weasel/bugdrop-board/pull/37>
  - Merge commit: `166f2dbf542ed482f385ece4ec3fe13bb732ebda`
  - Added the manual no-secret `Install Smoke` workflow.
- PR #38: <https://github.com/mean-weasel/bugdrop-board/pull/38>
  - Merge commit: `753d83f84fc9f649a44713bb9dd911c5cbac61f7`
  - Installed Playwright Chromium before running the clean-room smoke.

## Workflow Proof

First post-merge dispatch:

- Run: <https://github.com/mean-weasel/bugdrop-board/actions/runs/27042195381>
- Commit: `166f2dbf542ed482f385ece4ec3fe13bb732ebda`
- Result: failed.
- Cause: GitHub runner had npm dependencies but no Playwright Chromium browser installed.

Fixed dispatch:

- Run: <https://github.com/mean-weasel/bugdrop-board/actions/runs/27042324248>
- Commit: `753d83f84fc9f649a44713bb9dd911c5cbac61f7`
- Result: passed.
- Job: `Clean-Room Install Smoke`, 50 seconds.
- Steps passed: checkout, setup-node, dependency install, Chromium install, clean-room install smoke.

## Local Proof Already Recorded

The install-smoke workflow board recorded:

- `npm run install:smoke:workflow`
- `npm run install:smoke -- --version 0.1.2 --retries 1 --retry-delay-ms 0`
- `npm run pack:check`
- `npm run validate`
- `make check`
- `git diff --check`
- GoalBuddy state checker

## Next Board

Next GoalBuddy board: `bugdrop-board-production-dogfood-regression-recheck`.

That board should use the existing production dogfood host and signed-token path to confirm the live
embedded board still creates items, mirrors to GitHub Issues, upvotes, polls, and survives refresh
after the release-readiness workflow/docs changes.

## Scope Audit

This audit did not publish a package, bump a package version, deploy Cloudflare Worker changes,
rotate or inspect secrets, add hosted control plane behavior, add billing, add realtime transport,
add comments, add downvotes, add GitHub Projects, or change runtime product behavior.
