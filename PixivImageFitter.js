(function() {
  'use strict';
  // 拡大画像のimg要素セレクタ
  const sel = 'img[style*="z-index"], img[data-testid="illust-zoom-viewer-image"], div[role="presentation"] img';

  // 画像を画面サイズにフィットさせる関数
  const fit = () => {
    document.querySelectorAll(sel).forEach(img => {
      if (!img.dataset.fit) {
        Object.assign(img.style, {
          maxWidth: '100vw',
          maxHeight: '100vh',
          width: 'auto',
          height: 'auto',
          display: 'block',
          margin: 'auto'
        });
        img.dataset.fit = 1;
      }
    });
    let ov = document.querySelector('[data-testid="illust-zoom-viewer"], [class*="modal"], [class*="Overlay"]');
    if (ov) ov.style.overflow = 'auto';
  };

  // enabled状態を参照して処理を実行
  function init() {
    chrome.storage.sync.get('enabled', data => {
      if (data.enabled !== false) { // デフォルトはON
        new MutationObserver(fit).observe(document.body, {childList:true,subtree:true});
        window.addEventListener('load', fit);
        fit();
      }
    });
  }

  // 設定変更時にページをリロードして状態を反映
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && 'enabled' in changes) {
      location.reload();
    }
  });

  init();
})();
