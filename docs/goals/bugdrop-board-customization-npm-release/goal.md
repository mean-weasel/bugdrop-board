# BugDrop Board Customization npm Release

## Goal

Prepare and, after explicit maintainer approval, execute the npm release for the customizable
embedded BugDrop Board widget.

## Oracle

The customization release is complete only when all of the following are true:

- The live production Worker at `https://board.bugdrop.dev` is running the customization-capable
  bundle from `44cb49e`.
- The real BugDrop host page at `https://bugdrop.dev/board-dogfood` renders the customized board
  copy, density, layout, theme, item creation, GitHub mirror, upvote count, one-upvote-per-viewer
  state, and polling behavior.
- A version PR bumps the package to `0.2.0`, updates release notes/docs that name customization as
  the release reason, and passes local gates plus pull-request CI.
- The `Package Widget` workflow publishes `@mean-weasel/bugdrop-board@0.2.0` only after explicit
  maintainer approval to publish.
- Post-publish proof passes against the npm registry artifact: `release:smoke`, `Install Smoke`, and
  npm registry metadata show `latest: 0.2.0`.
- A GitHub Release `v0.2.0` exists and links to the production deploy, live dogfood, package publish,
  install-smoke, and release receipt evidence.

## Scope

In scope:

- `package.json` and `package-lock.json` version bump to `0.2.0`.
- Release receipt and README/doc updates needed to describe the customization release.
- Package dry-run and publish workflow dispatches.
- Install smoke and release smoke proof for the published package.
- GitHub Release `v0.2.0` notes.

Out of scope:

- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, or new product
  behavior beyond the already-merged customization contract.
- Cloudflare redeploys unless the release proof discovers production drift from `44cb49e`.
- Credential or secret changes.
- Destructive production dogfood cleanup.
- Publishing any package version other than `0.2.0` without a new maintainer decision.

## Current Proof Baseline

- Production Worker deploy: `https://github.com/mean-weasel/bugdrop-board/actions/runs/27064358060`
  passed at SHA `44cb49e102e440a7670787684d03e3f51ed3745e`.
- Package dry-run: `https://github.com/mean-weasel/bugdrop-board/actions/runs/27064404524` passed
  with publish steps skipped.
- Live A/B dogfood created
  `https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/7`.
- Live A/B dogfood proved viewer A token `bugdrop-dev-dogfood-a`, viewer B token
  `bugdrop-dev-dogfood-b`, polling readback, and one-upvote-per-viewer state:
  viewer A saw `Prioritize 1`; viewer B saw `Prioritized 1`.
- npm registry currently reports `@mean-weasel/bugdrop-board@0.1.2` as `latest`.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-customization-npm-release/goal.md.`
