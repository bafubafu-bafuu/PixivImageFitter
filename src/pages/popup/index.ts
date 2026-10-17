import { loadSettings, saveEnabled } from '../../shared/settings';
import { el, header, message, notice, root } from '../../shared/ui';

const app = root();
app.append(header('Pixiv Image Fitter'));

const main = el('main');
const row = el('div', 'switch-row');
const label = el('label', '', '画像を画面に合わせる');
label.htmlFor = 'enabled';
const toggle = el('input', 'switch');
toggle.type = 'checkbox';
toggle.id = 'enabled';
toggle.setAttribute('role', 'switch');
toggle.disabled = true;
row.append(label, toggle);
const status = el('p', 'status', '設定を読み込んでいます');
status.setAttribute('aria-live', 'polite');
const error = el('div');
error.hidden = true;
const footer = el('p', 'footer', `v${chrome.runtime.getManifest().version} ・ 設定は Chrome Sync に保存されます`);
main.append(row, status, error, footer);
app.append(main);

function render(value: boolean): void {
  toggle.checked = value;
  status.textContent = value
    ? '有効です。画像の拡大表示を画面に合わせます。'
    : '無効です。画像は元の表示のままです。';
}

toggle.addEventListener('change', () => {
  const next = toggle.checked;
  toggle.disabled = true;
  error.hidden = true;
  void saveEnabled(next).then(() => {
    render(next);
  }).catch((cause: unknown) => {
    toggle.checked = !next;
    notice(error, `保存できませんでした: ${message(cause)}`);
  }).finally(() => {
    toggle.disabled = false;
  });
});

async function load(): Promise<void> {
  try {
    render((await loadSettings()).enabled);
    toggle.disabled = false;
  } catch (cause) {
    status.textContent = '設定を読み込めませんでした。';
    notice(error, message(cause));
  }
}
void load();
