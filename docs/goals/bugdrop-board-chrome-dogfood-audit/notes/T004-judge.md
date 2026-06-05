# T004 Judge Receipt

Timestamp: `2026-06-05T14:42:00Z`

## Decision

Classification: blocker.

The Chrome-visible embedded board cannot load production dogfood items from `https://bugdrop.dev`
because the Board Worker does not emit CORS allow-origin headers for the host origin. This blocks
the required create, polling, upvote, and refresh-durability dogfood flow.

## Follow-Up

Created and repaired GitHub issue:

- `https://github.com/mean-weasel/bugdrop-board/issues/24`

## Rationale

- This is concrete and reproducible from Chrome and CLI CORS probes.
- It is not a duplicate of an existing open issue.
- The issue is narrow: production dogfood browser-origin CORS behavior.
- The issue stays in scope: no hosted control plane, billing, realtime, comments, downvotes, GitHub
  Projects, credential rotation, or destructive cleanup.

Decision: proceed to `T005` to write the blocked dogfood receipt.
