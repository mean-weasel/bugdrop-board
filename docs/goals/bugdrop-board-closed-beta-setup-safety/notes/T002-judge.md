# T002 Judge

Decision: proceed.

The Scout plan is inside the Closed Beta Board 1 scope. The required work is documentation,
workflow defaults, and setup-safety script guidance. It does not require product behavior changes,
new throttling/security behavior, monitoring, npm publish, Cloudflare deploy, credential changes,
or status workflow work.

Approved Worker sequence:

1. T003: version/install-smoke/default deploy-env clarity.
2. T004: host-token endpoint examples and GitHub token scope guidance.
3. T005: closed-beta checklist.

Constraints to preserve during Worker work:

- Do not change runtime API/auth/GitHub/widget product behavior.
- Do not publish, deploy, rotate credentials, or edit local secret files.
- Keep deploy fixes limited to safe scripts, workflow defaults, and docs clarity.
- Keep all version claims aligned with `@mean-weasel/bugdrop-board@0.2.0` as npm `latest`.
