/* Hesabi 1.0.83 - Customer Purchase Full Smoke Fixes.
   Non-intrusive smoke checks only. No order creation, Firestore writes, cart mutation or stock mutation. */
(function(){
  "use strict";
  const VERSION = "1.0.83";
  const BUILD_CODE = 83;
  const REQUIRED_FUNCTIONS = [
    "renderCustomerItemsReadonly",
    "renderCustomerAddItemsPage",
    "renderPurchaseInvoiceOnly",
    "addItemToPurchaseInvoice",
    "sendCustomerOrder",
    "catalogCartTotal",
    "customerCanSeeItem",
    "effectiveItemPrice",
    "customerDebtInfo"
  ];
  function fnExists(name){ try { return typeof window[name] === "function" || (typeof globalThis !== "undefined" && typeof globalThis[name] === "function"); } catch (_) { return false; } }
  function context(){
    const s = window.state || {};
    const c = window.cache || {};
    return {
      role: s.role || "",
      shopId: s.shopId || s.activeShopId || "",
      customerId: s.customerId || "",
      itemCount: Array.isArray(c.items) ? c.items.length : 0,
      orderCount: Array.isArray(c.orders) ? c.orders.length : 0,
      hasCatalogHelper: !!window.hesabiCatalogHelpers,
      hasItemsHelper: !!window.hesabiItemsHelpers,
      checkedAt: new Date().toISOString()
    };
  }
  function requiredFunctionStatus(){ return REQUIRED_FUNCTIONS.map(function(name){ return { name, ok: fnExists(name) }; }); }
  function purchaseReadiness(){
    const ctx = context();
    const missingFunctions = requiredFunctionStatus().filter(function(x){ return !x.ok; }).map(function(x){ return x.name; });
    const warnings = [];
    if(ctx.role === "customer" && !ctx.shopId) warnings.push("لا يوجد متجر نشط للعميل.");
    if(ctx.role === "customer" && !ctx.customerId) warnings.push("لا يوجد customerId مربوط بالعميل.");
    if(ctx.role === "customer" && ctx.itemCount === 0) warnings.push("لا توجد أصناف محملة للكتالوج.");
    return { ok: missingFunctions.length === 0, version:VERSION, build:BUILD_CODE, context:ctx, missingFunctions, warnings };
  }
  function safeCartPreview(){
    try {
      if(typeof catalogCartTotal === "function") {
        const t = catalogCartTotal();
        return { ok:true, total:Number(t && t.total || 0), lines:Array.isArray(t && t.lines) ? t.lines.length : 0, raw:t };
      }
    } catch (error) { return { ok:false, error:String(error && error.message || error) }; }
    return { ok:true, skipped:true, reason:"catalogCartTotal غير متاحة في هذا السياق" };
  }
  function runSmoke(){
    const readiness = purchaseReadiness();
    const cart = safeCartPreview();
    const ok = readiness.ok && cart.ok !== false;
    const result = { ok, version:VERSION, build:BUILD_CODE, readiness, cart, checkedAt:new Date().toISOString() };
    try { localStorage.setItem("hesabi_last_customer_purchase_smoke", JSON.stringify({ ok:result.ok, at:result.checkedAt, missing:readiness.missingFunctions })); } catch (_) {}
    return result;
  }
  function selfCheck(){
    const missing = ["context","requiredFunctionStatus","purchaseReadiness","safeCartPreview","runSmoke"].filter(function(name){ return typeof api[name] !== "function"; });
    const sample = requiredFunctionStatus();
    return { ok: missing.length === 0 && Array.isArray(sample) && sample.length === REQUIRED_FUNCTIONS.length, version:VERSION, build:BUILD_CODE, missing, requiredCount:REQUIRED_FUNCTIONS.length };
  }
  const api = { version:VERSION, build:BUILD_CODE, requiredFunctions:REQUIRED_FUNCTIONS.slice(), context, requiredFunctionStatus, purchaseReadiness, safeCartPreview, runSmoke };
  window.hesabiCustomerPurchaseSmoke = api;
  window.hesabiCustomerPurchaseSmokeSelfCheck = selfCheck;
})();
