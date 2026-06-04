# BugDrop Board npm Publishing Readiness

## Goal

Run Conveyor Board 11: prove the embed package publishing path is ready up to the explicit human
publish gate.

## Oracle

Completion requires local package dry-run proof, GitHub Package Widget dry-run proof from `main`,
package contents inspection, npm token/ownership readiness notes, and a scope audit confirming no
actual npm publish happened.

## Scope

In scope:

- Local `npm run pack:check` / package contents proof.
- Manual Package Widget workflow dry-run from `main`.
- Repository secret presence check by name only.
- Publish checklist and blocker receipt.

Out of scope:

- Actual `npm publish`.
- Version bump/tagging unless explicitly approved.
- Hosted CDN/control plane, billing, realtime, comments, downvotes, GitHub Projects, or product
  behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-npm-publishing-readiness/goal.md.`
