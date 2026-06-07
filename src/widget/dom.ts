import { DEFAULT_COPY } from './config';
import type { BoardItemView, BoardState, BoardWidgetCopy, BoardWidgetLayout } from './types';

const KANBAN_LANES = [
  { key: 'open', title: 'Open', statuses: new Set(['open']) },
  { key: 'planned', title: 'Planned', statuses: new Set(['planned']) },
  { key: 'building', title: 'Building', statuses: new Set(['in_progress']) },
  { key: 'shipped', title: 'Shipped', statuses: new Set(['shipped', 'closed']) },
];

interface BoardDomHandlers {
  onCreate(input: { title: string; description: string }): void;
  onUpvote(itemId: string): void;
  onRetry(): void;
}

export function renderBoard(
  root: HTMLElement,
  state: BoardState,
  handlers: BoardDomHandlers,
  copy: BoardWidgetCopy = DEFAULT_COPY,
  layout: BoardWidgetLayout = 'inline'
): void {
  root.replaceChildren();

  const shell = document.createElement('section');
  shell.className = 'bugdrop-board';
  shell.setAttribute('aria-busy', String(state.loading || Boolean(state.submitting)));

  const header = document.createElement('header');
  header.className = 'bugdrop-board__header';

  const heading = document.createElement('h2');
  heading.textContent = copy.heading;
  header.append(heading);

  const form = createForm(handlers, Boolean(state.submitting), copy);
  const list = document.createElement('div');
  list.className =
    layout === 'kanban' ? 'bugdrop-board__list bugdrop-board__kanban' : 'bugdrop-board__list';
  list.setAttribute('aria-live', 'polite');

  if (state.loading) {
    const loading = document.createElement('p');
    loading.className = 'bugdrop-board__loading';
    loading.setAttribute('role', 'status');
    loading.textContent = copy.loadingLabel;
    list.append(loading);
  } else if (state.items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'bugdrop-board__empty';
    empty.textContent = copy.emptyLabel;
    list.append(empty);
  } else if (layout === 'kanban') {
    renderKanbanLanes(state.items, handlers, copy).forEach(lane => list.append(lane));
  } else {
    state.items.forEach(item => list.append(renderItem(item, handlers, copy)));
  }

  shell.append(header, form);
  if (state.error) {
    const error = document.createElement('p');
    error.className = 'bugdrop-board__error';
    error.setAttribute('role', 'alert');
    const title = document.createElement('span');
    title.className = 'bugdrop-board__error-title';
    title.textContent = copy.errorTitle;
    const detail = document.createElement('span');
    detail.className = 'bugdrop-board__error-detail';
    detail.textContent = state.error;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'bugdrop-board__retry';
    retry.textContent = copy.retryLabel;
    retry.addEventListener('click', () => handlers.onRetry());
    error.append(title, detail, retry);
    shell.append(error);
  }
  shell.append(list);
  root.append(shell);
}

function createForm(
  handlers: BoardDomHandlers,
  disabled: boolean,
  copy: BoardWidgetCopy
): HTMLFormElement {
  const form = document.createElement('form');
  form.className = 'bugdrop-board__form';

  const titleLabel = document.createElement('label');
  const titleText = document.createElement('span');
  titleText.textContent = copy.titleLabel;
  const titleInput = document.createElement('input');
  titleInput.name = 'title';
  titleInput.maxLength = 120;
  titleInput.placeholder = copy.titlePlaceholder;
  titleInput.required = true;
  titleInput.disabled = disabled;
  titleLabel.append(titleText, titleInput);

  const descriptionLabel = document.createElement('label');
  const descriptionText = document.createElement('span');
  descriptionText.textContent = copy.descriptionLabel;
  const descriptionInput = document.createElement('textarea');
  descriptionInput.name = 'description';
  descriptionInput.maxLength = 4000;
  descriptionInput.placeholder = copy.descriptionPlaceholder;
  descriptionInput.rows = 3;
  descriptionInput.disabled = disabled;
  descriptionLabel.append(descriptionText, descriptionInput);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.disabled = disabled;
  submit.textContent = disabled ? copy.submittingLabel : copy.submitLabel;

  form.append(titleLabel, descriptionLabel, submit);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    handlers.onCreate({
      title: String(data.get('title') ?? ''),
      description: String(data.get('description') ?? ''),
    });
    form.reset();
  });

  return form;
}

function renderKanbanLanes(
  items: BoardItemView[],
  handlers: BoardDomHandlers,
  copy: BoardWidgetCopy
): HTMLElement[] {
  return KANBAN_LANES.map(lane => {
    const laneItems = items.filter(item => statusBelongsInLane(item.status, lane.statuses));
    const section = document.createElement('section');
    section.className = `bugdrop-board__lane bugdrop-board__lane--${lane.key}`;
    section.setAttribute(
      'aria-label',
      `${lane.title} lane, ${laneItems.length} ${laneItems.length === 1 ? 'item' : 'items'}`
    );

    const header = document.createElement('header');
    header.className = 'bugdrop-board__lane-header';
    const title = document.createElement('h3');
    title.className = 'bugdrop-board__lane-title';
    title.textContent = lane.title;
    const count = document.createElement('span');
    count.className = 'bugdrop-board__lane-count';
    count.textContent = String(laneItems.length);
    header.append(title, count);
    section.append(header);

    if (laneItems.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'bugdrop-board__lane-empty';
      empty.textContent = 'No requests';
      section.append(empty);
    } else {
      laneItems.forEach(item => section.append(renderItem(item, handlers, copy)));
    }
    return section;
  });
}

function statusBelongsInLane(status: string, laneStatuses: Set<string>): boolean {
  const normalizedStatus = status.trim().toLowerCase();
  return (
    laneStatuses.has(normalizedStatus) ||
    (!knownStatus(normalizedStatus) && laneStatuses.has('open'))
  );
}

function knownStatus(status: string): boolean {
  return KANBAN_LANES.some(lane => lane.statuses.has(status));
}

function renderItem(
  item: BoardItemView,
  handlers: BoardDomHandlers,
  copy: BoardWidgetCopy
): HTMLElement {
  const article = document.createElement('article');
  article.className = 'bugdrop-board__item';

  const vote = document.createElement('button');
  vote.type = 'button';
  vote.className = 'bugdrop-board__upvote';
  vote.textContent = `${item.viewerHasUpvoted ? copy.upvotedLabel : copy.upvoteLabel} ${
    item.upvoteCount
  }`;
  vote.setAttribute('aria-pressed', String(Boolean(item.viewerHasUpvoted)));
  vote.setAttribute('aria-label', voteLabel(item, copy));
  vote.addEventListener('click', () => handlers.onUpvote(item.id));

  const content = document.createElement('div');
  content.className = 'bugdrop-board__item-content';

  const title = document.createElement('h3');
  title.textContent = item.title;

  const meta = document.createElement('div');
  meta.className = 'bugdrop-board__meta';

  const status = document.createElement('span');
  status.className = 'bugdrop-board__status';
  status.textContent = statusLabel(item.status);
  meta.append(status);

  if (item.githubIssueUrl && item.githubIssueNumber) {
    const issue = document.createElement('a');
    issue.href = item.githubIssueUrl;
    issue.target = '_blank';
    issue.rel = 'noreferrer';
    issue.textContent = `${copy.issuePrefix}${item.githubIssueNumber}`;
    meta.append(issue);
  }

  const description = document.createElement('p');
  description.textContent = item.description;

  content.append(title, meta, description);
  article.append(vote, content);
  return article;
}

function voteLabel(item: BoardItemView, copy: BoardWidgetCopy): string {
  const count = `${item.upvoteCount} ${item.upvoteCount === 1 ? 'upvote' : 'upvotes'}`;
  if (item.viewerHasUpvoted) {
    return `Remove ${copy.upvoteLabel.toLowerCase()} from ${item.title}. ${count}.`;
  }
  return `${copy.upvoteLabel} ${item.title}. ${count}.`;
}

function statusLabel(status: string): string {
  const normalizedStatus = status.trim().toLowerCase();
  if (normalizedStatus === 'in_progress') return 'In progress';
  if (normalizedStatus === 'open') return 'Open';
  if (normalizedStatus === 'planned') return 'Planned';
  if (normalizedStatus === 'shipped') return 'Shipped';
  if (normalizedStatus === 'closed') return 'Closed';
  return status;
}
