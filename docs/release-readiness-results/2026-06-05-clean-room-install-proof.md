# BugDrop Board Clean-Room Install Proof

Status: passed.

This receipt verifies that `@mean-weasel/bugdrop-board@0.1.2` can be installed and embedded from a
fresh project without relying on this repository checkout.

## Fresh Project Browser Proof

A temporary project installed the published package:

```bash
npm install @mean-weasel/bugdrop-board@0.1.2
```

The proof served only the installed package bundle from:

```text
node_modules/@mean-weasel/bugdrop-board/public/board.js
```

Then it loaded a host page with the documented inline mount attributes:

```html
<section id="feedback-board"></section>
<script
  src="/vendor/bugdrop-board.js"
  data-board-id="board_mean_weasel_demo"
  data-api-url="/api"
  data-token-endpoint="/api/bugdrop-board-token"
  data-mount-selector="#feedback-board"
  data-poll-interval="600000"
  data-color="#1f883d"
></script>
```

The host harness mocked the token endpoint and board items endpoint, then verified:

- installed version: `0.1.2`
- root, `/board`, and `/board.js` entrypoints resolve to the same installed `public/board.js`
- installed bundle size: `10445` bytes
- bundle contains widget/fetch code and `data-mount-selector` support
- `#feedback-board [data-bugdrop-board-root]` mounted exactly once
- Shadow DOM rendered `Clean room install proof`, `Upvote 2`, and `Issue #12`
- token endpoint requested: `/api/bugdrop-board-token`
- items endpoint requested: `/api/boards/board_mean_weasel_demo/items`
- console errors: none
- failed browser requests: none

The strongest failed-assumption check was useful but non-blocking: resolving
`@mean-weasel/bugdrop-board/package.json` fails because `package.json` is not exported. The proof
therefore verifies the installed version with `npm ls`, while consumers should use the documented
public package entrypoints and static `public/board.js` path.

## Repo Package Proof

Local package checks:

```bash
npm run pack:check
npm run release:smoke -- --version 0.1.2 --retries 1 --retry-delay-ms 0
```

Results:

- `npm run pack:check` passed and dry-ran tarball contents for version `0.1.2`.
- Tarball dry-run included `public/board.js`, `scripts/verify-deployed-worker.js`,
  `scripts/verify-package-install.js`, `src/widget/mount.ts`, and widget source files.
- `release:smoke` installed `@mean-weasel/bugdrop-board@0.1.2` into a temporary project and passed
  all entrypoint/content/version checks.

No-publish GitHub workflow proof:

- Package Widget dry run:
  `https://github.com/mean-weasel/bugdrop-board/actions/runs/27037127255`
- Result: success.
- `Validate npm token`, `Publish package`, and `Verify published package` were skipped because
  `dry_run=true`.

## Docs Follow-Up

README now explicitly documents the npm-installed browser bundle path:

```text
node_modules/@mean-weasel/bugdrop-board/public/board.js
```

It also includes a temp-project verification snippet for self-hosters who want to prove the package
install independently of this repository.

## Scope Audit

- No npm publish.
- No package version bump.
- No production deploy.
- No credential or secret changes.
- No hosted control plane.
- No billing.
- No realtime/WebSocket/Durable Objects.
- No comments.
- No downvotes.
- No GitHub Projects.
- No runtime product behavior change.
