import '../pages/style.css';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className = '', text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function root(): HTMLElement {
  const node = document.getElementById('app');
  if (!node) throw new Error('画面のルートがありません。');
  return node;
}

export function header(title: string): HTMLElement {
  const bar = el('header', 'topbar');
  const icon = el('img', 'brand-icon');
  icon.src = chrome.runtime.getURL('mdi_resize.png');
  icon.alt = '';
  icon.width = 20;
  icon.height = 20;
  bar.append(icon, document.createTextNode(title));
  return bar;
}

export function notice(container: HTMLElement, message: string, kind: 'error' | 'success' = 'error'): void {
  container.replaceChildren();
  container.className = `notice ${kind}`;
  container.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  container.textContent = message;
  container.hidden = false;
}

export function message(error: unknown): string {
  return error instanceof Error ? error.message : '処理できませんでした。';
}
