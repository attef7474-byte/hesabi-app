/* Hesabi 1.0.87 - Production Release Candidate.
   Aggregates existing smoke checks only. It does not mutate data or call operational writes. */
(function(){
  "use strict";
  const VERSION = "1.0.87";
  const BUILD_CODE = 87;
  const TARGET_VERSION = "1.0.89";
  const TARGET_BUILD = 89;
  const CRITICAL_CHECKS = [
    ["full-runtime", "hesabiFullRuntimeSmokeSelfCheck"],
    ["apk-version-final", "hesabiApkVersionFinalCheckSelfCheck"],
    ["firestore-rules-alignment", "hesabiFirestoreRulesAlignmentSelfCheck"],
    ["customer-purchase", "hesabiCustomerPurchaseSmokeSelfCheck"],
    ["trader-workflow", "hesabiTraderWorkflowSmokeSelfCheck"],
    ["android-native", "hesabiAndroidNativeSmokeSelfCheck"],
    ["catalog-bug-fixes", "hesabiCustomerCatalogBugFixesSelfCheck"],
    ["payments-statements-real-data", "hesabiPaymentsStatementsRealDataSelfCheck"]
  ];
  function callCheck(label, fnName){
    const fn = window[fnName];
    if(typeof fn !== "function") return { label, fn: fnName, ok: false, missing: true };
    try {
      const result = fn();
      return { label, fn: fnName, ok: !(result && typeof result === "object" && result.ok === false), result };
    } catch (error) { return { label, fn: fnName, ok: false, error: String(error && error.message || error) }; }
  }
  function dataSnapshot(){
    const c = window.cache || {};
    const arr = function(name){ return Array.isArray(c[name]) ? c[name] : []; };
    const s = window.state || {};
    return {
      role: s.role || "",
      shopId: s.shopId || s.activeShopId || "",
      customerId: s.customerId || "",
      items: arr("items").length,
      customers: arr("customers").length,
      orders: arr("orders").length,
      invoices: arr("invoices").length,
      payments: arr("payments").length,
      ledger: arr("customerLedger").length,
      returns: arr("returns").length,
      schedules: arr("schedules").length,
      messages: arr("messages").length
    };
  }
  function releaseReadiness(){
    const checks = CRITICAL_CHECKS.map(function(pair){ return callCheck(pair[0], pair[1]); });
    const failed = checks.filter(function(x){ return x.ok === false; });
    const snapshot = dataSnapshot();
    const warnings = [];
    if(!snapshot.shopId && (snapshot.role === "trader" || snapshot.role === "customer")) warnings.push("لا يوجد shopId نشط أثناء الفحص.");
    if(snapshot.role === "trader" && snapshot.items === 0) warnings.push("لا توجد أصناف محملة للتاجر؛ افحص المستمعات أو الصلاحيات.");
    if(snapshot.role === "customer" && !snapshot.customerId) warnings.push("لا يوجد customerId نشط للعميل.");
    const result = { ok: failed.length === 0, version: VERSION, build: BUILD_CODE, targetVersion: TARGET_VERSION, targetBuild: TARGET_BUILD, checks, failed, warnings, snapshot, checkedAt: new Date().toISOString() };
    try { localStorage.setItem("hesabi_last_release_candidate_check", JSON.stringify({ ok:result.ok, at:result.checkedAt, failed:failed.map(function(x){return x.label;}), warnings })); } catch (_) {}
    return result;
  }
  function selfCheck(){
    const required = ["callCheck","dataSnapshot","releaseReadiness"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    const snapshot = dataSnapshot();
    return { ok: missing.length === 0 && typeof snapshot === "object", version: VERSION, build: BUILD_CODE, targetVersion: TARGET_VERSION, targetBuild: TARGET_BUILD, missing, criticalChecks: CRITICAL_CHECKS.length };
  }
  const api = { version: VERSION, build: BUILD_CODE, targetVersion: TARGET_VERSION, targetBuild: TARGET_BUILD, criticalChecks: CRITICAL_CHECKS.slice(), callCheck, dataSnapshot, releaseReadiness };
  window.hesabiProductionReleaseCandidate = api;
  window.hesabiProductionReleaseCandidateSelfCheck = selfCheck;
})();
