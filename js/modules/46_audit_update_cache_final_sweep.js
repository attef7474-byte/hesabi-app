/* Hesabi 1.0.124 - Audit/update cache module without settings injection.
   This module intentionally does not add buttons/cards to page_settings. */
(function(){
  "use strict";
  const VERSION = "1.0.124";
  const BUILD_CODE = 124;

  function byId(id){ try { return document.getElementById(id); } catch (_) { return null; } }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch (_) { return []; } }
  function safeString(value){ try { return value == null ? "" : String(value); } catch (_) { return ""; } }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch (_) {} }

  function ensureMobileTableGuard(root){
    if(!root) return false;
    try {
      qsa(".table-wrap,.tablewrap,.mobile-table-wrap", root).forEach(function(w){
        w.style.maxWidth = "100%";
        w.style.overflowX = "auto";
        w.style.webkitOverflowScrolling = "touch";
      });
      qsa("table", root).forEach(function(t){ if(!t.style.minWidth) t.style.minWidth = "590px"; });
      return true;
    } catch (_) { return false; }
  }

  function bindAuditNow(){
    const root = byId("page_audit");
    if(!root) return { ok:false, reason:"audit page missing" };
    ensureMobileTableGuard(root);
    try { if(typeof bindPageTabs === "function") bindPageTabs("audit", renderAudit); } catch (_) {}
    window.__hesabiAuditFinalBound = { ok:true, at:Date.now() };
    return window.__hesabiAuditFinalBound;
  }

  async function finalCacheSweep(reason){
    const result = { ok:true, version:VERSION, build:BUILD_CODE, reason:reason || "manual", at:new Date().toISOString() };
    try {
      if(window.hesabiUpdateCacheStability && typeof window.hesabiUpdateCacheStability.clearAppCaches === "function"){
        result.base = await window.hesabiUpdateCacheStability.clearAppCaches(reason || "manual");
      }
    } catch (error) {
      result.ok = false;
      result.error = safeString(error && error.message || error);
    }
    window.__hesabiFinalCacheSweepLastResult = result;
    return result;
  }
  async function refreshWebUiFinal(){
    await finalCacheSweep("web-ui-refresh");
    if(typeof refreshWebUiNow === "function") return refreshWebUiNow();
    try { location.replace(location.pathname + "?v=" + Date.now()); } catch (_) {}
  }
  async function cleanCacheFinal(){
    const result = await finalCacheSweep("cache-clean");
    notify(result.ok ? "تم تنظيف الكاش." : "تمت محاولة تنظيف الكاش مع وجود تحذير.", result.ok ? "success" : "warn");
    return result;
  }
  function finalUpdateCheck(){
    return { ok:true, version:VERSION, build:BUILD_CODE, settingsInjection:false, checkedAt:new Date().toISOString() };
  }
  function bindUpdateCacheNow(){
    return { ok:true, version:VERSION, build:BUILD_CODE, settingsInjection:false };
  }
  function bindCurrentPages(){
    const result = {};
    if(byId("page_audit")) result.audit = bindAuditNow();
    return result;
  }
  function activate(){
    try { bindCurrentPages(); } catch (_) {}
    window.__hesabiAuditUpdateCacheFinalInstalled = { ok:true, version:VERSION, build:BUILD_CODE, settingsInjection:false, at:Date.now() };
    return window.__hesabiAuditUpdateCacheFinalInstalled;
  }
  function selfCheck(){
    let forbidden = false;
    try { forbidden = !!document.querySelector(".settings-final-check"); } catch (_) {}
    return { ok:!forbidden, version:VERSION, build:BUILD_CODE, settingsInjection:false, forbidden, installed:!!window.__hesabiAuditUpdateCacheFinalInstalled };
  }

  window.hesabiAuditUpdateCacheFinalSweep = { version:VERSION, build:BUILD_CODE, bindAuditNow, bindUpdateCacheNow, bindCurrentPages, ensureMobileTableGuard, finalCacheSweep, refreshWebUiFinal, cleanCacheFinal, finalUpdateCheck, activate, selfCheck };
  window.hesabiAuditUpdateCacheFinalSweepSelfCheck = selfCheck;
  activate();
})();
