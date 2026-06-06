# T004 Worker Receipt

Result: done.

Tightened runtime/package/setup trust metadata without publishing or changing the package version.
The Worker inspected the already-dirty package metadata, lockfile, README, closed-beta docs, and
install/package smoke helper changes from this session and kept them with proof.

Changed files:

- `package.json`
- `package-lock.json`
- `README.md`
- `docs/closed-beta-setup.md`
- `docs/closed-beta-runbook.md`
- `scripts/verify-clean-room-install.js`
- `scripts/verify-package-install.js`

What changed:

- Added `packageManager: npm@10.9.8`.
- Added `engines` for Node `>=22.12.0 <23` and npm `>=10 <11`.
- Updated `package-lock.json` with package metadata using `npm install --package-lock-only --ignore-scripts`.
- README and closed-beta docs now state the Node 22, npm 10, and Wrangler 4.x expectations.
- Closed-beta setup/runbook clarify that npm is the widget artifact only and self-hosting still
  uses the repo Worker/D1/provision/deploy path.
- Smoke helper help text now uses the current package version dynamically instead of stale
  `0.1.x` examples.

Proof:

- `node --version`: `v22.22.3`.
- `npm --version`: `10.9.8`.
- `npx wrangler --version`: `4.97.0`.
- `npm run install:smoke:workflow`: pass.
- `npm run package:workflow:check`: pass.
- `npm run test -- test/verify-clean-room-install.test.ts`: included in focused 22-test pass.
- `npm run format:check`: pass after formatting docs.
- Stale helper scan for `0.1.2`, `Usage: npm run release:smoke -- [--version 0.1.0]`, and
  `Usage: npm run install:smoke -- [--version 0.1.2]` returned no matches in current setup/helper
  surfaces.

Stop conditions checked:

- No package version bump, npm publish, Cloudflare deploy, credential/secret change, hosted control
  plane, billing, realtime, comments, downvotes, GitHub Projects, status/admin workflow, or
  unrelated product behavior was required.
