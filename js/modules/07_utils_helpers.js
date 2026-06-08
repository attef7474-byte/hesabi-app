/* Hesabi 1.0.67 - Safe utilities and helpers module.
   This module centralizes generic formatting, IDs, phone normalization and file helpers.
   Legacy helper names in core modules keep working and delegate here when available. */
(function(){
  const MODULE_VERSION = '1.0.67';

  function normalizeArabicDigits(value){
    const ar = '٠١٢٣٤٥٦٧٨٩';
    const fa = '۰۱۲۳۴۵۶۷۸۹';
    return String(value ?? '')
      .replace(/[٠-٩]/g, d => String(ar.indexOf(d)))
      .replace(/[۰-۹]/g, d => String(fa.indexOf(d)));
  }

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"]/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[ch]));
  }

  function formatMoney(value, currency='ريال'){
    return Number(value || 0).toLocaleString('ar-YE') + (currency ? ' ' + currency : '');
  }

  function todayIso(date){
    const d = date instanceof Date ? date : new Date();
    return d.toISOString().slice(0, 10);
  }

  function makeId(prefix='ID'){
    return String(prefix || 'ID') + '-' + Math.random().toString(36).slice(2, 7).toUpperCase() + Date.now().toString().slice(-4);
  }

  function normalizePhone(value){
    let x = normalizeArabicDigits(value).trim();
    x = x.replace(/[^0-9]/g, '');
    if (x.startsWith('00')) x = x.slice(2);
    if (x.startsWith('967') && x.length >= 12) x = '0' + x.slice(3);
    if (x.startsWith('7') && x.length === 9) x = '0' + x;
    return x;
  }

  function phoneKeyToInternational(phoneKey){
    let x = normalizePhone(phoneKey);
    if (x.startsWith('0')) x = x.slice(1);
    if (x.startsWith('967')) return '+' + x;
    return '+967' + x;
  }

  function toInternationalPhone(value){
    let raw = normalizeArabicDigits(value).trim();
    let x = raw.replace(/[^0-9+]/g, '');
    if (x.startsWith('+')) return x;
    x = x.replace(/[^0-9]/g, '');
    if (x.startsWith('00')) x = x.slice(2);
    if (x.startsWith('967')) return '+' + x;
    if (x.startsWith('0')) x = x.slice(1);
    if (x.startsWith('7') && x.length === 9) return '+967' + x;
    return '+' + x;
  }

  function fileToDataUrl(file, maxBytes=700000){
    return new Promise((resolve, reject) => {
      if (!file) { resolve(null); return; }
      if (file.size > maxBytes) {
        reject(new Error('حجم صورة الإيصال كبير جدًا. اختر صورة أقل من 700KB أو صغّرها قبل الإرسال.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
      reader.onerror = () => reject(new Error('تعذر قراءة صورة الإيصال'));
      reader.readAsDataURL(file);
    });
  }

  function safeNumber(value, fallback=0){
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  window.hesabiUtilsHelpers = Object.assign(window.hesabiUtilsHelpers || {}, {
    version: MODULE_VERSION,
    normalizeArabicDigits,
    escapeHtml,
    formatMoney,
    todayIso,
    makeId,
    normalizePhone,
    phoneKeyToInternational,
    toInternationalPhone,
    fileToDataUrl,
    safeNumber
  });

  window.hesabiUtilsHelpersSelfCheck = function(){
    const api = window.hesabiUtilsHelpers || {};
    const required = ['escapeHtml','formatMoney','todayIso','makeId','normalizePhone','phoneKeyToInternational','toInternationalPhone','fileToDataUrl','safeNumber'];
    const missingApi = required.filter(name => typeof api[name] !== 'function');
    const probes = [];
    try { probes.push({ name: 'escapeHtml', ok: api.escapeHtml('<x>') === '&lt;x&gt;' }); } catch (error) { probes.push({ name: 'escapeHtml', ok: false, error: String(error && error.message || error) }); }
    try { probes.push({ name: 'normalizePhone', ok: api.normalizePhone('٧٧٧١٢٣٤٥٦') === '0777123456' }); } catch (error) { probes.push({ name: 'normalizePhone', ok: false, error: String(error && error.message || error) }); }
    try { probes.push({ name: 'phoneKeyToInternational', ok: api.phoneKeyToInternational('0777123456') === '+967777123456' }); } catch (error) { probes.push({ name: 'phoneKeyToInternational', ok: false, error: String(error && error.message || error) }); }
    return { ok: missingApi.length === 0 && probes.every(item => item.ok), version: MODULE_VERSION, missingApi, probes };
  };
})();
