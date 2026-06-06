import { DEFAULT_COPY } from './config';
import type { BoardItemView, BoardState, BoardWidgetCopy } from './types';

interface BoardDomHandlers {
  onCreate(input: { title: string; description: string }): void;
  onUpvote(itemId: string): void;
  onRetry(): void;
}

export function renderBoard(
  root: HTMLElement,
  state: BoardState,
  handlers: BoardDomHandlers,
  copy: BoardWidgetCopy = DEFAULT_COPY
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
  list.className = 'bugdrop-board__list';
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
  status.textContent = item.status;
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
