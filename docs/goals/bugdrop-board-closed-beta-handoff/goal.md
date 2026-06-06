# BugDrop Board Closed Beta Handoff And Dogfood Readiness

## Goal

Prepare BugDrop Board for closed-beta handoff by creating operator-facing beta docs and proof
artifacts that a maintainer can use before inviting real beta users.

## Oracle

Closed-beta handoff is ready when a maintainer can use the repository docs to understand what is
ready, what is still deliberately out of scope, how to manually dogfood the embedded board end to
end, how to record proof, and how to hand off known risks without changing product behavior.

Completion must prove:

- A closed-beta runbook exists and references the setup/security foundations from Boards 1-2 without
  redoing or contradicting them.
- A manual dogfood script/checklist exists for the example board flow: host page load, token fetch,
  item creation, GitHub Issue mirror, upvote, polling update, CORS/token/security spot checks, and
  evidence capture.
- A readiness matrix exists covering setup safety, security/abuse controls, customization, deploy
  proof, package proof, dogfood proof, and explicit go/no-go criteria.
- A remaining-risk handoff exists and distinguishes beta blockers, acceptable beta limitations, and
  deferred future work.
- Docs preserve the current product behavior and do not introduce hosted control plane, billing,
  realtime, comments, downvotes, GitHub Projects, npm publishing, Cloudflare deploys, credential
  changes, or ops monitoring implementation.
- Standard docs/format verification plus a final forbidden-scope scan pass.

## Scope

In scope:

- Closed-beta runbook and handoff docs.
- Manual dogfood script or checklist docs for maintainers.
- Readiness matrix and remaining-risk handoff.
- References to existing package/deploy/security/customization proof.
- GoalBuddy receipts and final audit.

Out of scope:

- Product behavior changes.
- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects.
- npm publishing, package version bumps, Cloudflare deploys, credential changes, secret rotation, or
  editing secret files.
- Ops monitoring, alerting, incident response, backup/export/restore implementation.
- Setup-safety or security-hardening rewrites already handled by Closed Beta Boards 1-2.

## Constraints

- Keep this board documentation-only unless Scout/Judge proves a tiny verifier/doc helper is
  necessary and still inside scope.
- Preserve the embedded, host-authenticated, one-board-per-app product shape.
- Treat docs as beta operating artifacts, not marketing copy.
- Every readiness claim must point to a concrete local file, command, PR, release receipt, or
  dogfood evidence slot.
- If a requested proof would require deploys, credentials, npm publishing, secret edits, or live
  beta-user activity, record it as an operator action or follow-up rather than performing it.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-closed-beta-handoff/goal.md.`
