# T002 Red Tests

Status: done.

Added failing tests for:

- `createGitHubAppIssueCreator` exchanging a GitHub App JWT for an installation token and using
  that token to create an issue.
- Malformed installation-token responses failing closed.
- `HostedConfigRepository.createGitHubConnection` and board-config readback of active connection
  metadata.
- Hosted route item creation through the configured connection repo.
- Hosted route fail-closed behavior for missing connection and repo mismatch.

Red proof:

- `npm run test -- test/github.test.ts`
  - Failed as expected: `TypeError: createGitHubAppIssueCreator is not a function`.
- `npm run test -- test/hosted-config-repository.test.ts test/routes.test.ts`
  - Failed as expected: `TypeError: hosted.createGitHubConnection is not a function`.
