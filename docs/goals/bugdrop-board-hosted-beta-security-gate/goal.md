# BugDrop Board Hosted Beta Security Gate

## Goal

Create a local, repeatable hosted beta security gate that proves the hosted board boundary before
the first non-dogfood hosted tenant.

This board must not deploy, mutate remote D1, change credentials, or perform real GitHub App setup.

## Oracle

The gate is complete only when local tests and docs prove:

- hosted CORS allows configured origins and denies unconfigured origins;
- hosted token verification fails closed for excessive TTL, wrong issuer, wrong audience, wrong key,
  wrong tenant, and wrong board/app scope;
- hosted GitHub issue creation fails closed on repo mismatch before D1 item/event persistence;
- hosted read/event polling request throttles return `429` with retry metadata;
- emitted event payloads do not leak external user ids or display names;
- a manual dogfood script and go/no-go receipt exist for the first non-dogfood hosted tenant.

## Scope

In scope:

- Focused local route/security gate tests.
- Manual hosted dogfood script and release go/no-go receipt docs.
- GoalBuddy receipts.

Out of scope:

- Cloudflare deploys, remote D1 mutation, credential/secret changes, real GitHub App installation
  smoke, hosted public admin UI, billing, realtime, comments, downvotes, GitHub Projects, npm
  publishing, and package version bumps.

## Constraints

- Preserve existing hosted and self-host behavior.
- Use local mocked GitHub/JWKS only.
- Include negative/adversarial cases.
- Treat user/event privacy as proof, not hope.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-hosted-beta-security-gate/goal.md.`
