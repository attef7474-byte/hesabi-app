/* Hesabi 1.0.84 - Trader Daily Workflow Smoke Fixes.
   Read-only workflow smoke. It never approves orders, rejects payments, writes invoices, or changes stock. */
(function(){
  "use strict";
  const VERSION = "1.0.84";
  const BUILD_CODE = 84;
  const REQUIRED_ACTIONS = ["renderOrders","approveOrder","rejectOrder","renderCustomers","renderInvoices","renderPayments","renderStatement","renderReturns","renderSchedules","renderReports"];
  function fnExists(name){ try { return typeof window[name] === "function" || (typeof globalThis !== "undefined" && typeof globalThis[name] === "function"); } catch (_) { return false; } }
  function counts(){
    const c = window.cache || {};
    const arr = function(name){ return Array.isArray(c[name]) ? c[name] : []; };
    return {
      customers: arr("customers").length,
      items: arr("items").length,
      orders: arr("orders").length,
      pendingOrders: arr("orders").filter(function(o){ return String(o.status || "pending").indexOf("pending") >= 0; }).length,
      invoices: arr("invoices").length,
      payments: arr("payments").length,
      pendingPayments: arr("payments").filter(function(p){ return String(p.status || "pending") === "pending"; }).length,
      returns: arr("returns").length,
      schedules: arr("schedules").length,
      ledger: arr("customerLedger").length
    };
  }
  function actionStatus(){ return REQUIRED_ACTIONS.map(function(name){ return { name, ok: fnExists(name) }; }); }
  function traderContext(){
    const s = window.state || {};
    return { role:s.role || "", shopId:s.shopId || "", shopName:s.shopName || "", isTrader:s.role === "trader", checkedAt:new Date().toISOString() };
  }
  function runSmoke(){
    const ctx = traderContext();
    const actions = actionStatus();
    const missingActions = actions.filter(function(x){ return !x.ok; }).map(function(x){ return x.name; });
    const dataCounts = counts();
    const warnings = [];
    if(ctx.role === "trader" && !ctx.shopId) warnings.push("لا يوجد shopId نشط للتاجر.");
    if(ctx.role === "trader" && dataCounts.items === 0) warnings.push("لا توجد أصناف محملة؛ قد تكون المستمعات أو الصلاحيات غير مكتملة.");
    const ok = missingActions.length === 0;
    const result = { ok, version:VERSION, build:BUILD_CODE, context:ctx, actions, missingActions, counts:dataCounts, warnings };
    try { localStorage.setItem("hesabi_last_trader_workflow_smoke", JSON.stringify({ ok:result.ok, at:new Date().toISOString(), missingActions })); } catch (_) {}
    return result;
  }
  function selfCheck(){
    const missing = ["counts","actionStatus","traderContext","runSmoke"].filter(function(name){ return typeof api[name] !== "function"; });
    const sample = counts();
    return { ok: missing.length === 0 && typeof sample === "object", version:VERSION, build:BUILD_CODE, missing, requiredActions:REQUIRED_ACTIONS.length };
  }
  const api = { version:VERSION, build:BUILD_CODE, requiredActions:REQUIRED_ACTIONS.slice(), counts, actionStatus, traderContext, runSmoke };
  window.hesabiTraderWorkflowSmoke = api;
  window.hesabiTraderWorkflowSmokeSelfCheck = selfCheck;
})();
