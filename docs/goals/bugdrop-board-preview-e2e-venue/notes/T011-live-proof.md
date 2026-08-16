# T011 Live Preview Proof

Date: 2026-08-16

This note records redacted live evidence for the protected BugDrop Board preview system. No token, private key, signer secret, or installation token value is included.

## Deployed identity

- Board repository: `mean-weasel/bugdrop-board`
- Companion repository: `mean-weasel/bugdrop-board-widget-test`
- Fixed companion preview alias: `https://bugdrop-board-widget-test-git-preview-jermwatts-projects.vercel.app`
- Signed companion deployment: `dpl_5ymNTg2WPMdgRDRqfBCzXtYL46kc`
- Companion venue commit: `a9eba6e7f8770e997facdfa8e5edf406bafdc03a`
- Venue config version: `preview-2026-08-15-v1`
- Preview Worker: `bugdrop-board-preview`
- Preview D1 database id: `d8b341bd-8be8-45f3-90d8-231abe398781`
- Passing merge commit and Worker build SHA: `fdf0356f684c5caef7c3cea197b235d79244033e`
- Verified widget SHA-256: `521df617959620acf1ebac5c4664bc501275244770a506523b5eeac65d2bf209`

The workflow required exact agreement among the expected GitHub SHA, Worker health response, response build header, and widget hash before browser mutations were allowed. A bounded readiness retry was added after Cloudflare briefly served the previous exact SHA immediately after deployment; it does not accept a mismatched SHA.

## Protected CI evidence

- Passing same-repository pull-request proof after the propagation repair: [run 31954854975](https://github.com/mean-weasel/bugdrop-board/actions/runs/31954854975).
- Passing clean merge-group preview proof: [run 31955188955](https://github.com/mean-weasel/bugdrop-board/actions/runs/31955188955).
- Passing merge-group repository CI: [run 31955188976](https://github.com/mean-weasel/bugdrop-board/actions/runs/31955188976).
- Passing trusted janitor proof on `main`: [run 31955720029](https://github.com/mean-weasel/bugdrop-board/actions/runs/31955720029).

The live browser proof exercised two stable viewers across desktop and mobile: signed token retrieval by POST, item creation, independently verified GitHub Issue mirroring, second-viewer polling, upvote visibility, reload persistence, and the final D1 reset. The Issue verifier used a separately minted installation token outside Playwright. Cleanup closed only exact reserved-marker matches, followed by two zero-open observations.

The `main` ruleset (`20876332`) now requires:

- `Lint, Typecheck, Knip, Audit`
- `Unit Tests & Build`
- `Preview E2E`

The preview environment approvals and exact ref patterns were exercised for pull-request merge refs and `gh-readonly-queue/main/*`. Because GitHub treated the sole repository owner as the merge-queue deployment initiator, `preview-merge-queue` permits self-review; it still requires that named reviewer and does not allow administrator bypass. This is an explicit single-owner operational tradeoff, not an unprotected environment.

## Negative and failure-path evidence

- [Run 31949725368](https://github.com/mean-weasel/bugdrop-board/actions/runs/31949725368) intentionally reached a post-Issue browser assertion failure. Exact Issue cleanup, the reserved-prefix sweep, and the D1 reset all still completed successfully.
- [Run 31950593478](https://github.com/mean-weasel/bugdrop-board/actions/runs/31950593478) rejected a stale Worker build SHA during deployment propagation. Its cleanup, sweep, and reset stages also passed.
- The trusted janitor was followed by two independent GitHub API observations; both reported zero open reserved-prefix Issues.
- A short-lived signed Ada token was used for a read-only burst against the CI board. The Worker returned HTTP `429` on request 65 of this probe and supplied `Retry-After: 8`, proving the configured limiter fails closed under burst traffic. The token was never printed and was discarded.
- Existing workflow and route proof covers exact-origin CORS rejection, missing/expired/malformed/wrong-board authentication, and fork-safe workflow paths that cannot consume protected preview credentials.

## Rollback drills

### Companion signer cutoff

The fixed CI alias was temporarily repointed to an otherwise equivalent deployment with no signer configuration. During the cutoff:

```text
health=503 config=503 token=503
```

The alias was restored to deployment `dpl_5ymNTg2WPMdgRDRqfBCzXtYL46kc`. Recovery checks returned:

```text
health=200 config=200 token=200
```

Post-restore inspection confirmed the fixed alias mapped to the exact signed deployment.

### Runtime GitHub App suspension

Runtime installation `154043454` was temporarily suspended. A single reserved-marker create attempt returned HTTP `502`. The installation was immediately unsuspended and verified active. Independent D1 and GitHub searches found no attributable record:

```text
suspend=204 mutation=502 unsuspended=true d1_matches=0 issue_matches=0
```

The temporary App JWT was never printed and was discarded. The installation remains active.

## Cleanup and residual operations

The final merge-group run showed `demoUnchanged=true` and `ciEmpty=true` before and after the browser flow. Its Issue cleanup recorded no remaining marker matches, and the later janitor plus two independent observations confirmed zero open reserved Issues.

Remaining operational follow-ups:

- Completed 2026-08-16: rotated the preview Cloudflare CI token to a new one-account token with only D1 Edit and Workers Scripts Edit, expiring 2026-10-15. The replacement was installed only in `preview-pr` and `preview-merge-queue`; GitHub recorded updates at `2026-08-16T20:47:52Z` and `2026-08-16T20:47:58Z`. Cloudflare token verification, D1 access, and Workers Scripts access each returned HTTP 200, the superseded token was removed, and temporary token variables plus browser and operating-system clipboards were cleared.
- Replace the deprecated `app-id` input of `actions/create-github-app-token` with `client-id` in a bounded maintenance change; the currently pinned action and live janitor both work.
- Revisit merge-queue self-review when a second trusted reviewer is available.
