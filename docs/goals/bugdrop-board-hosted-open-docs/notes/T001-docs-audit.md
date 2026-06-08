# T001 Docs Audit

## Findings

- README already documents the product shape, host-signed tokens, D1 storage, GitHub Issue creation,
  and upvotes, but its setup path is mostly self-host oriented.
- README documents deployed origin rules, token endpoint claims, GitHub mirroring, request throttles,
  event privacy, and customization settings in separate sections.
- `wrangler.toml` production vars show the current dogfood hosted surface:
  `ALLOWED_ORIGINS = "https://bugdrop.dev,https://board.bugdrop.dev"`,
  `BOARD_TOKEN_AUDIENCE = "bugdrop-board"`,
  `BOARD_TOKEN_ISSUER = "bugdrop-board-production-host"`,
  `BOARD_TOKEN_MAX_TTL_SECONDS = "300"`, and the documented throttle defaults.
- `src/widget/config.ts` confirms current user-facing customization options: layouts
  `inline`, `panel`, `kanban`; densities `compact`, `comfortable`, `spacious`; composer
  `inline` or `collapsed`; empty lane display; issue link visibility; stable copy keys; and known
  theme tokens.
- `docs/closed-beta-risks.md` already lists key limitations, but it does not distinguish the manual
  hosted beta path from future multi-tenant hosted SaaS.

## Missing For Hosted Beta Readers

- One concise document that explains what BugDrop Hosted Beta protects today.
- A split between host app responsibilities and BugDrop-managed hosted settings.
- A succinct embed/customization settings table for non-self-hosted installers.
- Clear wording that CORS is browser containment, while bearer-token verification is authorization.
- Clear limitations language that avoids promising a hosted control plane, billing, realtime,
  comments, downvotes, GitHub Projects, status workflow, monitoring, or backup/export/restore.

## Edit Plan

- Add `docs/hosted-security-and-setup.md`.
- Add a README link near the product shape so hosted beta readers find the right setup/security
  contract early.
- Add a small closed-beta risk cross-link and manual-provisioning limitation.
