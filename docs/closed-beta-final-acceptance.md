# Closed Beta Final Acceptance

Use this packet as the final maintainer gate before inviting a first real closed-beta user. It
summarizes what is already proven for BugDrop Board, what must be proven for each target app, and
what limitations the beta user must accept.

## Current Decision

Decision: **conditional go for first closed-beta install**.

BugDrop Board is repo/product ready for a first closed-beta install when the target app completes
the operator-owned proof below. This packet is not approval to publish, deploy, change credentials,
invite a beta user, or perform production data changes by itself.

## Already Proven Globally

| Area               | Status                             | Evidence                                                                                                                                                                                                 |
| ------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup safety       | Pass                               | [Closed Beta Setup Checklist](closed-beta-setup.md), `docs/goals/bugdrop-board-closed-beta-setup-safety/`                                                                                                |
| Self-host doctor   | Pass                               | `npm run doctor:selfhost`, `docs/goals/bugdrop-board-selfhost-doctor/`                                                                                                                                   |
| Dependency audit   | Pass                               | Beta security hardening T008: full `npm audit --json` reported zero vulnerabilities; type, repository, unit, browser, and production deploy-dry-run gates passed                                         |
| Security controls  | Pass                               | Beta security hardening T009: 56 focused Vitest cases plus the focused two-viewer Playwright workflow proved the requested local auth, CORS, throttling, polling, and upvote cases                       |
| Widget packaging   | Pass                               | Worker asset configuration, production deploy dry-run, and mocked deploy-smoke verifier tests                                                                                                            |
| Deployed widget    | Pass baseline; pending per install | [2026-08-15 Staging Dogfood](staging-dogfood-results/2026-08-15.md) proves a real staging Worker served `/board.js` and completed the two-viewer flow; repeat deployed smoke for each target install     |
| Customization      | Pass                               | [v0.2.0 Customization Release Prep](release-readiness-results/2026-06-06-v0.2.0-customization-release.md), [Full UX Customization](release-readiness-results/2026-06-06-full-ux-customization.md)        |
| Production dogfood | Pass                               | [Chrome Upvote Issue 9](production-dogfood-results/2026-06-06-chrome-upvote-issue-9.md), [Production Dogfood](production-dogfood.md)                                                                     |
| Handoff docs       | Pass                               | [Closed Beta Runbook](closed-beta-runbook.md), [Closed Beta Dogfood Script](closed-beta-dogfood-script.md), [Closed Beta Readiness](closed-beta-readiness.md), [Closed Beta Risks](closed-beta-risks.md) |
| Ops handoff        | Pass                               | [Closed Beta Ops Runbook](closed-beta-ops-runbook.md)                                                                                                                                                    |

## Required Per-Install Proof

Complete these for each target app before sending an invite:

- Remote D1 database exists, migrations are applied, and `wrangler.toml` points at the intended
  `database_id`.
- Worker secrets are set by the operator without committing or sharing values.
- `ALLOWED_ORIGINS` names the exact host app origin.
- Host token endpoint signs short-lived tokens with matching secret, audience, issuer, board id,
  stable user id, and max TTL.
- `npm run doctor:selfhost` passes for the target Worker URL, host origin, repo, board id, and token
  endpoint.
- `npm run deploy:smoke` passes with allowed and disallowed origins.
- The embed loads `/board.js` from the actual deployed Worker origin, the sole supported widget
  distribution path; the dummy host's local `/board.js` does not satisfy this item.
- One board is provisioned for the target mirror repo.
- The host page embeds the widget in the expected place with accepted styling/copy.
- Two signed-in viewers complete item creation, GitHub Issue mirror proof, polling visibility,
  upvote uniqueness, refresh persistence, and CORS negative proof.
- The beta user receives and accepts [Closed Beta Risks](closed-beta-risks.md), including accepted
  limitations.

## Go Criteria

Use **go** only when:

- every required per-install proof item above has dated evidence;
- no beta blockers remain;
- the beta user accepts the closed-beta limitations;
- the operator has a rollback path for the host embed and Worker deployment;
- support evidence can be captured without exposing secrets, tokens, cookies, secret files, or
  screenshots of secret screens.

## Conditional Go Criteria

Use **conditional go** only when the remaining work is operator-owned and does not require repo code
or docs changes. Acceptable examples:

- the deploy window is scheduled but not yet run;
- the beta mirror repo exists but the board has not yet been provisioned;
- final target-app screenshots or dogfood notes are pending;
- the beta user has accepted a documented limitation.

Do not convert code, security, deployment, or documentation uncertainty into conditional go. Those are
no-go until fixed or explicitly reclassified by a maintainer.

GitHub Advanced Security is enabled as additive detection, including CodeQL default setup for
JavaScript/TypeScript and GitHub Actions, pull-request dependency review, Dependabot alerts/security
updates, secret scanning, and push protection. The active `main` ruleset requires both CI jobs and
blocks medium-or-higher CodeQL security findings. These repository controls cannot substitute for
auth/CORS tests, D1 isolation evidence, deployment smoke, a live Worker `/board.js` fetch, or
two-viewer dogfood proof.

The 2026-08-15 repository security audit found zero open CodeQL, Dependabot, or secret-scanning
alerts. Treat that as dated evidence and recheck before each beta acceptance decision.

## No-Go Criteria

Use **no-go** when any of these are true:

- host token endpoint cannot produce valid short-lived tokens;
- GitHub Issue creation fails for valid item creation and the cause is unknown;
- two-viewer polling or upvote proof fails;
- allowed-origin CORS fails or a disallowed origin receives board CORS access;
- target app proof requires exposing secret values, raw tokens, cookies, `.dev.vars`,
  `.deploy.secrets`, or screenshots of secret screens;
- the beta user requires hosted control plane, billing, realtime, comments, downvotes, GitHub
  Projects, status workflow, built-in monitoring, or backup/export/restore automation before
  trialing the board.

## First-Beta Invite Checklist

Before the invite:

- Complete [Closed Beta Setup Checklist](closed-beta-setup.md).
- Complete [Closed Beta Runbook](closed-beta-runbook.md).
- Run [Closed Beta Dogfood Script](closed-beta-dogfood-script.md) for the target app.
- Check [Closed Beta Readiness](closed-beta-readiness.md).
- Review [Closed Beta Ops Runbook](closed-beta-ops-runbook.md).
- Share [Closed Beta Risks](closed-beta-risks.md) with the beta user.
- Record the final decision below.

## Beta-User Handoff Template

```md
# BugDrop Board Closed Beta Handoff: <app or repo>

- Decision: go / conditional go / no-go
- Date:
- Maintainer:
- Beta user:
- Host app origin:
- Worker URL:
- Board id:
- Mirror repo:
- Worker commit or deployment identifier:
- Setup checklist complete: yes/no
- Doctor result:
- Deploy smoke result:
- Dogfood result:
- GitHub Issue proof:
- CORS negative proof:
- Accepted limitations shared: yes/no
- Ops runbook reviewed: yes/no
- Rollback owner:
- Support owner:
- Secrets redaction confirmed: yes/no
- Remaining operator-owned proof:
- Beta blockers:
- Follow-up owner:
```

Do not include token values, browser cookies, `.dev.vars`, `.deploy.secrets`, Worker secret values,
Cloudflare API tokens, GitHub tokens, database exports, private user data, or screenshots of secret
screens in the handoff.

## Accepted Limitations

Closed beta intentionally excludes hosted control plane, billing, realtime transport, comments,
downvotes, GitHub Projects, status workflow, built-in monitoring, alerting, incident tooling, and
backup/export/restore automation. Polling, upvotes-only voting, GitHub-Issue mirroring for new
items, host-owned authentication, and operator-owned Cloudflare/D1/secrets/rollback are accepted
closed-beta boundaries.

## Final Status

The repo is ready to support a first closed-beta install. The first beta invite remains conditional
on target-app operator proof and beta-user acceptance of the limitations above.
