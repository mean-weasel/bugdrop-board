# T003 Worker Receipt

Status: complete

## Changes

- Added `docs/closed-beta-runbook.md` as the operator-facing closed-beta flow.
- Added `docs/closed-beta-dogfood-script.md` as a repeatable manual dogfood checklist with evidence
  slots.
- The runbook links to Board 1 setup guidance and Board 2 security hardening instead of duplicating
  them.
- The dogfood script covers host page load, token fetch, item creation, GitHub Issue mirror,
  second-viewer polling, upvote uniqueness, CORS negative proof, token TTL, throttles, event privacy,
  and go/no-go decision capture.

## Proof

- `rg -n "host page|token fetch|GitHub Issue|upvote|polling|CORS|BOARD_TOKEN_MAX_TTL_SECONDS|throttle|Evidence|Go:|No-go|Conditional go|viewer" docs/closed-beta-runbook.md docs/closed-beta-dogfood-script.md`
  found all required dogfood flow and evidence terms.
- `rg -n "npm publish|package version bump|Cloudflare deploy|credential changes|secret edits|hosted control plane|billing|realtime|comments|downvotes|GitHub Projects|monitoring implementation" docs/closed-beta-runbook.md docs/closed-beta-dogfood-script.md || true`
  only found explicit limitation/exclusion text.

## Scope Check

No live deploy, credential change, npm publish, product behavior change, or monitoring implementation
was introduced.
