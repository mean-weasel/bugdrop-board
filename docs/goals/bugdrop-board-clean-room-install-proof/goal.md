# BugDrop Board Clean-Room Install Proof

## Goal

Prove a fresh self-hoster can install and inspect `@mean-weasel/bugdrop-board@0.1.2` from npm,
understand the documented embed/self-host contract, and verify the package/workflow release path
without relying on local repository state or publishing another package.

## Oracle

The goal is complete only when all of the following are true:

- A fresh temporary project installs `@mean-weasel/bugdrop-board@0.1.2` from npm and verifies the
  package exports, `public/board.js`, embedded widget bundle content, and installed version.
- A generated clean-room host page using the documented script-tag attributes is syntactically
  valid enough to boot the published bundle in a browser-like or static inspection harness, without
  requiring local repo files.
- The README/package docs accurately describe the package entrypoints, script embed, optional
  `data-mount-selector`, token endpoint expectation, Worker URL expectation, and self-host
  verification commands discovered during the proof.
- The Package Widget dry-run/package path is verified from `main` without publishing, changing
  credentials, rotating secrets, deploying, or bumping a version.
- A release-readiness receipt records commands, artifacts, and the strongest failed-assumption check.

## Scope

In scope:

- Fresh temp workspace install proof for `@mean-weasel/bugdrop-board@0.1.2`.
- Package exports and installed artifact verification.
- Static/minimal browser-style embed proof for documented install snippets.
- README/docs fixes for install or verification gaps found by the proof.
- Package dry-run and release smoke checks that do not publish.
- GoalBuddy receipts for this tranche.

Out of scope:

- New npm publish or package version bump.
- Production deploys or credential changes.
- Hosted control plane, billing, realtime, comments, downvotes, or GitHub Projects.
- New product behavior beyond docs/proof helper changes required by the clean-room install proof.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-clean-room-install-proof/goal.md.`
