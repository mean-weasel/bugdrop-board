export interface BoardWidgetConfig {
  apiUrl: string;
  boardId: string;
  tokenEndpoint: string;
  accentColor: string;
  pollIntervalMs: number;
}

export interface BoardItemView {
  id: string;
  title: string;
  description: string;
  status: string;
  githubIssueNumber?: number;
  githubIssueUrl?: string;
  upvoteCount: number;
  viewerHasUpvoted?: boolean;
}

export interface BoardState {
  items: BoardItemView[];
  cursor: number;
  loading: boolean;
  error?: string;
}
