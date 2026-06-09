/* Hesabi 1.0.88 - Customer Catalog Bug Fixes.
   Safe catalog diagnostics and non-destructive helpers. No order creation, no Firestore writes. */
(function(){
  "use strict";
  const VERSION = "1.0.88";
  const BUILD_CODE = 88;
  function arr(value){ return Array.isArray(value) ? value : []; }
  function num(value){ const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
  function str(value){ try { return String(value == null ? "" : value); } catch (_) { return ""; } }
  function helper(){ return window.hesabiCatalogHelpers || {}; }
  function catalogContext(){
    const s = window.state || {};
    const c = window.cache || {};
    let catalogState = {};
    try { if(typeof window.catalogState === "function") catalogState = window.catalogState() || {}; } catch (_) {}
    return {
      role: s.role || "",
      shopId: s.shopId || s.activeShopId || "",
      customerId: s.customerId || "",
      itemCount: arr(c.items).length,
      visibleItems: arr(c.items).filter(function(i){ try { return typeof customerCanSeeItem === "function" ? customerCanSeeItem(i) : i && i.isActive !== false; } catch (_) { return i && i.isActive !== false; } }).length,
      cartKeys: catalogState && catalogState.cart ? Object.keys(catalogState.cart).length : 0,
      purchaseMode: catalogState.purchaseMode || "",
      searchText: catalogState.inlineQ || catalogState.query || "",
      hasCatalogHelper: !!window.hesabiCatalogHelpers,
      hasItemsHelper: !!window.hesabiItemsHelpers,
      checkedAt: new Date().toISOString()
    };
  }
  function findInvalidCartLines(){
    let stateObj = {};
    try { if(typeof window.catalogState === "function") stateObj = window.catalogState() || {}; } catch (_) {}
    const cart = stateObj.cart || {};
    const c = window.cache || {};
    const items = arr(c.items);
    const ids = new Set(items.map(function(i){ return str(i.id); }));
    return Object.keys(cart).map(function(id){
      const qty = num(cart[id]);
      const item = items.find(function(i){ return str(i.id) === str(id); }) || null;
      const stock = num(item && item.stock);
      const visible = item ? (function(){ try { return typeof customerCanSeeItem === "function" ? customerCanSeeItem(item) : item.isActive !== false; } catch (_) { return item.isActive !== false; } })() : false;
      const invalidReasons = [];
      if(!ids.has(str(id))) invalidReasons.push("missing-item");
      if(qty <= 0) invalidReasons.push("bad-qty");
      if(item && !visible) invalidReasons.push("hidden-item");
      if(item && stock <= 0 && !(typeof shopPolicyBool === "function" && shopPolicyBool("allowOutOfStockOrders", false))) invalidReasons.push("out-of-stock");
      return { itemId: id, qty, stock, exists: !!item, visible, invalid: invalidReasons.length > 0, reasons: invalidReasons };
    }).filter(function(x){ return x.invalid; });
  }
  function searchDiagnostics(query){
    const c = window.cache || {};
    const q = str(query || "").trim().toLowerCase();
    const items = arr(c.items);
    const h = helper();
    let helperCount = null;
    try {
      if(typeof h.searchItems === "function") helperCount = arr(h.searchItems(items, q)).length;
      else if(typeof h.filterCatalogItems === "function") helperCount = arr(h.filterCatalogItems(items, { query:q })).length;
    } catch (_) { helperCount = null; }
    const basicCount = items.filter(function(i){ return str((i && (i.name || "")) + " " + (i && (i.barcode || i.code || "")) + " " + (i && (i.category || ""))).toLowerCase().indexOf(q) >= 0; }).length;
    return { ok: true, query:q, total:items.length, basicCount, helperCount, usedHelper: helperCount !== null };
  }
  function layoutRiskDiagnostics(){
    let stickyCart = false, searchFocused = false, overlayRisk = false;
    try { stickyCart = !!document.querySelector(".catalog-cart,.cart-panel,.purchase-cart"); } catch (_) {}
    try { searchFocused = !!(document.activeElement && /search|catalog|item/i.test(str(document.activeElement.id || document.activeElement.name || document.activeElement.placeholder))); } catch (_) {}
    try {
      const cartEl = document.querySelector(".catalog-cart,.cart-panel,.purchase-cart");
      const tableEl = document.querySelector("#catalogList23,#customerItemsList23,.demand-table");
      if(cartEl && tableEl){
        const a = cartEl.getBoundingClientRect(), b = tableEl.getBoundingClientRect();
        overlayRisk = !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
      }
    } catch (_) {}
    return { ok: true, stickyCart, searchFocused, overlayRisk, note: overlayRisk ? "قد تكون السلة فوق محتوى الكتالوج؛ افحص CSS على الهاتف." : "لا يوجد تداخل ظاهر في الفحص الحالي." };
  }
  function runCatalogBugReview(){
    const context = catalogContext();
    const invalidCartLines = findInvalidCartLines();
    const search = searchDiagnostics(context.searchText);
    const layout = layoutRiskDiagnostics();
    const warnings = [];
    if(context.role === "customer" && !context.shopId) warnings.push("لا يوجد متجر نشط للعميل.");
    if(context.role === "customer" && !context.customerId) warnings.push("لا يوجد customerId نشط للعميل.");
    if(context.role === "customer" && context.visibleItems === 0) warnings.push("لا توجد أصناف ظاهرة للعميل.");
    if(invalidCartLines.length) warnings.push("توجد أسطر سلة غير صالحة تحتاج تنظيفًا يدويًا أو إعادة تحميل.");
    if(layout.overlayRisk) warnings.push("قد توجد مشكلة تداخل في تخطيط السلة/الكتالوج.");
    return { ok: warnings.length === 0 || (warnings.length && context.role !== "customer"), version: VERSION, build: BUILD_CODE, context, invalidCartLines, search, layout, warnings, checkedAt: new Date().toISOString() };
  }
  function selfCheck(){
    const required = ["catalogContext","findInvalidCartLines","searchDiagnostics","layoutRiskDiagnostics","runCatalogBugReview"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    const sample = searchDiagnostics("sample");
    return { ok: missing.length === 0 && sample.ok === true, version: VERSION, build: BUILD_CODE, missing, sample };
  }
  const api = { version: VERSION, build: BUILD_CODE, catalogContext, findInvalidCartLines, searchDiagnostics, layoutRiskDiagnostics, runCatalogBugReview };
  window.hesabiCustomerCatalogBugFixes = api;
  window.hesabiCustomerCatalogBugFixesSelfCheck = selfCheck;
})();
