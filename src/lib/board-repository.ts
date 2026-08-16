import type { BoardItem, BoardStatus } from '../types';
import { createId } from './ids';

interface BoardRow {
  id: string;
  repo_owner: string;
  repo_name: string;
  name: string;
}

interface ItemRow {
  id: string;
  board_id: string;
  title: string;
  description: string;
  status: BoardStatus;
  github_issue_number: number | null;
  github_issue_url: string | null;
  upvote_count: number;
  created_by_external_user_id: string;
  created_by_display_name: string | null;
  created_at: string;
  updated_at: string;
}

interface ViewerItemRow extends ItemRow {
  viewer_has_upvoted: number;
}

interface EventRow {
  id: number;
  board_id: string;
  event_type: string;
  item_id: string | null;
  payload_json: string;
  created_at: string;
}

interface Board {
  id: string;
  repoOwner: string;
  repoName: string;
  name: string;
}

interface BoardEvent {
  id: number;
  boardId: string;
  eventType: string;
  itemId: string | null;
  payload: unknown;
  createdAt: string;
}

interface ViewerItem extends BoardItem {
  viewerHasUpvoted: boolean;
}

export class BoardRepository {
  constructor(private readonly db: D1Database) {}

  async upsertBoard(input: {
    id?: string;
    repoOwner: string;
    repoName: string;
    name?: string;
  }): Promise<Board> {
    const id =
      input.id ?? `board_${input.repoOwner}_${input.repoName}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const name = input.name ?? `${input.repoOwner}/${input.repoName}`;
    const existing = await this.getBoard(id);
    if (
      existing &&
      (existing.repoOwner !== input.repoOwner || existing.repoName !== input.repoName)
    ) {
      throw new Error('Board id is already assigned to another repository');
    }

    await this.db
      .prepare(
        `INSERT INTO boards (id, repo_owner, repo_name, name)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = CASE
             WHEN boards.repo_owner = excluded.repo_owner AND boards.repo_name = excluded.repo_name
               THEN excluded.name
             ELSE NULL
           END,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
      )
      .bind(id, input.repoOwner, input.repoName, name)
      .run();

    const board = await this.getBoard(id);
    if (!board) {
      throw new Error('Failed to upsert board');
    }
    if (board.repoOwner !== input.repoOwner || board.repoName !== input.repoName) {
      throw new Error('Board id is already assigned to another repository');
    }

    return board;
  }

  async getBoard(boardId: string): Promise<Board | null> {
    const row = await this.db
      .prepare('SELECT id, repo_owner, repo_name, name FROM boards WHERE id = ?')
      .bind(boardId)
      .first<BoardRow>();
    return row ? this.mapBoard(row) : null;
  }

  async createItem(input: {
    id?: string;
    boardId: string;
    title: string;
    description: string;
    externalUserId: string;
    displayName?: string;
    githubIssueNumber?: number;
    githubIssueUrl?: string;
  }): Promise<BoardItem> {
    const id = input.id ?? createId('item');
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO board_items (
            id, board_id, title, description, github_issue_number, github_issue_url,
            created_by_external_user_id, created_by_display_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          input.boardId,
          input.title,
          input.description,
          input.githubIssueNumber ?? null,
          input.githubIssueUrl ?? null,
          input.externalUserId,
          input.displayName ?? null
        ),
      this.db
        .prepare(
          `INSERT INTO board_events (board_id, event_type, item_id, payload_json)
           VALUES (?, 'item_created', ?, ?)`
        )
        .bind(input.boardId, id, JSON.stringify({ itemId: id })),
    ]);

    const item = await this.getItem(input.boardId, id);
    if (!item) {
      throw new Error('Failed to create board item');
    }

    return item;
  }

  async getItem(boardId: string, itemId: string): Promise<BoardItem | null> {
    const row = await this.db
      .prepare('SELECT * FROM board_items WHERE board_id = ? AND id = ?')
      .bind(boardId, itemId)
      .first<ItemRow>();
    return row ? this.mapItem(row) : null;
  }

  async listItems(boardId: string): Promise<BoardItem[]> {
    const result = await this.db
      .prepare('SELECT * FROM board_items WHERE board_id = ? ORDER BY created_at DESC')
      .bind(boardId)
      .all<ItemRow>();
    return result.results.map(row => this.mapItem(row));
  }

  async listItemsForViewer(boardId: string, externalUserId: string): Promise<ViewerItem[]> {
    const result = await this.db
      .prepare(
        `SELECT board_items.*,
                CASE WHEN board_votes.id IS NULL THEN 0 ELSE 1 END AS viewer_has_upvoted
         FROM board_items
         LEFT JOIN board_votes
           ON board_votes.board_id = board_items.board_id
          AND board_votes.item_id = board_items.id
          AND board_votes.external_user_id = ?
         WHERE board_items.board_id = ?
         ORDER BY board_items.created_at DESC`
      )
      .bind(externalUserId, boardId)
      .all<ViewerItemRow>();
    return result.results.map(row => ({
      ...this.mapItem(row),
      viewerHasUpvoted: row.viewer_has_upvoted === 1,
    }));
  }

  async toggleUpvote(boardId: string, itemId: string, externalUserId: string): Promise<ViewerItem> {
    const item = await this.getItem(boardId, itemId);
    if (!item) {
      throw new Error('Board item not found');
    }

    const existing = await this.db
      .prepare(
        'SELECT id FROM board_votes WHERE board_id = ? AND item_id = ? AND external_user_id = ?'
      )
      .bind(boardId, itemId, externalUserId)
      .first<{ id: string }>();

    if (existing) {
      await this.removeUpvote(boardId, itemId, existing.id);
    } else {
      await this.addUpvote(boardId, itemId, externalUserId);
    }

    const updated = await this.getItem(boardId, itemId);
    if (!updated) {
      throw new Error('Board item not found');
    }

    return { ...updated, viewerHasUpvoted: !existing };
  }

  async listEvents(boardId: string, since: number): Promise<BoardEvent[]> {
    const result = await this.db
      .prepare('SELECT * FROM board_events WHERE board_id = ? AND id > ? ORDER BY id ASC LIMIT 100')
      .bind(boardId, since)
      .all<EventRow>();
    return result.results.map(row => ({
      id: row.id,
      boardId: row.board_id,
      eventType: row.event_type,
      itemId: row.item_id,
      payload: publicEventPayload(JSON.parse(row.payload_json) as unknown),
      createdAt: row.created_at,
    }));
  }

  private async addUpvote(boardId: string, itemId: string, externalUserId: string): Promise<void> {
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO board_votes (id, board_id, item_id, external_user_id)
           VALUES (?, ?, ?, ?)`
        )
        .bind(createId('vote'), boardId, itemId, externalUserId),
      this.db
        .prepare(
          `UPDATE board_items
           SET upvote_count = upvote_count + 1,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE board_id = ? AND id = ?`
        )
        .bind(boardId, itemId),
      this.db
        .prepare(
          `INSERT INTO board_events (board_id, event_type, item_id, payload_json)
           VALUES (?, 'upvote_added', ?, ?)`
        )
        .bind(boardId, itemId, JSON.stringify({ itemId })),
    ]);
  }

  private async removeUpvote(boardId: string, itemId: string, voteId: string): Promise<void> {
    await this.db.batch([
      this.db.prepare('DELETE FROM board_votes WHERE id = ?').bind(voteId),
      this.db
        .prepare(
          `UPDATE board_items
           SET upvote_count = MAX(upvote_count - 1, 0),
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE board_id = ? AND id = ?`
        )
        .bind(boardId, itemId),
      this.db
        .prepare(
          `INSERT INTO board_events (board_id, event_type, item_id, payload_json)
           VALUES (?, 'upvote_removed', ?, ?)`
        )
        .bind(boardId, itemId, JSON.stringify({ itemId })),
    ]);
  }

  private mapBoard(row: BoardRow): Board {
    return {
      id: row.id,
      repoOwner: row.repo_owner,
      repoName: row.repo_name,
      name: row.name,
    };
  }

  private mapItem(row: ItemRow): BoardItem {
    return {
      id: row.id,
      boardId: row.board_id,
      title: row.title,
      description: row.description,
      status: row.status,
      githubIssueNumber: row.github_issue_number ?? undefined,
      githubIssueUrl: row.github_issue_url ?? undefined,
      upvoteCount: row.upvote_count,
      createdByExternalUserId: row.created_by_external_user_id,
      createdByDisplayName: row.created_by_display_name ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

function publicEventPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  const { externalUserId: _externalUserId, ...publicPayload } = payload as Record<string, unknown>;
  return publicPayload;
}
