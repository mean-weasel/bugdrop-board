import { env as workerEnv } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { buildPreviewProvisioningPlan } from '../scripts/provision-preview.mjs';
import {
  assertPreviewResetProof,
  buildPreviewResetSql,
  parsePreviewResetArgs,
} from '../scripts/reset-preview-board.mjs';
import { PREVIEW_CONTRACT } from '../scripts/validate-preview-config.mjs';

describe('preview CI reset', () => {
  it('requires the exact CI board twice and rejects demo or arbitrary targets', () => {
    expect(
      parsePreviewResetArgs([
        '--board-id',
        PREVIEW_CONTRACT.ciBoardId,
        '--confirm-board',
        PREVIEW_CONTRACT.ciBoardId,
      ])
    ).toEqual({
      dryRun: true,
      boardId: PREVIEW_CONTRACT.ciBoardId,
      confirmBoard: PREVIEW_CONTRACT.ciBoardId,
    });
    for (const boardId of [PREVIEW_CONTRACT.demoBoardId, 'board_other', '', undefined]) {
      expect(() =>
        parsePreviewResetArgs(['--board-id', boardId ?? '', '--confirm-board', boardId ?? ''])
      ).toThrow();
    }
  });

  it('deletes only rows transitively owned by the CI board', async () => {
    await workerEnv.DB.exec(buildPreviewProvisioningPlan('123456').sql);
    await seedBoard(PREVIEW_CONTRACT.demoBoardId, 'demo');
    await seedBoard(PREVIEW_CONTRACT.ciBoardId, 'ci');

    await workerEnv.DB.exec(buildPreviewResetSql(PREVIEW_CONTRACT.ciBoardId));

    await expect(counts(PREVIEW_CONTRACT.demoBoardId)).resolves.toEqual({
      items: 1,
      votes: 1,
      events: 1,
    });
    await expect(counts(PREVIEW_CONTRACT.ciBoardId)).resolves.toEqual({
      items: 0,
      votes: 0,
      events: 0,
    });
  });

  it('rejects reset evidence when demo changed or CI is not empty', () => {
    expect(assertPreviewResetProof(proofRows(2, 2, 0))).toEqual({
      demoUnchanged: true,
      ciEmpty: true,
    });
    expect(() => assertPreviewResetProof(proofRows(2, 1, 0))).toThrow(/changed demo/);
    expect(() => assertPreviewResetProof(proofRows(2, 2, 1))).toThrow(/left CI/);
  });
});

async function seedBoard(boardId: string, suffix: string) {
  const itemId = `item_preview_${suffix}`;
  await workerEnv.DB.prepare(
    `INSERT INTO board_items (
       id, board_id, title, description, created_by_external_user_id, upvote_count
     ) VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(itemId, boardId, 'Item', 'Description', 'preview_ada', 1)
    .run();
  await workerEnv.DB.prepare(
    `INSERT INTO board_votes (id, board_id, item_id, external_user_id)
     VALUES (?, ?, ?, ?)`
  )
    .bind(`vote_preview_${suffix}`, boardId, itemId, 'preview_grace')
    .run();
  await workerEnv.DB.prepare(
    `INSERT INTO board_events (board_id, event_type, item_id, payload_json)
     VALUES (?, ?, ?, ?)`
  )
    .bind(boardId, 'item_created', itemId, '{}')
    .run();
}

async function counts(boardId: string) {
  const row = await workerEnv.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM board_items WHERE board_id = ?) AS items,
       (SELECT COUNT(*) FROM board_votes WHERE board_id = ?) AS votes,
       (SELECT COUNT(*) FROM board_events WHERE board_id = ?) AS events`
  )
    .bind(boardId, boardId, boardId)
    .first();
  return row;
}

function proofRows(demoBefore: number, demoAfter: number, ciAfter: number) {
  return [
    {
      results: [
        countRow('before', PREVIEW_CONTRACT.demoBoardId, demoBefore),
        countRow('before', PREVIEW_CONTRACT.ciBoardId, 2),
      ],
    },
    {
      results: [
        countRow('after', PREVIEW_CONTRACT.demoBoardId, demoAfter),
        countRow('after', PREVIEW_CONTRACT.ciBoardId, ciAfter),
      ],
    },
  ];
}

function countRow(phase: string, boardId: string, count: number) {
  return { phase, board_id: boardId, items: count, votes: count, events: count };
}
