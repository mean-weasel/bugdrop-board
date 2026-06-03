export function injectTheme(root: ShadowRoot, accentColor: string): void {
  const style = document.createElement('style');
  style.textContent = `
    :host { color-scheme: light; }
    .bugdrop-board {
      color: #172026;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      max-width: 760px;
    }
    .bugdrop-board__header h2 {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 12px;
    }
    .bugdrop-board__form {
      display: grid;
      gap: 10px;
      margin-bottom: 16px;
    }
    .bugdrop-board__form label {
      display: grid;
      gap: 5px;
      font-size: 13px;
      font-weight: 600;
    }
    .bugdrop-board__form input,
    .bugdrop-board__form textarea {
      border: 1px solid #d0d7de;
      border-radius: 6px;
      box-sizing: border-box;
      color: #172026;
      font: inherit;
      padding: 8px 10px;
      width: 100%;
    }
    .bugdrop-board__form button,
    .bugdrop-board__upvote {
      background: ${accentColor};
      border: 0;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      min-height: 36px;
      padding: 8px 10px;
    }
    .bugdrop-board__form button:disabled {
      cursor: wait;
      opacity: 0.72;
    }
    .bugdrop-board__list {
      display: grid;
      gap: 10px;
    }
    .bugdrop-board__item {
      align-items: start;
      border: 1px solid #d0d7de;
      border-radius: 8px;
      display: grid;
      gap: 12px;
      grid-template-columns: auto 1fr;
      padding: 12px;
    }
    .bugdrop-board__item h3 {
      font-size: 16px;
      line-height: 1.25;
      margin: 0 0 6px;
    }
    .bugdrop-board__item p {
      font-size: 14px;
      line-height: 1.4;
      margin: 8px 0 0;
    }
    .bugdrop-board__meta {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .bugdrop-board__meta a,
    .bugdrop-board__status {
      color: #57606a;
      font-size: 12px;
    }
    .bugdrop-board__status {
      text-transform: uppercase;
    }
    .bugdrop-board__empty,
    .bugdrop-board__error {
      font-size: 14px;
      margin: 0;
    }
    .bugdrop-board__error {
      color: #b42318;
      margin-bottom: 12px;
    }
  `;
  root.append(style);
}
