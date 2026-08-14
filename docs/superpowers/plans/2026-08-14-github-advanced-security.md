# GitHub Advanced Security Setup

## Goal

Add repository-level security detection after the closed-beta dependency hardening work, without
treating GitHub scanning as proof of runtime authorization, deployment correctness, or per-install
beta readiness.

## Changes

- Enable Dependabot alerts and security updates.
- Enable secret scanning, non-provider pattern detection, validity checks, and push protection.
- Enable CodeQL default setup for JavaScript/TypeScript and GitHub Actions.
- Add a pull-request dependency review workflow pinned to immutable action commits.
- Fail dependency review for moderate-or-higher vulnerabilities in runtime, development, or unknown
  scopes; keep license policy out of this security-only gate.

## Verification

- Inspect the repository `security_and_analysis` state through the GitHub API.
- Confirm CodeQL default setup is configured and its setup run completes.
- Run formatting, action-version guard, workflow inspection, and repository checks locally.
- Push the focused workflow commit and confirm GitHub Actions accepts the workflow.

## Boundaries

- Do not change Cloudflare deployments, credentials, D1 data, or beta-user access.
- Do not claim that Advanced Security replaces auth, CORS, D1 isolation, deployed `/board.js`,
  GitHub mirroring, or two-viewer dogfood proof.
