# BugDrop Board Full UX Customization

Date: 2026-06-06

Status: passed locally.

## Summary

This tranche adds a backward-compatible embedded widget customization contract. Existing script
attributes continue to work, including `data-color`, `data-mount-selector`, `data-board-id`,
`data-api-url`, `data-token-endpoint`, and `data-poll-interval`. Advanced customization is supplied
through an optional JSON config element selected by `data-config-selector`.

The public customization contract covers:

- layout: `inline` and `panel`;
- density: `compact`, `comfortable`, and `spacious`;
- copy: heading, form labels/placeholders/buttons, loading, empty, error, retry, issue prefix, and
  upvote/upvoted labels;
- theme: colors, typography, max width, spacing, radii, borders/surfaces, field/button/upvote
  treatment, shadows, and focus color.

Customization is applied through fixed known keys and host-level CSS custom properties. The widget
keeps Shadow DOM isolation and does not require host apps to style private internals.

## Visual Review Proof

`npx playwright test e2e/customization-widget.spec.ts` passed with three configured variants. Each
variant rendered from JSON config alone, created a board item, showed the GitHub issue link, and
toggled an upvote with accessible `aria-pressed` state:

- compact SaaS: `test-results/customization-widget-custo-70ea8-nd-preserves-board-behavior/customization-variants/compact-saas.png`
- soft/community: `test-results/customization-widget-custo-2e19f-nd-preserves-board-behavior/customization-variants/soft-community.png`
- high contrast: `test-results/customization-widget-custo-928ea-nd-preserves-board-behavior/customization-variants/high-contrast.png`

The full E2E suite also passed with the existing default embed and inline mount tests plus the new
customization variants:

```text
npm run test:e2e
5 passed
```

## Compatibility Proof

Existing minimal installs remain compatible:

- `data-color` maps to the new `theme.accent` token.
- `data-layout` and `data-density` are optional.
- `data-config-selector` is optional.
- The clean-room install smoke remains compatible with the currently published package while also
  validating that hosts can include the new config block safely.

`npm run install:smoke` passed against `@mean-weasel/bugdrop-board@0.1.2`.

## Package Proof

`npm run pack:check` passed. The package dry-run rebuilt the widget and included:

- `public/board.js`
- `src/widget/config.ts`
- `src/widget/dom.ts`
- `src/widget/index.ts`
- `src/widget/theme.ts`
- `src/widget/types.ts`
- install/deploy verification scripts
- README/package metadata

No npm publish or package version bump was performed.

## Verification Commands

- `npm run validate`: passed; lint, format, typecheck, and 66 Vitest tests passed.
- `npm run test:e2e`: passed; 5 Playwright tests passed.
- `npm run install:smoke`: passed against published `0.1.2`.
- `npm run pack:check`: passed.
- `npm run knip`: passed.
- `npm run audit`: passed with 0 critical vulnerabilities.
- `npm run check:actions-node24`: passed.
- `git diff --check`: passed.
- GoalBuddy state checker: passed.

## Scope Audit

Diff-only scope scan did not find new implementation or docs drift for WebSockets, Durable
Objects, EventSource, downvotes, GitHub Projects, billing, tenant/control-plane behavior, npm
publish, Cloudflare deploy, or secret changes.

This tranche did not change backend auth, D1 schema, GitHub mirroring semantics, polling semantics,
upvote semantics, production deploy configuration, credentials, package version, or hosted-control
plane behavior.

## Residual Follow-Ups

- Publish/version bump remains a separate explicitly approved release step.
- Production dogfood can adopt one of the new variants in the host app later, but this tranche did
  not deploy or modify `bugdrop.dev`.
