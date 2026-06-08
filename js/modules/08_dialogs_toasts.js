/* Hesabi 1.0.64 - Safe dialogs and toasts module.
   This module centralizes app messages and dialogs through window.hesabiDialogsToasts.
   Legacy functions in older modules keep their names and delegate here for compatibility. */
(function(){
  const MODULE_VERSION = '1.0.64';

  function byId(id){
    try { return document.getElementById(id); } catch (_) { return null; }
  }

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>\"]/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[ch]));
  }

  function normalizeType(type, text){
    const t = String(type || 'notice');
    const body = String(text || '');
    if (t === 'error' || /خطأ|فشل|تعذر|Missing|Firebase|Uncaught|Error|ReferenceError/i.test(body)) return 'error';
    if (t === 'success') return 'success';
    if (t === 'warn' || t === 'warning') return 'warn';
    return 'notice';
  }

  function hideAppDialog(){
    try { byId('hesabiDialogBackdrop')?.classList.add('hidden'); } catch (_) {}
  }

  function showAppDialog(title, body, type='notice', buttons){
    const safeType = normalizeType(type, body || title);
    const back = byId('hesabiDialogBackdrop');
    const ttl = byId('hesabiDialogTitle');
    const icon = byId('hesabiDialogIcon');
    const bdy = byId('hesabiDialogBody');
    const acts = byId('hesabiDialogActions');

    if (!back || !ttl || !bdy || !acts) {
      const box = byId('msg');
      if (box) box.innerHTML = `<div class="notice ${escapeHtml(safeType)}">${escapeHtml(body || title || '')}</div>`;
      return;
    }

    const kind = safeType === 'error' ? 'dialog-error' : (safeType === 'success' ? 'dialog-success' : (safeType === 'warn' ? 'dialog-warn' : ''));
    back.className = 'hesabi-dialog-backdrop ' + kind;
    ttl.textContent = title || 'تنبيه';
    bdy.textContent = body || '';
    if (icon) icon.textContent = safeType === 'error' ? '⚠️' : (safeType === 'success' ? '✅' : (safeType === 'warn' ? '🧹' : 'ℹ️'));

    const list = Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'موافق', cls: safeType === 'error' ? 'danger' : 'ok', fn: hideAppDialog }];
    acts.className = 'hesabi-dialog-actions ' + (list.length === 1 ? 'one' : (list.length === 3 ? 'three' : ''));
    acts.innerHTML = list.map((item, index) => `<button type="button" class="btn ${escapeHtml(item && item.cls || 'secondary')}" data-dialog-action="${index}">${escapeHtml(item && item.text || 'موافق')}</button>`).join('');
    acts.querySelectorAll('[data-dialog-action]').forEach(btn => {
      btn.onclick = () => {
        const item = list[Number(btn.dataset.dialogAction)] || {};
        try {
          if (item.close !== false) hideAppDialog();
          if (typeof item.fn === 'function') item.fn();
        } catch (error) {
          console.warn('dialog action failed', error);
        }
      };
    });
  }

  function msg(text, type='notice'){
    const safeType = normalizeType(type, text);
    const title = safeType === 'error' ? 'تنبيه مهم' : (safeType === 'success' ? 'تم بنجاح' : 'تنبيه');
    showAppDialog(title, String(text || ''), safeType);
  }

  function safeMsg(text, type='notice'){
    try { msg(text, type); }
    catch (error) {
      try { console.warn('safeMsg fallback:', error, text); } catch (_) {}
      const box = byId('msg');
      if (box) box.textContent = String(text || '');
    }
  }

  function confirmDialog(title, body, okText='موافق'){
    return new Promise(resolve => {
      showAppDialog(title, body, 'warn', [
        { text: okText, cls: 'ok', fn: () => resolve(true) },
        { text: 'إلغاء', cls: 'light', fn: () => resolve(false) }
      ]);
    });
  }

  window.hesabiDialogsToasts = Object.assign(window.hesabiDialogsToasts || {}, {
    version: MODULE_VERSION,
    hideAppDialog,
    closeAppDialog: hideAppDialog,
    showAppDialog,
    msg,
    safeMsg,
    toast: safeMsg,
    confirmDialog
  });

  window.hesabiDialogsToastsSelfCheck = function(){
    const ids = ['hesabiDialogBackdrop','hesabiDialogTitle','hesabiDialogBody','hesabiDialogActions'];
    const missingDom = ids.filter(id => !byId(id));
    const api = window.hesabiDialogsToasts || {};
    const missingApi = ['hideAppDialog','showAppDialog','msg','safeMsg','confirmDialog'].filter(name => typeof api[name] !== 'function');
    return { ok: missingDom.length === 0 && missingApi.length === 0, version: MODULE_VERSION, missingDom, missingApi };
  };
})();
