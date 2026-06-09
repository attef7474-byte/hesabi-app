/* Hesabi 1.0.102 - Returns + Schedules Page Final Sweep.
   Scope: page-level interaction hardening only. No Firestore writes, no stock/invoice/ledger/payment mutation changes. */
(function(){
  "use strict";

  const VERSION = "1.0.102";
  const BUILD_CODE = 102;
  const ID = "hesabiReturnsSchedulesPageSweep";

  function safeString(value){
    try { return String(value == null ? "" : (value.message || value)); } catch (_) { return ""; }
  }
  function byId(id){ try { return typeof $ === "function" ? $(id) : document.getElementById(id); } catch (_) { return document.getElementById(id); } }
  function qsa(selector, root){ return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function pageEl(page){ return byId("page_" + page); }
  function inPage(page, node){ const root = pageEl(page); return !!(root && node && root.contains(node)); }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch (_) {} }
  function persist(){ try { if(typeof save === "function") save(); } catch (_) {} }
  function fn(name){
    if(typeof window[name] === "function") return window[name];
    try { const scoped = eval(name); return typeof scoped === "function" ? scoped : null; } catch (_) { return null; }
  }

  function ensureStyles(){
    if(document.getElementById("hesabi-returns-schedules-sweep-style")) return true;
    const style = document.createElement("style");
    style.id = "hesabi-returns-schedules-sweep-style";
    style.textContent = `
      #page_returns, #page_schedules{max-width:100%;overflow-x:hidden;}
      #page_returns .card, #page_schedules .card{max-width:100%;box-sizing:border-box;}
      #page_returns .tablewrap, #page_schedules .tablewrap,
      #page_returns .table-wrap, #page_schedules .table-wrap,
      #page_returns .demand-table-wrap, #page_schedules .demand-table-wrap,
      #page_returns .table-scroll, #page_schedules .table-scroll{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
      #page_returns table, #page_schedules table{border-collapse:collapse;min-width:680px;}
      #page_returns td, #page_returns th, #page_schedules td, #page_schedules th{white-space:normal;vertical-align:middle;}
      #page_returns .page-tabs-bar, #page_schedules .page-tabs-bar{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;}
      #page_returns .page-tab-btn, #page_schedules .page-tab-btn{flex:0 0 auto;}
      #page_returns .actions, #page_schedules .actions{flex-wrap:wrap;gap:8px;}
      #page_returns textarea, #page_schedules textarea, #page_schedules input, #page_schedules select{max-width:100%;box-sizing:border-box;}
      @media (max-width:720px){
        #page_returns table, #page_schedules table{min-width:620px;font-size:12px;}
        #page_returns .btn.mini, #page_schedules .btn.mini{padding:6px 8px;font-size:12px;}
        #page_returns .grid, #page_schedules .grid{grid-template-columns:1fr!important;}
      }
    `;
    document.head.appendChild(style);
    return true;
  }

  function runRender(page){
    try {
      if(page === "returns") { const render = fn("renderReturns"); if(render) { render(); return true; } }
      if(page === "schedules") { const render = fn("renderSchedules"); if(render) { render(); return true; } }
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
      const setPageTabFn = fn("setPageTab");
      if(setPageTabFn) {
        setPageTabFn(key, value, function(){ runRender(key); });
        setTimeout(function(){ key === "returns" ? bindReturnsActions() : bindSchedulesActions(); }, 80);
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

  function callAction(name, id, friendly){
    const action = fn(name);
    if(!action){ notify((friendly || name) + " غير متاحة حاليًا.", "error"); return false; }
    try { action(String(id || "")); return true; }
    catch (error) { try { console.error(ID + " action failed", name, error); } catch (_) {} notify("تعذر تنفيذ العملية: " + safeString(error), "error"); return false; }
  }

  function bindReturnsActions(){
    const root = pageEl("returns");
    if(!root) return { ok:false, reason:"returns page not mounted" };
    ensureStyles();
    try { const bindTabs = fn("bindPageTabs"); const render = fn("renderReturns"); if(bindTabs && render) bindTabs("returns", render); } catch (_) {}
    try { const bindDemand = fn("bindDemandTable"); const render = fn("renderReturns"); if(bindDemand && render) bindDemand("returnsList23", render); } catch (_) {}
    try { const bindReturnForm = fn("phase6BindReturnForm"); if(bindReturnForm) bindReturnForm(); } catch (_) {}

    const sendBtn = byId("sendReturnRequest");
    if(sendBtn && !sendBtn.__hesabiReturnsSchedulesSweepBound){
      sendBtn.__hesabiReturnsSchedulesSweepBound = true;
      sendBtn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); callAction("sendReturnRequest", "", "إرسال طلب المرتجع"); });
    }
    qsa("[data-approve-return]", root).forEach(function(btn){
      if(btn.__hesabiReturnsSchedulesSweepBound) return;
      btn.__hesabiReturnsSchedulesSweepBound = true;
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); callAction("approveReturn", btn.getAttribute("data-approve-return"), "قبول المرتجع"); });
    });
    qsa("[data-reject-return]", root).forEach(function(btn){
      if(btn.__hesabiReturnsSchedulesSweepBound) return;
      btn.__hesabiReturnsSchedulesSweepBound = true;
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); callAction("rejectReturn", btn.getAttribute("data-reject-return"), "رفض المرتجع"); });
    });
    const invoiceSelect = byId("returnInvoice");
    if(invoiceSelect && !invoiceSelect.__hesabiReturnsSchedulesSweepBound){
      invoiceSelect.__hesabiReturnsSchedulesSweepBound = true;
      invoiceSelect.addEventListener("change", function(){ try { const bindReturnForm = fn("phase6BindReturnForm"); if(bindReturnForm) bindReturnForm(); } catch (_) {} });
    }
    window.__hesabiReturnsSchedulesSweepReturnsBound = {
      at: Date.now(),
      tabs: qsa("[data-page-tab-key='returns']", root).length,
      send: !!sendBtn,
      approve: qsa("[data-approve-return]", root).length,
      reject: qsa("[data-reject-return]", root).length,
      invoiceSelect: !!invoiceSelect
    };
    return Object.assign({ ok:true, mounted:true }, window.__hesabiReturnsSchedulesSweepReturnsBound);
  }

  function bindSchedulesActions(){
    const root = pageEl("schedules");
    if(!root) return { ok:false, reason:"schedules page not mounted" };
    ensureStyles();
    try { const bindTabs = fn("bindPageTabs"); const render = fn("renderSchedules"); if(bindTabs && render) bindTabs("schedules", render); } catch (_) {}
    try { const bindDemand = fn("bindDemandTable"); const render = fn("renderSchedules"); if(bindDemand && render) bindDemand("schedulesList23", render); } catch (_) {}

    const createBtn = byId("createSchedule");
    const invoiceSelect = byId("schedInvoice");
    if(createBtn && !createBtn.__hesabiReturnsSchedulesSweepBound){
      createBtn.__hesabiReturnsSchedulesSweepBound = true;
      createBtn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); callAction("createSchedule", "", "إنشاء الجدولة"); });
    }
    if(invoiceSelect && !invoiceSelect.__hesabiReturnsSchedulesSweepBound){
      invoiceSelect.__hesabiReturnsSchedulesSweepBound = true;
      invoiceSelect.addEventListener("change", function(){ const action = fn("fillScheduleFromInvoice"); if(action) action(); });
    }
    qsa("[data-pay-schedule]", root).forEach(function(btn){
      if(btn.__hesabiReturnsSchedulesSweepBound) return;
      btn.__hesabiReturnsSchedulesSweepBound = true;
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); callAction("paySchedule", btn.getAttribute("data-pay-schedule"), "سداد القسط"); });
    });
    qsa("[data-cancel-schedule]", root).forEach(function(btn){
      if(btn.__hesabiReturnsSchedulesSweepBound) return;
      btn.__hesabiReturnsSchedulesSweepBound = true;
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); callAction("cancelSchedule", btn.getAttribute("data-cancel-schedule"), "إلغاء الاستحقاق"); });
    });
    window.__hesabiReturnsSchedulesSweepSchedulesBound = {
      at: Date.now(),
      tabs: qsa("[data-page-tab-key='schedules']", root).length,
      create: !!createBtn,
      invoiceSelect: !!invoiceSelect,
      pay: qsa("[data-pay-schedule]", root).length,
      cancel: qsa("[data-cancel-schedule]", root).length
    };
    return Object.assign({ ok:true, mounted:true }, window.__hesabiReturnsSchedulesSweepSchedulesBound);
  }

  function bindCurrentPages(){
    return { returns: bindReturnsActions(), schedules: bindSchedulesActions() };
  }

  function delegatedClick(ev){
    const tabBtn = ev.target && ev.target.closest ? ev.target.closest("[data-page-tab-key]") : null;
    if(tabBtn){
      const key = tabBtn.getAttribute("data-page-tab-key");
      if(key === "returns" || key === "schedules"){
        ev.preventDefault(); ev.stopPropagation(); setTab(key, tabBtn.getAttribute("data-page-tab-value")); return;
      }
    }
    const sendReturn = ev.target && ev.target.closest ? ev.target.closest("#sendReturnRequest") : null;
    if(sendReturn && inPage("returns", sendReturn)){ ev.preventDefault(); ev.stopPropagation(); callAction("sendReturnRequest", "", "إرسال طلب المرتجع"); return; }
    const approveReturnBtn = ev.target && ev.target.closest ? ev.target.closest("[data-approve-return]") : null;
    if(approveReturnBtn && inPage("returns", approveReturnBtn)){ ev.preventDefault(); ev.stopPropagation(); callAction("approveReturn", approveReturnBtn.getAttribute("data-approve-return"), "قبول المرتجع"); return; }
    const rejectReturnBtn = ev.target && ev.target.closest ? ev.target.closest("[data-reject-return]") : null;
    if(rejectReturnBtn && inPage("returns", rejectReturnBtn)){ ev.preventDefault(); ev.stopPropagation(); callAction("rejectReturn", rejectReturnBtn.getAttribute("data-reject-return"), "رفض المرتجع"); return; }
    const createScheduleBtn = ev.target && ev.target.closest ? ev.target.closest("#createSchedule") : null;
    if(createScheduleBtn && inPage("schedules", createScheduleBtn)){ ev.preventDefault(); ev.stopPropagation(); callAction("createSchedule", "", "إنشاء الجدولة"); return; }
    const payScheduleBtn = ev.target && ev.target.closest ? ev.target.closest("[data-pay-schedule]") : null;
    if(payScheduleBtn && inPage("schedules", payScheduleBtn)){ ev.preventDefault(); ev.stopPropagation(); callAction("paySchedule", payScheduleBtn.getAttribute("data-pay-schedule"), "سداد القسط"); return; }
    const cancelScheduleBtn = ev.target && ev.target.closest ? ev.target.closest("[data-cancel-schedule]") : null;
    if(cancelScheduleBtn && inPage("schedules", cancelScheduleBtn)){ ev.preventDefault(); ev.stopPropagation(); callAction("cancelSchedule", cancelScheduleBtn.getAttribute("data-cancel-schedule"), "إلغاء الاستحقاق"); return; }
  }

  function delegatedChange(ev){
    const target = ev.target;
    if(!target) return;
    if(target.id === "schedInvoice" && inPage("schedules", target)){ const action = fn("fillScheduleFromInvoice"); if(action) action(); return; }
    if(target.id === "returnInvoice" && inPage("returns", target)){ try { const bindReturnForm = fn("phase6BindReturnForm"); if(bindReturnForm) setTimeout(bindReturnForm, 0); } catch (_) {} }
  }

  function install(){
    if(window.__hesabiReturnsSchedulesPageSweepInstalled) return;
    window.__hesabiReturnsSchedulesPageSweepInstalled = true;
    ensureStyles();
    document.addEventListener("click", delegatedClick, true);
    document.addEventListener("change", delegatedChange, true);
    const returnsRender = fn("renderReturns");
    if(returnsRender && !returnsRender.__hesabiReturnsSchedulesSweepWrapped){
      const baseReturns = returnsRender;
      const wrappedReturns = function(){ const result = baseReturns.apply(this, arguments); setTimeout(bindReturnsActions, 80); return result; };
      wrappedReturns.__hesabiReturnsSchedulesSweepWrapped = true;
      try { renderReturns = wrappedReturns; } catch (_) { window.renderReturns = wrappedReturns; }
    }
    const schedulesRender = fn("renderSchedules");
    if(schedulesRender && !schedulesRender.__hesabiReturnsSchedulesSweepWrapped){
      const baseSchedules = schedulesRender;
      const wrappedSchedules = function(){ const result = baseSchedules.apply(this, arguments); setTimeout(bindSchedulesActions, 80); return result; };
      wrappedSchedules.__hesabiReturnsSchedulesSweepWrapped = true;
      try { renderSchedules = wrappedSchedules; } catch (_) { window.renderSchedules = wrappedSchedules; }
    }
    window.addEventListener("hashchange", function(){ setTimeout(bindCurrentPages, 100); });
    setTimeout(bindCurrentPages, 140);
  }

  function selfCheck(){
    const requiredApi = ["install","bindReturnsActions","bindSchedulesActions","setTab"];
    const api = window.hesabiReturnsSchedulesPageSweep || {};
    const missingApi = requiredApi.filter(function(name){ return typeof api[name] !== "function"; });
    const requiredFunctions = ["renderReturns","renderSchedules","sendReturnRequest","approveReturn","rejectReturn","createSchedule","paySchedule","cancelSchedule","fillScheduleFromInvoice"];
    const missingFunctions = requiredFunctions.filter(function(name){ return typeof fn(name) !== "function"; });
    return {
      ok: missingApi.length === 0,
      version: VERSION,
      build: BUILD_CODE,
      installed: !!window.__hesabiReturnsSchedulesPageSweepInstalled,
      mounted: { returns: !!pageEl("returns"), schedules: !!pageEl("schedules") },
      lastBound: { returns: window.__hesabiReturnsSchedulesSweepReturnsBound || null, schedules: window.__hesabiReturnsSchedulesSweepSchedulesBound || null },
      missingApi,
      missingFunctions
    };
  }

  window.hesabiReturnsSchedulesPageSweep = {
    version: VERSION,
    build: BUILD_CODE,
    install,
    ensureStyles,
    bindReturnsActions,
    bindSchedulesActions,
    bindCurrentPages,
    setTab,
    selfCheck
  };
  window.hesabiReturnsSchedulesPageSweepSelfCheck = selfCheck;
  install();
})();
