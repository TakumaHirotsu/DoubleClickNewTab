// 設定ページのロジック
// chrome.storage.sync から設定を読み込み、変更があれば保存する

document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');

  // 保存完了メッセージを一時表示するヘルパー
  function showSaved() {
    statusEl.textContent = '設定を保存しました';
    setTimeout(() => { statusEl.textContent = ''; }, 1500);
  }

  // --- 前面 / バックグラウンド設定 ---
  chrome.storage.sync.get(['openInBackground'], (result) => {
    const isBackground = result.openInBackground === true;
    document.getElementById(isBackground ? 'modeBackground' : 'modeForeground').checked = true;
  });

  document.querySelectorAll('input[name="tabMode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      chrome.storage.sync.set({ openInBackground: radio.value === 'background' }, showSaved);
    });
  });

  // --- 開く場所設定 ---
  // openNextToCurrent のデフォルトは true（現在のタブの右隣）
  chrome.storage.sync.get(['openNextToCurrent'], (result) => {
    const isNext = result.openNextToCurrent !== false;
    document.getElementById(isNext ? 'positionNext' : 'positionEnd').checked = true;
  });

  document.querySelectorAll('input[name="tabPosition"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      chrome.storage.sync.set({ openNextToCurrent: radio.value === 'next' }, showSaved);
    });
  });
});
