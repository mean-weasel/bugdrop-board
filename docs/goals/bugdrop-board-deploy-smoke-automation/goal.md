# BugDrop Board Deploy Smoke Automation

## Goal

Add a reusable deployed Worker smoke command and optional Deploy Worker workflow verification input,
without deploying, publishing, changing secrets, or changing runtime product behavior.

## Oracle

A maintainer or self-hoster can verify a deployed Worker URL with one command that checks `/health`
and `/board.js`; the manual Deploy Worker workflow can run that same smoke after a real deployment
when `smoke_url` is provided.

Completion must prove:

- Local `deploy:smoke` command verifies the already-live production Worker.
- The Deploy Worker workflow only runs the smoke when an explicit URL input is provided.
- README documents the command and workflow input.
- Standard gates pass.
- No npm publish, production deploy, secret rotation, hosted control plane, billing, realtime,
  comments, downvotes, GitHub Projects, or runtime product behavior was added.

## Scope

In scope:

- Deployed Worker smoke script and local commands.
- Optional Deploy Worker workflow smoke input/step.
- README deployment verification docs.
- GoalBuddy receipts for this tranche.

Out of scope:

- Running a deployment.
- Publishing a new npm version.
- Rotating or changing secrets.
- Runtime product behavior.

## Starter

Run:

`/goal Follow docs/goals/bugdrop-board-deploy-smoke-automation/goal.md.`
