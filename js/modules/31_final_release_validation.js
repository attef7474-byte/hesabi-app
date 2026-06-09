/* Hesabi 1.0.109 - Final Release Validation.
   Scope: diagnostics + mobile guards only. No Firestore writes, no order/payment/item mutations. */
(function(){
  "use strict";
  const VERSION = "1.0.109";
  const BUILD_CODE = 109;
  const CRITICAL_MODULES = [
    "js/modules/25_apk_version_final_check.js",
    "js/modules/26_production_release_candidate.js",
    "js/modules/27_customer_catalog_bug_fixes.js",
    "js/modules/28_payments_statements_real_data.js",
    "js/modules/29_items_mobile_table_fix.js",
    "js/modules/31_final_release_validation.js",
    "js/modules/99_runtime_missing_functions_fix.js",
    "js/modules/42_returns_schedules_page_sweep.js",
    "js/modules/43_messages_notifications_page_sweep.js",
    "js/modules/44_customers_owner_page_sweep.js",
    "js/modules/45_reports_policies_page_sweep.js",
    "js/modules/46_audit_update_cache_final_sweep.js",
    "js/modules/47_stock_collections_page_sweep.js",
    "js/modules/48_auth_customer_linking_page_sweep.js",
    "js/modules/49_home_search_navigation_sweep.js"
  ];
  const CRITICAL_CHECKS = [
    "hesabiApkVersionFinalCheckSelfCheck",
    "hesabiProductionReleaseCandidateSelfCheck",
    "hesabiCustomerCatalogBugFixesSelfCheck",
    "hesabiPaymentsStatementsRealDataSelfCheck",
    "hesabiItemsMobileTableFixSelfCheck",
    "hesabiFullRuntimeSmokeSelfCheck",
    "hesabiRuntimeSmokeSelfCheck",
    "hesabiReturnsSchedulesPageSweepSelfCheck",
    "hesabiMessagesNotificationsPageSweepSelfCheck",
    "hesabiCustomersOwnerPageSweepSelfCheck",
    "hesabiReportsPoliciesPageSweepSelfCheck",
    "hesabiAuditUpdateCacheFinalSweepSelfCheck",
    "hesabiStockCollectionsPageSweepSelfCheck",
    "hesabiAuthCustomerLinkingPageSweepSelfCheck",
    "hesabiHomeSearchNavigationSweepSelfCheck"
  ];
  function safeArray(value){ return Array.isArray(value) ? value : []; }
  function safeString(value){ try{ return String(value == null ? "" : value); }catch(_){ return ""; } }
  function runtime(){ return window.__hesabiRuntime || {}; }
  function injectFinalMobileGuards(){
    try{
      if(document.getElementById("hesabi-final-release-mobile-guards")) return true;
      const style = document.createElement("style");
      style.id = "hesabi-final-release-mobile-guards";
      style.textContent = "html,body,.app{max-width:100%!important;overflow-x:hidden!important}.top,.card{max-width:100%!important;box-sizing:border-box!important}.title h1,.top h1{max-width:calc(100vw - 125px)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.tablewrap,.mobile-table-wrap,.items-table-scroll{max-width:100%!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}";
      document.head.appendChild(style);
      return true;
    }catch(_){ return false; }
  }
  function checkLoaderConsistency(){
    const rt = runtime();
    const parts = safeArray(rt.moduleParts);
    const loaded = safeArray(rt.loadedParts).map(function(x){ return safeString(x && x.file); });
    const failed = safeArray(rt.failedParts);
    const missingDeclared = CRITICAL_MODULES.filter(function(file){ return parts.indexOf(file) === -1; });
    const missingLoaded = CRITICAL_MODULES.filter(function(file){ return loaded.indexOf(file) === -1; });
    const duplicateParts = parts.filter(function(file, i){ return parts.indexOf(file) !== i; });
    return { ok: missingDeclared.length === 0 && failed.length === 0 && duplicateParts.length === 0, partsCount: parts.length, loadedCount: loaded.length, missingDeclared, missingLoaded, duplicateParts, failedParts: failed };
  }
  function checkVersionState(){
    const rt = runtime();
    const appVersion = typeof APP_VERSION !== "undefined" ? safeString(APP_VERSION) : "";
    const appBuild = typeof APP_BUILD_CODE !== "undefined" ? Number(APP_BUILD_CODE || 0) : 0;
    return { ok: safeString(rt.version) === VERSION && Number(rt.build || 0) === BUILD_CODE && appVersion === VERSION && appBuild === BUILD_CODE, expectedVersion: VERSION, expectedBuild: BUILD_CODE, runtimeVersion: safeString(rt.version), runtimeBuild: Number(rt.build || 0), appVersion, appBuild };
  }
  function checkCriticalGlobals(){
    const missing = CRITICAL_CHECKS.filter(function(name){ return typeof window[name] !== "function"; });
    return { ok: missing.length === 0, required: CRITICAL_CHECKS.slice(), missing };
  }
  function checkMobileOverflow(){
    let width = 0, scroll = 0;
    try{ width = window.innerWidth || document.documentElement.clientWidth || 0; }catch(_){}
    try{ scroll = Math.max(document.documentElement.scrollWidth || 0, document.body ? document.body.scrollWidth || 0 : 0); }catch(_){}
    const overflowPx = Math.max(0, scroll - width);
    return { ok: overflowPx <= 24, width, scrollWidth: scroll, overflowPx, warning: overflowPx > 24 ? "يوجد تمدد أفقي ظاهر في الصفحة الحالية؛ التقط صورة للصفحة ليتم إصلاحها." : "" };
  }
  function runFinalValidation(){
    injectFinalMobileGuards();
    const loader = checkLoaderConsistency();
    const version = checkVersionState();
    const globals = checkCriticalGlobals();
    const mobile = checkMobileOverflow();
    const ok = loader.ok && version.ok && globals.ok;
    const result = { ok, version: VERSION, build: BUILD_CODE, loader, versionState: version, globals, mobileLayout: mobile, checkedAt: new Date().toISOString(), note: "هذا فحص نهائي آمن ولا ينفذ أي عمليات كتابة أو اعتماد." };
    window.__hesabiFinalReleaseValidation = result;
    try{ localStorage.setItem("hesabi_final_release_validation", JSON.stringify({ ok: result.ok, version: VERSION, build: BUILD_CODE, at: result.checkedAt, overflowPx: mobile.overflowPx, missingGlobals: globals.missing, missingModules: loader.missingDeclared })); }catch(_){}
    if(!result.ok){ try{ console.warn("Hesabi final release validation warnings:", result); }catch(_){} }
    return result;
  }
  injectFinalMobileGuards();
  window.hesabiFinalReleaseValidation = { version: VERSION, build: BUILD_CODE, criticalModules: CRITICAL_MODULES.slice(), criticalChecks: CRITICAL_CHECKS.slice(), injectFinalMobileGuards, checkLoaderConsistency, checkVersionState, checkCriticalGlobals, checkMobileOverflow, run: runFinalValidation };
  window.hesabiFinalReleaseValidationSelfCheck = runFinalValidation;
})();
