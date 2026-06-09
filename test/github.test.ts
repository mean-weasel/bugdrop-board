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

  it('accepts GitHub App RSA private keys in PKCS#1 PEM format', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'ghs_installation_token' }), { status: 201 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ number: 10, html_url: 'https://github.com/o/r/issues/10' }), {
          status: 201,
        })
      );
    vi.stubGlobal('fetch', fetchMock);
    const issueCreator = createGitHubAppIssueCreator({
      appId: '12345',
      privateKey: RSA_PRIVATE_KEY_PEM,
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

    expect(issue).toEqual({ number: 10, htmlUrl: 'https://github.com/o/r/issues/10' });
    const [, tokenInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String((tokenInit.headers as Record<string, string>).Authorization)).toMatch(
      /^Bearer [^.]+\.[^.]+\.[^.]+$/
    );
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

const RSA_PRIVATE_KEY_PEM = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAz4eykM0nKdvAwMHnasBMGsU4B0+RwgvVv6pz+KBb4T1Pu/Tt
OfaycnQpA+R3F0Gj1t+WVTDG8GASIms+DjD90hYgIp613yy5YU8VUlyY4sAimF2X
Cg4kJXRe8GIApGo1JztH48YHn/z0iiBp7+np7reUaCjABtx+NThjZ2YRhl5pa5+0
T35hwEyg/zquY2zQw9zi3epUNtaUk9bJ8ND/mQGK70dOLLmtBpOcRo6n7CgJ4aEO
7qcrt0V+WS2pZOQ1FW57HVlG/4QAdW1FAyR/f/5rT7NtFO3MLvtFviWMXzKk+iYE
QRk+zHHsR3iyNI4smnDCgR82EBA+lTB+Y2MVAwIDAQABAoIBACyrDnowTg+qZxCW
K9NEVJ0meerI65ySo40/iPqouV3/rlvMWgsx2DLeYb2evStaS4OCWH85ong2lXCn
GJJBZUCE1qHc+1Rv8e7J8NLrb1TO+iNFca8OYCVXqN+gmHbLDWnGTrDt/NIoxhG8
7FBhTqK9DMpmiv5vExMtcefdhkQfRrNXX39RH3u5YqfYWZQY6icMsO5tvMhC0rob
BEh2/eFGyBCdeDxGyq60mWt5x1tJQhYzlDju/TtRelXfGBW3CJlbeKWf5LOd4ByR
xN7S4JJxwUpaTj/FqIx0nS2G89eku2pWV4sBqiv2L2Io8Dc7MM6e8N1y7Rrra1v0
LAkcakECgYEA9UNWjgM83wVZVxHHMzfAkeYwgAUZd1LJ1DysPLhxHUdI04gJKV5w
BIYTM/TV4p6A72ojSmP9ahVjzYAT+Lo3CUdmiHyGo6Vf15x0Btk9yMr7yb82zF9k
6Jd/OEIBlvLQVNAtIvbdMpzzU2J9LdZdrRTTDokn3yCRLMj8LIzhRRMCgYEA2J18
dTG2Od4bIrRyeaygMMiR2ohoIAoh0lzxKN6XAymspD/n2e41yVwJWjLPxIWTHYaG
Lkz5IlIpT3CTky3eT59aMiCdBab4f+pAwd+SAiTMQ3tMBAPmmd8KV5BRquVHEkuN
C4PHcQY4AyDdtfIudv7jOGhqt2orXU5WE2JsHlECgYEAwQu/lQf3YZNUPrQ/lpDL
ggstIZbh9Im1UthuuVxzrBfvuo/Ypjcu9GCTvNF5iGY6Fjf0jxkk3dr4M0gccCoi
J6uLiOJ7F1OTnKIIsVtMxj7+8E0RVMvBIVIdUKqjlayJTjiNTngAo1XmMDvVS77u
/MznUwmh2H5JxnZsBqTcqwECgYBfPzhni7lVzpzd8LxZVheF+9tuXQZz+CCRED8W
OnHqeRupiVQYVo8eADM4jxkej6F1nR5JI510gu4ZOSYa1FNpbWdKnV6OCrJABK/+
z6CzAp0ymvd82H5AcHtqr1HJtFFA8SmOw54hy5s7fOsgQuI9fqxItFkgVzXELFra
4S8rUQKBgDUUvxdq1fMhehwWztOOVss6juWyLMpUKBiLnmO1yotjmkOcP7F/vXZg
S+YRRcc73bmT2258zb/XOhVEIip/S+MWXdS9iIjRIcTdSoFkDCXZr+kPYJEIHB8K
Bs01UJC7GPCrxRGXM1m8orO8NnLJDLubUCZ8YdTa/p5hVJybj/VZ
-----END RSA PRIVATE KEY-----`;
