# T002 Worker Receipt

Live two-viewer production dogfood acceptance proof passed.

Proof:

- Viewer A and Viewer B loaded:
  - `https://bugdrop.dev/board-dogfood?viewer=a`
  - `https://bugdrop.dev/board-dogfood?viewer=b`
- Viewer A created `Closed beta acceptance rehearsal 20260607T014840Z`.
- The first browser script created the item and GitHub issue, then stopped on a stale assertion that
  expected link text `Issue #11`; the live widget correctly renders `GitHub #11`.
- The second browser script reused the same item, verified Viewer B saw it through polling, clicked
  Viewer B's prioritize button, verified Viewer B saw `aria-pressed="true"` with 1 upvote, verified
  Viewer A saw 1 upvote with `aria-pressed="false"`, refreshed both pages, and verified state
  persisted.
- API read-back agreed:
  - item id: `item_a33f58acf757e85041d4be6e`
  - GitHub issue: `https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/11`
  - upvote count: `1`
  - Viewer A `viewerHasUpvoted=false`
  - Viewer B `viewerHasUpvoted=true`
- `gh issue view 11 --repo mean-weasel/bugdrop-board-production-dogfood --json number,title,state,url,createdAt,body` confirmed issue #11 is open, has the matching title, and contains `BugDrop Board item: item_a33f58acf757e85041d4be6e`.
- Browser console/page error arrays were empty for both viewers during the passing proof.

No token values, cookies, `.dev.vars`, `.deploy.secrets`, Worker secrets, API tokens, or GitHub
tokens were printed.
