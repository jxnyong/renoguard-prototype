/* Undocumented Loop11 UI adapter. Pilot after provider updates; never call exit-study hooks. */
(() => {
  'use strict';
  const initial = new URL(location.href).searchParams;
  const studies = { a: '112897', b: '112898' };
  const enabled = initial.get('study') === 'quotation' &&
    studies[initial.get('variant')] === initial.get('l11_uid') &&
    initial.get('l11_autocomplete') !== '0';
  let started = false;

  window.RenoGuardLoop11 = {
    approvalRecorded(tile) {
      if (!enabled || started || tile !== 'sabbia') return;
      const eligible = () => {
        const url = new URL(location.href);
        return url.hash === '#approval-receipt/sabbia' &&
          url.searchParams.get('approved_tile') === 'sabbia' &&
          document.querySelector('[data-approved-tile="sabbia"]');
      };
      if (!eligible()) return;
      started = true;
      const note = document.createElement('p');
      note.className = 'help';
      note.setAttribute('role', 'status');
      note.textContent = 'Opening the study questions… If they do not appear, select “Task completed” in the Loop11 toolbar.';
      document.getElementById('content').appendChild(note);
      let attempts = 0;
      let expansionRequested = false;
      const attempt = () => {
        if (!eligible() || !note.isConnected) return;
        let button, showControl;
        try {
          // Loop11 creates this same-origin iframe and a stable, prefixed button ID.
          const toolbar = document.getElementById('loop11-eui-iframe')?.contentDocument;
          button = toolbar?.getElementById('loop11_eui_id_completeTaskButton');
          showControl = toolbar?.getElementById('loop11_eui_id_showButton');
        } catch (_) { /* A provider origin change must fall back to manual completion. */ }
        if (showControl?.getClientRects().length) {
          if (!expansionRequested) {
            expansionRequested = true;
            // The circle uses drag handlers, not click(). Its advertised Alt+X shortcut
            // is handled by Loop11's parent-document keyboard subscription.
            try {
              for (const [type, key, code, keyCode, altKey] of [
                ['keydown', 'Alt', 'AltLeft', 18, true],
                ['keydown', 'x', 'KeyX', 88, true],
                ['keyup', 'x', 'KeyX', 88, true],
                ['keyup', 'Alt', 'AltLeft', 18, false]
              ]) document.dispatchEvent(new window.KeyboardEvent(type, { key, code, keyCode, which: keyCode, altKey, bubbles: true }));
            } catch (_) { /* Keep the manual fallback if synthetic shortcuts are blocked. */ }
          }
          // Let Loop11 animate and render the expanded task before completing it.
        } else if (button && !button.disabled && button.getAttribute('aria-disabled') !== 'true' &&
            button.getClientRects().length && typeof button.click === 'function') {
          // Only one dispatch per app session; never retry a potentially successful submission.
          note.textContent = 'Continue with the questions in Loop11. If this page remains, select “Task completed” in its toolbar.';
          try { button.click(); } catch (_) {
            note.textContent = 'Select “Task completed” in the Loop11 toolbar to continue to feedback.';
          }
          return;
        }
        if (++attempts < 20) window.setTimeout(attempt, 500);
        else note.textContent = 'Select “Task completed” in the Loop11 toolbar to continue to feedback. Expand the toolbar if it is hidden.';
      };
      // Allow receipt rendering and Loop11's URL tracking to run before submission.
      window.setTimeout(attempt, 1200);
    }
  };
})();
