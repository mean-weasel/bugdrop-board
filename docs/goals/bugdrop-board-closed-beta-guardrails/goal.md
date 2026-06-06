# BugDrop Board Closed Beta Guardrails

## Goal

Use the three independent closed-beta critiques from 2026-06-06 to harden BugDrop Board's safest
remaining beta-readiness gaps without changing the product shape.

## Oracle

Closed-beta guardrails are ready when the repo no longer exposes unnecessary stable creator
identifiers to board viewers, production deployment automation cannot accidentally use production
secrets against the top-level development Wrangler config, deployed CORS negative proof is available
from the deploy workflow, local deployment secret files are ignored, and package/setup metadata no
longer hides the supported runtime or current package state.

Completion must prove:

- Viewer item API responses omit stable creator IDs that the widget does not need. A negative route
  test proves `createdByExternalUserId` is not present in authenticated item reads.
- The deploy workflow derives or requires the intended Wrangler environment for production-style
  runs and refuses dangerous mismatches before dry-run, migration, provisioning, or deploy steps.
- Production deploy workflow smoke inputs include disallowed-origin CORS proof, and the workflow
  passes that value to `npm run deploy:smoke`.
- `.deploy.secrets` is ignored locally and the workflow still removes it after deployment attempts.
- Runtime/package metadata and docs state the supported Node/npm/Wrangler expectations and current
  package artifact posture without publishing, bumping versions, deploying, or changing secrets.
- Standard repo gates and focused negative tests pass, including a final forbidden-scope scan.

## Scope

In scope:

- API response minimization for authenticated board item reads.
- Focused tests for viewer privacy and deploy workflow command construction/guardrails.
- GitHub Actions deploy workflow guardrails around Wrangler environment and CORS negative smoke.
- `.gitignore` and docs/package metadata updates for closed-beta setup trust.
- GoalBuddy receipts and final audit.

Out of scope:

- npm publishing, package version bumps, Cloudflare deploys, credential changes, secret rotation, or
  editing secret files.
- Hosted control plane, billing, realtime, comments, downvotes, GitHub Projects.
- Status workflow, admin portals, issue workflow automation, or product behavior beyond the
  guardrails above.
- New abuse tiers such as IP/global budgets, token replay prevention, GitHub create circuit
  breakers, monitoring, backup/export/restore implementation, or full GitHub App installation-token
  migration.
- Replacing the self-host architecture or changing the one-board-per-app product shape.

## Constraints

- Preserve existing public widget behavior unless privacy minimization requires removing an unused
  API field.
- Keep changes small, reversible, and directly traceable to the independent critique findings.
- Do not weaken existing closed-beta docs, setup safety, CORS, throttling, token TTL, GitHub mirror,
  or package smoke proof.
- Treat status/admin workflow and richer hosted installer work as follow-up boards unless explicitly
  approved by the user.
- If a proof would require production credentials, live Cloudflare deploys, npm publish, or secret
  rotation, record it as operator-owned proof rather than performing it.

## Critique Findings Preserved

- Security critique: item reads expose stable creator IDs, deploy workflow can use production
  secrets with the wrong Wrangler env, CORS negative smoke is not wired into deploy workflow,
  `.deploy.secrets` is not ignored, GitHub token blast radius and abuse tier 2 remain future work.
- Setup critique: self-host install is repo-operator heavy, `wrangler.toml` contains project
  production config rather than a generic self-host template, no first-run doctor exists, host token
  endpoint support is under-tooled, runtime requirements are implicit.
- Product critique: no admin/status workflow, no sorting/prioritization controls, limited host JS
  integration API, partial accessibility proof, and flat pipeline UX remain open product gaps.

## Recommended Conveyor After This Board

Only create or execute these after Board 4's final Judge decides the guardrails are complete:

- Board 5: self-host doctor and setup diagnosis only.
- Board 6: host token signer helpers/templates only.
- Board 7: sorting/prioritization and accessibility proof only.
- Needs explicit user override: status/admin workflow, because status workflow has been a standing
  exclusion.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-closed-beta-guardrails/goal.md.`
