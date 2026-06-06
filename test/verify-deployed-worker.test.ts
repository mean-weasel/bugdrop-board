import { describe, expect, it, vi } from 'vitest';
import { parseArgs, runSmoke } from '../scripts/verify-deployed-worker.js';

describe('verify-deployed-worker', () => {
  it('verifies browser CORS preflight and authenticated board reads', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'ok',
          environment: 'production',
        })
      )
      .mockResolvedValueOnce(new Response('', { headers: { 'content-type': 'text/javascript' } }))
      .mockResolvedValueOnce(jsonResponse({ token: 'payload.signature' }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 204,
          headers: corsHeaders('https://bugdrop.dev'),
        })
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { items: [] },
          {
            headers: corsHeaders('https://bugdrop.dev'),
          }
        )
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { cursor: 0, events: [] },
          {
            headers: corsHeaders('https://bugdrop.dev'),
          }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ cursor: 0, events: [] }));

    await expect(
      runSmoke(
        {
          url: 'https://board.bugdrop.dev',
          expectEnvironment: 'production',
          corsOrigin: 'https://bugdrop.dev',
          corsDisallowedOrigin: 'https://evil.example',
          corsBoardId: 'board_mean_weasel_bugdrop_board_production_dogfood',
          corsTokenEndpoint: 'https://bugdrop.dev/api/bugdrop-board-token?viewer=a',
        },
        fetchImpl
      )
    ).resolves.toMatchObject({
      cors: {
        origin: 'https://bugdrop.dev',
        boardId: 'board_mean_weasel_bugdrop_board_production_dogfood',
        tokenShape: '7.9',
        preflight: { status: 204, allowOrigin: 'https://bugdrop.dev' },
        items: { status: 200, allowOrigin: 'https://bugdrop.dev' },
        events: { status: 200, allowOrigin: 'https://bugdrop.dev' },
        disallowed: {
          origin: 'https://evil.example',
          preflight: { status: 204, allowOrigin: null },
          items: { status: 200, allowOrigin: null },
          events: { status: 200, allowOrigin: null },
        },
      },
    });

    expect(fetchImpl.mock.calls[3]).toEqual([
      new URL(
        'https://board.bugdrop.dev/boards/board_mean_weasel_bugdrop_board_production_dogfood/items'
      ),
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://bugdrop.dev',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization',
        },
      },
    ]);
    expect(fetchImpl.mock.calls[4][1]).toMatchObject({
      headers: {
        Authorization: 'Bearer payload.signature',
        Origin: 'https://bugdrop.dev',
      },
    });
    expect(fetchImpl.mock.calls[6]).toEqual([
      new URL(
        'https://board.bugdrop.dev/boards/board_mean_weasel_bugdrop_board_production_dogfood/items'
      ),
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://evil.example',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization',
        },
      },
    ]);
  });

  it('fails browser CORS smoke when an API response omits the allow-origin header', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ status: 'ok', environment: 'production' }))
      .mockResolvedValueOnce(new Response('', { headers: { 'content-type': 'text/javascript' } }))
      .mockResolvedValueOnce(jsonResponse({ token: 'payload.signature' }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 204,
          headers: corsHeaders('https://bugdrop.dev'),
        })
      )
      .mockResolvedValueOnce(jsonResponse({ items: [] }));

    await expect(
      runSmoke(
        {
          url: 'https://board.bugdrop.dev',
          corsOrigin: 'https://bugdrop.dev',
          corsBoardId: 'board_mean_weasel_bugdrop_board_production_dogfood',
          corsTokenEndpoint: 'https://bugdrop.dev/api/bugdrop-board-token?viewer=a',
        },
        fetchImpl
      )
    ).rejects.toThrow(
      'https://board.bugdrop.dev/boards/board_mean_weasel_bugdrop_board_production_dogfood/items returned Access-Control-Allow-Origin <missing>, expected https://bugdrop.dev'
    );
  });

  it('fails disallowed-origin CORS smoke when wildcard CORS is exposed', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ status: 'ok', environment: 'production' }))
      .mockResolvedValueOnce(new Response('', { headers: { 'content-type': 'text/javascript' } }))
      .mockResolvedValueOnce(jsonResponse({ token: 'payload.signature' }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 204,
          headers: corsHeaders('https://bugdrop.dev'),
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({ items: [] }, { headers: corsHeaders('https://bugdrop.dev') })
      )
      .mockResolvedValueOnce(
        jsonResponse({ cursor: 0, events: [] }, { headers: corsHeaders('https://bugdrop.dev') })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204, headers: corsHeaders('*') }));

    await expect(
      runSmoke(
        {
          url: 'https://board.bugdrop.dev',
          corsOrigin: 'https://bugdrop.dev',
          corsDisallowedOrigin: 'https://evil.example',
          corsBoardId: 'board_mean_weasel_bugdrop_board_production_dogfood',
          corsTokenEndpoint: 'https://bugdrop.dev/api/bugdrop-board-token?viewer=a',
        },
        fetchImpl
      )
    ).rejects.toThrow(
      'https://board.bugdrop.dev/boards/board_mean_weasel_bugdrop_board_production_dogfood/items returned Access-Control-Allow-Origin *, expected no CORS access for https://evil.example'
    );
  });

  it('parses browser CORS smoke options', () => {
    expect(
      parseArgs([
        '--url',
        'https://board.bugdrop.dev',
        '--cors-origin',
        'https://bugdrop.dev',
        '--cors-disallowed-origin',
        'https://evil.example',
        '--cors-board-id',
        'board_mean_weasel_bugdrop_board_production_dogfood',
        '--cors-token-endpoint',
        'https://bugdrop.dev/api/bugdrop-board-token?viewer=a',
      ])
    ).toMatchObject({
      corsOrigin: 'https://bugdrop.dev',
      corsDisallowedOrigin: 'https://evil.example',
      corsBoardId: 'board_mean_weasel_bugdrop_board_production_dogfood',
      corsTokenEndpoint: 'https://bugdrop.dev/api/bugdrop-board-token?viewer=a',
    });
  });
});

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(body), { ...init, headers });
}

function corsHeaders(origin: string) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'Authorization, Content-Type',
  };
}
