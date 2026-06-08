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

interface CreateGitHubAppIssueCreatorInput {
  appId: string;
  privateKey: string;
  installationId: string;
  now?: Date;
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

export function createGitHubAppIssueCreator(input: CreateGitHubAppIssueCreatorInput): IssueCreator {
  return {
    async createIssue(issueInput) {
      const accessToken = await createInstallationAccessToken(input);
      return createGitHubIssue({ ...issueInput, accessToken });
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

async function createInstallationAccessToken(
  input: CreateGitHubAppIssueCreatorInput
): Promise<string> {
  const appJwt = await createGitHubAppJwt(input);
  const response = await fetch(
    `${GITHUB_API}/app/installations/${input.installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'BugDrop-Board/0.1',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to create GitHub installation token: ${response.status} - ${await response.text()}`
    );
  }

  const data = (await response.json()) as Partial<{ token: string }>;
  if (typeof data.token !== 'string' || data.token.length === 0) {
    throw new Error('GitHub installation token response was missing token metadata');
  }
  return data.token;
}

async function createGitHubAppJwt(input: CreateGitHubAppIssueCreatorInput): Promise<string> {
  const now = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iat: now - 60,
    exp: now + 600,
    iss: input.appId,
  };
  const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`;
  const key = await importPrivateKey(input.privateKey);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64urlBytes(new Uint8Array(signature))}`;
}

async function importPrivateKey(privateKey: string): Promise<CryptoKey> {
  const normalized = privateKey.replaceAll('\\n', '\n');
  const body = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const bytes = Uint8Array.from(atob(body), character => character.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    bytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
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

function base64urlJson(value: unknown): string {
  return base64urlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64urlBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
