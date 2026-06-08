# BugDrop Board Hosted Control Plane Design

## Goal

Write the design spec for true multi-tenant hosted BugDrop Board mode.

This board is design-only. It must define the additional security and product layer needed before
BugDrop can safely offer hosted boards to multiple real tenants that do not self-host the Worker,
D1 database, GitHub credentials, or deployment.

## Oracle

The hosted control-plane design is approved only when a maintainer can read one spec and understand:

- tenant/org/app/board boundaries;
- hosted vs self-host trust responsibilities;
- per-app origin allowlists;
- token verification model and key rotation;
- GitHub integration model that avoids a shared broad issue token;
- D1/data isolation requirements;
- rate-limit and abuse boundaries;
- audit/support/export/delete expectations;
- hosted MVP scope versus deferred product work;
- migration path from current dogfood/open hosted setup.

Completion must prove:

- A design spec exists at
  `docs/superpowers/specs/YYYY-MM-DD-bugdrop-board-hosted-control-plane-design.md`.
- The spec contains a threat model and trust-boundary section.
- The spec recommends a token trust model, with trade-offs; asymmetric/JWKS is preferred unless the
  spec gives a stronger reason not to use it.
- The spec rejects shared broad `GITHUB_ISSUE_ACCESS_TOKEN` for real hosted tenants and defines a
  GitHub App/per-tenant installation direction.
- The spec decomposes the follow-on implementation conveyor into Boards 3-6 with acceptance
  criteria.
- Verification confirms no runtime files, migrations, deploy config, credentials, package versions,
  or product behavior were changed.

## Scope

In scope:

- Current architecture/trust-boundary audit.
- Design alternatives and recommendation.
- Multi-tenant hosted MVP definition.
- Data model sketch, API/config surfaces, security controls, and operational handoff.
- Follow-on conveyor notes for scaffold, GitHub App integration, onboarding UX/API, and hosted beta
  security gate.
- One design spec under `docs/superpowers/specs/`.

Out of scope:

- Runtime implementation.
- D1 migrations.
- Worker API changes.
- Widget changes.
- Cloudflare deploys, credential changes, secret rotation, GitHub App creation, or GitHub token
  changes.
- Billing, realtime, comments, downvotes, GitHub Projects, status workflow, analytics dashboards,
  backup/export/restore implementation, or package publishing.

## Constraints

- Preserve self-hosting as a first-class path.
- Do not require customers to share app session cookies, passwords, or raw user databases.
- Prefer hosted verification of customer identity via public keys/JWKS or a similarly scoped trust
  model over customer-shared symmetric secrets.
- Keep GitHub credentials tenant-scoped.
- Design for denial-by-default: origin mismatch, token mismatch, repo mismatch, and tenant mismatch
  fail closed.
- Make the MVP small enough to build after design approval.

## Follow-On Conveyor Notes

After this board is approved:

1. **Board 3: Hosted Control Plane MVP Scaffold**
   - D1 migrations for tenants/apps/board configs.
   - Config repository layer.
   - App origin allowlist lookup.
   - Per-app token verification config.
   - Cross-tenant isolation tests.
   - Preserve current self-host path.
2. **Board 4: GitHub App Integration**
   - Per-tenant GitHub App installation storage.
   - Repo allowlist and installation-token issue creation.
   - Misconfigured repo fails closed.
   - Existing self-host GitHub token path remains supported.
3. **Board 5: Hosted Onboarding UX/API**
   - Create app/board.
   - Add allowed origins.
   - Add issuer/audience/JWKS or key config.
   - Connect GitHub repo.
   - Generate embed snippet.
   - Show security/setup checklist.
4. **Board 6: Hosted Beta Security Gate**
   - CORS positive/negative tests.
   - Token TTL/key rotation tests.
   - Origin mismatch tests.
   - Tenant and GitHub repo isolation tests.
   - Rate-limit tests.
   - Audit log tests.
   - Manual dogfood script and release gate.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-hosted-control-plane-design/goal.md.`
