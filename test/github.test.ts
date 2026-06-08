import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGitHubAppIssueCreator, createGitHubIssue } from '../src/lib/github';

describe('createGitHubIssue', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an issue with board metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ number: 7, html_url: 'https://github.com/o/r/issues/7' }), {
        status: 201,
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const issue = await createGitHubIssue({
      accessToken: 'ghs_installation_token',
      owner: 'o',
      repo: 'r',
      title: 'Add SSO',
      description: 'Enterprise users need it.',
      boardItemId: 'item_1',
    });

    expect(issue).toEqual({ number: 7, htmlUrl: 'https://github.com/o/r/issues/7' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/o/r/issues',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer ghs_installation_token',
        }) as HeadersInit,
        body: expect.stringContaining('item_1'),
      })
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(init.body)).toContain('Upvotes are tracked in BugDrop Board');
  });

  it('throws on GitHub API failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('bad credentials', { status: 401 }))
    );

    await expect(
      createGitHubIssue({
        accessToken: 'bad',
        owner: 'o',
        repo: 'r',
        title: 'Add SSO',
        description: '',
        boardItemId: 'item_1',
      })
    ).rejects.toThrow('Failed to create GitHub issue');
  });

  it('throws on malformed GitHub responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 201 })));

    await expect(
      createGitHubIssue({
        accessToken: 'ghs_installation_token',
        owner: 'o',
        repo: 'r',
        title: 'Add SSO',
        description: '',
        boardItemId: 'item_1',
      })
    ).rejects.toThrow('missing issue metadata');
  });
});

describe('createGitHubAppIssueCreator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mints an installation token and creates the issue with that token', async () => {
    const keyPair = await generateKeyPair();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'ghs_installation_token' }), { status: 201 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ number: 9, html_url: 'https://github.com/o/r/issues/9' }), {
          status: 201,
        })
      );
    vi.stubGlobal('fetch', fetchMock);
    const issueCreator = createGitHubAppIssueCreator({
      appId: '12345',
      privateKey: await privateKeyPem(keyPair.privateKey),
      installationId: '98765',
      now: new Date('2026-06-08T12:00:00Z'),
    });

    const issue = await issueCreator.createIssue({
      owner: 'o',
      repo: 'r',
      title: 'Add SSO',
      description: 'Enterprise users need it.',
      boardItemId: 'item_1',
    });

    expect(issue).toEqual({ number: 9, htmlUrl: 'https://github.com/o/r/issues/9' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(tokenUrl).toBe('https://api.github.com/app/installations/98765/access_tokens');
    expect(tokenInit).toMatchObject({ method: 'POST' });
    const tokenAuthorization = String((tokenInit.headers as Record<string, string>).Authorization);
    expect(tokenAuthorization).toMatch(/^Bearer [^.]+\.[^.]+\.[^.]+$/);

    const [issueUrl, issueInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(issueUrl).toBe('https://api.github.com/repos/o/r/issues');
    expect(issueInit.headers).toMatchObject({ Authorization: 'Bearer ghs_installation_token' });
  });

  it('fails closed when the installation-token response is malformed', async () => {
    const keyPair = await generateKeyPair();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 201 })));
    const issueCreator = createGitHubAppIssueCreator({
      appId: '12345',
      privateKey: await privateKeyPem(keyPair.privateKey),
      installationId: '98765',
    });

    await expect(
      issueCreator.createIssue({
        owner: 'o',
        repo: 'r',
        title: 'Add SSO',
        description: '',
        boardItemId: 'item_1',
      })
    ).rejects.toThrow('installation token response');
  });
});

async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  ) as Promise<CryptoKeyPair>;
}

async function privateKeyPem(privateKey: CryptoKey): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.exportKey('pkcs8', privateKey));
  const body =
    btoa(String.fromCharCode(...bytes))
      .match(/.{1,64}/g)
      ?.join('\n') ?? '';
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
}
