# BugDrop Board Chrome Dogfood Audit

## Starter

`/goal Follow docs/goals/bugdrop-board-chrome-dogfood-audit/goal.md.`

## Objective

Use the Codex Chrome Extension to manually dogfood BugDrop Board in the real embedded host at
`https://bugdrop.dev/board-dogfood`, then check the work against production APIs and GitHub.

The run should prove the user-facing board works in Chrome, not only through CLI/API smoke. It must
exercise two viewer identities, item creation, GitHub Issue mirroring, polling visibility, upvote
state, refresh durability, and visible UI quality. It should leave a durable receipt with proof and
actionable follow-up issues for defects or UX misses.

## Oracle

Completion is true only when a dated receipt under `docs/production-dogfood-results/` proves all of
these observable signals:

- Codex Chrome Extension could open or claim Chrome tabs for Viewer A and Viewer B.
- Viewer A loaded `https://bugdrop.dev/board-dogfood?viewer=a` and Viewer B loaded
  `https://bugdrop.dev/board-dogfood?viewer=b`.
- Both tabs rendered the embedded board from `https://board.bugdrop.dev/board.js` without console
  errors that block normal use.
- Viewer A created a uniquely titled item from the visible UI.
- The corresponding GitHub Issue exists in
  `mean-weasel/bugdrop-board-production-dogfood` with the same title.
- Viewer B saw the new item through polling without a manual full-page reload.
- A different viewer upvoted the item from the visible UI, and both viewers showed one upvote.
- Refreshing both tabs preserved the item, GitHub link, and viewer-specific upvote state.
- API/CLI cross-checks agree with the browser observations.
- Any defect found has a clear follow-up issue, or the receipt explains why no issue was needed.

## Scope

Allowed:

- Use Codex Chrome Extension for browser automation and screenshots.
- Use CLI/API checks for corroborating proof.
- Create dogfood items and upvotes in the existing production dogfood board.
- Create GitHub follow-up issues only for concrete defects or UX gaps discovered during dogfood.
- Add or update dated proof receipts and GoalBuddy receipts.

Forbidden:

- No npm publish.
- No hosted control plane.
- No billing.
- No realtime transport.
- No comments.
- No downvotes.
- No GitHub Projects.
- No production credential rotation.
- No broad product behavior changes.
- No destructive cleanup of production dogfood issues or D1 data.

## Browser Safety

- Do not inspect cookies, passwords, browser profile stores, or unrelated browser history.
- Use only the two dogfood URLs and the GitHub issue page needed for proof.
- Keep or hand off only tabs that are useful to the user after the run; close/release intermediate
  tabs with the Chrome skill's finalize flow.

## Proof Artifacts

The final receipt should include:

- Timestamped dogfood item title.
- Chrome-tab proof notes for Viewer A and Viewer B.
- Screenshots or DOM text excerpts sufficient to prove visible UI state.
- Console-log summary for both tabs, including any blocking errors.
- GitHub Issue URL and `gh issue view` JSON summary.
- Board API readback showing `githubIssueUrl`, `upvoteCount`, and `viewerHasUpvoted`.
- Event API readback showing creation and upvote events.
- Refresh/persistence proof.
- Scope audit and rollback notes.

## Stop Conditions

Stop and ask the user before continuing if:

- The Codex Chrome Extension cannot communicate after the documented retry/troubleshooting path.
- The UI requests credentials, CAPTCHA, or user approval.
- A production route, Worker secret, D1 binding, or GitHub token appears missing or broken.
- The proof would require publishing, rotating secrets, deleting data, or changing product behavior.
- A defect blocks item creation or voting and needs implementation beyond recording a follow-up.
