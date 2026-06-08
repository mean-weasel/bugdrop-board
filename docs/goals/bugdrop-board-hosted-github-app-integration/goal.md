# BugDrop Board Hosted GitHub App Integration

## Goal

Add the hosted-mode GitHub App issue creation path while preserving the existing self-host
`GITHUB_ISSUE_ACCESS_TOKEN` path.

Hosted boards must create GitHub Issues through the board's configured active GitHub App
installation and fail closed when the installation is missing, inactive, or points at a different
repository than the board.

## Oracle

This board is complete only when tests and source inspection prove:

- Hosted board config can store and read active GitHub connection metadata.
- Hosted item creation mints a GitHub App installation token server-side and creates the issue in
  the configured repo.
- Missing, suspended, or repo-mismatched hosted GitHub connections fail closed before creating a
  D1 board item.
- Existing self-host PAT issue creation keeps working.
- GitHub failure atomicity remains intact: no issue means no persisted board item or event.

## Scope

In scope:

- Hosted GitHub connection repository support.
- GitHub App JWT and installation-token issue creator.
- API route integration for hosted boards.
- Focused unit/route tests and GoalBuddy receipts.

Out of scope:

- GitHub App creation or OAuth onboarding.
- Real credentials, secrets, wrangler changes, deploys, workflow changes, package changes, public
  asset changes, package publishing, and version bumps.
- Hosted onboarding UX/API.
- Billing, realtime, comments, downvotes, GitHub Projects, and unrelated product behavior.

## Constraints

- Preserve self-host behavior and tests.
- Keep tenant/app/board/repo mismatch denial-by-default.
- Do not expose installation tokens to browser responses, logs, or event payloads.
- Use TDD: write failing tests before implementation.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-hosted-github-app-integration/goal.md.`
