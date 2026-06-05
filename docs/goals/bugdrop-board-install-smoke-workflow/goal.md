# BugDrop Board Install Smoke Workflow

## Goal

Add a manual, no-secret GitHub Actions workflow that runs the published-package clean-room install
smoke without publishing, deploying, rotating credentials, or changing product behavior.

## Conveyor Position

This is the first board in the next release-readiness conveyor after v0.1.2:

1. Install smoke workflow proof: make clean-room package install verification runnable from GitHub
   Actions.
2. Release handoff audit: reconcile README, receipts, workflow names, and npm/deploy state after the
   workflow lands.
3. Production dogfood regression recheck: use the existing signed-token host proof to recheck the
   live board after any documentation or workflow hardening.

## Oracle

A maintainer can manually dispatch **Install Smoke** from GitHub Actions with a published version or
dist-tag, and the workflow installs the package into a temporary project, serves the installed
`public/board.js`, boots the documented embed in Chromium, and verifies the widget mounts without
using npm publish, Cloudflare deploy, GitHub issue tokens, npm tokens, or production secrets.

Completion must prove:

- A RED workflow contract check fails before the workflow exists.
- The workflow contract verifier runs locally.
- The new workflow is manual, uses Node-24-ready Actions, and requires no secrets.
- README tells maintainers when and how to run the workflow.
- Local install smoke still passes for `0.1.2`.
- Standard repo gates pass.
- No npm publish, production deploy, secret rotation, hosted control plane, billing, realtime,
  comments, downvotes, GitHub Projects, package version bump, or runtime product behavior was added.

## Scope

In scope:

- `.github/workflows/install-smoke.yml`
- Focused workflow contract verifier.
- README release/package docs.
- GoalBuddy receipts for this tranche.

Out of scope:

- Publishing a package.
- Deploying or changing Cloudflare production.
- Rotating or inspecting secret values.
- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, or new product
  behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-install-smoke-workflow/goal.md.`
