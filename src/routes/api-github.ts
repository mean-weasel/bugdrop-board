import {
  createGitHubAppIssueCreator,
  createGitHubIssueCreator,
  type IssueCreator,
} from '../lib/github';
import type { HostedBoardConfig } from '../lib/hosted-config-repository';
import type { Env } from '../types';

export function createIssueCreator(
  env: Env,
  hostedConfig?: HostedBoardConfig
): IssueCreator | null {
  if (hostedConfig) {
    const connection = hostedConfig.githubConnection;
    if (!connection || !env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
      return null;
    }
    return createGitHubAppIssueCreator({
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY,
      installationId: connection.installationId,
    });
  }

  if (env.ENVIRONMENT === 'e2e') {
    return {
      createIssue(input) {
        return Promise.resolve({
          number: 1001,
          htmlUrl: `https://github.local/mean-weasel/demo/issues/${input.boardItemId}`,
        });
      },
    };
  }
  if (!env.GITHUB_ISSUE_ACCESS_TOKEN) {
    return null;
  }
  return createGitHubIssueCreator(env.GITHUB_ISSUE_ACCESS_TOKEN);
}

export function issueTargetForBoard(
  board: { repoOwner: string; repoName: string },
  hostedConfig?: HostedBoardConfig
): { owner: string; repo: string } | null {
  if (!hostedConfig) {
    return { owner: board.repoOwner, repo: board.repoName };
  }

  const connection = hostedConfig.githubConnection;
  if (!connection) {
    return null;
  }
  if (connection.repoOwner !== board.repoOwner || connection.repoName !== board.repoName) {
    return null;
  }

  return { owner: connection.repoOwner, repo: connection.repoName };
}
