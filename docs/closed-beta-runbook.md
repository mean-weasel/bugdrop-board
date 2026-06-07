# Closed Beta Runbook

Use this runbook when deciding whether a BugDrop Board install is ready for a closed-beta user and
when recording the handoff evidence. It assumes the setup path in
[Closed Beta Setup Checklist](closed-beta-setup.md) and the security boundaries from
[Closed Beta Security And Abuse Hardening](goals/bugdrop-board-closed-beta-security-abuse/goal.md)
are already understood.

## Purpose

Closed beta is ready for a specific app only when a maintainer can show:

- the target app has one provisioned board and one GitHub mirror repo;
- the deployed Worker uses exact host origins, remote D1, and short-lived host-signed tokens;
- the embed works inside the host app for at least two signed-in viewers;
- new board items create GitHub Issues before D1 item persistence;
- upvotes are unique per signed host user and visible to another viewer through polling;
- read, event, create, and upvote routes have closed-beta throttles;
- the operator knows the limitations that remain accepted for beta.

## Before Inviting A Beta User

1. Start from a clean repository checkout.
2. Use the supported closed-beta toolchain: Node 22, npm 10, and the repo's Wrangler 4.x dev
   dependency through `npx wrangler`.
3. Complete [Closed Beta Setup Checklist](closed-beta-setup.md).
4. Confirm package/install proof:

   ```bash
   npm view @mean-weasel/bugdrop-board version dist-tags --json
   npm run install:smoke -- --version latest --retries 3 --retry-delay-ms 5000
   ```

5. Confirm local gates before touching any deployment credentials:

   ```bash
   npm run validate
   make check
   npm run deploy:check:production
   ```

6. Run the self-host doctor against the intended environment, host origin, repo, board id, Worker
   URL, and token endpoint. It should pass before remote migrations or deploys:

   ```bash
   npm run doctor:selfhost -- \
     --env production \
     --host-origin https://app.example.com \
     --repo owner/name \
     --board-id board_owner_name \
     --worker-url https://bugdrop-board.example.workers.dev \
     --token-endpoint https://app.example.com/api/bugdrop-board-token
   ```

7. Complete [Closed Beta Dogfood Script](closed-beta-dogfood-script.md) for the target app.
8. Check [Closed Beta Readiness](closed-beta-readiness.md) and record any pending operator proof.
9. Review [Closed Beta Risks](closed-beta-risks.md) with the beta user.

## Evidence To Capture

Record a dated handoff note for each beta install. Use this shape:

```md
# Closed Beta Handoff: <app or repo>

- Date:
- Maintainer:
- Host app origin:
- Worker URL:
- Board id:
- Mirror repo:
- Package version/dist-tag:
- Worker environment:
- D1 database name/id location, without secret values:
- Doctor command summary:
- Deploy or dry-run proof:
- Smoke command summary:
- Dogfood item title:
- Mirrored GitHub Issue URL:
- Viewer A result:
- Viewer B result:
- CORS negative proof:
- Token TTL boundary checked:
- Throttle boundary communicated:
- Accepted beta limitations:
- Beta blockers:
- Follow-ups:
```

Do not include token values, `.dev.vars`, `.deploy.secrets`, screenshots of secret screens, or raw
browser cookies in the handoff note.

## Support Path

- Setup failure: start with `npm run doctor:selfhost`, then use
  [Closed Beta Setup Checklist](closed-beta-setup.md) and inspect the exact command output that
  failed.
- Token failure: confirm `BOARD_TOKEN_SECRET`, audience, issuer, `boardId`, and `exp` match the
  Worker environment. Tokens longer than `BOARD_TOKEN_MAX_TTL_SECONDS` are rejected.
- CORS failure: confirm `ALLOWED_ORIGINS` names the exact host app origin. CORS is browser
  containment, not authorization.
- GitHub mirror failure: confirm the issue token can create Issues in the provisioned repo and that
  the board row points to that repo.
- Polling or upvote failure: use two signed-in viewers and the dogfood script before assuming a
  product defect.

## Operator Rollback

Rollback is operator-controlled:

- remove or hide the host app embed if the beta page should stop showing the board;
- rerun the previous known-good Worker deployment if a new Worker promotion caused the problem;
- restore previous Worker secrets only when a secret rotation or replacement caused the issue;
- rerun deployed smoke and the dogfood script after rollback.

This runbook does not perform rollback, deploys, or credential changes.

## Known Boundaries

Closed beta does not include hosted control plane, billing, realtime transport, comments, downvotes,
GitHub Projects, status workflow, built-in monitoring, backup/export/restore automation, or
operator incident tooling. Those are future product or operations boards, not requirements for this
handoff.
