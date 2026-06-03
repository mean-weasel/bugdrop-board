# BugDrop Board Production Readiness

## Goal

Execute Conveyor Board 7: production deploy readiness for self-hosters only, using completed Board
1-6 foundations and excluding hosted control plane, billing, realtime, comments, downvotes, and
GitHub Projects.

Original request:

`$goal-prep Build Conveyor Board 7: production deploy readiness for self-hosters only, using completed Board 1-6 foundations and excluding hosted control plane, billing, realtime, comments, downvotes, and GitHub Projects.`

## Oracle

A self-hoster can follow documented production-oriented deploy readiness steps to configure
Cloudflare Worker/D1/secrets/origins, run migrations, build the widget, run checks, and understand
the remaining release risks without relying on development-only defaults or hidden hosted-control
plane assumptions.

Completion must prove:

- Production deploy docs/config distinguish local development from deployed Cloudflare Worker use.
- Secrets are documented as Worker secrets rather than committed vars.
- D1 migration and deployment commands are documented for self-hosted remote environments.
- Allowed origins and token audience/issuer guidance are explicit enough for a self-hoster to avoid
  `ALLOWED_ORIGINS="*"` as the production default.
- The deploy readiness checklist makes remaining risks explicit without implementing broad
  production hardening.
- Existing Board 1-6 behavior still passes: D1/auth, GitHub mirror, upvotes/polling, embedded
  widget, self-host docs/config, and durable board provisioning.
- Final audit confirms no hosted control plane, billing, realtime transport, comments, downvotes,
  GitHub Projects, or broad product expansion was added.

## Scope

In scope:

- Scout/Judge decision on the smallest self-host production deploy readiness package.
- README or docs updates for deployed Worker, D1 remote migrations, secrets, allowed origins,
  board provisioning, and verification.
- `.dev.vars.example`, `wrangler.toml`, package scripts, or Makefile adjustments only if Scout/Judge
  prove they are needed for deploy readiness or verification.
- Focused smoke/check commands that can run without real production credentials.
- A production-readiness handoff checklist that clearly labels remaining risks.

Out of scope:

- Hosted control plane, tenant management, billing, account onboarding, release automation, or
  managed hosted product implementation.
- Implementing production hardening itself, including rate limits, abuse controls, dashboards,
  secret rotation automation, or deployment launch workflows.
- Realtime/WebSocket/Durable Object/SSE transport.
- Comments, downvotes, GitHub Projects, status workflows, or new voting semantics.
- Reworking completed Board 1-6 foundations unless Scout/Judge prove a tiny compatibility fix is
  necessary for deploy readiness.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-production-readiness/goal.md.`

Do not stop after Scout or Judge planning if a safe Worker package is authorized. Complete the
Board 7 production deploy readiness slice, verify it, run the review/final audit, and preserve
receipts in `state.yaml`.
