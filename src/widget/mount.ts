interface AppendWidgetHostOptions {
  document: Document;
  script: HTMLScriptElement;
  mountSelector?: string;
}

export function appendWidgetHost(host: HTMLElement, options: AppendWidgetHostOptions): void {
  if (options.mountSelector) {
    const target = options.document.querySelector(options.mountSelector);
    if (!target) {
      throw new Error(
        `BugDrop Board mount target not found for data-mount-selector "${options.mountSelector}"`
      );
    }
    target.append(host);
    return;
  }

  const parent = options.script.parentNode;
  if (!parent || !options.document.body.contains(options.script)) {
    options.document.body.append(host);
    return;
  }

  parent.insertBefore(host, options.script.nextSibling);
}
