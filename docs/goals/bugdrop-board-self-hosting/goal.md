# BugDrop Board Self-Hosting

## Goal

Execute Conveyor Board 5 from `docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md`:
self-hosting docs/config, README/embed instructions, `.dev.vars.example`, and
production-hardening handoff only.

Original request:

`$goal-prep Build Conveyor Board 5 from docs/superpowers/plans/2026-06-03-bugdrop-board-implementation.md: self-hosting docs/config, README/embed instructions, .dev.vars.example, and production-hardening handoff only.`

## Oracle

A fresh checkout or clean worktree can follow the documented setup to configure local dev, prepare
local secrets, apply D1 migrations, build the widget, start or exercise the local Worker/dummy host,
and run the E2E smoke without hidden hosted-only assumptions.

Completion must prove:

- The README explains the product shape, hosted-vs-self-hosted expectations, Cloudflare Worker/D1
  setup, GitHub credential expectations, board token secret/audience/issuer, widget embed script,
  host token endpoint contract, local migrations, and the verification commands.
- `.dev.vars.example` lists the local secrets and placeholders a self-hoster needs without
  committing real credentials.
- `wrangler.toml` and documented commands agree on D1 binding/name, local Worker port, assets, and
  vars.
- The docs distinguish production-hardening follow-ups from what this early slice already supports.
- A clean-shell or clean-worktree walkthrough runs the documented commands and records exact proof.
- `npm run validate`, `make check`, `npm run build:widget`, and the selected E2E smoke command pass.
- Final audit confirms no new product features, realtime transport, comments, downvotes, GitHub
  Projects integration, billing, hosted-control-plane work, or broad production hardening was
  implemented.

## Scope

In scope:

- README setup and embed instructions.
- `.dev.vars.example`.
- Wrangler/config documentation alignment.
- Minimal config checks or script/docs adjustments if Scout/Judge prove they are required for the
  documented self-host path.
- Production-hardening handoff checklist or notes.
- Clean-worktree/fresh-checkout proof of documented commands.

Out of scope:

- Implementing production hardening itself, including rate limits, abuse controls, secret rotation,
  tenant management, hosted control plane, billing, release automation, or deployment launch work.
- New widget/backend product behavior beyond tiny compatibility fixes required to make the existing
  Board 1-4 local setup documentable.
- Realtime/WebSocket/Durable Object/SSE, comments, downvotes, GitHub Projects, or status workflow
  expansion.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-self-hosting/goal.md.`

Do not stop after Scout or Judge planning if a safe Worker package is authorized. Complete the
Board 5 self-hosting docs/config/handoff slice, verify it from the documented commands, run the
review/final audit, and preserve receipts in `state.yaml`.
