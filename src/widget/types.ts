export interface BoardWidgetConfig {
  apiUrl: string;
  boardId: string;
  tokenEndpoint: string;
  customization: BoardWidgetCustomization;
  mountSelector?: string;
  pollIntervalMs: number;
}

export interface BoardWidgetCustomization {
  copy: BoardWidgetCopy;
  density: BoardWidgetDensity;
  layout: BoardWidgetLayout;
  theme: BoardWidgetTheme;
}

export type BoardWidgetDensity = 'compact' | 'comfortable' | 'spacious';

export type BoardWidgetLayout = 'inline' | 'panel' | 'kanban';

export interface BoardWidgetCopy {
  heading: string;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  submitLabel: string;
  submittingLabel: string;
  loadingLabel: string;
  emptyLabel: string;
  errorTitle: string;
  retryLabel: string;
  issuePrefix: string;
  upvoteLabel: string;
  upvotedLabel: string;
}

export interface BoardWidgetTheme {
  accent?: string;
  accentText?: string;
  accentSoft?: string;
  background?: string;
  surface?: string;
  surfaceAlt?: string;
  text?: string;
  muted?: string;
  border?: string;
  danger?: string;
  focus?: string;
  fontFamily?: string;
  fontSize?: string;
  headingSize?: string;
  lineHeight?: string;
  maxWidth?: string;
  radius?: string;
  itemRadius?: string;
  fieldRadius?: string;
  buttonRadius?: string;
  borderWidth?: string;
  gap?: string;
  padding?: string;
  itemPadding?: string;
  fieldPadding?: string;
  buttonPadding?: string;
  shadow?: string;
  itemShadow?: string;
  buttonBackground?: string;
  buttonText?: string;
  buttonBorder?: string;
  upvoteBackground?: string;
  upvoteText?: string;
  upvoteBorder?: string;
  fieldBackground?: string;
  fieldText?: string;
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
  submitting?: boolean;
  error?: string;
}
