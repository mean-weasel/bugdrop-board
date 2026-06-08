# BugDrop Board Hosted Onboarding Provisioning

## Goal

Add an operator-facing hosted provisioning path that creates the D1 configuration needed for a
hosted board and prints a redacted setup handoff.

This board implements the "operator/admin APIs or scripts" option from the hosted control-plane
design. It intentionally does not build a public tenant-admin UI.

## Oracle

This board is complete only when an operator can run a tested command or dry run to:

- create or upsert a tenant, app, board, origins, token verifier config, GitHub connection, and board
  config;
- generate an embed snippet containing board id, API URL, token endpoint, layout, and config hooks;
- show a setup/security checklist;
- redact secrets and token material from all output;
- preserve the existing self-host `provision:board` command.

## Scope

In scope:

- Hosted provisioning CLI/core helper.
- Focused parser, SQL builder, redaction, and snippet tests.
- README/docs updates for operator use.
- GoalBuddy receipts.

Out of scope:

- Public tenant-admin UI.
- Cloudflare deploys or remote D1 execution during verification.
- Credential creation/rotation, real GitHub App installation, npm publishing, package version bumps,
  billing, realtime, comments, downvotes, and GitHub Projects.

## Constraints

- Keep generated SQL deterministic and safely quoted.
- Support local/remote/env modes like the existing `provision:board` command.
- Do not print private keys, HMAC values, bearer tokens, or GitHub installation tokens.
- Keep self-host provisioning behavior unchanged.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-hosted-onboarding-provisioning/goal.md.`
