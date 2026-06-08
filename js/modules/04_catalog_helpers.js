/* Hesabi 1.0.68 - Catalog helpers module.
   This module centralizes safe customer catalog, cart, search and pagination helpers only.
   Existing catalog functions keep their legacy names and delegate here when available. */
(function(){
  const MODULE_VERSION = '1.0.68';
  const MODULE_BUILD = 68;

  function defaultCatalogState(){
    return { q: '', category: 'الكل', availableOnly: true, sort: 'popular', limit: 30, favorites: {}, cart: {} };
  }

  function catalogState(appState, shopId){
    const stateRef = appState || {};
    if (!stateRef.catalog) stateRef.catalog = {};
    const sid = shopId || stateRef.shopId || 'default';
    if (!stateRef.catalog[sid]) stateRef.catalog[sid] = defaultCatalogState();
    if (!stateRef.catalog[sid].favorites) stateRef.catalog[sid].favorites = {};
    if (!stateRef.catalog[sid].cart) stateRef.catalog[sid].cart = {};
    return stateRef.catalog[sid];
  }

  function customerCanSeeItem(item){
    return !!item && item.isActive !== false && item.customerVisible !== false;
  }

  function shopIsOpenNow(shop, date){
    const sh = shop || {};
    if (!sh.workingHoursEnabled) return true;
    const open = String(sh.workingOpenTime || '08:00');
    const close = String(sh.workingCloseTime || '22:00');
    const now = date instanceof Date ? date : new Date();
    const cur = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    if (open === close) return true;
    return open < close ? (cur >= open && cur <= close) : (cur >= open || cur <= close);
  }

  function itemSoldQty(invoices, itemId){
    return (invoices || []).reduce((a, inv) => a + ((inv && (inv.lines || inv.items)) || [])
      .filter(line => line && line.itemId === itemId)
      .reduce((x, line) => x + Number(line.qty || 0), 0), 0);
  }

  function commonCustomerItems(invoices, itemById){
    const counts = {};
    for (const inv of invoices || []) {
      for (const line of ((inv && (inv.lines || inv.items)) || [])) {
        if (line && line.itemId) counts[line.itemId] = (counts[line.itemId] || 0) + Number(line.qty || 1);
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => (typeof itemById === 'function' ? itemById(id) : null))
      .filter(Boolean);
  }

  function visibleCustomerPurchaseItems(items, allowOutOfStock){
    return (items || [])
      .filter(customerCanSeeItem)
      .filter(item => Number(item.stock || 0) > 0 || !!allowOutOfStock);
  }

  function cartLines(options){
    const opts = options || {};
    const cs = opts.catalogState || {};
    const lines = [];
    for (const [itemId, qtyRaw] of Object.entries(cs.cart || {})) {
      const qty = Number(qtyRaw || 0);
      if (qty <= 0) continue;
      const item = typeof opts.itemById === 'function' ? opts.itemById(itemId) : null;
      if (!item || item.isActive === false) continue;
      const stock = Number(item.stock || 0);
      const allowOut = !!opts.allowOutOfStock;
      if (stock <= 0 && !allowOut) continue;
      const safeQty = allowOut ? qty : Math.min(qty, stock);
      if (safeQty !== qty && cs.cart) cs.cart[itemId] = safeQty;
      const price = Number(item.price || item.creditPrice || item.cashPrice || 0);
      lines.push({ itemId, name: item.name, unit: item.unit || 'حبة', price, qty: safeQty, total: price * safeQty });
    }
    return lines;
  }

  function cartTotal(lines){
    const rows = lines || [];
    return {
      lines: rows,
      count: rows.reduce((a, line) => a + Number(line.qty || 0), 0),
      items: rows.length,
      total: rows.reduce((a, line) => a + Number(line.total || 0), 0)
    };
  }

  function safeCartQty(options){
    const opts = options || {};
    const item = opts.item || null;
    if (!item) return { ok: false, qty: 0, reason: 'missing-item' };
    const stock = Number(item.stock || 0);
    const allowOut = !!opts.allowOutOfStock;
    let qty = Math.max(0, Number(opts.qty || 0));
    if (stock <= 0 && !allowOut) return { ok: false, qty: 0, reason: 'out-of-stock' };
    if (qty > stock && !allowOut) return { ok: true, qty: stock, reason: 'limited-by-stock' };
    return { ok: true, qty, reason: 'ok' };
  }

  function filteredCatalogItems(options){
    const opts = options || {};
    const cs = opts.catalogState || {};
    const itemCategory = typeof opts.itemCategory === 'function' ? opts.itemCategory : (item => String((item && item.category) || 'عام'));
    const searchMatch = typeof opts.searchMatch === 'function' ? opts.searchMatch : (() => true);
    const soldQty = typeof opts.itemSoldQty === 'function' ? opts.itemSoldQty : (() => 0);
    let items = (opts.items || []).filter(customerCanSeeItem);
    if (cs.availableOnly) items = items.filter(item => Number(item.stock || 0) > 0);
    if (cs.category && cs.category !== 'الكل' && cs.category !== 'المفضلة' && cs.category !== 'الأكثر طلبًا') items = items.filter(item => itemCategory(item) === cs.category);
    if (cs.category === 'المفضلة') items = items.filter(item => cs.favorites && cs.favorites[item.id]);
    if (cs.category === 'الأكثر طلبًا') items = items.sort((a, b) => soldQty(b.id) - soldQty(a.id));
    if (cs.q) items = items.filter(item => searchMatch(`${item.name} ${itemCategory(item)} ${item.unit || ''} ${item.code || ''} ${item.id}`, cs.q));
    if (cs.sort === 'price_asc') items = items.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    else if (cs.sort === 'price_desc') items = items.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    else if (cs.sort === 'stock_desc') items = items.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    else items = items.sort((a, b) => (soldQty(b.id) - soldQty(a.id)) || String(a.name || '').localeCompare(String(b.name || '')));
    return items;
  }

  function searchScore(item, query, options){
    const opts = options || {};
    const normalize = typeof opts.normalizeSearchText === 'function' ? opts.normalizeSearchText : (value => String(value || '').trim().toLowerCase());
    const itemCategory = typeof opts.itemCategory === 'function' ? opts.itemCategory : (i => String((i && i.category) || 'عام'));
    const nq = normalize(query);
    const name = normalize(item && item.name);
    const cat = normalize(itemCategory(item));
    const unit = normalize(item && item.unit);
    const code = normalize((item && (item.code || item.barcode || item.id)) || '');
    if (name === nq) return 0;
    if (name.startsWith(nq)) return 1;
    if (name.includes(nq)) return 2;
    if (cat.includes(nq)) return 3;
    if (code.includes(nq) || unit.includes(nq)) return 4;
    return 9;
  }

  function catalogSearchMatches(options){
    const opts = options || {};
    const text = String(opts.query || '').trim();
    if (!text) return [];
    const itemCategory = typeof opts.itemCategory === 'function' ? opts.itemCategory : (item => String((item && item.category) || 'عام'));
    const searchMatch = typeof opts.searchMatch === 'function' ? opts.searchMatch : (() => true);
    const limit = Number(opts.limit || 80);
    return (opts.items || [])
      .filter(customerCanSeeItem)
      .filter(item => searchMatch(`${item.name} ${itemCategory(item)} ${item.unit || ''} ${item.code || ''} ${item.id}`, text))
      .sort((a, b) => (searchScore(a, text, opts) - searchScore(b, text, opts)) || ((Number(b.stock || 0) > 0) - (Number(a.stock || 0) > 0)) || String(a.name || '').localeCompare(String(b.name || '')))
      .slice(0, limit);
  }

  function purchaseInlineMatches(options){
    const opts = options || {};
    const text = String(opts.query || '').trim();
    if (!text) return [];
    const normalize = typeof opts.normalizeSearchText === 'function' ? opts.normalizeSearchText : (value => String(value || '').trim().toLowerCase());
    const itemCategory = typeof opts.itemCategory === 'function' ? opts.itemCategory : (item => String((item && item.category) || 'عام'));
    const searchMatch = typeof opts.searchMatch === 'function' ? opts.searchMatch : (() => true);
    const nq = normalize(text);
    const score = item => {
      const name = normalize((item && item.name) || '');
      const code = normalize((item && (item.code || item.barcode || item.id)) || '');
      const cat = normalize(itemCategory(item));
      if (name === nq) return 0;
      if (name.startsWith(nq)) return 1;
      if (name.includes(nq)) return 2;
      if (code.includes(nq)) return 3;
      if (cat.includes(nq)) return 4;
      return 9;
    };
    return (opts.items || [])
      .filter(item => searchMatch(`${item.name || ''} ${item.barcode || ''} ${item.code || ''} ${itemCategory(item)} ${item.unit || ''}`, text))
      .sort((a, b) => (score(a) - score(b)) || String(a.name || '').localeCompare(String(b.name || ''), 'ar'))
      .slice(0, Number(opts.limit || 8));
  }

  function sortCustomerPurchaseItems(items, sort, options){
    const opts = options || {};
    const effectiveItemPrice = typeof opts.effectiveItemPrice === 'function' ? opts.effectiveItemPrice : (item => Number((item && item.price) || 0));
    const soldQty = typeof opts.itemSoldQty === 'function' ? opts.itemSoldQty : (() => 0);
    const rows = (items || []).slice();
    if (sort === 'price_asc') return rows.sort((a, b) => Number(effectiveItemPrice(a, 'credit') || 0) - Number(effectiveItemPrice(b, 'credit') || 0));
    if (sort === 'price_desc') return rows.sort((a, b) => Number(effectiveItemPrice(b, 'credit') || 0) - Number(effectiveItemPrice(a, 'credit') || 0));
    if (sort === 'stock_desc') return rows.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    return rows.sort((a, b) => (soldQty(b.id) - soldQty(a.id)) || String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
  }

  function paginateItems(items, page, pageSize){
    const rows = Array.isArray(items) ? items : [];
    const size = Math.max(1, Number(pageSize || 10));
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / size));
    const current = Math.min(Math.max(1, Number(page || 1)), pages);
    const start = (current - 1) * size;
    return { all: rows, visible: rows.slice(start, start + size), total, pages, page: current, pageSize: size, start };
  }

  function customerPurchaseRows(options){
    const opts = options || {};
    const cs = opts.catalogState || {};
    const itemCategory = typeof opts.itemCategory === 'function' ? opts.itemCategory : (item => String((item && item.category) || 'عام'));
    const searchMatch = typeof opts.searchMatch === 'function' ? opts.searchMatch : (() => true);
    let data = (opts.items || []).slice();
    if (cs.category && cs.category !== 'الكل') data = data.filter(item => String(itemCategory(item) || 'عام') === String(cs.category));
    const q = String(cs.q || '').trim();
    if (q) data = data.filter(item => searchMatch(`${item.name || ''} ${item.barcode || ''} ${item.code || ''} ${itemCategory(item)} ${item.unit || ''}`, q));
    data = sortCustomerPurchaseItems(data, cs.sort, opts);
    const meta = paginateItems(data, cs.page, opts.pageSize || 10);
    cs.page = meta.page;
    return meta;
  }

  function selfCheck(){
    const api = window.hesabiCatalogHelpers || {};
    const required = [
      'defaultCatalogState','catalogState','customerCanSeeItem','shopIsOpenNow','itemSoldQty','commonCustomerItems',
      'visibleCustomerPurchaseItems','cartLines','cartTotal','safeCartQty','filteredCatalogItems','searchScore',
      'catalogSearchMatches','purchaseInlineMatches','sortCustomerPurchaseItems','paginateItems','customerPurchaseRows','selfCheck'
    ];
    const missingApi = required.filter(name => typeof api[name] !== 'function');
    const sampleItems = [
      { id: '1', name: 'سكر أبيض', category: 'مواد', stock: 5, price: 10 },
      { id: '2', name: 'زيت', category: 'مواد', stock: 0, price: 20 }
    ];
    const probes = [];
    try { probes.push({ name: 'visibleCustomerPurchaseItems', ok: visibleCustomerPurchaseItems(sampleItems, false).length === 1 }); } catch (error) { probes.push({ name: 'visibleCustomerPurchaseItems', ok: false, error: String(error && error.message || error) }); }
    try { probes.push({ name: 'cartTotal', ok: cartTotal([{ qty: 2, total: 20 }]).count === 2 && cartTotal([{ qty: 2, total: 20 }]).total === 20 }); } catch (error) { probes.push({ name: 'cartTotal', ok: false, error: String(error && error.message || error) }); }
    try { probes.push({ name: 'paginateItems', ok: paginateItems(sampleItems, 1, 1).pages === 2 && paginateItems(sampleItems, 1, 1).visible.length === 1 }); } catch (error) { probes.push({ name: 'paginateItems', ok: false, error: String(error && error.message || error) }); }
    return { ok: missingApi.length === 0 && probes.every(item => item.ok), version: MODULE_VERSION, build: MODULE_BUILD, missingApi, probes };
  }

  window.hesabiCatalogHelpers = Object.assign(window.hesabiCatalogHelpers || {}, {
    version: MODULE_VERSION,
    build: MODULE_BUILD,
    defaultCatalogState,
    catalogState,
    customerCanSeeItem,
    shopIsOpenNow,
    itemSoldQty,
    commonCustomerItems,
    visibleCustomerPurchaseItems,
    cartLines,
    cartTotal,
    safeCartQty,
    filteredCatalogItems,
    searchScore,
    catalogSearchMatches,
    purchaseInlineMatches,
    sortCustomerPurchaseItems,
    paginateItems,
    customerPurchaseRows,
    selfCheck
  });

  window.hesabiCatalogHelpersSelfCheck = selfCheck;
})();
