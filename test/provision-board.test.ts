import { describe, expect, it } from 'vitest';
import { boardFromRepo, buildUpsertSql, parseArgs } from '../scripts/provision-board-core.js';

describe('provision-board script helpers', () => {
  it('derives the stable board id from owner and repo', () => {
    expect(boardFromRepo('mean-weasel/demo.app', 'Demo Board')).toEqual({
      id: 'board_mean_weasel_demo_app',
      repoOwner: 'mean-weasel',
      repoName: 'demo.app',
      name: 'Demo Board',
    });
  });

  it('defaults board name to owner/repo', () => {
    expect(boardFromRepo('mean-weasel/demo', undefined)).toMatchObject({
      id: 'board_mean_weasel_demo',
      name: 'mean-weasel/demo',
    });
  });

  it('rejects malformed repos', () => {
    expect(() => boardFromRepo('mean-weasel', 'Demo')).toThrow('Expected --repo owner/name');
    expect(() => boardFromRepo('../demo', 'Demo')).toThrow('Expected --repo owner/name');
  });

  it('escapes SQL strings in the upsert command', () => {
    const sql = buildUpsertSql(boardFromRepo('mean-weasel/demo', "Ada's Board"));

    expect(sql).toContain("'Ada''s Board'");
    expect(sql).toContain('ON CONFLICT(repo_owner, repo_name) DO UPDATE');
  });

  describe('parseArgs', () => {
    it('parses local and remote modes', () => {
      expect(parseArgs(['--repo', 'mean-weasel/demo', '--remote'])).toMatchObject({
        repo: 'mean-weasel/demo',
        local: false,
      });
      expect(parseArgs(['--repo', 'mean-weasel/demo', '--local'])).toMatchObject({
        local: true,
      });
    });

    it('parses a wrangler environment', () => {
      expect(
        parseArgs(['--repo', 'mean-weasel/demo', '--remote', '--env', 'staging'])
      ).toMatchObject({
        repo: 'mean-weasel/demo',
        local: false,
        env: 'staging',
      });
    });

    it('rejects invalid wrangler environment names', () => {
      expect(() => parseArgs(['--repo', 'mean-weasel/demo', '--env', '../prod'])).toThrow(
        'Expected --env to contain only letters, numbers, underscores, and hyphens'
      );
    });
  });
});
