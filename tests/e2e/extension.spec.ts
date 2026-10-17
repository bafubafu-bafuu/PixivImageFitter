import { test, expect, type BrowserContext, type Locator } from '@playwright/test';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const EXTENSION_NAME = 'Pixiv Image Fitter';
const PIXEL = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="2000"></svg>')}`;
const FIXTURE_URL = 'https://www.pixiv.net/artworks/123456';
const NATURAL_WIDTH = 4000;

let context: BrowserContext;
let extensionId: string;

function fixture(zoomed: boolean): string {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>Pixiv fixture</title></head>
<body>
  <a id="thumb-link" href="/artworks"><img id="thumb" src="${PIXEL}" style="z-index: 1" alt=""></a>
  <div class="gtm-medium-work-expanded-view"><img id="preview" src="${PIXEL}" style="z-index: 1" alt=""></div>
  <div id="viewer" data-testid="illust-zoom-viewer"><img id="zoom" data-testid="illust-zoom-viewer-image" src="${PIXEL}" style="z-index: 1" alt=""></div>
  <script>document.documentElement.style.overflow = ${JSON.stringify(zoomed ? 'hidden' : '')};</script>
</body></html>`;
}

async function findExtensionId(): Promise<string> {
  const page = await context.newPage();
  try {
    await page.goto('chrome://extensions/');
    const id = await page.evaluate(async (name) => {
      interface ExtensionItem { id: string; name: string }
      interface DeveloperPrivateApi {
        getExtensionsInfo: (options: { includeDisabled: boolean }, callback: (items: ExtensionItem[]) => void) => void;
      }
      const api = (chrome as unknown as { developerPrivate?: DeveloperPrivateApi }).developerPrivate;
      if (!api) return null;
      const items = await new Promise<ExtensionItem[]>((done) => {
        api.getExtensionsInfo({ includeDisabled: true }, done);
      });
      return items.find((item) => item.name === name)?.id ?? null;
    }, EXTENSION_NAME);
    if (id) return id;
  } catch {
    // Fall through to the path-derived identifier below.
  } finally {
    await page.close();
  }
  // Unpacked extensions without a key derive their identifier from the directory path.
  const hash = createHash('sha256').update(resolve('dist')).digest('hex').slice(0, 32);
  return hash.replace(/[0-9a-f]/g, (character) => String.fromCharCode(97 + parseInt(character, 16)));
}

async function setEnabled(value: boolean): Promise<void> {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const toggle = popup.getByRole('switch', { name: '画像を画面に合わせる' });
  await expect(toggle).toBeEnabled();
  if ((await toggle.isChecked()) !== value) await toggle.setChecked(value);
  await expect(toggle).toBeChecked({ checked: value });
  await expect(popup.getByText(value ? '有効です' : '無効です', { exact: false })).toBeVisible();
  await popup.close();
}

function fitPriority(locator: Locator): Promise<string> {
  return locator.evaluate((node) => node.style.getPropertyPriority('max-width'));
}

test.beforeAll(async ({ playwright }, testInfo) => {
  const path = resolve('dist');
  const installedChrome = testInfo.project.name === 'chrome';
  context = await playwright.chromium.launchPersistentContext('', {
    channel: installedChrome ? 'chrome' : 'chromium', headless: true,
    ignoreDefaultArgs: installedChrome ? ['--disable-extensions'] : [],
    args: [
      ...(installedChrome ? ['--enable-unsafe-extension-debugging'] : [`--disable-extensions-except=${path}`, `--load-extension=${path}`]),
      '--no-proxy-server',
    ],
  });
  if (installedChrome) {
    const browser = context.browser();
    if (!browser) throw new Error('Missing persistent browser handle');
    const session = await browser.newBrowserCDPSession();
    await session.send('Extensions.loadUnpacked', { path });
    await session.detach();
  }
  extensionId = await findExtensionId();
});

test.afterAll(async () => {
  await context?.close();
});

test.beforeEach(async () => {
  await setEnabled(true);
});

test('拡大表示の画像がビューポートへフィットされ、拡大を閉じると復元される', async () => {
  const page = await context.newPage();
  await page.route('https://www.pixiv.net/**', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: fixture(true) }));
  await page.goto(FIXTURE_URL);
  const zoom = page.locator('#zoom');
  await expect.poll(() => fitPriority(zoom)).toBe('important');
  await expect.poll(() => zoom.evaluate((node) => node.hasAttribute('data-pif-fit'))).toBe(true);
  // 実寸がビューポート幅に収まり、縦横比が保たれる。
  const geometry = await zoom.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { width: rect.width, height: rect.height, viewport: window.innerWidth };
  });
  expect(Math.round(geometry.width)).toBe(geometry.viewport);
  expect(geometry.height / geometry.width).toBeCloseTo(0.5, 2);
  expect(await zoom.evaluate((node) => getComputedStyle(node).objectFit)).toBe('contain');
  const viewer = page.locator('#viewer');
  await expect.poll(() => viewer.evaluate((node) => node.style.getPropertyPriority('overflow'))).toBe('important');
  // リンク内のサムネイルと作品プレビューには触れない。
  expect(await page.locator('#thumb').getAttribute('data-pif-fit')).toBeNull();
  expect(Math.round(await page.locator('#thumb').evaluate((node) => node.getBoundingClientRect().width))).toBe(NATURAL_WIDTH);
  expect(await page.locator('#preview').getAttribute('data-pif-fit')).toBeNull();
  // 拡大を閉じると、付与したスタイルだけが消えて元の実寸に戻る。
  await page.evaluate(() => { document.documentElement.style.overflow = ''; });
  await expect.poll(() => zoom.getAttribute('data-pif-fit')).toBeNull();
  await expect.poll(() => zoom.evaluate((node) => Math.round(node.getBoundingClientRect().width))).toBe(NATURAL_WIDTH);
  expect(await zoom.evaluate((node) => node.style.getPropertyValue('max-width'))).toBe('');
  await page.close();
});

test('ポップアップのスイッチが開いているタブへ即時反映され、設定が保存される', async () => {
  const page = await context.newPage();
  await page.route('https://www.pixiv.net/**', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: fixture(true) }));
  await page.goto(FIXTURE_URL);
  const zoom = page.locator('#zoom');
  await expect.poll(() => fitPriority(zoom)).toBe('important');
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  // ヘッダーのアイコンが配布物から読み込める。
  const brandIcon = popup.locator('.brand-icon');
  await expect(brandIcon).toHaveAttribute('src', `chrome-extension://${extensionId}/mdi_resize.png`);
  await expect.poll(() => brandIcon.evaluate((node) => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0)).toBe(true);
  await expect(popup.locator('.footer')).toContainText('Chrome Sync');
  const toggle = popup.getByRole('switch', { name: '画像を画面に合わせる' });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect(popup.getByText('無効です', { exact: false })).toBeVisible();
  await page.bringToFront();
  await expect.poll(() => zoom.getAttribute('data-pif-fit')).toBeNull();
  await expect.poll(() => zoom.evaluate((node) => Math.round(node.getBoundingClientRect().width))).toBe(NATURAL_WIDTH);
  await popup.bringToFront();
  await toggle.check();
  await expect(popup.getByText('有効です', { exact: false })).toBeVisible();
  await page.bringToFront();
  await expect.poll(() => fitPriority(zoom)).toBe('important');
  await expect.poll(() => zoom.evaluate((node) => Math.round(node.getBoundingClientRect().width) === window.innerWidth)).toBe(true);
  // 設定は保存され、開き直しても維持される。
  await popup.bringToFront();
  await popup.reload();
  await expect(toggle).toBeChecked();
  if (test.info().project.name === 'chromium') {
    await popup.setViewportSize({ width: 320, height: 180 });
    await popup.screenshot({ path: 'artifacts/screenshots/popup.png' });
  }
  await page.close();
  await popup.close();
});

test('無効のまま読み込んだページには適用されない', async () => {
  await setEnabled(false);
  const page = await context.newPage();
  await page.route('https://www.pixiv.net/**', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: fixture(true) }));
  await page.goto(FIXTURE_URL);
  await expect(page).toHaveTitle('Pixiv fixture');
  await page.waitForTimeout(750);
  expect(await page.locator('#zoom').getAttribute('data-pif-fit')).toBeNull();
  expect(await page.locator('#zoom').evaluate((node) => node.style.getPropertyValue('max-width'))).toBe('');
  expect(Math.round(await page.locator('#zoom').evaluate((node) => node.getBoundingClientRect().width))).toBe(NATURAL_WIDTH);
  await page.close();
});

test('拡大表示でないページには何も適用しない', async () => {
  const page = await context.newPage();
  await page.route('https://www.pixiv.net/**', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: fixture(false) }));
  await page.goto(FIXTURE_URL);
  await expect(page).toHaveTitle('Pixiv fixture');
  await page.waitForTimeout(750);
  expect(await page.locator('#zoom').getAttribute('data-pif-fit')).toBeNull();
  expect(await page.locator('#zoom').evaluate((node) => node.style.getPropertyValue('max-width'))).toBe('');
  expect(Math.round(await page.locator('#zoom').evaluate((node) => node.getBoundingClientRect().width))).toBe(NATURAL_WIDTH);
  await page.close();
});
