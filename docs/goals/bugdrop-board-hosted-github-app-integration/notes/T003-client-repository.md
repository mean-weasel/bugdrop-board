# T003 Client And Repository

Status: done.

Implemented:

- `createGitHubAppIssueCreator`, which signs a GitHub App JWT, mints an installation access token,
  and delegates issue creation to the existing GitHub issue creator.
- Fail-closed handling for failed or malformed installation-token responses.
- Hosted GitHub connection repository creation and active readback from `hosted_board_configs`.
- Environment types for `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`.

Green proof:

- `npm run test -- test/github.test.ts`
  - Passed: 5 tests.
- `npm run test -- test/hosted-config-repository.test.ts`
  - Passed: 5 tests.
