# T999 Judge Final Receipt

Decision: complete.

The closed-beta acceptance rehearsal oracle is satisfied for the production dogfood target.

Proof:

- `npm run doctor:selfhost -- --env production --host-origin https://bugdrop.dev --repo mean-weasel/bugdrop-board-production-dogfood --board-id board_mean_weasel_bugdrop_board_production_dogfood --worker-url https://board.bugdrop.dev --token-endpoint https://bugdrop.dev/api/bugdrop-board-token?viewer=a` passed with 17 checks, 0 warnings, and 0 failures.
- `npm run deploy:smoke -- --url https://board.bugdrop.dev --expect-environment production --cors-origin https://bugdrop.dev --cors-disallowed-origin https://evil.example --cors-board-id board_mean_weasel_bugdrop_board_production_dogfood --cors-token-endpoint https://bugdrop.dev/api/bugdrop-board-token?viewer=a` passed for production health, `board.js`, allowed CORS, disallowed CORS, items, and events.
- Playwright live proof created `Closed beta acceptance rehearsal 20260607T014840Z`, confirmed
  Viewer B polling visibility, Viewer B prioritize, Viewer A count sync, refresh persistence, and
  empty console/page error arrays during the passing proof.
- `gh issue view 11 --repo mean-weasel/bugdrop-board-production-dogfood --json number,title,state,url,createdAt,body` confirmed the mirrored issue and board item id.
- API read-back agreed for Viewer A and Viewer B: issue #11, item id
  `item_a33f58acf757e85041d4be6e`, upvote count 1, Viewer A not upvoted, Viewer B upvoted.
- Receipt scan, secret-shaped scan, forbidden-scope scan, format check, GoalBuddy checker, and
  `git diff --check` passed.

Strongest failure mode checked: the proof could accidentally create extra dogfood data or overstate
beta readiness. The first script created exactly one item then stopped before upvote due to a stale
link-text assertion; the second script reused that same item, and the receipt limits the go decision
to the existing dogfood target while keeping first real beta invite conditional.

Remaining status: production dogfood target is go; first real beta invite still requires target-app
proof and beta-user acceptance of limitations.
