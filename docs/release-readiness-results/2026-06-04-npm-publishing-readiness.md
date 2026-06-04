# npm Publishing Readiness - 2026-06-04

## Summary

The embed package is dry-run ready from local and GitHub Actions paths. Actual npm publish remains
gated because the package is not yet published in the npm registry and no repo-level `NPM_TOKEN`
secret is configured.

## Local Package Dry-Run

`npm pack --dry-run --json` passed and rebuilt the widget through `prepack`.

Package summary:

- Package: `bugdrop-board@0.1.0`
- Tarball: `bugdrop-board-0.1.0.tgz`
- Package size: `13846`
- Unpacked size: `44422`
- Entry count: `8`

Included files:

- `README.md`
- `package.json`
- `public/board.js`
- `src/widget/api.ts`
- `src/widget/dom.ts`
- `src/widget/index.ts`
- `src/widget/theme.ts`
- `src/widget/types.ts`

## GitHub Workflow Dry-Run

Package Widget dry-run from `main`:

- Run: `https://github.com/mean-weasel/bugdrop-board/actions/runs/26969918392`
- Head SHA: `bf188d3da50b47727bbcf0eb8f676e9bc44fb719`
- Conclusion: `success`
- `Validate npm token`: skipped
- `Publish package`: skipped

## Registry And Secret Readiness

`npm view bugdrop-board version dist-tags --json` returned npm `E404`, meaning `bugdrop-board` is
not currently published in the npm registry.

`gh secret list --repo mean-weasel/bugdrop-board --json name,updatedAt` returned an empty list, so
repo-level `NPM_TOKEN` is not configured.

Publishing requires explicit maintainer approval plus:

1. Confirm the intended npm package name is `bugdrop-board`.
2. Confirm npm ownership/access for that package name.
3. Add repo-level `NPM_TOKEN`.
4. Decide whether to publish `0.1.0` or bump version first.
5. Dispatch **Package Widget** with `dry_run=false` and an approved dist-tag.

## Scope Audit

- No npm publish ran.
- No version bump ran.
- No git tag was created.
- No production deploy ran.
- No hosted control plane, billing, realtime, comments, downvotes, GitHub Projects, or new product
  behavior was added.
- No secret values are recorded in this receipt.
