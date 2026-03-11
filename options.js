// 設定ページのロジック
// chrome.storage.sync から設定を読み込み、変更があれば保存する

document.addEventListener('DOMContentLoaded', () => {
  const radios = document.querySelectorAll('input[name="tabMode"]');
  const statusEl = document.getElementById('status');

  // 保存済みの設定を読み込んでラジオボタンに反映する
  chrome.storage.sync.get(['openInBackground'], (result) => {
    const isBackground = result.openInBackground === true;
    document.getElementById(isBackground ? 'modeBackground' : 'modeForeground').checked = true;
  });

  // ラジオボタンの変更を検知して即座に保存する
  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      const isBackground = radio.value === 'background';
      chrome.storage.sync.set({ openInBackground: isBackground }, () => {
        // 保存完了を一時的に表示する
        statusEl.textContent = '設定を保存しました';
        setTimeout(() => {
          statusEl.textContent = '';
        }, 1500);
      });
    });
  });
});
