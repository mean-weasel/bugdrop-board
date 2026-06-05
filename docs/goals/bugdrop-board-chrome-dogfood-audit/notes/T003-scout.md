# T003 Scout Receipt

Timestamp: `2026-06-05T14:55:00Z`

Result: done.

## GitHub Proof

`gh issue view 2 --repo mean-weasel/bugdrop-board-production-dogfood --json number,title,state,url,createdAt,body`
returned:

- number: `2`
- title: `Chrome dogfood item 20260605T145224Z`
- state: `OPEN`
- URL: `https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/2`
- created at: `2026-06-05T14:52:50Z`
- body includes board item id `item_abc3023cb1a27e7396aa3ba9`

## Board API Proof

Viewer A readback:

- status: `200`
- `Access-Control-Allow-Origin`: `https://bugdrop.dev`
- `githubIssueNumber`: `2`
- `githubIssueUrl`: `https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/2`
- `upvoteCount`: `1`
- `viewerHasUpvoted`: `false`

Viewer B readback:

- status: `200`
- `Access-Control-Allow-Origin`: `https://bugdrop.dev`
- `githubIssueNumber`: `2`
- `githubIssueUrl`: `https://github.com/mean-weasel/bugdrop-board-production-dogfood/issues/2`
- `upvoteCount`: `1`
- `viewerHasUpvoted`: `true`

## Event API Proof

The event stream for `item_abc3023cb1a27e7396aa3ba9` contained:

- `item_created` event id `3`
- `upvote_added` event id `4`

API/GitHub results agree with the browser-observed title, issue URL, and upvote count. Token values
were not printed or recorded.
