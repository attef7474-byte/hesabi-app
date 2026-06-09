/* Hesabi 1.0.98 - Payments and Statements page final sweep.
   Scope: page-level interaction hardening only. No Firestore writes, no payment approval logic changes, no invoice/ledger mutations. */
(function(){
  "use strict";

  const VERSION = "1.0.98";
  const BUILD_CODE = 98;
  const ID = "hesabiPaymentsStatementsPageSweep";

  function safeString(value){
    try { return String(value == null ? "" : (value.message || value)); } catch (_) { return ""; }
  }
  function byId(id){ try { return typeof $ === "function" ? $(id) : document.getElementById(id); } catch (_) { return document.getElementById(id); } }
  function qsa(selector, root){ return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function pageEl(page){ return byId("page_" + page); }
  function inPage(page, node){ const root = pageEl(page); return !!(root && node && root.contains(node)); }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch (_) {} }
  function persist(){ try { if(typeof save === "function") save(); } catch (_) {} }

  function ensureStyles(){
    if(document.getElementById("hesabi-payments-statements-sweep-style")) return true;
    const style = document.createElement("style");
    style.id = "hesabi-payments-statements-sweep-style";
    style.textContent = `
      #page_payments, #page_statement{max-width:100%;overflow-x:hidden;}
      #page_payments .card, #page_statement .card{max-width:100%;box-sizing:border-box;}
      #page_payments .table-wrap, #page_statement .table-wrap,
      #page_payments .demand-table-wrap, #page_statement .demand-table-wrap,
      #page_payments .table-scroll, #page_statement .table-scroll{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
      #page_payments table, #page_statement table{border-collapse:collapse;min-width:680px;}
      #page_payments td, #page_payments th, #page_statement td, #page_statement th{white-space:normal;vertical-align:middle;}
      #page_payments .page-tabs-bar, #page_statement .page-tabs-bar{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;}
      #page_payments .page-tab-btn, #page_statement .page-tab-btn{flex:0 0 auto;}
      #page_payments .compact-filters, #page_statement .compact-filters{grid-template-columns:repeat(auto-fit,minmax(180px,1fr));}
      #page_payments .actions, #page_statement .actions{flex-wrap:wrap;gap:8px;}
      @media (max-width: 720px){
        #page_payments table, #page_statement table{min-width:640px;font-size:12px;}
        #page_payments .btn.mini, #page_statement .btn.mini{padding:6px 8px;font-size:12px;}
        #page_payments .mini-stat-grid, #page_statement .mini-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
      }
    `;
    document.head.appendChild(style);
    return true;
  }

  function runRender(page){
    try {
      if(page === "payments" && typeof renderPayments === "function") { renderPayments(); return true; }
      if(page === "statement" && typeof renderStatement === "function") { renderStatement(); return true; }
    } catch (error) {
      try { console.error(ID + " render failed", page, error); } catch (_) {}
      notify("تعذر تحديث الصفحة: " + safeString(error), "error");
    }
    return false;
  }

  function setTab(page, tab){
    const key = String(page || "");
    const value = String(tab || "");
    if(!key || !value) return false;
    try {
      if(typeof setPageTab === "function") {
        setPageTab(key, value, function(){ runRender(key); });
        return true;
      }
    } catch (_) {}
    try {
      if(typeof state === "object" && state) state[key + "Tab"] = value;
      persist();
      return runRender(key);
    } catch (error) {
      try { console.warn(ID + " setTab failed", key, value, error); } catch (_) {}
      return false;
    }
  }

  function bindPaymentActions(){
    const page = pageEl("payments");
    if(!page) return { ok:false, reason:"payments page not mounted" };
    ensureStyles();
    try { if(typeof bindPageTabs === "function") bindPageTabs("payments", renderPayments); } catch (_) {}
    try { if(typeof bindDemandTable === "function") bindDemandTable("paymentsList23", renderPayments); } catch (_) {}
    const sendBtn = byId("sendPayment");
    if(sendBtn && !sendBtn.__hesabiPayStmtSweepBound){
      sendBtn.__hesabiPayStmtSweepBound = true;
      sendBtn.addEventListener("click", function(ev){
        ev.preventDefault(); ev.stopPropagation();
        try { if(typeof sendPayment === "function") sendPayment(); else notify("دالة إرسال السداد غير متاحة.", "error"); }
        catch (error) { notify("تعذر إرسال السداد: " + safeString(error), "error"); }
      });
    }
    qsa("[data-approve-pay]", page).forEach(function(btn){ if(!btn.__hesabiPayStmtSweepBound){ btn.__hesabiPayStmtSweepBound = true; btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); const id = btn.getAttribute("data-approve-pay") || ""; if(typeof approvePayment === "function") approvePayment(id); else notify("دالة اعتماد السداد غير متاحة.", "error"); }); } });
    qsa("[data-reject-pay]", page).forEach(function(btn){ if(!btn.__hesabiPayStmtSweepBound){ btn.__hesabiPayStmtSweepBound = true; btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); const id = btn.getAttribute("data-reject-pay") || ""; if(typeof rejectPayment === "function") rejectPayment(id); else notify("دالة رفض السداد غير متاحة.", "error"); }); } });
    qsa("[data-open-receipt]", page).forEach(function(btn){ if(!btn.__hesabiPayStmtSweepBound){ btn.__hesabiPayStmtSweepBound = true; btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); const id = btn.getAttribute("data-open-receipt") || ""; if(typeof openReceipt === "function") openReceipt(id); else notify("فتح الإيصال غير متاح.", "error"); }); } });
    window.__hesabiPaymentsStatementsSweepPaymentsBound = { at: Date.now(), send: !!sendBtn, approve: qsa("[data-approve-pay]", page).length, reject: qsa("[data-reject-pay]", page).length, receipt: qsa("[data-open-receipt]", page).length };
    return Object.assign({ ok:true, mounted:true }, window.__hesabiPaymentsStatementsSweepPaymentsBound);
  }

  function applyStatementFilterFromDom(){
    try {
      const select = byId("statementFilterCustomer");
      if(select && typeof state === "object" && state) {
        state.statementCustomer = select.value || "";
        persist();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function bindStatementActions(){
    const page = pageEl("statement");
    if(!page) return { ok:false, reason:"statement page not mounted" };
    ensureStyles();
    try { if(typeof bindPageTabs === "function") bindPageTabs("statement", renderStatement); } catch (_) {}
    try { if(typeof bindDemandTable === "function") bindDemandTable("statementList23", renderStatement); } catch (_) {}
    const filter = byId("statementFilterCustomer");
    const clear = byId("clearStatementFilters");
    const share = byId("shareSelectedStatement");
    if(filter && !filter.__hesabiPayStmtSweepBound){
      filter.__hesabiPayStmtSweepBound = true;
      filter.addEventListener("change", function(){ applyStatementFilterFromDom(); runRender("statement"); });
    }
    if(clear && !clear.__hesabiPayStmtSweepBound){
      clear.__hesabiPayStmtSweepBound = true;
      clear.addEventListener("click", function(ev){ ev.preventDefault(); try { if(typeof state === "object" && state) state.statementCustomer = ""; persist(); runRender("statement"); } catch (_) {} });
    }
    if(share && !share.__hesabiPayStmtSweepBound){
      share.__hesabiPayStmtSweepBound = true;
      share.addEventListener("click", function(ev){
        ev.preventDefault(); ev.stopPropagation();
        const customer = (typeof state === "object" && state && state.statementCustomer) || "";
        if(typeof shareStatementText === "function") shareStatementText(customer);
        else notify("مشاركة كشف الحساب غير متاحة.", "error");
      });
    }
    window.__hesabiPaymentsStatementsSweepStatementBound = { at: Date.now(), filter: !!filter, clear: !!clear, share: !!share };
    return Object.assign({ ok:true, mounted:true }, window.__hesabiPaymentsStatementsSweepStatementBound);
  }

  function bindCurrentPages(){
    return { payments: bindPaymentActions(), statement: bindStatementActions() };
  }

  function delegatedClick(ev){
    const tabBtn = ev.target && ev.target.closest ? ev.target.closest("[data-page-tab-key]") : null;
    if(tabBtn){
      const key = tabBtn.getAttribute("data-page-tab-key");
      if(key === "payments" || key === "statement"){
        ev.preventDefault(); ev.stopPropagation();
        setTab(key, tabBtn.getAttribute("data-page-tab-value"));
        return;
      }
    }
    const approve = ev.target && ev.target.closest ? ev.target.closest("[data-approve-pay]") : null;
    if(approve && inPage("payments", approve)){ ev.preventDefault(); ev.stopPropagation(); if(typeof approvePayment === "function") approvePayment(approve.getAttribute("data-approve-pay") || ""); return; }
    const reject = ev.target && ev.target.closest ? ev.target.closest("[data-reject-pay]") : null;
    if(reject && inPage("payments", reject)){ ev.preventDefault(); ev.stopPropagation(); if(typeof rejectPayment === "function") rejectPayment(reject.getAttribute("data-reject-pay") || ""); return; }
    const receipt = ev.target && ev.target.closest ? ev.target.closest("[data-open-receipt]") : null;
    if(receipt && inPage("payments", receipt)){ ev.preventDefault(); ev.stopPropagation(); if(typeof openReceipt === "function") openReceipt(receipt.getAttribute("data-open-receipt") || ""); return; }
    const send = ev.target && ev.target.closest ? ev.target.closest("#sendPayment") : null;
    if(send && inPage("payments", send)){ ev.preventDefault(); ev.stopPropagation(); if(typeof sendPayment === "function") sendPayment(); return; }
    const share = ev.target && ev.target.closest ? ev.target.closest("#shareSelectedStatement") : null;
    if(share && inPage("statement", share)){ ev.preventDefault(); ev.stopPropagation(); if(typeof shareStatementText === "function") shareStatementText((typeof state === "object" && state && state.statementCustomer) || ""); return; }
  }

  function install(){
    if(window.__hesabiPaymentsStatementsPageSweepInstalled) return;
    window.__hesabiPaymentsStatementsPageSweepInstalled = true;
    ensureStyles();
    document.addEventListener("click", delegatedClick, true);
    document.addEventListener("change", function(ev){
      const t = ev.target;
      if(t && t.id === "statementFilterCustomer" && inPage("statement", t)) { applyStatementFilterFromDom(); runRender("statement"); }
    }, true);
    const wrapPaymentRender = typeof renderPayments === "function" && !renderPayments.__hesabiPayStmtSweepWrapped;
    if(wrapPaymentRender){
      const base = renderPayments;
      renderPayments = function(){ const result = base.apply(this, arguments); setTimeout(bindPaymentActions, 80); return result; };
      renderPayments.__hesabiPayStmtSweepWrapped = true;
    }
    const wrapStatementRender = typeof renderStatement === "function" && !renderStatement.__hesabiPayStmtSweepWrapped;
    if(wrapStatementRender){
      const base = renderStatement;
      renderStatement = function(){ const result = base.apply(this, arguments); setTimeout(bindStatementActions, 80); return result; };
      renderStatement.__hesabiPayStmtSweepWrapped = true;
    }
    window.addEventListener("hashchange", function(){ setTimeout(bindCurrentPages, 80); });
    setTimeout(bindCurrentPages, 100);
  }

  function selfCheck(){
    const requiredFunctions = ["renderPayments","renderStatement","sendPayment","approvePayment","rejectPayment","openReceipt","shareStatementText"];
    const missingFunctions = requiredFunctions.filter(function(name){ return typeof window[name] !== "function" && typeof evalSafeFunction(name) !== "function"; });
    const api = window.hesabiPaymentsStatementsPageSweep || {};
    const requiredApi = ["install","bindPaymentActions","bindStatementActions","bindCurrentPages"];
    const missingApi = requiredApi.filter(function(name){ return typeof api[name] !== "function"; });
    return { ok: missingApi.length === 0, version: VERSION, build: BUILD_CODE, missingApi, missingFunctions, installed: !!window.__hesabiPaymentsStatementsPageSweepInstalled };
  }

  function evalSafeFunction(name){
    try { return (0, eval)(name); } catch (_) { return null; }
  }

  window.hesabiPaymentsStatementsPageSweep = {
    version: VERSION,
    build: BUILD_CODE,
    install,
    bindPaymentActions,
    bindStatementActions,
    bindCurrentPages,
    selfCheck
  };
  window.hesabiPaymentsStatementsPageSweepSelfCheck = selfCheck;
  install();
})();
