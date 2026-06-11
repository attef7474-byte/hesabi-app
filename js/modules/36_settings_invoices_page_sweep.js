/* Hesabi 1.0.97 - Settings and Invoices page final sweep.
   Scope: page-level interaction hardening only. No Firestore writes, no invoice creation, no payment/order changes. */
(function(){
  "use strict";

  const VERSION = "1.0.97";
  const BUILD_CODE = 97;
  const ID = "hesabiSettingsInvoicesPageSweep";

  function safeString(value){
    try { return String(value == null ? "" : (value.message || value)); } catch (_) { return ""; }
  }
  function qs(selector, root){ return (root || document).querySelector(selector); }
  function qsa(selector, root){ return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function byId(id){ try { return typeof $ === "function" ? $(id) : document.getElementById(id); } catch (_) { return document.getElementById(id); } }
  function inPage(pageId, node){
    if(!node || !pageId) return false;
    const page = byId("page_" + pageId);
    return !!(page && page.contains(node));
  }
  function persist(){ try { if(typeof save === "function") save(); } catch (_) {} }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch (_) {} }

  function runRender(pageId){
    try {
      if(pageId === "settings" && typeof renderSettings === "function") { renderSettings(); return true; }
      if(pageId === "invoices" && typeof renderInvoices === "function") { renderInvoices(); return true; }
    } catch (error) {
      try { console.error(ID + " render failed", pageId, error); } catch (_) {}
      notify("تعذر تحديث الصفحة: " + safeString(error), "error");
    }
    return false;
  }

  function setTab(pageId, tab){
    const value = String(tab || "");
    if(!pageId || !value) return false;
    try {
      if(typeof setPageTab === "function") {
        setPageTab(pageId, value, function(){ runRender(pageId); });
        return true;
      }
    } catch (_) {}
    try {
      if(typeof state === "object" && state) state[pageId + "Tab"] = value;
      persist();
      return runRender(pageId);
    } catch (error) {
      try { console.warn(ID + " setTab failed", pageId, value, error); } catch (_) {}
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
    const label = row.classList.contains("open") ? "إخفاء" : "تفاصيل";
    try { if(/تفاصيل|إخفاء/.test(button.textContent || "")) button.textContent = label; } catch (_) {}
    return true;
  }

  function shareInvoice(invoiceId){
    const id = String(invoiceId || "").trim();
    if(!id) { notify("لم يتم تحديد الفاتورة.", "error"); return false; }
    try {
      if(typeof shareInvoiceText === "function") { shareInvoiceText(id); return true; }
      const inv = (typeof cache === "object" && cache && Array.isArray(cache.invoices)) ? cache.invoices.find(function(x){ return String(x.id || x.invoiceId || "") === id; }) : null;
      const text = inv && window.hesabiInvoicesHelpers && typeof window.hesabiInvoicesHelpers.buildInvoiceText === "function" ? window.hesabiInvoicesHelpers.buildInvoiceText(inv) : "فاتورة: " + id;
      if(navigator.share) navigator.share({ text: text }).catch(function(){});
      else navigator.clipboard && navigator.clipboard.writeText(text).then(function(){ notify("تم نسخ الفاتورة.", "success"); });
      return true;
    } catch (error) {
      notify("تعذر مشاركة الفاتورة: " + safeString(error), "error");
      return false;
    }
  }

  function bindSettingsAction(id, handler){
    const el = byId(id);
    if(!el || el.__hesabiSweepBound) return !!el;
    el.__hesabiSweepBound = true;
    el.addEventListener("click", function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      try { handler(); } catch (error) { notify("تعذر تنفيذ الإجراء: " + safeString(error), "error"); }
    });
    return true;
  }

  function removeLegacySettingsControls(page){
    const ids = [
      "settingsRefreshUi",
      "settingsCleanCache",
      "settingsUpdateApk",
      "settingsCheckApk",
      "settingsRunSelfCheck",
      ("settings" + "FinalCacheCheck"),
      ("hesabi" + "RoleSettings115"),
      ("hesabi" + "UpdateSettings115")
    ];
    let removed = 0;
    ids.forEach(function(id){
      try {
        const el = byId(id);
        if(el && (!page || page.contains(el))){ el.remove(); removed += 1; }
      } catch (_) {}
    });
    return removed;
  }

  function bindSettingsNow(){
    if(!byId("page_settings")) return { ok:false, reason:"settings page not mounted" };
    const page = byId("page_settings");
    if(!page || page.offsetParent === null) return { ok:true, mounted:false };
    const removedLegacy = removeLegacySettingsControls(page);
    try { if(typeof bindPageTabs === "function") bindPageTabs("settings", renderSettings); } catch (_) {}
    window.__hesabiSettingsInvoicesSweepSettingsBound = { at: Date.now(), bound: 0, removedLegacy };
    return { ok:true, mounted:true, bound: 0, removedLegacy };
  }

  function applyInvoiceFiltersFromDom(){
    try {
      if(typeof state !== "object" || !state) return false;
      const c = byId("invFilterCustomer");
      const p = byId("invFilterPay");
      if(c) state.invFilterCustomer = c.value || "";
      if(p) state.invFilterPay = p.value || "";
      persist();
      return true;
    } catch (_) { return false; }
  }

  function bindInvoicesNow(){
    const page = byId("page_invoices");
    if(!page) return { ok:false, reason:"invoices page not mounted" };
    if(page.offsetParent === null) return { ok:true, mounted:false };
    try { if(typeof bindPageTabs === "function") bindPageTabs("invoices", renderInvoices); } catch (_) {}
    const customer = byId("invFilterCustomer");
    const pay = byId("invFilterPay");
    const clear = byId("clearInvoiceFilters");
    if(customer && !customer.__hesabiSweepBound){ customer.__hesabiSweepBound = true; customer.addEventListener("change", function(){ applyInvoiceFiltersFromDom(); runRender("invoices"); }); }
    if(pay && !pay.__hesabiSweepBound){ pay.__hesabiSweepBound = true; pay.addEventListener("change", function(){ applyInvoiceFiltersFromDom(); runRender("invoices"); }); }
    if(clear && !clear.__hesabiSweepBound){ clear.__hesabiSweepBound = true; clear.addEventListener("click", function(ev){ ev.preventDefault(); try { if(typeof state === "object" && state){ state.invFilterCustomer = ""; state.invFilterPay = ""; } persist(); runRender("invoices"); } catch (_) {} }); }
    qsa("[data-print-invoice]", page).forEach(function(btn){ if(!btn.__hesabiSweepBound){ btn.__hesabiSweepBound = true; btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); shareInvoice(btn.getAttribute("data-print-invoice")); }); } });
    qsa("[data-toggle-row]", page).forEach(function(btn){ if(!btn.__hesabiSweepBound){ btn.__hesabiSweepBound = true; btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); toggleDetails(btn); }); } });
    window.__hesabiSettingsInvoicesSweepInvoicesBound = { at: Date.now(), shareButtons: qsa("[data-print-invoice]", page).length, detailButtons: qsa("[data-toggle-row]", page).length };
    return Object.assign({ ok:true, mounted:true }, window.__hesabiSettingsInvoicesSweepInvoicesBound);
  }

  function delegatedClick(ev){
    const tabBtn = ev.target && ev.target.closest ? ev.target.closest("[data-page-tab-key]") : null;
    if(tabBtn){
      const key = tabBtn.getAttribute("data-page-tab-key");
      if(key === "settings" || key === "invoices"){
        ev.preventDefault();
        ev.stopPropagation();
        setTab(key, tabBtn.getAttribute("data-page-tab-value"));
        return;
      }
    }
    const invoiceShare = ev.target && ev.target.closest ? ev.target.closest("[data-print-invoice]") : null;
    if(invoiceShare && inPage("invoices", invoiceShare)){
      ev.preventDefault(); ev.stopPropagation(); shareInvoice(invoiceShare.getAttribute("data-print-invoice")); return;
    }
    const details = ev.target && ev.target.closest ? ev.target.closest("[data-toggle-row]") : null;
    if(details && inPage("invoices", details)){
      ev.preventDefault(); ev.stopPropagation(); toggleDetails(details); return;
    }
  }

  function install(){
    if(window.__hesabiSettingsInvoicesPageSweepInstalled) return;
    window.__hesabiSettingsInvoicesPageSweepInstalled = true;
    document.addEventListener("click", delegatedClick, true);
    document.addEventListener("change", function(ev){
      const t = ev.target;
      if(!t) return;
      if((t.id === "invFilterCustomer" || t.id === "invFilterPay") && inPage("invoices", t)){
        applyInvoiceFiltersFromDom();
        runRender("invoices");
      }
    }, true);
    window.addEventListener("hashchange", function(){ setTimeout(bindCurrentPages, 50); });
    setTimeout(bindCurrentPages, 80);
  }

  function bindCurrentPages(){
    const settings = bindSettingsNow();
    const invoices = bindInvoicesNow();
    return { settings, invoices };
  }

  function settingsCheckText(){
    const s = typeof window.hesabiSettingsHelpersSelfCheck === "function" ? window.hesabiSettingsHelpersSelfCheck() : { ok:false, missing:"hesabiSettingsHelpersSelfCheck" };
    const runtime = typeof window.hesabiFullRuntimeSmokeSelfCheck === "function" ? window.hesabiFullRuntimeSmokeSelfCheck() : { ok:false };
    return "الإعدادات: " + (s.ok ? "سليمة" : "تحتاج مراجعة") + "\n" +
      "الفحص العام: " + (runtime.ok ? "سليم" : "يحتاج مراجعة") + "\n" +
      "الإصدار: " + VERSION + " / build " + BUILD_CODE;
  }

  function showSweepDialog(title, text){
    try { if(typeof showAppDialog === "function") { showAppDialog(title, text, "notice", [{ text:"موافق", cls:"ok" }]); return; } } catch (_) {}
    notify(text.replace(/\n/g, " - "), "notice");
  }

  function selfCheck(){
    const required = [
      ["renderSettings", typeof renderSettings === "function"],
      ["renderInvoices", typeof renderInvoices === "function"],
      ["settings helper", typeof window.hesabiSettingsHelpersSelfCheck === "function"],
      ["invoices helper", typeof window.hesabiInvoicesHelpersSelfCheck === "function"]
    ];
    const missing = required.filter(function(x){ return !x[1]; }).map(function(x){ return x[0]; });
    let settingsOk = false, invoicesOk = false;
    try { settingsOk = window.hesabiSettingsHelpersSelfCheck ? window.hesabiSettingsHelpersSelfCheck().ok !== false : false; } catch (_) {}
    try { invoicesOk = window.hesabiInvoicesHelpersSelfCheck ? window.hesabiInvoicesHelpersSelfCheck().ok !== false : false; } catch (_) {}
    return {
      ok: missing.length === 0 && settingsOk && invoicesOk,
      version: VERSION,
      build: BUILD_CODE,
      missing,
      settingsOk,
      invoicesOk,
      installed: !!window.__hesabiSettingsInvoicesPageSweepInstalled,
      bindings: {
        settings: window.__hesabiSettingsInvoicesSweepSettingsBound || null,
        invoices: window.__hesabiSettingsInvoicesSweepInvoicesBound || null
      },
      checkedAt: new Date().toISOString()
    };
  }

  window.hesabiSettingsInvoicesPageSweep = {
    version: VERSION,
    build: BUILD_CODE,
    install,
    bindCurrentPages,
    bindSettingsNow,
    bindInvoicesNow,
    selfCheck
  };
  window.hesabiSettingsInvoicesPageSweepSelfCheck = selfCheck;
  install();
})();
