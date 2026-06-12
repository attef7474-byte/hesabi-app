/* Hesabi 1.0.126 - Audit helpers only.
   This module no longer injects anything into settings. */
(function(){
  "use strict";
  const VERSION = "1.0.128";
  const BUILD_CODE = 128;

  function byId(id){ try { return document.getElementById(id); } catch (_) { return null; } }
  function page(name){ return byId("page_" + name); }
  function qsa(selector, root){ try { return Array.from((root || document).querySelectorAll(selector)); } catch (_) { return []; } }
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
      qsa("table", root).forEach(function(t){
        t.style.width = "100%";
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  function auditRowsFromCache(){
    try { return Array.isArray(cache.auditLogs) ? cache.auditLogs.slice() : []; } catch (_) { return []; }
  }

  function exportAuditCsv(){
    try {
      const rows = auditRowsFromCache();
      const header = ["date","action","actorRole","actorName","details"];
      const csvEscape = function(value){ return '"' + safeString(value).replace(/"/g, '""') + '"'; };
      const lines = [header.map(csvEscape).join(",")];
      rows.forEach(function(a){
        const date = a && a.createdMs ? new Date(Number(a.createdMs)).toISOString() : "";
        lines.push([date, a && a.action, a && a.actorRole, a && a.actorName, JSON.stringify((a && a.details) || {})].map(csvEscape).join(","));
      });
      const blob = new Blob(["\ufeff" + lines.join("\n")], { type:"text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "hesabi-audit-log-" + new Date().toISOString().slice(0,10) + ".csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function(){ try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
      notify("تم تجهيز ملف سجل العمليات.", "success");
      return true;
    } catch (error) {
      notify("تعذر تصدير سجل العمليات: " + safeString(error && error.message || error), "error");
      return false;
    }
  }

  function bindAuditNow(){
    const root = page("audit");
    if(!root) return { ok:false, reason:"audit page missing" };
    ensureMobileTableGuard(root);
    try { if(typeof bindPageTabs === "function" && typeof renderAudit === "function") bindPageTabs("audit", renderAudit); } catch (_) {}
    window.__hesabiAuditFinalBound = { at:Date.now(), rows:auditRowsFromCache().length };
    return Object.assign({ ok:true }, window.__hesabiAuditFinalBound);
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
    await finalCacheSweep("web-refresh");
    try { location.replace((location.pathname || "/") + "?v=" + encodeURIComponent(VERSION + "-" + Date.now())); } catch (_) {}
  }

  async function cleanCacheFinal(){
    const result = await finalCacheSweep("cache-clean");
    notify(result.ok ? "تم تنظيف الكاش." : "تمت محاولة التنظيف مع وجود تحذيرات.", result.ok ? "success" : "warn");
    return result;
  }

  function finalUpdateCheck(){
    return { ok:true, version:VERSION, build:BUILD_CODE, checkedAt:new Date().toISOString() };
  }

  function activate(){
    try { bindAuditNow(); } catch (_) {}
    return { ok:true, version:VERSION, build:BUILD_CODE, settingsInjection:false };
  }

  function selfCheck(){
    const forbidden = !!byId(("settings" + "FinalCacheCheck"));
    return { ok:!forbidden, version:VERSION, build:BUILD_CODE, settingsInjection:false, forbiddenButtonPresent:forbidden, installed:true };
  }

  const api = {
    version:VERSION,
    build:BUILD_CODE,
    bindAuditNow,
    ensureMobileTableGuard,
    exportAuditCsv,
    finalCacheSweep,
    refreshWebUiFinal,
    cleanCacheFinal,
    finalUpdateCheck,
    activate,
    selfCheck
  };

  window.hesabiAuditUpdateCacheFinalSweep = api;
  window.hesabiAuditUpdateCacheFinalSweepSelfCheck = selfCheck;
  activate();
})();