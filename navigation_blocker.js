// Navigation Blocker - より積極的な遷移防止
(function() {
  'use strict';

  const EXTENSION_ID = 'DoubleClickNewTab';
  
  if (window[EXTENSION_ID + '_nav_blocker_initialized']) {
    return;
  }
  window[EXTENSION_ID + '_nav_blocker_initialized'] = true;

  function log(message, ...args) {
    console.log(`[DoubleClickNewTab-NavBlocker] ${message}`, ...args);
  }

  // ブロック対象URLの管理
  let blockedUrls = new Set();
  let originalMethods = {};

  // URLブロック管理の公開API
  window.doubleClickNavBlocker = {
    blockUrl: function(url, duration = 3000) {
      blockedUrls.add(url);
      log("Added to block list:", url);
      
      setTimeout(() => {
        blockedUrls.delete(url);
        log("Removed from block list:", url);
      }, duration);
    },
    
    isBlocked: function(url) {
      return blockedUrls.has(url);
    },
    
    clearAll: function() {
      blockedUrls.clear();
      log("Cleared all blocked URLs");
    }
  };

  // History API のオーバーライド
  function overrideHistoryMethods() {
    // pushState のオーバーライド
    originalMethods.pushState = history.pushState;
    history.pushState = function(state, title, url) {
      if (url && blockedUrls.has(new URL(url, window.location.href).href)) {
        log("Blocked pushState to:", url);
        return;
      }
      return originalMethods.pushState.apply(this, arguments);
    };

    // replaceState のオーバーライド
    originalMethods.replaceState = history.replaceState;
    history.replaceState = function(state, title, url) {
      if (url && blockedUrls.has(new URL(url, window.location.href).href)) {
        log("Blocked replaceState to:", url);
        return;
      }
      return originalMethods.replaceState.apply(this, arguments);
    };

    log("History API methods overridden");
  }

  // location のオーバーライド
  function overrideLocationMethods() {
    // location.href のセッター
    const locationDescriptor = Object.getOwnPropertyDescriptor(Location.prototype, 'href') ||
                              Object.getOwnPropertyDescriptor(window.location, 'href');
    
    if (locationDescriptor && locationDescriptor.set) {
      originalMethods.locationHrefSetter = locationDescriptor.set;
      
      Object.defineProperty(window.location, 'href', {
        set: function(value) {
          const fullUrl = new URL(value, window.location.href).href;
          if (blockedUrls.has(fullUrl)) {
            log("Blocked location.href assignment to:", fullUrl);
            return;
          }
          originalMethods.locationHrefSetter.call(this, value);
        },
        get: locationDescriptor.get
      });
    }

    // location.assign のオーバーライド
    originalMethods.locationAssign = window.location.assign;
    window.location.assign = function(url) {
      const fullUrl = new URL(url, window.location.href).href;
      if (blockedUrls.has(fullUrl)) {
        log("Blocked location.assign to:", fullUrl);
        return;
      }
      return originalMethods.locationAssign.call(this, url);
    };

    // location.replace のオーバーライド
    originalMethods.locationReplace = window.location.replace;
    window.location.replace = function(url) {
      const fullUrl = new URL(url, window.location.href).href;
      if (blockedUrls.has(fullUrl)) {
        log("Blocked location.replace to:", fullUrl);
        return;
      }
      return originalMethods.locationReplace.call(this, url);
    };

    log("Location methods overridden");
  }

  // フォーム送信のブロック
  function setupFormBlocking() {
    document.addEventListener('submit', function(e) {
      const form = e.target;
      if (form.tagName === 'FORM') {
        const action = form.action || window.location.href;
        const fullUrl = new URL(action, window.location.href).href;
        
        if (blockedUrls.has(fullUrl)) {
          log("Blocked form submission to:", fullUrl);
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
      }
    }, { capture: true, passive: false });
  }

  // より積極的なイベントブロック
  function setupAggressiveEventBlocking() {
    const blockingEvents = ['beforeunload', 'unload', 'pagehide'];
    
    blockingEvents.forEach(eventType => {
      window.addEventListener(eventType, function(e) {
        if (blockedUrls.size > 0) {
          log(`Blocked ${eventType} event`);
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
      }, { capture: true, passive: false });
    });

    // hashchange のブロック
    window.addEventListener('hashchange', function(e) {
      const newUrl = e.newURL || window.location.href;
      if (blockedUrls.has(newUrl)) {
        log("Blocked hashchange to:", newUrl);
        e.preventDefault();
        e.stopImmediatePropagation();
        // 元のハッシュに戻す
        const oldUrl = e.oldURL || window.location.href;
        const oldHash = new URL(oldUrl).hash;
        if (oldHash !== window.location.hash) {
          window.location.hash = oldHash;
        }
        return false;
      }
    }, { capture: true, passive: false });
  }

  // 初期化
  function initialize() {
    log("Initializing Navigation Blocker");
    overrideHistoryMethods();
    overrideLocationMethods();
    setupFormBlocking();
    setupAggressiveEventBlocking();
    log("Navigation Blocker initialized");
  }

  // 即座に初期化（DOM待ちなし）
  initialize();

})();