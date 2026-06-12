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

  function startUniversalScan(options = {}){
    window.hesabiActiveScanOptions = options;
    if(window.hesabiNativeScanItemBarcodeEmbedded){
      window.hesabiNativeScanItemBarcodeEmbedded();
      return;
    }
    if('BarcodeDetector' in window){
      // Web implementation fallback could go here if needed, but for now we follow requirements.
      // If native not available, and Web supported, we could trigger setupStartQrScan logic but adapted.
    }
    if(typeof msg === 'function') msg('المسح بالكاميرا مدعوم داخل تطبيق Android فقط حاليًا. يمكنك إدخال الكود يدويًا.', 'notice');
  }

  window.hesabiReceiveItemBarcode = function(code, message){
    const c = String(code || '').trim();
    if(!c){ if(message && typeof msg === 'function') msg(message, 'notice'); return; }
    const options = window.hesabiActiveScanOptions || {};

    // Check if it's a shop code
    if(c.startsWith('SHOP-') || (c.includes('joinShop=') && c.includes('SHOP-'))){
      if(typeof extractShopCodeFromText === 'function'){
        const shopId = extractShopCodeFromText(c);
        if(shopId){
          if(options.onShopCode) { options.onShopCode(shopId); return; }
          // Default behavior for shop code: if in setup, fill it.
          const joinInput = document.getElementById('joinShopId');
          if(joinInput){
            joinInput.value = shopId;
            if(typeof setupAddShopSelection === 'function') setupAddShopSelection(shopId, 'من الماسح', true);
            return;
          }
        }
      }
    }

    // Otherwise treat as item barcode
    if(options.onItemCode){
      options.onItemCode(c);
    } else {
      // For trader: if item exists, open for edit
      if(typeof isTrader === 'function' && isTrader() && typeof cache !== 'undefined'){
        const item = findItemByCode(cache.items || [], c);
        if(item){
          if(typeof selectItemForEdit === 'function') { selectItemForEdit(item.id); return; }
          if(typeof state !== 'undefined') { state.editItemId = item.id; state.itemsTab = 'edit'; if(typeof save === 'function') save(); if(typeof renderItems === 'function') renderItems(); return; }
        }
      }

      // Default behavior: search and fill
      const searchInputs = ['itemsListSearch', 'itemsEditListSearch', 'itemsPriceListSearch', 'browsePurchaseSearch', 'purchaseInlineItemInput'];
      let foundInput = null;
      for(const id of searchInputs){
        const el = document.getElementById(id);
        if(el && !el.closest('.hidden')){ foundInput = el; break; }
      }

      if(foundInput){
        foundInput.value = c;
        foundInput.dispatchEvent(new Event('input', { bubbles: true }));
        // For inline purchase, try to find and add
        if(foundInput.id === 'purchaseInlineItemInput'){
          if(typeof itemById === 'function' && typeof cache !== 'undefined'){
            const item = findItemByCode(cache.items || [], c);
            if(item && typeof addItemToPurchaseInvoice === 'function'){
              addItemToPurchaseInvoice(item.id, 1);
              if(typeof renderPurchaseInvoiceOnly === 'function') renderPurchaseInvoiceOnly();
              foundInput.value = '';
              return;
            }
          }
        }
        // Trigger enter/search
        foundInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      } else {
        // Last resort: Add item page barcode field
        const bcInput = document.getElementById('itemBarcode');
        if(bcInput && !bcInput.closest('.hidden')){
          bcInput.value = c;
          bcInput.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
        // If not in add tab, maybe go to add tab if trader
        if(typeof isTrader === 'function' && isTrader() && typeof state !== 'undefined' && state.itemsTab !== 'add'){
          state.itemsTab = 'add';
          if(typeof save === 'function') save();
          if(typeof renderItems === 'function') renderItems();
          setTimeout(() => {
            const bc = document.getElementById('itemBarcode');
            if(bc) { bc.value = c; bc.dispatchEvent(new Event('input', { bubbles: true })); }
          }, 100);
        }
      }
    }
  };

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
    startUniversalScan,
    selfCheck
  });

  window.hesabiItemsHelpersSelfCheck = selfCheck;
})();
