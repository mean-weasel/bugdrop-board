# T001 Handoff Scout

Status: complete

## Evidence Sources

- Setup safety: `docs/closed-beta-setup.md`, plus Board 1 receipts under
  `docs/goals/bugdrop-board-closed-beta-setup-safety/`.
- Security and abuse controls: Board 2 receipts under
  `docs/goals/bugdrop-board-closed-beta-security-abuse/`.
- Production dogfood flow: `docs/production-dogfood.md` and dated receipts in
  `docs/production-dogfood-results/`.
- Package and install proof: `docs/release-readiness-results/2026-06-06-v0.2.0-consumer-install-review.md`
  and `docs/release-readiness-results/2026-06-06-v0.2.0-customization-release.md`.
- Customization proof: `README.md` customization sections and
  `docs/release-readiness-results/2026-06-06-full-ux-customization.md`.
- Deploy proof: `README.md` deploy-smoke guidance, `docs/production-dogfood.md`, and release
  readiness receipts.

## Missing Handoff Surfaces

- No single closed-beta runbook that tells a maintainer how to decide, invite, operate, and record a
  beta install.
- No reusable manual dogfood script with explicit evidence slots for token fetch, item creation,
  GitHub Issue mirror, upvote, polling, CORS negative proof, token TTL, and throttling expectations.
- No readiness matrix that separates proven readiness, operator-pending proof, and go/no-go criteria.
- No remaining-risk handoff that separates blockers, accepted beta limitations, deferred product
  work, and operator-owned actions.

## Smallest Safe Docs Plan

1. Add `docs/closed-beta-runbook.md` and `docs/closed-beta-dogfood-script.md`.
2. Add `docs/closed-beta-readiness.md` and `docs/closed-beta-risks.md`.
3. Wire those four docs from `README.md` and `docs/closed-beta-setup.md`.
4. Keep all work documentation-only and record any live deploy, credential, npm publish, or beta-user
   proof as an operator action rather than performing it.

## Scope Check

The oracle does not require product behavior changes, npm publishing, Cloudflare deploys, credential
changes, live beta-user activity, monitoring implementation, hosted control plane, billing,
realtime, comments, downvotes, or GitHub Projects.
