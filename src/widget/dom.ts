import type { BoardItemView, BoardState } from './types';

interface BoardDomHandlers {
  onCreate(input: { title: string; description: string }): void;
  onUpvote(itemId: string): void;
}

export function renderBoard(
  root: HTMLElement,
  state: BoardState,
  handlers: BoardDomHandlers
): void {
  root.replaceChildren();

  const shell = document.createElement('section');
  shell.className = 'bugdrop-board';

  const header = document.createElement('header');
  header.className = 'bugdrop-board__header';

  const heading = document.createElement('h2');
  heading.textContent = 'Feedback';
  header.append(heading);

  const form = createForm(handlers, state.loading);
  const list = document.createElement('div');
  list.className = 'bugdrop-board__list';

  if (state.items.length === 0 && !state.loading) {
    const empty = document.createElement('p');
    empty.className = 'bugdrop-board__empty';
    empty.textContent = 'No feedback yet.';
    list.append(empty);
  } else {
    state.items.forEach(item => list.append(renderItem(item, handlers)));
  }

  shell.append(header, form);
  if (state.error) {
    const error = document.createElement('p');
    error.className = 'bugdrop-board__error';
    error.setAttribute('role', 'alert');
    error.textContent = state.error;
    shell.append(error);
  }
  shell.append(list);
  root.append(shell);
}

function createForm(handlers: BoardDomHandlers, disabled: boolean): HTMLFormElement {
  const form = document.createElement('form');
  form.className = 'bugdrop-board__form';

  const titleLabel = document.createElement('label');
  const titleText = document.createElement('span');
  titleText.textContent = 'Idea title';
  const titleInput = document.createElement('input');
  titleInput.name = 'title';
  titleInput.maxLength = 120;
  titleInput.required = true;
  titleInput.disabled = disabled;
  titleLabel.append(titleText, titleInput);

  const descriptionLabel = document.createElement('label');
  const descriptionText = document.createElement('span');
  descriptionText.textContent = 'Context';
  const descriptionInput = document.createElement('textarea');
  descriptionInput.name = 'description';
  descriptionInput.maxLength = 4000;
  descriptionInput.rows = 3;
  descriptionInput.disabled = disabled;
  descriptionLabel.append(descriptionText, descriptionInput);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.disabled = disabled;
  submit.textContent = disabled ? 'Working...' : 'Submit';

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

function renderItem(item: BoardItemView, handlers: BoardDomHandlers): HTMLElement {
  const article = document.createElement('article');
  article.className = 'bugdrop-board__item';

  const vote = document.createElement('button');
  vote.type = 'button';
  vote.className = 'bugdrop-board__upvote';
  vote.textContent = `${item.viewerHasUpvoted ? 'Upvoted' : 'Upvote'} ${item.upvoteCount}`;
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
    issue.textContent = `Issue #${item.githubIssueNumber}`;
    meta.append(issue);
  }

  const description = document.createElement('p');
  description.textContent = item.description;

  content.append(title, meta, description);
  article.append(vote, content);
  return article;
}
