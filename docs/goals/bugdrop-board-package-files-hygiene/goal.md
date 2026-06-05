# BugDrop Board Package Files Hygiene

## Goal

Fix post-deploy-smoke package hygiene so future npm tarballs include every script referenced by
published `package.json` commands.

## Oracle

`npm run pack:check` shows both verifier scripts in the package tarball, and standard checks pass
without publishing, deploying, changing secrets, or changing runtime product behavior.

## Scope

In scope:

- `package.json` npm `files` metadata.
- README package contents docs.
- GoalBuddy receipts for this package hygiene tranche.

Out of scope:

- New npm publish or version bump.
- Production deploys or credential changes.
- Runtime product behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-package-files-hygiene/goal.md.`
