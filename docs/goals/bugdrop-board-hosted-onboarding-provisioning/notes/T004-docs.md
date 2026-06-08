# T004 Docs

Status: done.

Updated:

- README hosted beta section with `npm run provision:hosted-board -- ... --dry-run` and the
  redacted handoff contract.
- Hosted security/setup guide with operator dry-run usage, apply guidance, and the GitHub App
  installation model.
- Hosted defaults now refer to GitHub App installation metadata matching the board repo.

Proof:

- `rg -n "provision:hosted-board|dry-run|allowed origins|token endpoint|GitHub installation" README.md docs/hosted-security-and-setup.md`
  - Found the command, dry-run guidance, allowed-origin/token-endpoint setup language, and GitHub
    installation language.
