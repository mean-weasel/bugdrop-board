export interface Env {
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
  ASSETS: Fetcher;
  DB: D1Database;
  BOARD_TOKEN_SECRET: string;
  BOARD_TOKEN_AUDIENCE?: string;
  BOARD_TOKEN_ISSUER?: string;
  GITHUB_ISSUE_ACCESS_TOKEN?: string;
  REQUEST_THROTTLE_WINDOW_SECONDS?: string;
  ITEM_CREATE_RATE_LIMIT?: string;
  UPVOTE_RATE_LIMIT?: string;
}

export type BoardStatus = 'open' | 'planned' | 'in_progress' | 'shipped' | 'closed';

export interface BoardItem {
  id: string;
  boardId: string;
  title: string;
  description: string;
  status: BoardStatus;
  githubIssueNumber?: number;
  githubIssueUrl?: string;
  upvoteCount: number;
  createdByExternalUserId: string;
  createdByDisplayName?: string;
  createdAt: string;
  updatedAt: string;
}
