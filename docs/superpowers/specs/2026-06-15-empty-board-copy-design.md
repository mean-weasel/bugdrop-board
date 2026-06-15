# Empty Board Copy Design

Accepted on 2026-06-15.

## Goal

Make the default empty board state more inviting and succinct while preserving host configurability.

## Decision

The embedded widget default empty message is:

> Tell us what you want to see next.

This replaces the longer first-action copy. It keeps the board welcoming without implying that every
submitted idea will be built.

## Configuration

Hosts can continue to override the empty state through the existing JSON customization contract:

```json
{
  "copy": {
    "emptyLabel": "No requests yet. Add one for the team to review."
  }
}
```

No new CTA button is added in this slice. The visible composer remains the action surface, and the
empty message acts as the invitation.

## Verification

Focused widget DOM tests and the embedded dummy host E2E should assert the new default copy. Existing
customization tests continue to prove `copy.emptyLabel` can be overridden.
