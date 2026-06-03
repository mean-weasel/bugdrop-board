const GITHUB_API = 'https://api.github.com';

export interface CreateIssueInput {
  owner: string;
  repo: string;
  title: string;
  description: string;
  boardItemId: string;
}

interface CreateGitHubIssueInput extends CreateIssueInput {
  accessToken: string;
}

export interface CreatedIssue {
  number: number;
  htmlUrl: string;
}

export interface IssueCreator {
  createIssue(input: CreateIssueInput): Promise<CreatedIssue>;
}

export function createGitHubIssueCreator(accessToken: string): IssueCreator {
  return {
    createIssue(input) {
      return createGitHubIssue({ ...input, accessToken });
    },
  };
}

export async function createGitHubIssue(input: CreateGitHubIssueInput): Promise<CreatedIssue> {
  const response = await fetch(`${GITHUB_API}/repos/${input.owner}/${input.repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'BugDrop-Board/0.1',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      title: input.title,
      body: buildIssueBody(input),
      labels: ['enhancement'],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create GitHub issue: ${response.status} - ${await response.text()}`);
  }

  const data = (await response.json()) as Partial<{ number: number; html_url: string }>;
  if (typeof data.number !== 'number' || typeof data.html_url !== 'string') {
    throw new Error('GitHub issue response was missing issue metadata');
  }

  return { number: data.number, htmlUrl: data.html_url };
}

function buildIssueBody(input: CreateIssueInput): string {
  return [
    input.description,
    '',
    '---',
    `BugDrop Board item: \`${input.boardItemId}\``,
    'Upvotes are tracked in BugDrop Board, not GitHub reactions.',
  ].join('\n');
}
