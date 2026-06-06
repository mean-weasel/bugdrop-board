# T004 Package Dry-Run Proof

Date: 2026-06-06

The pre-publish gate now has a successful GitHub Actions package dry-run from `main` after the
`0.2.0` version-prep PR merged.

## Proof

- Workflow: `Package Widget`
- Run: `https://github.com/mean-weasel/bugdrop-board/actions/runs/27069301552`
- Head SHA: `c04a43069f00b7285b5aaca2f5185fdac2beb372`
- Result: success
- Inputs: `dry_run=true`, `npm_tag=latest`
- Completed steps: install dependencies, validation gates, dry-run package contents.
- Skipped steps: validate npm token, publish package, verify published package.

Registry state after the dry-run:

```json
{
  "version": "0.1.2",
  "dist-tags": {
    "latest": "0.1.2"
  }
}
```

Conclusion: the 0.2.0 package dry-run proof is satisfied, and no npm publish occurred. T004 remains
active because the maintainer has not explicitly approved dispatching `Package Widget` with
`dry_run=false`.
