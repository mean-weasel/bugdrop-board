# T002 Red Tests

Status: done.

Added `test/hosted-beta-security-gate.test.ts` as the consolidated local gate for:

- hosted CORS allow/deny;
- hosted token TTL, issuer, audience, key, tenant, app, and board drift;
- hosted GitHub repo mismatch atomicity;
- hosted read and event-poll throttle boundaries;
- hosted event payload privacy.

Red proof:

- First focused run failed before green work because the new gate suite had test-helper scoping
  errors. Those were fixed before accepting the suite as proof.

Green proof after test-shape fixes:

- `npm run test -- test/hosted-beta-security-gate.test.ts`
  - Passed: 1 test file, 5 tests.
