# Board Representation Contract Audit

## Goal

Prevent the embedded board from silently degrading into a form-first or missing-board experience
when its supported presentation settings are copied through setup tools, host pages, docs, fixtures,
or CI.

## Surfaces

- Widget script attributes and JSON customization parsing.
- Hosted provisioning CLI and its generated embed handoff.
- Local real-bundle Playwright host, including an empty Kanban board with a collapsed composer.
- Preview companion source and live Demo/CI pages.
- Production BugDrop board host and staging/dogfood runbooks.
- Active README and hosted setup documentation.

## Changes

1. Make every direct presentation setting supported by the widget representable in the hosted
   provisioning handoff: layout, density, composer, empty-lane display, and issue-link visibility.
2. Add focused parsing and handoff tests, including invalid-value rejection.
3. Add a real-widget browser test that proves an empty Kanban still renders all four lanes, keeps
   the composer collapsed until opened, and can create an item into the Open lane.
4. Bring active setup and dogfood documentation into agreement with the runtime contract.

## Proof

- Focused Vitest coverage for widget configuration and hosted provisioning.
- Focused Playwright coverage against the built `board.js`, with both empty and post-mutation state.
- Repository-wide search confirming active snippets and option lists do not omit supported settings.
- Full repository checks, dependency/security checks, and an independent Codex review.
- Read-only live inspection of preview Demo/CI and the production BugDrop board.
