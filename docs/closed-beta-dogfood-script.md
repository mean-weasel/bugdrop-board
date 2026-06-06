# Closed Beta Dogfood Script

Use this script before inviting a closed-beta user or after changing beta setup docs, security
controls, deploy paths, or the embedded widget. The script is written so it can be run against the
real `bugdrop.dev` dogfood app or a beta user's host app.

## Targets

Fill these in before starting:

- Date:
- Maintainer:
- Host app origin:
- Host app page URL:
- Board Worker URL:
- Board id:
- Mirror repo:
- Viewer A identity:
- Viewer B identity:
- Package version or Worker commit:

## 1. Static Surface

1. Open the host page as Viewer A.
2. Confirm the embedded board mounts in the expected location.
3. Confirm the visible copy, density, layout, and theme match the host app expectation.
4. Confirm the browser console has no board-related errors.

Evidence:

- Viewer A URL:
- Screenshot or note:
- Console result:

## 2. Token Fetch

1. Confirm the browser requests the host token endpoint with credentials.
2. Confirm the Worker API receives a bearer token rather than browser-supplied user ids.
3. Confirm the token uses the expected `boardId`, audience, issuer, stable `externalUserId`, and a
   short `exp`.
4. Confirm the token expiry is within `BOARD_TOKEN_MAX_TTL_SECONDS`.

Evidence:

- Token endpoint URL, without token value:
- Expected audience:
- Expected issuer:
- Token TTL result:

Do not paste the token value into the receipt.

## 3. Item Creation And GitHub Mirror

1. Viewer A creates a uniquely titled item, for example
   `Closed beta dogfood <YYYYMMDDTHHMMSSZ>`.
2. Confirm the item appears in the board UI.
3. Confirm the item response includes a GitHub Issue number and URL.
4. Confirm the GitHub Issue exists in the mirror repo and contains the BugDrop Board item id.

Evidence:

- Item title:
- Board item id:
- GitHub Issue URL:
- Issue body includes board item id: yes/no
- Browser console result:

## 4. Second Viewer Polling

1. Open the host page as Viewer B in a separate browser context or signed-in session.
2. Confirm Viewer B sees the item without a full page reload after polling.
3. Record the poll interval used by the embed.

Evidence:

- Viewer B URL:
- Polling observed: yes/no
- Time to appear:
- Browser console result:

## 5. Upvote Uniqueness

1. Viewer B upvotes the item.
2. Confirm Viewer B sees the upvoted state and count `1`.
3. Confirm Viewer A sees the same count but not Viewer B's selected state.
4. Refresh both viewers and confirm the item, GitHub link, count, and viewer-specific upvote state
   persist.

Evidence:

- Viewer A button text/state:
- Viewer B button text/state:
- Refresh result:
- API read-back summary, without token value:

## 6. Security Spot Checks

Run the deployed smoke helper with an allowed and disallowed origin:

```bash
npm run deploy:smoke -- \
  --url <board-worker-url> \
  --expect-environment production \
  --cors-origin <host-app-origin> \
  --cors-disallowed-origin https://evil.example \
  --cors-board-id <board-id> \
  --cors-token-endpoint <host-token-endpoint-url>
```

Confirm:

- allowed-origin CORS preflight passes;
- item and event reads pass from the allowed origin;
- the disallowed origin does not receive allowed CORS;
- read/event throttles and write throttles are communicated to the operator;
- event payloads do not expose stable host user ids to other viewers.

Evidence:

- Smoke command summary:
- CORS negative result:
- Token TTL checked:
- Throttle boundary communicated:
- Event payload privacy checked:

## 7. Handoff Decision

Choose one:

- Go: all required proof passed and the remaining limitations are acceptable for this beta user.
- No-go: a beta blocker remains.
- Conditional go: operator-owned proof remains, but no code or docs blocker remains.

Decision:

- Result:
- Blockers:
- Accepted limitations:
- Follow-ups:

## Existing Dogfood References

- Production dogfood runbook: [Production Dogfood](production-dogfood.md)
- Latest production upvote proof:
  [2026-06-06 Chrome Upvote Issue 9](production-dogfood-results/2026-06-06-chrome-upvote-issue-9.md)
- Customization release proof:
  [v0.2.0 Customization Release Prep](release-readiness-results/2026-06-06-v0.2.0-customization-release.md)
