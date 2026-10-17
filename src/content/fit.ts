/**
 * Pixiv の画像拡大表示に対するスタイル調整。
 * DOM の状態だけを入力に取る処理として分離し、単体試験の対象にする。
 */

/** フィット中の画像に付ける目印。 */
export const FIT_ATTRIBUTE = 'data-pif-fit';
export const TARGET_SELECTOR = 'img[style*="z-index"], img[data-testid="illust-zoom-viewer-image"], div[role="presentation"] img';
export const VIEWER_SELECTOR = '[data-testid="illust-zoom-viewer"]';

/** フィット時に付与するスタイル。順序は適用順。 */
export const FIT_STYLES: ReadonlyArray<readonly [string, string]> = [
  ['max-width', '100vw'],
  ['max-height', '100vh'],
  ['width', 'auto'],
  ['height', 'auto'],
  ['display', 'block'],
  ['margin', 'auto'],
  ['object-fit', 'contain'],
];

/** 復元時に削除するプロパティ。旧バージョンが付けた可能性のあるものも含める。 */
export const RESTORED_PROPERTIES: readonly string[] = [
  ...FIT_STYLES.map(([property]) => property),
  'position', 'top', 'left', 'right', 'bottom',
];

/** 画像拡大中は pixiv がルート要素の overflow を hidden にする。 */
export function isZoomMode(doc: Document): boolean {
  return doc.documentElement.style.overflow === 'hidden';
}

/** 付与済みのプロパティを再設定しないための判定。 */
function needsProperty(style: CSSStyleDeclaration, property: string, value: string): boolean {
  return style.getPropertyValue(property) !== value || style.getPropertyPriority(property) !== 'important';
}

/** 拡大表示中の画像をビューポートに収め、ビューア自体のスクロールを許可する。 */
export function fitZoomViewer(doc: Document): void {
  for (const image of doc.querySelectorAll<HTMLImageElement>(TARGET_SELECTOR)) {
    // サムネイルリンクの中や作品プレビューの画像は対象外。
    if (image.closest('a') || image.closest('.gtm-medium-work-expanded-view')) continue;
    for (const [property, value] of FIT_STYLES) {
      if (needsProperty(image.style, property, value)) image.style.setProperty(property, value, 'important');
    }
    if (!image.hasAttribute(FIT_ATTRIBUTE)) image.setAttribute(FIT_ATTRIBUTE, '');
  }
  const viewer = doc.querySelector(VIEWER_SELECTOR);
  if (viewer instanceof HTMLElement && needsProperty(viewer.style, 'overflow', 'auto')) {
    viewer.style.setProperty('overflow', 'auto', 'important');
  }
}

/** 付与したスタイルを削除し、ページ本来のレイアウトに戻す。 */
export function restoreImages(doc: Document): void {
  for (const image of doc.querySelectorAll<HTMLImageElement>(`[${FIT_ATTRIBUTE}]`)) {
    for (const property of RESTORED_PROPERTIES) {
      if (image.style.getPropertyValue(property) !== '') image.style.removeProperty(property);
    }
    image.removeAttribute(FIT_ATTRIBUTE);
  }
}

/** 有効なら拡大表示中のみ適用し、無効または通常表示では復元する。 */
export function applyFit(doc: Document, enabled: boolean): void {
  if (!enabled || !isZoomMode(doc)) restoreImages(doc);
  else fitZoomViewer(doc);
}
