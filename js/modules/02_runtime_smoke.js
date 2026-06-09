/* Hesabi 1.0.106 - Full runtime smoke stabilization.
   Non-intrusive checks only: no Firestore writes, no order/payment/catalog mutations. */
(function(){
  "use strict";

  const VERSION = "1.0.106";
  const BUILD_CODE = 106;

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
    "js/modules/11_settings_helpers.js",
    "js/modules/12_messages_helpers.js",
    "js/modules/13_payments_helpers.js",
    "js/modules/14_invoices_helpers.js",
    "js/modules/15_statements_helpers.js",
    "js/modules/16_returns_helpers.js",
    "js/modules/17_schedules_helpers.js",
    "js/modules/18_notifications_helpers.js",
    "js/modules/19_owner_subscription_helpers.js",
    "js/modules/20_permissions_role_guards.js",
    "js/modules/21_firestore_rules_alignment.js",
    "js/modules/22_customer_purchase_smoke.js",
    "js/modules/23_trader_workflow_smoke.js",
    "js/modules/24_android_native_smoke.js",
    "js/modules/25_apk_version_final_check.js",
    "js/modules/26_production_release_candidate.js",
    "js/modules/27_customer_catalog_bug_fixes.js",
    "js/modules/28_payments_statements_real_data.js",
    "js/modules/20_router_setup_profile.js",
    "js/modules/30_purchase_catalog.js",
    "js/modules/40_pages_tables.js",
    "js/modules/50_auth_order_approval.js",
    "js/modules/60_payments_returns_policies.js",
    "js/modules/70_settings_owner_items_bridge.js",
    "js/modules/29_items_mobile_table_fix.js",
    "js/modules/31_final_release_validation.js",
    "js/modules/32_items_actions_search_fix.js",
    "js/modules/33_utf8_arabic_encoding_repair.js",
    "js/modules/99_runtime_missing_functions_fix.js",
    "js/modules/34_items_final_interaction_controller.js",
    "js/modules/35_items_remaining_actions_fix.js",
    "js/modules/36_settings_invoices_page_sweep.js",
    "js/modules/37_payments_statements_page_sweep.js",
    "js/modules/38_orders_approval_page_sweep.js",
    "js/modules/39_remove_page_explanations.js",
    "js/modules/41_catalog_cart_purchase_page_sweep.js",
    "js/modules/42_returns_schedules_page_sweep.js",
    "js/modules/43_messages_notifications_page_sweep.js",
    "js/modules/44_customers_owner_page_sweep.js",
    "js/modules/45_reports_policies_page_sweep.js",
    "js/modules/46_audit_update_cache_final_sweep.js"
  ];

  const CHECKS = [
    { name: "update-cache-stability", fn: "hesabiUpdateCacheStabilitySelfCheck", required: true },
    { name: "settings-helpers", fn: "hesabiSettingsHelpersSelfCheck", required: true },
    { name: "messages-helpers", fn: "hesabiMessagesHelpersSelfCheck", required: true },
    { name: "payments-helpers", fn: "hesabiPaymentsHelpersSelfCheck", required: true },
    { name: "invoices-helpers", fn: "hesabiInvoicesHelpersSelfCheck", required: true },
    { name: "statements-helpers", fn: "hesabiStatementsHelpersSelfCheck", required: true },
    { name: "returns-helpers", fn: "hesabiReturnsHelpersSelfCheck", required: true },
    { name: "schedules-helpers", fn: "hesabiSchedulesHelpersSelfCheck", required: true },
    { name: "notifications-helpers", fn: "hesabiNotificationsHelpersSelfCheck", required: true },
    { name: "owner-subscription-helpers", fn: "hesabiOwnerSubscriptionHelpersSelfCheck", required: true },
    { name: "permissions-role-guards", fn: "hesabiPermissionsRoleGuardsSelfCheck", required: true },
    { name: "firestore-rules-alignment", fn: "hesabiFirestoreRulesAlignmentSelfCheck", required: true },
    { name: "customer-purchase-smoke", fn: "hesabiCustomerPurchaseSmokeSelfCheck", required: true },
    { name: "trader-workflow-smoke", fn: "hesabiTraderWorkflowSmokeSelfCheck", required: true },
    { name: "android-native-smoke", fn: "hesabiAndroidNativeSmokeSelfCheck", required: true },
    { name: "apk-version-final", fn: "hesabiApkVersionFinalCheckSelfCheck", required: true },
    { name: "production-release-candidate", fn: "hesabiProductionReleaseCandidateSelfCheck", required: true },
    { name: "customer-catalog-bug-fixes", fn: "hesabiCustomerCatalogBugFixesSelfCheck", required: true },
    { name: "payments-statements-real-data", fn: "hesabiPaymentsStatementsRealDataSelfCheck", required: true },
    { name: "reports-helpers", fn: "hesabiReportsHelpersSelfCheck", required: true },
    { name: "catalog-helpers", fn: "hesabiCatalogHelpersSelfCheck", required: true },
    { name: "items-mobile-table-fix", fn: "hesabiItemsMobileTableFixSelfCheck", required: true },
    { name: "items-helpers", fn: "hesabiItemsHelpersSelfCheck", required: true },
    { name: "excel-import-export", fn: "hesabiExcelImportExportSelfCheck", required: true },
    { name: "utils-helpers", fn: "hesabiUtilsHelpersSelfCheck", required: true },
    { name: "dialogs-toasts", fn: "hesabiDialogsToastsSelfCheck", required: true },
    { name: "android-bridge", fn: "hesabiAndroidBridgeSelfCheck", required: true },
    { name: "final-release-validation", fn: "hesabiFinalReleaseValidationSelfCheck", required: true },
    { name: "settings-invoices-page-sweep", fn: "hesabiSettingsInvoicesPageSweepSelfCheck", required: true },
    { name: "payments-statements-page-sweep", fn: "hesabiPaymentsStatementsPageSweepSelfCheck", required: true },
    { name: "orders-approval-page-sweep", fn: "hesabiOrdersApprovalPageSweepSelfCheck", required: true },
    { name: "remove-page-explanations", fn: "hesabiRemovePageExplanationsSelfCheck", required: true },
    { name: "catalog-cart-purchase-page-sweep", fn: "hesabiCatalogCartPurchasePageSweepSelfCheck", required: true },
    { name: "returns-schedules-page-sweep", fn: "hesabiReturnsSchedulesPageSweepSelfCheck", required: true },
    { name: "messages-notifications-page-sweep", fn: "hesabiMessagesNotificationsPageSweepSelfCheck", required: true },
    { name: "customers-owner-page-sweep", fn: "hesabiCustomersOwnerPageSweepSelfCheck", required: true },
    { name: "reports-policies-page-sweep", fn: "hesabiReportsPoliciesPageSweepSelfCheck", required: true },
    { name: "items-actions-search-fix", fn: "hesabiItemsActionsSearchFixSelfCheck", required: true },
    { name: "utf8-arabic-encoding-repair", fn: "hesabiUtf8ArabicEncodingRepairSelfCheck", required: true },
    { name: "items-final-interaction-controller", fn: "hesabiItemsFinalInteractionControllerSelfCheck", required: true },
    { name: "items-remaining-actions-fix", fn: "hesabiItemsRemainingActionsFixSelfCheck", required: true },
    { name: "audit-update-cache-final-sweep", fn: "hesabiAuditUpdateCacheFinalSweepSelfCheck", required: true },
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
