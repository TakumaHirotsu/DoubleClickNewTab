// DOM Observer for dynamic content handling
(function() {
  'use strict';

  const EXTENSION_ID = 'DoubleClickNewTab';
  
  if (window[EXTENSION_ID + '_observer_initialized']) {
    return;
  }
  window[EXTENSION_ID + '_observer_initialized'] = true;

  let observer = null;
  
  function log(message, ...args) {
    console.log(`[DoubleClickNewTab-Observer] ${message}`, ...args);
  }

  // 動的に追加されたリンクを監視
  function observeDOM() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
      let hasNewLinks = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 新しく追加されたリンクをチェック
              if (node.tagName === 'A' || node.querySelector('a[href]')) {
                hasNewLinks = true;
              }
            }
          });
        }
      });

      if (hasNewLinks) {
        log("New links detected, ensuring handlers are active");
        // 必要に応じて再初期化をトリガー
        window.dispatchEvent(new CustomEvent('doubleclick-reinit'));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    log("DOM observer started");
  }

  // ページが完全に読み込まれてから開始
  function initialize() {
    if (document.body) {
      observeDOM();
    } else {
      setTimeout(initialize, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();