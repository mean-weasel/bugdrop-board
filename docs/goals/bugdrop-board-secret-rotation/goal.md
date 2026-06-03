# BugDrop Board Secret Rotation

## Goal

Execute Conveyor Board 9: self-host secret rotation and recovery guidance only, using completed
Board 1-8 foundations and excluding hosted control plane, billing, realtime, comments, downvotes,
GitHub Projects, release automation, package publishing, and new product behavior.

Original request:

`$goal-prep Build Conveyor Board 9: self-host secret rotation and recovery guidance only, using completed Board 1-8 foundations and excluding hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, release automation, package publishing, and new product behavior.`

## Oracle

A self-hoster can follow documented, current-stack-accurate procedures to rotate and recover
BugDrop Board secrets without adding hosted infrastructure or changing product behavior.

Completion must prove:

- The docs identify every current self-host secret and non-secret setting involved in recovery:
  `BOARD_TOKEN_SECRET`, `GITHUB_ISSUE_ACCESS_TOKEN`, token audience/issuer, allowed origins, and D1
  binding/database identity where relevant.
- The `BOARD_TOKEN_SECRET` rotation guidance explains host app coordination, short-lived token
  impact, expected temporary authentication failures, rollback/recovery, and verification.
- The `GITHUB_ISSUE_ACCESS_TOKEN` rotation guidance explains GitHub token scope expectations,
  Worker secret replacement, failure symptoms, rollback/recovery, and verification.
- The guidance uses current project commands such as `wrangler secret put`, `npm run deploy:check`,
  `npm run provision:board`, and deployed/local smoke checks where appropriate.
- The work is docs/config guidance only unless Scout/Judge prove a tiny consistency fix is required
  for accuracy.
- Existing Board 1-8 behavior remains intact through the standard gates.
- Final audit confirms no hosted control plane, billing, realtime transport, comments, downvotes,
  GitHub Projects, release automation, package publishing, or new product behavior was added.

## Scope

In scope:

- Scout/Judge decision on the smallest safe secret rotation and recovery guidance package.
- README or docs updates for self-host operator rotation and recovery procedures.
- `.dev.vars.example`, `wrangler.toml`, package scripts, or Makefile adjustments only if
  Scout/Judge prove they are needed for accurate guidance or verification.
- Verification commands that can run without real production Cloudflare or GitHub credentials.
- Explicit handoff notes for any recovery scenarios that require operator credentials or
  environment-specific judgment.

Out of scope:

- Hosted control plane, tenant management, billing, account onboarding, release automation, or
  package publishing.
- Realtime/WebSocket/Durable Object/SSE transport.
- Comments, downvotes, GitHub Projects, status workflow expansion, or new voting semantics.
- New product behavior, secret-management automation, secret dual-read/rollover behavior, or
  changes to host token format unless Scout/Judge prove an existing docs inconsistency requires a
  tiny correction.
- Broad production hardening beyond secret rotation and recovery guidance.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-secret-rotation/goal.md.`

Do not stop after Scout or Judge planning if a safe Worker package is authorized. Complete the
Board 9 secret rotation/recovery guidance slice, verify it, run the review/final audit, and preserve
receipts in `state.yaml`.
