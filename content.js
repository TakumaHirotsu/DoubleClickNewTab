// Double Click Link Opener - Patched
(function () {
  'use strict';

  const EXTENSION_ID = 'DoubleClickNewTab';
  const DOUBLE_CLICK_DELAY = 500;
  const SINGLE_CLICK_DELAY = 250;

  if (window[EXTENSION_ID + '_initialized']) return;
  window[EXTENSION_ID + '_initialized'] = true;

  // ★ 安定キー: 要素そのもの
  const clickTime = new WeakMap();     // linkEl -> lastClickTs
  const clickTimer = new WeakMap();    // linkEl -> timeoutId
  const pressedLink = new WeakMap();   // mousedown で掴んだリンク -> true
  let lastDoubleClickAt = 0;

  function log(...args) {
    console.log('[DoubleClickNewTab]', ...args);
  }

  function isValidLink(el) {
    const a = el.closest('a[href]');
    if (!a) return null;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('javascript:') || href === '#' ||
        href.startsWith('mailto:') || href.startsWith('tel:')) return null;
    if (a.target === '_blank' || a.target === '_new') return null;
    return a;
  }

  function normalizeUrl(href, base = window.location.href) {
    try { return new URL(href, base).href; } catch { return null; }
  }

  // 共通: 伝播完全停止
  function kill(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }

  function planSingleNavigate(link) {
    const href = normalizeUrl(link.getAttribute('href'));
    if (!href) return;
    // ★ 待機中ブロック（SPA対策）
    try { window.doubleClickNavBlocker?.blockUrl(href, DOUBLE_CLICK_DELAY + 1000); } catch {}
    const ts = Date.now();
    clickTime.set(link, ts);
    const tid = setTimeout(() => {
      // まだ同じクリックが有効ならシングル確定
      if (clickTime.get(link) === ts) {
        clickTime.delete(link);
        clickTimer.delete(link);
        // ブロックは時間で勝手に外れる
        window.location.href = href;
      }
    }, SINGLE_CLICK_DELAY);
    clickTimer.set(link, tid);
  }

  function cancelSingle(link) {
    const tid = clickTimer.get(link);
    if (tid) {
      clearTimeout(tid);
      clickTimer.delete(link);
    }
    clickTime.delete(link);
  }

  function handleClick(e) {
    try {
      // テキスト選択中・フォームは無視
      const sel = window.getSelection();
      if (sel && sel.toString().trim()) return true;
      if (e.target.closest("input, textarea, select, button, [contenteditable], [role='button']")) return true;

      const link = isValidLink(e.target);
      if (!link) return true;

      const now = Date.now();

      if (e.type === 'dblclick') {
        // ★ ダブクリ最優先: シングルを潰して新タブ
        // ただし、最近ダブルクリック処理が実行された場合は重複を防ぐ
        if (now - lastDoubleClickAt < 300) {
          return false;
        }
        cancelSingle(link);
        const href = normalizeUrl(link.getAttribute('href'));
        if (href) {
          try { window.doubleClickNavBlocker?.blockUrl(href, 1500); } catch {}
          kill(e);
          window.open(href, '_blank', 'noopener,noreferrer');
          lastDoubleClickAt = now;
        }
        return false;
      }

      // click（1発目/2発目両方来る）: まず止める
      kill(e);

      const last = clickTime.get(link);
      if (last && (now - last) < DOUBLE_CLICK_DELAY) {
        // 2発目認定 → ダブクリ処理と同等
        // ただし、最近ダブルクリック処理が実行された場合は重複を防ぐ
        if (now - lastDoubleClickAt < 300) {
          return false;
        }
        cancelSingle(link);
        const href = normalizeUrl(link.getAttribute('href'));
        if (href) {
          try { window.doubleClickNavBlocker?.blockUrl(href, 1500); } catch {}
          window.open(href, '_blank', 'noopener,noreferrer');
          lastDoubleClickAt = now;
        }
        return false;
      }

      // 1発目 → シングル遷移の予約
      planSingleNavigate(link);
      return false;

    } catch (err) {
      log('Error in handler', err);
    }
    return false;
  }

  // 早い段階でリンケージを握る（SPA対策）
  function handleMouseDown(e) {
    const link = isValidLink(e.target);
    if (!link) return;
    pressedLink.set(link, true);
    // ここで止めるとサイト側の mousedown 起点のナビを抑制できる
    kill(e);
  }

  function handlePointerDown(e) {
    const link = isValidLink(e.target);
    if (!link) return;
    pressedLink.set(link, true);
    kill(e);
  }

  // イベント登録（できるだけ早く & 強めに）
  document.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: false });
  document.addEventListener('mousedown', handleMouseDown, { capture: true, passive: false });
  document.addEventListener('click', handleClick, { capture: true, passive: false });
  document.addEventListener('dblclick', handleClick, { capture: true, passive: false });

  // site_specific.js から呼べるように公開
  window.doubleClickLinkOpenerMainHandler = handleClick;

  log('Initialized (patched)');
})();