/* Hesabi 1.0.99 - Orders and order approval page final sweep.
   Scope: page-level interaction hardening only. No Firestore write logic changes, no invoice/stock/ledger mutations. */
(function(){
  "use strict";

  const VERSION = "1.0.99";
  const BUILD_CODE = 99;
  const ID = "hesabiOrdersApprovalPageSweep";

  function safeString(value){
    try { return String(value == null ? "" : (value.message || value)); } catch (_) { return ""; }
  }
  function byId(id){ try { return typeof $ === "function" ? $(id) : document.getElementById(id); } catch (_) { return document.getElementById(id); } }
  function qsa(selector, root){ return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function page(){ return byId("page_orders"); }
  function inOrders(node){ const root = page(); return !!(root && node && root.contains(node)); }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch (_) {} }
  function persist(){ try { if(typeof save === "function") save(); } catch (_) {} }

  function ensureStyles(){
    if(document.getElementById("hesabi-orders-approval-sweep-style")) return true;
    const style = document.createElement("style");
    style.id = "hesabi-orders-approval-sweep-style";
    style.textContent = `
      #page_orders{max-width:100%;overflow-x:hidden;}
      #page_orders .card{max-width:100%;box-sizing:border-box;}
      #page_orders .page-tabs-bar{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;}
      #page_orders .page-tab-btn{flex:0 0 auto;}
      #page_orders .table-wrap,#page_orders .demand-table-wrap,#page_orders .table-scroll,#page_orders .compact-table-wrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
      #page_orders table{border-collapse:collapse;min-width:760px;}
      #page_orders td,#page_orders th{white-space:normal;vertical-align:middle;}
      #page_orders .mini-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;align-items:center;}
      #page_orders .btn.mini{white-space:nowrap;}
      #page_orders .demand-toolbar{grid-template-columns:1fr auto auto;}
      #page_orders .lines-row .demand-details{display:none;}
      #page_orders .detail-row.open + .lines-row .demand-details,#page_orders .lines-row.open .demand-details{display:block!important;}
      @media (max-width:720px){
        #page_orders table{min-width:700px;font-size:12px;}
        #page_orders .btn.mini{padding:6px 8px!important;font-size:11px!important;}
        #page_orders .mini-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
        #page_orders .demand-toolbar{grid-template-columns:1fr;}
        #page_orders .demand-toolbar .btn{width:100%;}
      }
    `;
    document.head.appendChild(style);
    return true;
  }

  function evalSafeFunction(name){
    try { return (0, eval)(name); } catch (_) { return null; }
  }
  function fn(name){
    const direct = window[name];
    if(typeof direct === "function") return direct;
    const scoped = evalSafeFunction(name);
    return typeof scoped === "function" ? scoped : null;
  }

  function runRender(){
    try {
      const render = fn("renderOrders");
      if(render) { render(); return true; }
      notify("دالة عرض الطلبات غير متاحة.", "error");
    } catch (error) {
      try { console.error(ID + " render failed", error); } catch (_) {}
      notify("تعذر تحديث صفحة الطلبات: " + safeString(error), "error");
    }
    return false;
  }

  function setOrdersTab(tab){
    const value = String(tab || "").trim();
    if(!value) return false;
    try {
      const setPageTabFn = fn("setPageTab");
      if(setPageTabFn) {
        setPageTabFn("orders", value, fn("renderOrders") || runRender);
        setTimeout(bindActions, 80);
        return true;
      }
    } catch (_) {}
    try {
      if(typeof state === "object" && state) state.ordersTab = value;
      persist();
      runRender();
      return true;
    } catch (error) {
      try { console.warn(ID + " set tab failed", value, error); } catch (_) {}
      return false;
    }
  }

  function toggleDetails(button){
    if(!button) return false;
    const row = button.closest("tr");
    if(!row) return false;
    row.classList.toggle("open");
    const next = row.nextElementSibling;
    if(next && next.classList && next.classList.contains("lines-row")) next.classList.toggle("open", row.classList.contains("open"));
    try {
      const isOpen = row.classList.contains("open");
      if(/تفاصيل|إخفاء/.test(button.textContent || "")) button.textContent = isOpen ? "إخفاء" : "تفاصيل";
    } catch (_) {}
    return true;
  }

  function callAction(name, id, friendly){
    const action = fn(name);
    if(!action) { notify((friendly || name) + " غير متاحة حاليًا.", "error"); return false; }
    try {
      action(String(id || ""));
      return true;
    } catch (error) {
      try { console.error(ID + " action failed", name, error); } catch (_) {}
      notify("تعذر تنفيذ العملية: " + safeString(error), "error");
      return false;
    }
  }

  function bindActions(){
    const root = page();
    if(!root) return { ok:false, reason:"orders page not mounted" };
    ensureStyles();
    try { const bindTabs = fn("bindPageTabs"); const render = fn("renderOrders"); if(bindTabs && render) bindTabs("orders", render); } catch (_) {}
    try { const bindDemand = fn("bindDemandTable"); const render = fn("renderOrders"); if(bindDemand && render) bindDemand("ordersList23", render); } catch (_) {}
    try { const bindRows = fn("bindOrderRows"); if(bindRows) bindRows(); } catch (_) {}

    qsa("[data-page-tab-key='orders']", root).forEach(function(btn){
      if(btn.__hesabiOrdersSweepBound) return;
      btn.__hesabiOrdersSweepBound = true;
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); setOrdersTab(btn.getAttribute("data-page-tab-value")); });
    });
    qsa("[data-approve-order]", root).forEach(function(btn){
      if(btn.__hesabiOrdersSweepBound) return;
      btn.__hesabiOrdersSweepBound = true;
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); callAction("approveOrder", btn.getAttribute("data-approve-order"), "اعتماد الطلب"); });
    });
    qsa("[data-reject-order]", root).forEach(function(btn){
      if(btn.__hesabiOrdersSweepBound) return;
      btn.__hesabiOrdersSweepBound = true;
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); callAction("rejectOrder", btn.getAttribute("data-reject-order"), "رفض الطلب"); });
    });
    qsa("[data-customer-approve]", root).forEach(function(btn){
      if(btn.__hesabiOrdersSweepBound) return;
      btn.__hesabiOrdersSweepBound = true;
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); callAction("customerApproveOrder", btn.getAttribute("data-customer-approve"), "موافقة العميل"); });
    });
    qsa("[data-customer-reject]", root).forEach(function(btn){
      if(btn.__hesabiOrdersSweepBound) return;
      btn.__hesabiOrdersSweepBound = true;
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); callAction("customerRejectOrder", btn.getAttribute("data-customer-reject"), "رفض العميل"); });
    });
    qsa("[data-edit-customer-order]", root).forEach(function(btn){
      if(btn.__hesabiOrdersSweepBound) return;
      btn.__hesabiOrdersSweepBound = true;
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); callAction("loadOrderForEdit", btn.getAttribute("data-edit-customer-order"), "تعديل الطلب"); });
    });
    qsa("[data-cancel-customer-order]", root).forEach(function(btn){
      if(btn.__hesabiOrdersSweepBound) return;
      btn.__hesabiOrdersSweepBound = true;
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); callAction("cancelCustomerOrder", btn.getAttribute("data-cancel-customer-order"), "إلغاء الطلب"); });
    });
    qsa("[data-toggle-row]", root).forEach(function(btn){
      if(btn.__hesabiOrdersSweepBound) return;
      btn.__hesabiOrdersSweepBound = true;
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); toggleDetails(btn); });
    });

    window.__hesabiOrdersApprovalSweepBound = {
      at: Date.now(),
      tabs: qsa("[data-page-tab-key='orders']", root).length,
      approve: qsa("[data-approve-order]", root).length,
      reject: qsa("[data-reject-order]", root).length,
      customerApprove: qsa("[data-customer-approve]", root).length,
      customerReject: qsa("[data-customer-reject]", root).length,
      edit: qsa("[data-edit-customer-order]", root).length,
      cancel: qsa("[data-cancel-customer-order]", root).length,
      details: qsa("[data-toggle-row]", root).length
    };
    return Object.assign({ ok:true, mounted:true }, window.__hesabiOrdersApprovalSweepBound);
  }

  function delegatedClick(ev){
    const tab = ev.target && ev.target.closest ? ev.target.closest("[data-page-tab-key='orders']") : null;
    if(tab){ ev.preventDefault(); ev.stopPropagation(); setOrdersTab(tab.getAttribute("data-page-tab-value")); return; }
    const approve = ev.target && ev.target.closest ? ev.target.closest("[data-approve-order]") : null;
    if(approve && inOrders(approve)){ ev.preventDefault(); ev.stopPropagation(); callAction("approveOrder", approve.getAttribute("data-approve-order"), "اعتماد الطلب"); return; }
    const reject = ev.target && ev.target.closest ? ev.target.closest("[data-reject-order]") : null;
    if(reject && inOrders(reject)){ ev.preventDefault(); ev.stopPropagation(); callAction("rejectOrder", reject.getAttribute("data-reject-order"), "رفض الطلب"); return; }
    const customerApprove = ev.target && ev.target.closest ? ev.target.closest("[data-customer-approve]") : null;
    if(customerApprove && inOrders(customerApprove)){ ev.preventDefault(); ev.stopPropagation(); callAction("customerApproveOrder", customerApprove.getAttribute("data-customer-approve"), "موافقة العميل"); return; }
    const customerReject = ev.target && ev.target.closest ? ev.target.closest("[data-customer-reject]") : null;
    if(customerReject && inOrders(customerReject)){ ev.preventDefault(); ev.stopPropagation(); callAction("customerRejectOrder", customerReject.getAttribute("data-customer-reject"), "رفض العميل"); return; }
    const edit = ev.target && ev.target.closest ? ev.target.closest("[data-edit-customer-order]") : null;
    if(edit && inOrders(edit)){ ev.preventDefault(); ev.stopPropagation(); callAction("loadOrderForEdit", edit.getAttribute("data-edit-customer-order"), "تعديل الطلب"); return; }
    const cancel = ev.target && ev.target.closest ? ev.target.closest("[data-cancel-customer-order]") : null;
    if(cancel && inOrders(cancel)){ ev.preventDefault(); ev.stopPropagation(); callAction("cancelCustomerOrder", cancel.getAttribute("data-cancel-customer-order"), "إلغاء الطلب"); return; }
    const details = ev.target && ev.target.closest ? ev.target.closest("[data-toggle-row]") : null;
    if(details && inOrders(details)){ ev.preventDefault(); ev.stopPropagation(); toggleDetails(details); return; }
  }

  function install(){
    if(window.__hesabiOrdersApprovalPageSweepInstalled) return;
    window.__hesabiOrdersApprovalPageSweepInstalled = true;
    ensureStyles();
    document.addEventListener("click", delegatedClick, true);
    const render = fn("renderOrders");
    if(render && !render.__hesabiOrdersSweepWrapped){
      const base = render;
      const wrapped = function(){ const result = base.apply(this, arguments); setTimeout(bindActions, 80); return result; };
      wrapped.__hesabiOrdersSweepWrapped = true;
      try { renderOrders = wrapped; } catch (_) { window.renderOrders = wrapped; }
    }
    window.addEventListener("hashchange", function(){ setTimeout(bindActions, 80); });
    setTimeout(bindActions, 120);
  }

  function selfCheck(){
    const requiredFunctions = ["renderOrders","approveOrder","rejectOrder","customerApproveOrder","customerRejectOrder","loadOrderForEdit","cancelCustomerOrder"];
    const missingFunctions = requiredFunctions.filter(function(name){ return typeof fn(name) !== "function"; });
    const api = window.hesabiOrdersApprovalPageSweep || {};
    const requiredApi = ["install","bindActions","setOrdersTab"];
    const missingApi = requiredApi.filter(function(name){ return typeof api[name] !== "function"; });
    return {
      ok: missingApi.length === 0,
      version: VERSION,
      build: BUILD_CODE,
      installed: !!window.__hesabiOrdersApprovalPageSweepInstalled,
      mounted: !!page(),
      lastBound: window.__hesabiOrdersApprovalSweepBound || null,
      missingApi,
      missingFunctions
    };
  }

  window.hesabiOrdersApprovalPageSweep = {
    version: VERSION,
    build: BUILD_CODE,
    install,
    ensureStyles,
    bindActions,
    setOrdersTab,
    toggleDetails,
    selfCheck
  };
  window.hesabiOrdersApprovalPageSweepSelfCheck = selfCheck;
  install();
})();
