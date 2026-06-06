# BugDrop Board Chrome Dogfood Upvote Proof

Status: passed.

This dogfood pass used the Codex Chrome extension against the live BugDrop host page:

- Viewer A: `https://bugdrop.dev/board-dogfood?viewer=a`
- Viewer B: `https://bugdrop.dev/board-dogfood?viewer=b`

## Item

- Title: `a test for you`
- Board item ID: `item_c0c7dec70a521787b4b177d4`
- GitHub issue: `https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/9`
- Created by: `bugdrop-dev-dogfood-a`

## Chrome UI Proof

Before the vote, the live embedded board showed GitHub #9 as:

- Viewer A: `Prioritize 0`, `aria-pressed="false"`
- Viewer B: `Prioritize 0`, `aria-pressed="false"`

Using Chrome, viewer B clicked the GitHub #9 upvote button with accessible label:

```text
Prioritize a test for you. 0 upvotes.
```

After the click:

- Viewer B showed `Prioritized 1`, `aria-pressed="true"`.
- Viewer A showed `Prioritize 1`, `aria-pressed="false"`.
- Chrome console error logs were empty for both tabs.

The board had another older item with the same title mirrored as GitHub #8, so the proof targeted
GitHub #9 through the button state and API item ID.

## API Proof

Board API read-back for GitHub #9:

```json
{
  "id": "item_c0c7dec70a521787b4b177d4",
  "title": "a test for you",
  "githubIssueNumber": 9,
  "githubIssueUrl": "https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/9",
  "upvoteCount": 1,
  "viewerAHasUpvoted": false,
  "viewerBHasUpvoted": true,
  "updatedAt": "2026-06-06T20:12:55.023Z"
}
```

## GitHub Mirror Proof

`gh issue view 9 --repo mean-weasel/bugdrop-board-production-dogfood --json number,title,state,url,body,reactionGroups`
reported:

- Issue title: `a test for you`
- Issue state: `OPEN`
- Body includes `BugDrop Board item: item_c0c7dec70a521787b4b177d4`
- Body states that upvotes are tracked in BugDrop Board, not GitHub reactions.
- `reactionGroups` was empty.

## Scope Audit

This dogfood pass did not perform:

- npm publish;
- package version bump;
- Cloudflare deploy;
- credential or secret change;
- hosted control plane work;
- billing;
- realtime transport;
- comments;
- downvotes;
- GitHub Projects;
- product behavior change beyond the intended live upvote.
