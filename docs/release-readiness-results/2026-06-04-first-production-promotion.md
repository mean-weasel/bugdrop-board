# First Production Promotion Gate - 2026-06-04

## Summary

The first production promotion board is prepared but intentionally blocked. Production mutation
requires explicit maintainer approval after production resources and secrets are ready.

## Promotion Preconditions

Board 13 cannot execute until Board 12 blockers are resolved:

- GitHub Environment `production` exists.
- Production D1 database exists.
- Production Worker config is explicit and does not rely on local wildcard origins.
- Production Environment secrets are configured by name.
- Production board mirror repo is chosen.
- Maintainer approves the deploy window and rollback path.

## Intended Deploy Command

After approval, the first production promotion should dispatch **Deploy Worker** from `main` with
production inputs similar to:

```bash
gh workflow run "Deploy Worker" \
  --repo mean-weasel/bugdrop-board \
  --ref main \
  -f environment=production \
  -f wrangler_environment=production \
  -f apply_migrations=true \
  -f provision_repo=<owner/name> \
  -f provision_name="BugDrop Board Production"
```

If production uses top-level Wrangler config instead of `[env.production]`, leave
`wrangler_environment` blank and verify the workflow dry-run output before deploy.

## Required Smoke Checks

After deploy:

1. `curl -fsS https://<production-worker>/health`
2. `curl -fsSI https://<production-worker>/board.js`
3. Signed-token host proof against production origin.
4. Create one production board item.
5. Confirm GitHub Issue mirroring in the approved production repo.
6. Confirm second-viewer polling visibility.
7. Confirm upvote sync through polling.

## Rollback

Rollback must be available before approval:

1. Re-run **Deploy Worker** from the previous known-good commit, or use Cloudflare Worker rollback.
2. Restore previous Worker secrets if secret rotation caused the failure.
3. Re-run `/health`, `/board.js`, signed-token host proof, GitHub Issue mirror, and upvote polling
   checks.

## Approval Gate

Actual production promotion remains blocked until the maintainer explicitly approves production
mutation. The broad instruction to run boards autonomously is not treated as approval to create
production resources, write production secrets, or deploy production.
