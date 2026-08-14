# BugDrop Board Beta Security Hardening

## Objective

Preserve and land the completed npm-distribution removal, remediate actionable dependency security
risk, prove the Worker and closed-beta security paths, and make the readiness documentation match
the resulting evidence.

## Original Request

Do steps one through four as a GoalBuddy prep board and advise whether to set up Advanced Security
in this repo.

## Intake Summary

- Input shape: `existing_plan`
- Audience: BugDrop Board maintainers and first closed-beta operators
- Authority: `requested`
- Proof type: `test`
- Completion proof: all four requested steps have receipt-backed proof and a final security/readiness
  audit finds no unaddressed beta blocker within scope.
- Goal oracle: focused change evidence, actionable dependency-risk disposition, full repository and
  adversarial verification, and readiness claims that agree with the evidence.
- Likely misfire: declaring the app secure because the critical-only npm audit gate passes while
  high-severity advisories or contradictory documentation remain.
- Blind spots considered: upgrade regressions across Worker/Cloudflare tooling; dirty-worktree scope
  mixing; Advanced Security being mistaken for runtime or deployment proof.
- Existing plan facts: preserve the npm-removal change; update vulnerable dependencies; run full and
  adversarial verification; reconcile readiness documentation.

## Goal Oracle

The oracle for this goal is:

`A final audit shows the npm-removal change is isolated and preserved, actionable dependency vulnerabilities are remediated or explicitly risk-accepted, the full beta verification suite passes with adversarial auth/CORS coverage, and readiness docs match the evidence.`

The PM must keep comparing task receipts to this oracle. Planning, a critical-only audit pass, or a
clean-looking board is not enough. The goal finishes only when a final Judge/PM audit maps receipts
and verification back to this oracle and records `full_outcome_complete: true`.

## Goal Kind

`existing_plan`

## Current Tranche

Execute the complete four-step security-hardening sequence as successive safe, reversible work
packages. The first Judge validates boundaries around the existing dirty worktree. Workers then
preserve the npm-removal change, remediate dependencies, run the complete proof suite, and reconcile
the readiness artifacts. Finish with one skeptical final audit against the original outcome.

## Non-Negotiable Constraints

- Preserve unrelated user work and do not widen the npm-removal change accidentally.
- Keep Worker-hosted `/board.js` as the only supported widget distribution path.
- Do not deploy, push, invite users, change production credentials, or enable paid/external GitHub
  features without explicit operator authority.
- Treat runtime auth, exact CORS behavior, D1 durability, GitHub mirroring, and two-viewer polling as
  separate proof obligations; security scanning cannot substitute for them.
- Prefer compatible dependency updates before majors; require explicit Judge review for a major
  upgrade or behavior-changing security workaround.
- Record unresolved advisories with reachability, exposure, fix availability, owner, and beta
  disposition. Do not silently waive them.
- Use the repository's risk-scaled evidence and handoff receipt requirements from `AGENTS.md`.

## Stop Rule

Stop only when a final audit proves the full original outcome is complete.

Do not stop after plan validation, dependency installation, a passing critical-only audit, or a
single test suite. If a hosted configuration or operator approval is unavailable, record that exact
slice as blocked and continue all safe local work.

## Slice Sizing

The dependency and proof work should be grouped into coherent reversible packages, not one task per
package or command. Workers must complete their assigned package and its verification before the PM
advances the board.

## Canonical Board

Machine truth lives at:

`docs/goals/bugdrop-board-beta-security-hardening/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts,
verification freshness, and completion truth.

## Run Command

```text
Codex: /goal Follow docs/goals/bugdrop-board-beta-security-hardening/goal.md.
Claude Code: /goalbuddy Follow docs/goals/bugdrop-board-beta-security-hardening/goal.md.
```

## PM Loop

On every `/goal` continuation:

1. Read this charter and the GoalBuddy execution contract.
2. Read `state.yaml` and work only on its active task.
3. Preserve the existing plan facts and compare every receipt to the oracle.
4. Advance through the largest safe verified work package until the full outcome is complete.
5. Review at plan, dependency-risk, rejected-verification, ambiguity, and final-completion boundaries.
6. Before stopping, run GoalBuddy's `check-can-stop.mjs` against this goal directory.
