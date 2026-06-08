/* Hesabi 1.0.71 - Full runtime smoke stabilization.
   Non-intrusive checks only: no Firestore writes, no order/payment/catalog mutations. */
(function(){
  "use strict";

  const VERSION = "1.0.71";
  const BUILD_CODE = 71;

  const EXPECTED_MODULES = [
    "js/modules/00_core_update_auth.js",
    "js/modules/01_update_cache_stability.js",
    "js/modules/07_utils_helpers.js",
    "js/modules/06_excel_import_export.js",
    "js/modules/05_items_helpers.js",
    "js/modules/04_catalog_helpers.js",
    "js/modules/03_reports_helpers.js",
    "js/modules/02_runtime_smoke.js",
    "js/modules/08_dialogs_toasts.js",
    "js/modules/09_android_bridge.js",
    "js/modules/10_firebase_live_data.js",
    "js/modules/20_router_setup_profile.js",
    "js/modules/30_purchase_catalog.js",
    "js/modules/40_pages_tables.js",
    "js/modules/50_auth_order_approval.js",
    "js/modules/60_payments_returns_policies.js",
    "js/modules/70_settings_owner_items_bridge.js",
    "js/modules/99_runtime_missing_functions_fix.js"
  ];

  const CHECKS = [
    { name: "update-cache-stability", fn: "hesabiUpdateCacheStabilitySelfCheck", required: true },
    { name: "reports-helpers", fn: "hesabiReportsHelpersSelfCheck", required: true },
    { name: "catalog-helpers", fn: "hesabiCatalogHelpersSelfCheck", required: true },
    { name: "items-helpers", fn: "hesabiItemsHelpersSelfCheck", required: true },
    { name: "excel-import-export", fn: "hesabiExcelImportExportSelfCheck", required: true },
    { name: "utils-helpers", fn: "hesabiUtilsHelpersSelfCheck", required: true },
    { name: "dialogs-toasts", fn: "hesabiDialogsToastsSelfCheck", required: true },
    { name: "android-bridge", fn: "hesabiAndroidBridgeSelfCheck", required: true },
    { name: "runtime-missing-functions", fn: "hesabiRuntimeMissingFunctionsFix", required: true },
    { name: "runtime-self-check", fn: "hesabiRuntimeSelfCheck", required: true },
    { name: "final-self-check", fn: "hesabiFinalSelfCheck", required: true }
  ];

  function nowIso(){
    try { return new Date().toISOString(); } catch (_) { return String(Date.now()); }
  }

  function safeString(value){
    try {
      if(value && value.message) return String(value.message);
      return String(value);
    } catch (_) {
      return "unknown";
    }
  }

  function isPlainResultOk(result){
    if(result && typeof result === "object" && "ok" in result) return result.ok !== false;
    return true;
  }

  function callNamedCheck(check){
    const fnName = typeof check === "string" ? check : check.fn;
    const label = typeof check === "string" ? check : check.name;
    const required = typeof check === "string" ? true : check.required !== false;
    const fn = window[fnName];
    if(typeof fn !== "function") {
      return { name: label, fn: fnName, ok: !required, required, missing: true };
    }
    try {
      const result = fn();
      return { name: label, fn: fnName, ok: isPlainResultOk(result), required, result };
    } catch (error) {
      return { name: label, fn: fnName, ok: false, required, error: safeString(error) };
    }
  }

  function checkLoaderState(){
    const runtime = window.__hesabiRuntime || {};
    const parts = Array.isArray(runtime.moduleParts) ? runtime.moduleParts : [];
    const loaded = Array.isArray(runtime.loadedParts) ? runtime.loadedParts : [];
    const failed = Array.isArray(runtime.failedParts) ? runtime.failedParts : [];
    const missingParts = EXPECTED_MODULES.filter(function(file){ return parts.indexOf(file) === -1; });
    const duplicateParts = parts.filter(function(file, index){ return parts.indexOf(file) !== index; });
    return {
      ok: missingParts.length === 0 && duplicateParts.length === 0 && failed.length === 0,
      expectedCount: EXPECTED_MODULES.length,
      declaredCount: parts.length,
      loadedCount: loaded.length,
      missingParts,
      duplicateParts,
      failedParts: failed,
      phase: runtime.phase || "unknown"
    };
  }

  function checkVersionState(){
    const runtime = window.__hesabiRuntime || {};
    const runtimeVersion = String(runtime.version || "");
    const runtimeBuild = Number(runtime.build || 0);
    return {
      ok: runtimeVersion === VERSION && runtimeBuild === BUILD_CODE,
      expectedVersion: VERSION,
      expectedBuild: BUILD_CODE,
      runtimeVersion,
      runtimeBuild
    };
  }

  function checkGlobals(){
    const requiredGlobals = CHECKS.map(function(item){ return item.fn; });
    requiredGlobals.push("hesabiFullRuntimeSmokeSelfCheck");
    requiredGlobals.push("hesabiRuntimeSmokeSelfCheck");
    const missing = requiredGlobals.filter(function(name){ return typeof window[name] !== "function"; });
    return { ok: missing.length === 0, requiredCount: requiredGlobals.length, missing };
  }

  function summarize(results){
    const failed = results.filter(function(item){ return item && item.ok === false; });
    const missing = results.filter(function(item){ return item && item.missing; });
    return { failedCount: failed.length, missingCount: missing.length, failed, missing };
  }

  function runFullRuntimeSmoke(){
    const loader = checkLoaderState();
    const version = checkVersionState();
    const globals = checkGlobals();
    const checks = CHECKS.map(callNamedCheck);
    const summary = summarize(checks);
    const ok = loader.ok && version.ok && globals.ok && summary.failedCount === 0;
    const result = {
      ok,
      version: VERSION,
      build: BUILD_CODE,
      checkedAt: nowIso(),
      loader,
      versionState: version,
      globals,
      checks,
      summary
    };
    window.__hesabiFullRuntimeSmoke = result;
    try {
      localStorage.setItem("hesabi_last_full_runtime_smoke", JSON.stringify({
        ok: result.ok,
        version: result.version,
        build: result.build,
        checkedAt: result.checkedAt,
        failedCount: result.summary.failedCount,
        missingCount: result.summary.missingCount,
        failedNames: result.summary.failed.map(function(item){ return item.name; })
      }));
    } catch (_) {}
    if(!ok) {
      try { console.warn("Hesabi full runtime smoke warnings:", result); } catch (_) {}
    }
    return result;
  }

  window.hesabiRuntimeSmoke = {
    version: VERSION,
    build: BUILD_CODE,
    expectedModules: EXPECTED_MODULES.slice(),
    checks: CHECKS.slice(),
    checkLoaderState,
    checkVersionState,
    checkGlobals,
    runNamedCheck: callNamedCheck,
    run: runFullRuntimeSmoke
  };

  window.hesabiFullRuntimeSmokeSelfCheck = runFullRuntimeSmoke;
  window.hesabiRuntimeSmokeSelfCheck = runFullRuntimeSmoke;
})();
