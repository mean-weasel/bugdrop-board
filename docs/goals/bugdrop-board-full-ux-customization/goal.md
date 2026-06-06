# BugDrop Board Full UX Customization

Prepare and execute a focused product tranche that makes the embedded BugDrop Board UX deeply
customizable so it can fit aesthetically inside a user's app without forking the widget or weakening
the existing self-host/auth/API foundations.

## Original Request

> yes lets do that - the ux should be completely customizable so it fits in ashtetically with a
> user's app - make a detailed goalbuddy prep plan

## Outcome

Self-hosters can install the same embedded widget and make it feel native in their own app through a
documented customization contract. The implementation should support practical visual, copy, density,
layout, and state customization while preserving the current host-signed token model, D1/GitHub
backend behavior, upvotes-only scope, polling model, package/install story, and Shadow DOM isolation.

## Goal Oracle

The goal is complete only when a reviewer can run proof that the widget supports at least three
distinct host-app presentations from configuration alone:

- a compact operational SaaS style;
- a soft/community feedback style;
- a high-contrast accessible style.

Each presentation must render the same board behavior, including loading, empty, error, item list,
create form, GitHub issue link, upvote count/state, and polling update state. The final proof must
include automated checks plus visual/manual review artifacts or screenshots that show the variants
are materially different and still accessible.

## Success Criteria

- A documented customization API exists for the embedded script and/or generated root.
- Hosts can customize colors, typography scale, spacing/density, radius, border/surface treatment,
  button treatment, field treatment, item/card treatment, and visible copy for common states.
- Hosts can choose at least two layout modes, such as inline/full board and compact list/panel, if
  this can be done without broad product redesign.
- Customization is declarative and stable: no host CSS selectors into private internals are required.
- Existing installs remain compatible. Current `data-color`, `data-mount-selector`,
  `data-board-id`, `data-api-url`, `data-token-endpoint`, and polling behavior continue to work.
- Shadow DOM isolation is preserved unless the Judge explicitly approves a safer alternative.
- The npm package and self-host docs explain the customization contract with copy-pasteable examples.
- The dummy/dogfood host or a local review harness demonstrates multiple distinct themes.
- Accessibility remains intact: labels, focus states, contrast, aria-pressed upvote buttons, and
  error/status announcements still work.
- Existing API/auth/GitHub/upvote/polling behavior is not changed except where necessary to support
  UI state display.

## Non-Goals

- Hosted control plane.
- Billing.
- Realtime transport.
- Comments.
- Downvotes.
- GitHub Projects.
- Package publish or version bump.
- Cloudflare deploy.
- Credential or secret changes.
- Replacing the self-host install model.
- Rewriting the widget in React/Vue/Svelte.
- Letting customization require a fork of the widget bundle.

## Starter Command

`/goal Follow docs/goals/bugdrop-board-full-ux-customization/goal.md.`
