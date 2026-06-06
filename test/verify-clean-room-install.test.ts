import { describe, expect, it } from 'vitest';
import { buildHostHtml, parseArgs } from '../scripts/verify-clean-room-install-core.js';

describe('verify-clean-room-install', () => {
  it('builds the documented inline host page around a local package bundle URL', () => {
    const html = buildHostHtml({
      scriptSrc: '/vendor/bugdrop-board.js',
      apiUrl: '/api',
      tokenEndpoint: '/api/bugdrop-board-token',
      boardId: 'board_mean_weasel_demo',
      pollIntervalMs: 600000,
      color: '#1f883d',
      mountSelector: '#feedback-board',
      configSelector: '#bugdrop-board-config',
      customization: {
        copy: { heading: 'Custom board' },
        density: 'compact',
        layout: 'panel',
        theme: { accent: '#1f883d' },
      },
    });

    expect(html).toContain('<section id="feedback-board"></section>');
    expect(html).toContain('<script type="application/json" id="bugdrop-board-config">');
    expect(html).toContain('src="/vendor/bugdrop-board.js"');
    expect(html).toContain('data-board-id="board_mean_weasel_demo"');
    expect(html).toContain('data-api-url="/api"');
    expect(html).toContain('data-token-endpoint="/api/bugdrop-board-token"');
    expect(html).toContain('data-mount-selector="#feedback-board"');
    expect(html).toContain('data-poll-interval="600000"');
    expect(html).toContain('data-color="#1f883d"');
    expect(html).toContain('data-config-selector="#bugdrop-board-config"');
    expect(html).toContain('"heading":"Custom board"');
  });

  it('parses package install smoke options', () => {
    expect(
      parseArgs([
        '--version',
        '0.1.2',
        '--package',
        '@mean-weasel/bugdrop-board',
        '--retries',
        '2',
        '--retry-delay-ms',
        '10',
        '--keep',
      ])
    ).toMatchObject({
      packageName: '@mean-weasel/bugdrop-board',
      version: '0.1.2',
      retries: 2,
      retryDelayMs: 10,
      keep: true,
    });
  });
});
