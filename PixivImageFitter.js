(function() {
  'use strict';
  const sel = 'img[style*="z-index"], img[data-testid="illust-zoom-viewer-image"], div[role="presentation"] img';
  const fit = () => {
    const images = document.querySelectorAll(sel);
    if (images.length === 0) return;
    const isZoomMode = document.documentElement.style.overflow === 'hidden';
    if (!isZoomMode) {
      images.forEach(img => {
        if (img.dataset.fit) {
          img.style.removeProperty('max-width');
          img.style.removeProperty('max-height');
          img.style.removeProperty('width');
          img.style.removeProperty('height');
          img.style.removeProperty('display');
          img.style.removeProperty('margin');
          img.style.removeProperty('object-fit');
          img.style.removeProperty('position');
          img.style.removeProperty('top');
          img.style.removeProperty('left');
          img.style.removeProperty('right');
          img.style.removeProperty('bottom');
          delete img.dataset.fit;
        }
      });
      return;
    }
    images.forEach(img => {
      if (img.closest('.gtm-medium-work-expanded-view')) {
        return;
      }
      if (img.closest('a')) {
        return;
      }
      img.style.setProperty('max-width', '100vw', 'important');
      img.style.setProperty('max-height', '100vh', 'important');
      img.style.setProperty('width', 'auto', 'important');
      img.style.setProperty('height', 'auto', 'important');
      img.style.setProperty('display', 'block', 'important');
      img.style.setProperty('margin', 'auto', 'important');
      img.style.setProperty('object-fit', 'contain', 'important');
      img.dataset.fit = 1;
    });
    let ov = document.querySelector('[data-testid="illust-zoom-viewer"]');
    if (ov) {
      ov.style.setProperty('overflow', 'auto', 'important');
    }
  };
  function init() {
    chrome.storage.sync.get('enabled', data => {
      if (data.enabled !== false) {
        const observer = new MutationObserver(fit);
        observer.observe(document.body, { childList: true, subtree: true });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
        window.addEventListener('resize', fit);
        fit();
      }
    });
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && 'enabled' in changes) {
      location.reload();
    }
  });
  init();
})();
