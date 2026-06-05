# BugDrop Board Install Smoke Command

Status: passed.

This receipt turns the previous clean-room install proof into a reusable repo command:

```bash
npm run install:smoke -- --version 0.1.2 --retries 1 --retry-delay-ms 0
```

The command installs `@mean-weasel/bugdrop-board@0.1.2` into a temporary project, serves only the
installed `public/board.js`, loads a minimal host page in Chromium with the documented inline mount
attributes, mocks the token/items/events endpoints, and verifies that the board renders inside
`#feedback-board`.

The new verifier files are included in the package `files` list so future tarballs do not publish a
package script entry without its backing script.

## Command Proof

The smoke output verified:

- installed version: `0.1.2`
- root, `/board`, and `/board.js` entrypoints resolve to the installed `public/board.js`
- installed bundle contains widget/fetch code and `data-mount-selector` support
- `#feedback-board [data-bugdrop-board-root]` mounted exactly once
- Shadow DOM rendered `Clean room install proof`, `Upvote 2`, and `Issue #12`
- token endpoint requested
- items endpoint requested
- console errors: none
- failed browser requests: none

## Local Gates

Focused TDD proof:

```bash
npm run test -- test/verify-clean-room-install.test.ts
```

The test was first observed red because `scripts/verify-clean-room-install.js` did not exist. During
implementation, importing the Node/Playwright CLI script directly into the Cloudflare Vitest pool
also exposed a useful test-environment failure, so the lightweight argument and host-HTML helpers
were split into `scripts/verify-clean-room-install-core.js`.

## Scope Audit

- No npm publish.
- No package version bump.
- No deploy.
- No credential or secret changes.
- No hosted control plane.
- No billing.
- No realtime/WebSocket/Durable Objects.
- No comments.
- No downvotes.
- No GitHub Projects.
- No runtime product behavior change.
