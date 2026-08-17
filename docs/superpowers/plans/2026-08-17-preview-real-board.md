# Preview Real Board Plan

## Outcome

Make the fixed preview venue visibly demonstrate BugDrop Board as a request board, rather than
appearing to be only a feedback form.

## Changes

1. Correct the companion embed attributes to request the supported `kanban` layout and a
   `collapsed` composer.
2. Render Kanban lanes when the selected board is empty, while preserving the existing generic
   empty state for inline and panel layouts.
3. Keep the CI board resettable and isolated. Populate only the durable Demo board, and create
   every sample through the normal item-creation path so each D1 item retains its GitHub Issue
   mirror.
4. Add focused regression coverage for the empty Kanban view and the companion embed attributes.

## Verification

- Focused widget DOM tests prove empty Kanban boards render Open, Planned, Building, and Shipped.
- Companion browser tests prove the real script receives `data-layout="kanban"` and
  `data-composer="collapsed"`.
- Both repository check suites pass.
- Live inspection proves Demo shows persistent sample cards and CI shows an empty but recognizable
  Kanban board after reset.

## Safety

- Do not seed the CI board.
- Do not insert database-only Demo cards; samples must have real GitHub Issue mirrors.
- Use fixed, recognizable Demo titles and check for existing items before creating anything so a
  retry cannot duplicate samples.
