/* Hesabi 1.0.67 - Items helpers module.
   This module centralizes safe item/catalog helper functions only.
   Existing item functions keep their legacy names and delegate here when available. */
(function(){
  const MODULE_VERSION = '1.0.67';
  const MODULE_BUILD = 67;

  function normalizeItemKey(value){
    return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function itemCategory(item){
    return String((item && (item.category || item.group || item.type)) || 'عام').trim() || 'عام';
  }

  function itemCodeKeys(item){
    const i = item || {};
    return [i.barcode, i.code, i.sku, i.serial, i.imei, i.sn].filter(v => String(v ?? '').trim());
  }

  function normalizeItemCodeForLookup(code){
    return String(code ?? '').trim().toUpperCase().replace(/\s+/g, '');
  }

  function safeItemById(items, itemId){
    return (items || []).find(item => item && String(item.id) === String(itemId)) || null;
  }

  function itemDuplicateExists(items, candidate){
    const c = candidate || {};
    const name = normalizeItemKey(c.name || '');
    const barcode = normalizeItemKey(c.barcode || c.code || '');
    const excludeId = String(c.excludeId || '');
    return (items || []).some(item => {
      if (!item || item.isDeleted === true) return false;
      if (excludeId && String(item.id) === excludeId) return false;
      const itemBarcode = normalizeItemKey(item.barcode || item.code || '');
      const itemName = normalizeItemKey(item.name || '');
      return (barcode && itemBarcode === barcode) || (name && itemName === name);
    });
  }

  function currentItemDoc(itemId){
    return doc(db, 'shops', state.shopId, 'items', itemId);
  }

  function selectedItemsArray(selection){
    if (selection && typeof selection.forEach === 'function') {
      const rows = [];
      selection.forEach(value => { if (value) rows.push(value); });
      return rows;
    }
    if (selection && typeof selection === 'object') return Object.keys(selection).filter(Boolean);
    return [];
  }

  function clearSelectedItems(selection){
    if (selection && typeof selection.clear === 'function') { selection.clear(); return true; }
    if (selection && typeof selection === 'object') { Object.keys(selection).forEach(key => delete selection[key]); return true; }
    return false;
  }

  function itemCategoryList(items){
    return ['الكل', ...Array.from(new Set((items || []).map(itemCategory).filter(Boolean))).sort((a, b) => a.localeCompare(b))];
  }

  function filteredItemsByCategory(items, category){
    const cat = category || 'الكل';
    const rows = Array.isArray(items) ? items : [];
    return cat === 'الكل' ? rows.slice() : rows.filter(item => itemCategory(item) === cat);
  }

  function itemSearchText(item){
    const i = item || {};
    return [i.name, i.barcode, i.code, i.model, i.brand, itemCategory(i), i.unit, i.stock, i.minStock].map(v => String(v ?? '')).join(' ');
  }

  function itemCashPrice(item){
    const i = item || {};
    const value = Number(i.cashPrice ?? i.price ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  function itemCreditPrice(item){
    const i = item || {};
    const value = Number(i.creditPrice ?? i.cashPrice ?? i.price ?? 0);
    return Number.isFinite(value) ? value : itemCashPrice(i);
  }

  function findItemByCode(items, code){
    const key = normalizeItemCodeForLookup(code);
    if (!key) return null;
    return (items || []).find(item => itemCodeKeys(item).map(normalizeItemCodeForLookup).includes(key)) || null;
  }

  function extractItemNameFromOcrText(text){
    const raw = String(text || '').replace(/\r/g, '\n');
    const lines = raw.split(/\n+/).map(x => x.trim()).filter(Boolean);
    const joined = lines.join(' ');
    const model = (joined.match(/(?:Model|MODEL|الموديل)\s*[:：]?\s*([A-Za-z0-9][A-Za-z0-9._-]{2,})/i) || [])[1] || '';
    const brand = (joined.match(/\b(HUAWEI|SAMSUNG|APPLE|XIAOMI|OPPO|VIVO|TECNO|INFINIX|NOKIA|LENOVO|HP|DELL|LG|SONY)\b/i) || [])[1] || '';
    if (model && brand) return `${brand.toUpperCase()} ${model}`;
    if (model) return model;
    return lines.find(line => {
      const s = line.toUpperCase();
      if (/IMEI|S\/N|SN:|SERIAL|MAC|WIFI|WI-FI|IP:|INPUT|PASSWORD|PASS/.test(s)) return false;
      return /[A-Za-z\u0600-\u06FF]/.test(line) && line.length >= 3 && line.length <= 60;
    }) || '';
  }

  function selfCheck(){
    const api = window.hesabiItemsHelpers || {};
    const required = [
      'normalizeItemKey','itemCategory','itemCodeKeys','normalizeItemCodeForLookup','safeItemById','itemDuplicateExists',
      'currentItemDoc','selectedItemsArray','clearSelectedItems','itemCategoryList','filteredItemsByCategory','itemSearchText',
      'itemCashPrice','itemCreditPrice','findItemByCode','extractItemNameFromOcrText','selfCheck'
    ];
    const missingApi = required.filter(name => typeof api[name] !== 'function');
    const sampleItems = [
      { id: 'a', name: 'زيت طبخ', barcode: '123', category: 'مواد غذائية', cashPrice: 10, creditPrice: 12 },
      { id: 'b', name: 'سكر', code: 'S-1', category: 'مواد غذائية' }
    ];
    const probes = [];
    try { probes.push({ name: 'itemCategory', ok: itemCategory(sampleItems[0]) === 'مواد غذائية' }); } catch (error) { probes.push({ name: 'itemCategory', ok: false, error: String(error && error.message || error) }); }
    try { probes.push({ name: 'duplicateBarcode', ok: itemDuplicateExists(sampleItems, { barcode: '123' }) === true }); } catch (error) { probes.push({ name: 'duplicateBarcode', ok: false, error: String(error && error.message || error) }); }
    try { probes.push({ name: 'findItemByCode', ok: findItemByCode(sampleItems, 's-1') && findItemByCode(sampleItems, 's-1').id === 'b' }); } catch (error) { probes.push({ name: 'findItemByCode', ok: false, error: String(error && error.message || error) }); }
    return { ok: missingApi.length === 0 && probes.every(item => item.ok), version: MODULE_VERSION, build: MODULE_BUILD, missingApi, probes };
  }

  window.hesabiItemsHelpers = Object.assign(window.hesabiItemsHelpers || {}, {
    version: MODULE_VERSION,
    build: MODULE_BUILD,
    normalizeItemKey,
    itemCategory,
    itemCodeKeys,
    normalizeItemCodeForLookup,
    safeItemById,
    itemDuplicateExists,
    currentItemDoc,
    selectedItemsArray,
    clearSelectedItems,
    itemCategoryList,
    filteredItemsByCategory,
    itemSearchText,
    itemCashPrice,
    itemCreditPrice,
    findItemByCode,
    extractItemNameFromOcrText,
    selfCheck
  });

  window.hesabiItemsHelpersSelfCheck = selfCheck;
})();
