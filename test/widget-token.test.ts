import { fetchBoardToken } from '../src/widget/token';

describe('widget token fetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts exactly one empty JSON object to the configured endpoint verbatim', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: 'signed.board.token' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const endpoint = '/api/board-token?viewer=ada&mode=ci';

    await expect(fetchBoardToken(endpoint)).resolves.toBe('signed.board.token');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(endpoint, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
  });

  it('fails closed on a non-success response without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchBoardToken('/api/board-token')).rejects.toThrow(
      'Token request failed with 503'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails closed on invalid JSON without retrying', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('not-json', { headers: { 'Content-Type': 'application/json' } })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchBoardToken('/api/board-token')).rejects.toThrow(
      'Token request returned invalid JSON'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['missing', {}],
    ['non-string', { token: 123 }],
    ['blank', { token: '   ' }],
  ])('fails closed on a %s token without retrying', async (_case, payload) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchBoardToken('/api/board-token')).rejects.toThrow(
      'Token request did not return a token'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
