# Closed Beta Readiness

Use this matrix before calling a specific BugDrop Board install closed-beta ready. A row is ready
only when the evidence is current for the target app or explicitly marked as an operator-owned
pending proof.

## Readiness Matrix

| Area                        | Required state                                                                                                                                                                                      | Evidence source                                                                                                                                                        | Beta decision                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Setup safety                | Production/self-host setup uses explicit Wrangler envs, remote D1, exact origins, and no committed secrets.                                                                                         | [Closed Beta Setup Checklist](closed-beta-setup.md), Board 1 receipts in `docs/goals/bugdrop-board-closed-beta-setup-safety/`                                          | Go when checklist is complete for the target app.                             |
| Widget delivery             | The target Worker build contains and serves `public/board.js` from the same deployment as the API. The local browser fixture's `/board.js` is dummy-host served, so it is not deployed-asset proof. | `npm run build:widget`, `npm run deploy:check:production`, then `npm run deploy:smoke -- --url <worker-url> --expect-environment production` against the actual Worker | Operator-pending: go only when the target Worker returns the asset.           |
| Worker deploy proof         | The deployed Worker answers `/health`, serves `/board.js`, and reports the expected environment.                                                                                                    | `npm run deploy:smoke -- --url <worker-url> --expect-environment production`                                                                                           | Operator-pending for each beta install.                                       |
| Host token endpoint         | The host signs short-lived tokens server-side with matching secret, audience, issuer, board id, and stable user id.                                                                                 | [Closed Beta Setup Checklist](closed-beta-setup.md), [Closed Beta Dogfood Script](closed-beta-dogfood-script.md)                                                       | Go when token fetch and TTL proof are recorded without exposing token values. |
| Dependency security         | The complete audit inventory has no known vulnerabilities at the verified lockfile state.                                                                                                           | Beta security hardening T008: `npm audit --json` passed with zero vulnerabilities; full type, repo, unit, browser, and deploy-dry-run gates passed                     | Globally proven for the verified lockfile; rerun after dependency changes.    |
| Security and abuse controls | Local adversarial tests reject missing, expired, malformed, forged, wrong-key, and wrong-scope tokens and cover throttling plus CORS.                                                               | Beta security hardening T009: six focused Vitest files passed 56 tests; focused two-viewer Playwright passed                                                           | Globally proven locally; target allowed/disallowed-origin smoke is pending.   |
| GitHub mirror               | Item creation creates a GitHub Issue in the provisioned repo before D1 item persistence.                                                                                                            | [Production Dogfood](production-dogfood.md), dogfood receipt for the target app                                                                                        | Operator-pending for each beta install.                                       |
| Upvote and polling proof    | Two viewers can see the same item, one viewer can upvote it, and polling updates the other viewer.                                                                                                  | [2026-06-06 Chrome Upvote Issue 9](production-dogfood-results/2026-06-06-chrome-upvote-issue-9.md), [Closed Beta Dogfood Script](closed-beta-dogfood-script.md)        | Go when target-app dogfood proof passes.                                      |
| Customization               | The widget can be styled and copied to fit the host app without forking internals.                                                                                                                  | [v0.2.0 Customization Release Prep](release-readiness-results/2026-06-06-v0.2.0-customization-release.md), README customization docs                                   | Go when the host accepts the current customization contract.                  |
| Ops handoff                 | Operator knows triage, safe evidence capture, rollback, support handoff, and manual backup/export boundaries.                                                                                       | [Closed Beta Ops Runbook](closed-beta-ops-runbook.md)                                                                                                                  | Go when operator accepts manual ops ownership for closed beta.                |
| Final acceptance            | Maintainer records go, conditional-go, or no-go with global evidence, per-install proof, and accepted limitations.                                                                                  | [Closed Beta Final Acceptance](closed-beta-final-acceptance.md)                                                                                                        | Go when the target-app decision is recorded.                                  |
| Handoff docs                | Operator has runbook, dogfood script, readiness matrix, and risk handoff.                                                                                                                           | [Closed Beta Runbook](closed-beta-runbook.md), [Closed Beta Dogfood Script](closed-beta-dogfood-script.md), [Closed Beta Risks](closed-beta-risks.md)                  | Go when beta user receives limitations and support path.                      |

## Go Criteria

- All target-app operator-pending rows above have dated evidence.
- No beta blockers remain in [Closed Beta Risks](closed-beta-risks.md).
- The beta user accepts the current limitations: no hosted control plane, billing, realtime,
  comments, downvotes, GitHub Projects, built-in monitoring, backup/export/restore automation, or
  status workflow.
- The maintainer has a rollback path for the host app embed and Worker deployment.
- The operator has reviewed [Closed Beta Ops Runbook](closed-beta-ops-runbook.md) and knows what
  evidence can be shared without exposing secrets.
- The maintainer records the final decision in
  [Closed Beta Final Acceptance](closed-beta-final-acceptance.md).

## No-Go Criteria

- The host token endpoint cannot produce valid short-lived tokens.
- GitHub Issue creation fails for a valid item and the cause is unknown.
- Two-viewer polling or upvote proof fails.
- Allowed-origin CORS fails or a disallowed origin receives board CORS access.
- The beta user requires an out-of-scope feature before trying the board.
- Any proof requires exposing secrets in docs, screenshots, browser code, or logs.

## Conditional Go

Use conditional go only when the remaining work is operator-owned and does not require code or docs
changes in this repo. Examples:

- production deploy is scheduled but not yet run;
- the beta user's mirror repo is not yet provisioned;
- final evidence screenshots are pending from the target host app;
- the beta user has accepted a limitation documented in [Closed Beta Risks](closed-beta-risks.md).

## Advanced Security

GitHub Advanced Security is recommended as additive detection: enable CodeQL default setup for
JavaScript/TypeScript, dependency review, Dependabot alerts and security updates, secret scanning,
and push protection when repository policy and licensing allow. This local goal did not enable or
configure repository settings because it had no repository-admin authority. These signals do not
prove authorization, CORS, D1 isolation, deployment correctness, a real Worker-hosted `/board.js`
fetch, or two-viewer behavior; the evidence and per-install gates above remain required.
