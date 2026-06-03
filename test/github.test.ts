import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGitHubIssue } from '../src/lib/github';

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
