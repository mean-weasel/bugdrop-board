# BugDrop Board Closed Beta Setup Safety

## Goal

Make BugDrop Board safe and trustworthy for a closed-beta self-host installer by fixing setup,
deploy, version, token, and checklist drift without changing runtime product behavior.

## Oracle

A fresh closed-beta installer can use the repository instructions, scripts, and workflow defaults
without accidentally deploying development configuration, verifying a stale package version, or
guessing at host-token and GitHub-token setup.

Completion must prove:

- Production and self-host deploy guidance cannot silently steer an operator into top-level
  development Wrangler config, wildcard CORS, or placeholder D1 bindings.
- Version and package guidance matches the current published `@mean-weasel/bugdrop-board@0.2.0`
  state, and install-smoke defaults verify the current beta artifact or a safe dist-tag.
- Host token endpoint guidance includes copy-pasteable, backend-only signing examples and clearly
  explains cookie/CORS implications of the widget token request.
- GitHub issue-token guidance states the closed-beta recommendation, minimum permissions, and repo
  boundary expectations.
- A closed-beta setup checklist names the required preflight, deploy, smoke, and handoff proof.
- Standard repo verification and focused drift scans pass.

## Scope

In scope:

- README and setup documentation accuracy.
- GitHub workflow defaults that affect setup/install trust.
- Non-product scripts or Makefile/package script safety rails for deployment clarity.
- Host-token endpoint examples and GitHub token scope guidance.
- Closed-beta setup checklist and GoalBuddy receipts.

Out of scope:

- Status workflow, status editing, or GitHub label sync.
- New security throttles, read/event throttling, token replay prevention, or abuse-control behavior.
- Ops monitoring, alerting, incident response, backup/export/restore implementation.
- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects.
- npm publishing, package version bump, Cloudflare deploy, credential or secret changes.
- Runtime widget/API product behavior except small setup-safety script/workflow defaults.

## Constraints

- Preserve existing API/auth/GitHub/widget behavior.
- Do not publish to npm, deploy Cloudflare, rotate or change credentials, or edit local secret
  files.
- Treat historical release receipts as evidence, not as files to rewrite unless needed for this
  setup-safety goal.
- Keep changes narrow and reversible. Prefer documentation and workflow safety over broad
  restructuring.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-closed-beta-setup-safety/goal.md.`
