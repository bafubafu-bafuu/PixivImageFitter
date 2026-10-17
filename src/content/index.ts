import { applyFit } from './fit';
import { loadSettings, subscribeEnabled } from '../shared/settings';

let enabled = false;
let watching = false;
let frame = 0;

/** DOM 変化のたびの再計算を requestAnimationFrame でまとめる。 */
function schedule(): void {
  if (frame !== 0) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    applyFit(document, enabled);
  });
}

const observer = new MutationObserver(schedule);

function watch(): void {
  if (watching) return;
  watching = true;
  observer.observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['style'],
  });
  window.addEventListener('resize', schedule);
  schedule();
}

function unwatch(): void {
  if (!watching) return;
  watching = false;
  observer.disconnect();
  window.removeEventListener('resize', schedule);
  if (frame !== 0) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  applyFit(document, false);
}

function setEnabled(next: boolean): void {
  if (next === enabled) return;
  enabled = next;
  if (enabled) watch();
  else unwatch();
}

subscribeEnabled(setEnabled);

void loadSettings().then((settings) => {
  setEnabled(settings.enabled);
}).catch((error: unknown) => {
  // 拡張の更新・無効化後は古いコンテンツスクリプトから設定を読めない。
  // その場合は何も適用せず、ページをそのままにする。
  console.warn('Pixiv Image Fitter:', error instanceof Error ? error.message : error);
});
