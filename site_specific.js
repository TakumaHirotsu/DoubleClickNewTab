// Site-specific handling for problematic websites
(function() {
  'use strict';

  const EXTENSION_ID = 'DoubleClickNewTab';
  
  if (window[EXTENSION_ID + '_site_specific_initialized']) {
    return;
  }
  window[EXTENSION_ID + '_site_specific_initialized'] = true;

  function log(message, ...args) {
    console.log(`[DoubleClickNewTab-SiteSpecific] ${message}`, ...args);
  }

  const currentDomain = window.location.hostname.toLowerCase();
  
  // サイト固有の設定
  const siteConfigs = {
    'yahoo.co.jp': {
      extraSelectors: ['div[data-rapid_p]', '.sw-Card', '.Topics-item'],
      excludeSelectors: ['.sw-VideoCard', '.sw-HeaderDrawer'],
      forceCapture: true,
      delayMs: 50
    },
    'news.yahoo.co.jp': {
      extraSelectors: ['.newsFeed_item', '.topics_item'],
      excludeSelectors: ['.header', '.footer'],
      forceCapture: true,
      delayMs: 30
    },
    'google.com': {
      extraSelectors: ['#search a', '.g a'],
      excludeSelectors: ['#searchform', '.hdtb-mitem'],
      forceCapture: true,
      delayMs: 20
    }
  };

  // 現在のサイトの設定を取得
  function getSiteConfig() {
    for (const domain in siteConfigs) {
      if (currentDomain.includes(domain)) {
        return siteConfigs[domain];
      }
    }
    return null;
  }

  // サイト固有の追加処理
  function applySiteSpecificFixes() {
    const config = getSiteConfig();
    if (!config) return;

    log("Applying site-specific fixes for:", currentDomain);

    // 追加のイベントハンドラーを設定
    if (config.extraSelectors) {
      config.extraSelectors.forEach(selector => {
        try {
          document.addEventListener('click', function(e) {
            const target = e.target.closest(selector);
            if (target) {
              log("Site-specific selector triggered:", selector);
              // メインハンドラーがうまく動かない場合の補完
              setTimeout(() => {
                if (window.doubleClickLinkOpenerMainHandler) {
                  window.doubleClickLinkOpenerMainHandler(e);
                }
              }, config.delayMs || 10);
            }
          }, { capture: config.forceCapture || false, passive: false });
        } catch (error) {
          log("Error setting up site-specific handler:", error);
        }
      });
    }

    // 特定の要素での干渉を防ぐ
    if (config.excludeSelectors) {
      config.excludeSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            element.addEventListener('click', function(e) {
              e.stopImmediatePropagation();
            }, { capture: true, passive: false });
          });
        } catch (error) {
          log("Error setting up exclusion handler:", error);
        }
      });
    }

    // Yahoo特有の問題への対処
    if (currentDomain.includes('yahoo.co.jp')) {
      // Yahoo のSPA遷移を検出
      let yahooPushStateOriginal = history.pushState;
      history.pushState = function() {
        yahooPushStateOriginal.apply(history, arguments);
        setTimeout(() => {
          log("Yahoo SPA navigation detected, reinitializing...");
          window.dispatchEvent(new CustomEvent('doubleclick-reinit'));
        }, 500);
      };

      // Yahoo の特殊なイベント処理を無効化
      document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href]');
        if (link && !link.target) {
          // Yahoo の独自ナビゲーションを一時的に無効化
          const originalRapid = link.getAttribute('data-rapid_p');
          if (originalRapid) {
            link.removeAttribute('data-rapid_p');
            setTimeout(() => {
              link.setAttribute('data-rapid_p', originalRapid);
            }, 1000);
          }
        }
      }, { capture: true, passive: false });
    }
  }

  // 初期化
  function initialize() {
    applySiteSpecificFixes();
    log("Site-specific handling initialized");
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();