# T001 Worker Receipt

Preflight passed without browser mutation.

Proof:

- `npm run doctor:selfhost -- --env production --host-origin https://bugdrop.dev --repo mean-weasel/bugdrop-board-production-dogfood --board-id board_mean_weasel_bugdrop_board_production_dogfood --worker-url https://board.bugdrop.dev --token-endpoint https://bugdrop.dev/api/bugdrop-board-token?viewer=a` passed with 17 checks, 0 warnings, and 0 failures.
- `npm run deploy:smoke -- --url https://board.bugdrop.dev --expect-environment production --cors-origin https://bugdrop.dev --cors-disallowed-origin https://evil.example --cors-board-id board_mean_weasel_bugdrop_board_production_dogfood --cors-token-endpoint https://bugdrop.dev/api/bugdrop-board-token?viewer=a` passed. Health reported production, `/board.js` returned 200 text/javascript, allowed CORS returned `https://bugdrop.dev`, and disallowed CORS returned no allowed origin.
- `gh issue list --repo mean-weasel/bugdrop-board-production-dogfood --state open --limit 5 --json number,title,url` listed current dogfood issues without mutation.
