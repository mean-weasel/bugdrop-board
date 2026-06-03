# BugDrop Board Design

## Summary

BugDrop Board is an embedded ideas/request board for a user's app. It follows the
same product promise as BugDrop: for the hosted version, the installing user only
needs GitHub. They install the GitHub App, add an embed script, and our managed
Cloudflare backend handles the durable board state.

The board is not a standalone hosted portal in v1. It is a script-based embedded
experience that can be placed inside any app and can also be self-hosted.

## Goals

- Provide an embeddable ideas/request board for a user's app.
- Preserve the hosted-product sales promise that the installing user only needs GitHub.
- Create a GitHub Issue for every new board item.
- Let authenticated app users create items and upvote existing items.
- Keep board state durable, fast to query, and independent of GitHub API read latency.
- Make self-hosting possible with a Cloudflare Worker, D1, optional R2, and GitHub App
  credentials.
- Include a dummy host app for local development and E2E testing.

## Non-Goals

- No standalone hosted board page in v1.
- No BugDrop-owned login system in v1.
- No anonymous item creation or voting in v1.
- No comments or discussion threads in v1.
- No downvotes in v1.
- No GitHub Projects integration in v1.
- No WebSocket or Durable Object realtime layer in v1.
- No bug/question feedback categories in v1; this board is for ideas and requests.

## Users and Terminology

- **Installing user**: the person or team adding BugDrop Board to their app.
- **App user**: a signed-in user inside the installing user's app.
- **Board item**: an idea/request created by an app user.
- **Hosted version**: BugDrop Board operated by us on managed Cloudflare infrastructure.
- **Self-hosted version**: BugDrop Board operated by the installing user on their own
  Cloudflare and GitHub App setup.

## Product Shape

V1 is embedded-first. The installing user adds the board to an app with a script tag or
equivalent JavaScript integration. The board UI loads inside the app, isolated from the
host page as much as practical, and communicates with a Worker API.

For hosted usage, the installing user should not need to create a database, object bucket,
or backend service. They should only need GitHub plus the BugDrop Board setup.

For self-hosted usage, the installing user operates the required infrastructure:

- Cloudflare Worker for the API and widget asset serving.
- D1 database for board items, votes, statuses, and polling events.
- Optional R2 bucket for future images or attachments.
- GitHub App credentials for issue creation.

## V1 Behavior

### Board Items

An authenticated app user can create a board item with a title and description. The API
validates the host-signed auth token, stores the item in D1, creates a GitHub Issue, and
stores the issue number and URL on the D1 item.

The D1 item is the source of truth for board presentation. The GitHub Issue is the
engineering workflow mirror.

### Upvotes

Voting is upvote-only. An authenticated app user can upvote one item once. Clicking again
removes the upvote.

Votes are stored in D1 and are canonical there. GitHub reactions, comments, or Projects
fields are not used as the vote database.

The API enforces one upvote per app user per item with a uniqueness constraint over the
board, item, and external app user id.

### Statuses

Board items have a small visible status model:

- `open`
- `planned`
- `in_progress`
- `shipped`
- `closed`

The board reads status from D1. In v1, status management can be implemented through a
server/admin path or GitHub-label sync if needed, but the public board should not depend
on live GitHub reads to render statuses.

### Sorting

V1 should support at least:

- Recent items.
- Most upvoted items.

Additional filters can wait until the first usable board proves the core interaction.

## Architecture

The stack should mirror BugDrop's spirit:

```text
embedded vanilla TypeScript widget
-> Cloudflare Worker / Hono API
-> D1 for board items, votes, statuses, and event cursor
-> optional R2 for future attachments
-> GitHub App for issue creation
```

### Hosted Version

The hosted version uses our managed Cloudflare Worker, D1 database, and optional R2
bucket. The installing user experiences this as a GitHub-backed product, not as an
infrastructure setup.

### Self-Hosted Version

The self-hosted version documents how to provision the Worker, D1 database, optional R2
bucket, secrets, and GitHub App credentials. This path is more operationally involved by
definition, but should follow the hosted architecture closely.

## Data Model

The initial D1 schema should include these conceptual tables.

### `boards`

- `id`
- `repo_owner`
- `repo_name`
- `name`
- `created_at`
- `updated_at`

V1 presents one board per app/repo, but keeping an explicit board id leaves room for
future multi-board support.

### `board_items`

- `id`
- `board_id`
- `title`
- `description`
- `status`
- `github_issue_number`
- `github_issue_url`
- `upvote_count`
- `created_by_external_user_id`
- `created_by_display_name`
- `created_at`
- `updated_at`

### `board_votes`

- `id`
- `board_id`
- `item_id`
- `external_user_id`
- `created_at`
- `updated_at`

Constraint:

```text
unique(board_id, item_id, external_user_id)
```

### `board_events`

- `id`
- `board_id`
- `event_type`
- `item_id`
- `payload_json`
- `created_at`

This event log powers incremental polling and gives the API a stable cursor model.

## Authentication

The board does not own user login. The host app signs short-lived board tokens for app
users. The Worker verifies those tokens and trusts only scoped claims.

Expected claims:

- Board or repo scope.
- External app user id.
- Optional display name.
- Optional email only if the host app intentionally provides it.
- Expiration.
- Issuer/audience when configured.

Token validation should reject missing, expired, malformed, or wrong-scope tokens. Token
claims should not be blindly copied into GitHub Issue bodies without sanitization.

Unauthenticated visitors may read public board state if the installing user allows that,
but they cannot create items or upvote in v1.

## GitHub Integration

Creating a board item creates a GitHub Issue. The issue should include:

- Item title and description.
- Board item id.
- Link or reference back to the embedded board context when available.
- A note that upvotes are tracked by BugDrop Board, not GitHub reactions.

Votes should not write to GitHub one-by-one. That would create API noise, timeline noise,
and a weak identity model. A later version can add periodic or threshold-based GitHub
summary updates.

GitHub Projects integration is out of scope for v1. It can be revisited later as an
optional workflow integration, but it should not be the board database.

## Polling and Freshness

V1 uses polling rather than WebSockets.

The board client should poll incrementally while visible, likely every 2-5 seconds, with
jitter. It should slow down or pause when the tab is hidden, offline, or idle.

Reads should use an event cursor:

```text
GET /api/boards/:boardId/events?since=:cursor
```

The API returns changed items, new cursor information, or a no-change response.

Mutation responses should return the updated item state immediately. The app user who
creates or upvotes an item should not wait for the next poll to see their own action.
Other viewers catch up on their next poll.

The event/cursor API should be designed so a future Durable Object or WebSocket transport
can broadcast the same event payloads without changing the board state model.

## API Surface

The exact route names can change during implementation, but v1 needs these capabilities:

- Load board configuration and initial items.
- Create a board item.
- Toggle an upvote.
- Poll for changes since a cursor.
- Check GitHub App installation/configuration.
- Health check.

Possible route shape:

```text
GET  /api/boards/:boardId
GET  /api/boards/:boardId/events?since=:cursor
POST /api/boards/:boardId/items
POST /api/boards/:boardId/items/:itemId/upvote
GET  /api/check/:owner/:repo
GET  /api/health
```

## Widget Shape

The widget should be vanilla TypeScript and embeddable in the same spirit as BugDrop. It
should avoid requiring a frontend framework in the host app.

The embed API should support:

- Repository or board identity.
- Theme/accent options.
- A host-provided token callback or token endpoint.
- Optional container mounting instead of only a floating button.

A token callback or token endpoint is safer than placing a long-lived token in the script
tag. The final design should avoid embedding reusable secrets in browser-visible markup.

## Testing Venue

The repo should include or reference a dummy host app for development and E2E tests. This
host app should mimic a real app that has signed-in users and can mint short-lived board
tokens.

The test venue should cover:

- Widget loads inside the dummy app.
- Signed app user can create an item.
- New item creates a GitHub Issue in a configured test repo or mocked GitHub client.
- Signed app user can upvote and remove an upvote.
- Duplicate upvotes are prevented.
- Polling updates another viewer after item creation or voting.
- Statuses render correctly.

## Error Handling

The API should return clear errors for:

- Missing or invalid auth token.
- Wrong board/repo scope.
- GitHub App not installed.
- GitHub Issue creation failure.
- D1 write failure.
- Invalid item title or description.

If GitHub Issue creation fails during item creation, v1 should fail the create request
rather than creating a board item with no engineering mirror. This preserves the product
promise that every item corresponds to a GitHub Issue.

## Security and Abuse Controls

V1 should include:

- Short-lived signed auth tokens.
- Per-IP and per-board rate limits for mutation routes.
- Title and description length limits.
- HTML escaping/sanitization for rendered item content.
- Careful CORS configuration.
- No browser-visible long-lived secrets.

Because v1 requires signed app users for mutations, anonymous spam controls can remain
minimal.

## Open Follow-Ups

- Pick the exact token format: reuse BugDrop-style HMAC tokens or use JWT-like signed
  tokens.
- Decide whether the first dummy host app lives in this repo or reuses an existing
  BugDrop test venue.
- Decide whether hosted v1 needs an admin/status update UI, GitHub-label sync, or a small
  API-only status update path.
- Decide whether attachments are postponed entirely or whether R2 scaffolding is included
  early for future screenshots.
- Pick the public product name. `bugdrop-board` is the investigation repo name.

## Recommended First Implementation Steps

1. Scaffold the Worker, widget build, TypeScript, linting, and test setup using BugDrop as
   the style reference.
2. Add D1 schema and migrations for boards, items, votes, and events.
3. Implement host-signed token verification.
4. Implement item creation with GitHub Issue creation.
5. Implement upvote toggle and uniqueness enforcement.
6. Implement initial board load and incremental polling.
7. Build the dummy host app and E2E tests for create/upvote/polling flows.
