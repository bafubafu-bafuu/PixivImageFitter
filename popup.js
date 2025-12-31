// popup.js
const toggle = document.getElementById('toggle');

// 初期状態を取得して反映
chrome.storage.sync.get('enabled', data => {
  toggle.checked = data.enabled !== false; // デフォルトはON
});

// チェックボックスの変更を保存
toggle.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: toggle.checked });
});
