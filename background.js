// Enhanced Background script for Double Click New Tab
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    console.log('Double Click New Tab: Extension installed/updated');
    
    try {
      // 全ての既存タブにコンテンツスクリプトを注入
      const tabs = await chrome.tabs.query({});
      const scriptFiles = ['navigation-blocker.js', 'site-specific.js', 'dom-observer.js', 'content.js'];
      
      for (const tab of tabs) {
        // 特殊URLは除外
        if (tab.url.startsWith('chrome://') || 
            tab.url.startsWith('chrome-extension://') || 
            tab.url.startsWith('moz-extension://') ||
            tab.url.startsWith('edge://') ||
            tab.url.startsWith('about:')) {
          continue;
        }
        
        try {
          // 複数のスクリプトを順番に注入
          for (const file of scriptFiles) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: [file]
            });
            
            // スクリプト間に短い遅延を入れる
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          console.log(`Successfully injected scripts into tab: ${tab.url}`);
          
        } catch (error) {
          console.log(`Could not inject into tab ${tab.id} (${tab.url}):`, error.message);
        }
      }
      
      // 注入完了の通知
      console.log('Double Click New Tab: Script injection completed');
      
    } catch (error) {
      console.error('Error during script injection:', error);
    }
  }
});

// タブ更新時の処理（SPA対応）
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // ナビゲーション完了時に再注入
  if (changeInfo.status === 'complete' && tab.url) {
    // 特殊URLは除外
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') || 
        tab.url.startsWith('moz-extension://') ||
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('about:')) {
      return;
    }

    try {
      // Yahoo等のSPAサイトでは追加の処理
      if (tab.url.includes('yahoo.co.jp') || 
          tab.url.includes('google.com') ||
          tab.url.includes('news.')) {
        
        setTimeout(async () => {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: () => {
                // 再初期化イベントを発火
                if (window.dispatchEvent) {
                  window.dispatchEvent(new CustomEvent('doubleclick-reinit'));
                }
              }
            });
          } catch (e) {
            // エラーは無視（タブが既に閉じられている等）
          }
        }, 1000);
      }
    } catch (error) {
      // エラーログは出力するが処理は継続
      console.log(`Tab update handling error for ${tab.url}:`, error.message);
    }
  }
});