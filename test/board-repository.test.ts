import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:workers';
import { BoardRepository } from '../src/lib/board-repository';

describe('BoardRepository', () => {
  let repo: BoardRepository;

  beforeEach(() => {
    repo = new BoardRepository(env.DB);
  });

  it('creates and loads one board per repo', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: 'demo' });
    const duplicate = await repo.upsertBoard({
      repoOwner: 'mean-weasel',
      repoName: 'demo',
      name: 'Demo Board',
    });

    const loaded = await repo.getBoard(board.id);
    expect(duplicate.id).toBe(board.id);
    expect(loaded).toMatchObject({
      id: board.id,
      repoOwner: 'mean-weasel',
      repoName: 'demo',
      name: 'Demo Board',
    });
  });

  it('creates an item and appends an item_created event without GitHub placeholders', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: 'demo' });
    const item = await repo.createItem({
      boardId: board.id,
      title: 'Add keyboard shortcuts',
      description: 'Power users need faster navigation.',
      externalUserId: 'user_1',
      displayName: 'Ada',
    });

    expect(item).toMatchObject({
      title: 'Add keyboard shortcuts',
      upvoteCount: 0,
      githubIssueNumber: undefined,
      githubIssueUrl: undefined,
    });
    const events = await repo.listEvents(board.id, 0);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventType: 'item_created', itemId: item.id });
  });

  it('toggles one upvote per external user', async () => {
    const board = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: 'demo' });
    const item = await repo.createItem({
      boardId: board.id,
      title: 'Add exports',
      description: 'CSV export would help admins.',
      externalUserId: 'user_1',
    });

    const upvoted = await repo.toggleUpvote(board.id, item.id, 'user_2');
    expect(upvoted.upvoteCount).toBe(1);
    expect(upvoted.viewerHasUpvoted).toBe(true);

    const removed = await repo.toggleUpvote(board.id, item.id, 'user_2');
    expect(removed.upvoteCount).toBe(0);
    expect(removed.viewerHasUpvoted).toBe(false);
  });

  it('rejects wrong-board item upvotes without leaking counters', async () => {
    const boardA = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: 'a' });
    const boardB = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: 'b' });
    const item = await repo.createItem({
      boardId: boardA.id,
      title: 'A item',
      description: 'Only board A owns this.',
      externalUserId: 'user_1',
    });

    await expect(repo.toggleUpvote(boardB.id, item.id, 'user_2')).rejects.toThrow(
      'Board item not found'
    );
    await expect(repo.getItem(boardA.id, item.id)).resolves.toMatchObject({ upvoteCount: 0 });
  });

  it('does not leak item events or item lists across boards', async () => {
    const boardA = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: 'a' });
    const boardB = await repo.upsertBoard({ repoOwner: 'mean-weasel', repoName: 'b' });
    await repo.createItem({
      boardId: boardA.id,
      title: 'A item',
      description: 'Only board A should see this.',
      externalUserId: 'user_1',
    });

    expect(await repo.listEvents(boardB.id, 0)).toHaveLength(0);
    expect(await repo.listItems(boardB.id)).toHaveLength(0);
  });
});
