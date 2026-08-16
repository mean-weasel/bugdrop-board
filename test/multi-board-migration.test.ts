import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { boardFromRepo, buildUpsertSql } from '../scripts/provision-board-core.js';

describe('0004 multi-board migration', () => {
  it('preserves every board-dependent row and removes only repository uniqueness', async () => {
    await resetSchema();
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS.slice(0, 3));
    await seedLegacyRows();

    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    await expect(row('boards', 'board_legacy')).resolves.toMatchObject({
      repo_owner: 'mean-weasel',
      repo_name: 'shared-repo',
      name: 'Legacy Board',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    });
    await expect(row('board_items', 'item_legacy')).resolves.toMatchObject({
      board_id: 'board_legacy',
      github_issue_number: 42,
      upvote_count: 1,
    });
    await expect(row('board_votes', 'vote_legacy')).resolves.toMatchObject({
      board_id: 'board_legacy',
      item_id: 'item_legacy',
    });
    await expect(row('hosted_board_configs', 'config_legacy')).resolves.toMatchObject({
      board_id: 'board_legacy',
      github_connection_id: 'connection_legacy',
    });
    await expect(
      env.DB.prepare('SELECT * FROM board_events WHERE id = 19').first()
    ).resolves.toMatchObject({ board_id: 'board_legacy', item_id: 'item_legacy' });
    await expect(
      env.DB.prepare('SELECT * FROM hosted_audit_events WHERE id = 23').first()
    ).resolves.toMatchObject({ board_id: 'board_legacy', event_type: 'legacy_event' });

    await env.DB.prepare(
      buildUpsertSql(boardFromRepo('mean-weasel/shared-repo', 'Second Board', 'board_second'))
    ).run();
    const boards = await env.DB.prepare(
      `SELECT id FROM boards WHERE repo_owner = ? AND repo_name = ? ORDER BY id`
    )
      .bind('mean-weasel', 'shared-repo')
      .all<{ id: string }>();
    expect(boards.results.map(board => board.id)).toEqual(['board_legacy', 'board_second']);

    await expect(
      env.DB.prepare(
        buildUpsertSql(boardFromRepo('mean-weasel/other-repo', 'Retargeted', 'board_legacy'))
      ).run()
    ).rejects.toThrow();
    await expect(row('boards', 'board_legacy')).resolves.toMatchObject({
      repo_owner: 'mean-weasel',
      repo_name: 'shared-repo',
      name: 'Legacy Board',
    });

    const foreignKeyCheck = await env.DB.prepare('PRAGMA foreign_key_check').all();
    expect(foreignKeyCheck.results).toEqual([]);
  });
});

async function resetSchema() {
  const tables = [
    'hosted_audit_events',
    'hosted_board_configs',
    'hosted_github_connections',
    'hosted_app_token_verifiers',
    'hosted_app_origins',
    'hosted_apps',
    'hosted_tenants',
    'board_votes',
    'board_events',
    'board_items',
    'boards',
    'request_throttle_windows',
    'd1_migrations',
  ];
  for (const table of tables) {
    await env.DB.prepare(`DROP TABLE ${table}`).run();
  }
}

async function seedLegacyRows() {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO boards (id, repo_owner, repo_name, name, created_at, updated_at)
       VALUES ('board_legacy', 'mean-weasel', 'shared-repo', 'Legacy Board',
               '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z')`
    ),
    env.DB.prepare(
      `INSERT INTO board_items (
         id, board_id, title, description, status, github_issue_number, github_issue_url,
         upvote_count, created_by_external_user_id, created_by_display_name, created_at, updated_at
       ) VALUES (
         'item_legacy', 'board_legacy', 'Legacy item', 'Preserve me', 'planned', 42,
         'https://github.com/mean-weasel/shared-repo/issues/42', 1, 'legacy_user', 'Ada',
         '2026-01-03T00:00:00.000Z', '2026-01-04T00:00:00.000Z'
       )`
    ),
    env.DB.prepare(
      `INSERT INTO board_votes (id, board_id, item_id, external_user_id, created_at, updated_at)
       VALUES ('vote_legacy', 'board_legacy', 'item_legacy', 'voter',
               '2026-01-05T00:00:00.000Z', '2026-01-06T00:00:00.000Z')`
    ),
    env.DB.prepare(
      `INSERT INTO board_events (id, board_id, event_type, item_id, payload_json, created_at)
       VALUES (19, 'board_legacy', 'item_created', 'item_legacy', '{"itemId":"item_legacy"}',
               '2026-01-07T00:00:00.000Z')`
    ),
    env.DB.prepare(
      `INSERT INTO hosted_tenants (id, name, slug) VALUES ('tenant_legacy', 'Legacy', 'legacy')`
    ),
    env.DB.prepare(
      `INSERT INTO hosted_apps (id, tenant_id, name, slug)
       VALUES ('app_legacy', 'tenant_legacy', 'Legacy App', 'legacy-app')`
    ),
    env.DB.prepare(
      `INSERT INTO hosted_github_connections (
         id, tenant_id, app_id, installation_id, repo_owner, repo_name, status
       ) VALUES (
         'connection_legacy', 'tenant_legacy', 'app_legacy', '123',
         'mean-weasel', 'shared-repo', 'active'
       )`
    ),
    env.DB.prepare(
      `INSERT INTO hosted_board_configs (
         id, tenant_id, app_id, board_id, github_connection_id, status, created_at, updated_at
       ) VALUES (
         'config_legacy', 'tenant_legacy', 'app_legacy', 'board_legacy',
         'connection_legacy', 'active', '2026-01-08T00:00:00.000Z',
         '2026-01-09T00:00:00.000Z'
       )`
    ),
    env.DB.prepare(
      `INSERT INTO hosted_audit_events (
         id, tenant_id, app_id, board_id, actor_type, actor_ref_hash,
         event_type, metadata_json, created_at
       ) VALUES (
         23, 'tenant_legacy', 'app_legacy', 'board_legacy', 'system', 'hash',
         'legacy_event', '{}', '2026-01-10T00:00:00.000Z'
       )`
    ),
  ]);
}

function row(table: string, id: string) {
  return env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
}
