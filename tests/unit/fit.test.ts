import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyFit, fitZoomViewer, isZoomMode, restoreImages,
  FIT_ATTRIBUTE, FIT_STYLES, RESTORED_PROPERTIES,
} from '../../src/content/fit';

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function buildPage({ zoomed = true, viewer = true } = {}): void {
  document.body.innerHTML = `
    <a id="thumb-link" href="/artworks"><img id="thumb" src="${PIXEL}" style="z-index: 1" alt=""></a>
    <div class="gtm-medium-work-expanded-view"><img id="preview" src="${PIXEL}" style="z-index: 1" alt=""></div>
    ${viewer ? `<div id="viewer" data-testid="illust-zoom-viewer"><img id="zoom" data-testid="illust-zoom-viewer-image" src="${PIXEL}" style="z-index: 1" alt=""></div>` : ''}
    <div id="presentation" role="presentation"><img id="plain" src="${PIXEL}" alt=""></div>`;
  document.documentElement.style.overflow = zoomed ? 'hidden' : '';
}

const image = (id: string): HTMLImageElement => document.getElementById(id) as HTMLImageElement;

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
});

describe('fit', () => {
  it('detects zoom mode from the root overflow', () => {
    buildPage({ zoomed: true });
    expect(isZoomMode(document)).toBe(true);
    buildPage({ zoomed: false });
    expect(isZoomMode(document)).toBe(false);
  });

  it('fits viewer images and skips links and work previews', () => {
    buildPage();
    fitZoomViewer(document);
    const zoom = image('zoom');
    expect(zoom.hasAttribute(FIT_ATTRIBUTE)).toBe(true);
    for (const [property, value] of FIT_STYLES) {
      expect(zoom.style.getPropertyValue(property)).toBe(value);
      expect(zoom.style.getPropertyPriority(property)).toBe('important');
    }
    expect(image('plain').hasAttribute(FIT_ATTRIBUTE)).toBe(true);
    expect(image('thumb').hasAttribute(FIT_ATTRIBUTE)).toBe(false);
    expect(image('thumb').style.getPropertyValue('max-width')).toBe('');
    expect(image('preview').hasAttribute(FIT_ATTRIBUTE)).toBe(false);
    expect(image('preview').style.getPropertyValue('max-width')).toBe('');
    const viewer = document.getElementById('viewer');
    expect(viewer?.style.getPropertyValue('overflow')).toBe('auto');
    expect(viewer?.style.getPropertyPriority('overflow')).toBe('important');
  });

  it('does nothing while the page is not zoomed', () => {
    buildPage({ zoomed: false });
    applyFit(document, true);
    expect(image('zoom').hasAttribute(FIT_ATTRIBUTE)).toBe(false);
    expect(image('zoom').style.getPropertyValue('max-width')).toBe('');
  });

  it('overrides page styles that lack priority', () => {
    buildPage();
    const zoom = image('zoom');
    zoom.style.setProperty('max-width', '50%');
    fitZoomViewer(document);
    expect(zoom.style.getPropertyValue('max-width')).toBe('100vw');
    expect(zoom.style.getPropertyPriority('max-width')).toBe('important');
  });

  it('does not rewrite properties that are already correct', () => {
    buildPage();
    fitZoomViewer(document);
    const zoom = image('zoom');
    const before = zoom.getAttribute('style');
    fitZoomViewer(document);
    expect(zoom.getAttribute('style')).toBe(before);
  });

  it('restores injected properties, including leftovers, and the marker', () => {
    buildPage();
    fitZoomViewer(document);
    const zoom = image('zoom');
    zoom.style.setProperty('position', 'fixed', 'important');
    restoreImages(document);
    expect(zoom.hasAttribute(FIT_ATTRIBUTE)).toBe(false);
    for (const property of RESTORED_PROPERTIES) {
      expect(zoom.style.getPropertyValue(property)).toBe('');
    }
    expect(image('plain').hasAttribute(FIT_ATTRIBUTE)).toBe(false);
  });

  it('restores when zoom mode ends or the extension is disabled', () => {
    buildPage();
    applyFit(document, true);
    expect(image('zoom').hasAttribute(FIT_ATTRIBUTE)).toBe(true);
    document.documentElement.style.overflow = '';
    applyFit(document, true);
    expect(image('zoom').hasAttribute(FIT_ATTRIBUTE)).toBe(false);
    expect(image('zoom').style.getPropertyValue('max-width')).toBe('');
    document.documentElement.style.overflow = 'hidden';
    applyFit(document, true);
    expect(image('zoom').hasAttribute(FIT_ATTRIBUTE)).toBe(true);
    applyFit(document, false);
    expect(image('zoom').hasAttribute(FIT_ATTRIBUTE)).toBe(false);
  });

  it('tolerates a missing viewer and empty pages', () => {
    expect(() => applyFit(document, true)).not.toThrow();
    buildPage({ viewer: false });
    expect(() => applyFit(document, true)).not.toThrow();
    expect(image('plain').hasAttribute(FIT_ATTRIBUTE)).toBe(true);
    buildPage();
    document.getElementById('viewer')?.remove();
    expect(() => applyFit(document, true)).not.toThrow();
    expect(image('plain').hasAttribute(FIT_ATTRIBUTE)).toBe(true);
  });
});
