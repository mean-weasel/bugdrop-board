# T005 Worker

Result: done.

## Changes

- Added `docs/closed-beta-setup.md`.
- Linked the checklist from the README production readiness checklist.
- Checklist covers:
  - package/install preflight;
  - Cloudflare and D1 setup;
  - Worker secrets;
  - GitHub repo/token boundary;
  - host app token endpoint;
  - explicit production deploy;
  - deploy smoke and embedded host smoke;
  - handoff evidence;
  - explicit out-of-scope items for Board 1.

## Verification

- `npx prettier --check README.md docs/closed-beta-setup.md ...`: passed.
- Focused checklist scan found the required setup proof sections and exclusions:
  - preflight;
  - Cloudflare and D1;
  - secrets;
  - GitHub repo boundary;
  - host token endpoint;
  - deploy;
  - smoke proof;
  - handoff evidence;
  - out-of-scope Board 1 items.

## Scope Guard

The checklist is documentation only. It does not publish, deploy, rotate credentials, add product
behavior, add throttles, implement monitoring, add hosted control plane, billing, realtime,
comments, downvotes, GitHub Projects, or status workflow.
