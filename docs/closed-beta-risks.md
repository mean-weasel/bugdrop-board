# Closed Beta Risks

Use this handoff to separate beta blockers from accepted beta limitations and deferred future work.
Do not treat an accepted limitation as hidden readiness; tell the beta user directly.

## Beta Blockers

These block inviting a beta user until fixed or explicitly reclassified:

- Host token endpoint cannot sign valid short-lived tokens for signed-in users.
- Worker `ALLOWED_ORIGINS` does not match the host app origin.
- Deployed smoke cannot prove `/health`, `/board.js`, authenticated reads, events, and CORS
  behavior.
- GitHub Issue creation fails for valid item creation.
- Two signed viewers cannot complete the item create, polling, and upvote dogfood flow.
- Secret values appear in committed files, screenshots, receipts, browser code, or logs.
- A current full dependency audit reports an unresolved vulnerability without an explicit owner and
  beta disposition. The verified hardening baseline reported zero vulnerabilities.
- The beta user requires comments, downvotes, realtime updates, GitHub Projects, billing, hosted
  control plane, or status workflow before trialing the board.

## Accepted Closed-Beta Limitations

These are acceptable for closed beta when communicated before invite:

- One board per host app repo.
- Upvotes only; no downvotes.
- Polling instead of realtime transport.
- GitHub Issues mirror new items, but status workflow and label sync are not part of closed beta.
- Host app owns authentication, signed token endpoint, user identity, and session security.
- Self-host operators own Cloudflare account, D1 database, Worker deploys, secrets, and rollback.
- BugDrop Hosted Beta is manually provisioned; see
  [Hosted Security And Setup](hosted-security-and-setup.md).
- No self-service hosted control plane or billing.
- No built-in comments.
- No built-in monitoring, alerting, backup/export/restore automation, or incident tooling.
- Manual support, rollback, and backup/export boundaries are documented in
  [Closed Beta Ops Runbook](closed-beta-ops-runbook.md).
- CORS is browser containment only; bearer tokens remain the Worker authorization boundary.
- Local browser evidence uses the dummy host's `/board.js`; a real fetch from the target deployed
  Worker remains operator-owned proof for every install.
- GitHub Advanced Security is recommended for additive CodeQL, dependency, and secret signals, but
  it is not configured by the local hardening goal and is not runtime or deployment proof.

## Deferred Product Work

Track these only after closed beta proves the core board flow:

- Hosted control plane and installer onboarding.
- Billing and plan boundaries.
- Realtime transport.
- Comments or discussion threads.
- Downvotes or richer reactions.
- GitHub Projects or richer GitHub status integration.
- Product analytics and operational dashboards.
- Backup/export/restore tooling.
- Organization-level board administration.

## Operator-Owned Actions

These are not repo code changes, but they must be complete for a specific beta install:

- Create or choose the target D1 database.
- Configure exact host origins and production Worker vars.
- Set Worker secrets without committing values.
- Provision the board row for the target mirror repo.
- Deploy or promote the Worker through the operator's chosen path.
- Run deployed smoke with allowed and disallowed origins.
- Confirm the embed fetches `/board.js` from the actual deployed Worker. Worker hosting is the sole
  supported widget distribution path.
- Complete the dogfood script and record evidence.
- Review the ops runbook and keep support evidence free of secrets, tokens, cookies, and secret
  screen screenshots.
- Share accepted limitations and support path with the beta user.

## Risk Review Template

```md
# Closed Beta Risk Review: <app or repo>

- Date:
- Reviewer:
- Beta blockers: none / list
- Accepted limitations shared with beta user: yes/no
- Operator-owned actions complete: yes/no
- Deferred product asks captured: yes/no
- Go decision: go / conditional go / no-go
- Follow-up owner:
```
