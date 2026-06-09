// Hesabi App 1.0.108
// Stable module loader + runtime self check.
// Loads module parts in a fixed order, imports them as one runtime module to preserve shared scope,
// and exposes diagnostics so startup errors are clear instead of leaving a blank screen.
const HESABI_APP_VERSION = '1.0.108';
const HESABI_APP_BUILD_CODE = 108;

const HESABI_MODULE_PARTS = [
  'js/modules/00_core_update_auth.js',
  'js/modules/01_update_cache_stability.js',
  'js/modules/07_utils_helpers.js',
  'js/modules/06_excel_import_export.js',
  'js/modules/05_items_helpers.js',
  'js/modules/04_catalog_helpers.js',
  'js/modules/03_reports_helpers.js',
  'js/modules/02_runtime_smoke.js',
  'js/modules/08_dialogs_toasts.js',
  'js/modules/09_android_bridge.js',
  'js/modules/10_firebase_live_data.js',
  'js/modules/11_settings_helpers.js',
  'js/modules/12_messages_helpers.js',
  'js/modules/13_payments_helpers.js',
  'js/modules/14_invoices_helpers.js',
  'js/modules/15_statements_helpers.js',
  'js/modules/16_returns_helpers.js',
  'js/modules/17_schedules_helpers.js',
  'js/modules/18_notifications_helpers.js',
  'js/modules/19_owner_subscription_helpers.js',
  'js/modules/20_permissions_role_guards.js',
  'js/modules/21_firestore_rules_alignment.js',
  'js/modules/22_customer_purchase_smoke.js',
  'js/modules/23_trader_workflow_smoke.js',
  'js/modules/24_android_native_smoke.js',
  'js/modules/25_apk_version_final_check.js',
  'js/modules/26_production_release_candidate.js',
  'js/modules/27_customer_catalog_bug_fixes.js',
  'js/modules/28_payments_statements_real_data.js',
  'js/modules/20_router_setup_profile.js',
  'js/modules/30_purchase_catalog.js',
  'js/modules/40_pages_tables.js',
  'js/modules/50_auth_order_approval.js',
  'js/modules/60_payments_returns_policies.js',
  'js/modules/70_settings_owner_items_bridge.js',
  'js/modules/29_items_mobile_table_fix.js',
  'js/modules/31_final_release_validation.js',
  'js/modules/32_items_actions_search_fix.js',
  'js/modules/33_utf8_arabic_encoding_repair.js',
  'js/modules/99_runtime_missing_functions_fix.js',
  'js/modules/34_items_final_interaction_controller.js',
  'js/modules/35_items_remaining_actions_fix.js',
  'js/modules/36_settings_invoices_page_sweep.js',
  'js/modules/37_payments_statements_page_sweep.js',
  'js/modules/38_orders_approval_page_sweep.js',
  'js/modules/39_remove_page_explanations.js',
  'js/modules/41_catalog_cart_purchase_page_sweep.js',
  'js/modules/42_returns_schedules_page_sweep.js',
  'js/modules/43_messages_notifications_page_sweep.js',
  'js/modules/44_customers_owner_page_sweep.js',
  'js/modules/45_reports_policies_page_sweep.js',
  'js/modules/46_audit_update_cache_final_sweep.js',
  'js/modules/47_stock_collections_page_sweep.js',
  'js/modules/48_auth_customer_linking_page_sweep.js',
];

const HESABI_REQUIRED_GLOBALS = [
  'hesabiFinalSelfCheck',
  'hesabiRuntimeSelfCheck',
  'showStartupRecoveryDialog',
  'refreshWebUiNow',
  'downloadApkUpdate',
  'hesabiDialogsToastsSelfCheck',
  'hesabiUtilsHelpersSelfCheck',
  'hesabiExcelImportExportSelfCheck',
  'hesabiItemsHelpersSelfCheck',
  'hesabiCatalogHelpersSelfCheck',
  'hesabiReportsHelpersSelfCheck',
  'hesabiUpdateCacheStabilitySelfCheck',
  'hesabiSettingsHelpersSelfCheck',
  'hesabiMessagesHelpersSelfCheck',
  'hesabiPaymentsHelpersSelfCheck',
  'hesabiInvoicesHelpersSelfCheck',
  'hesabiStatementsHelpersSelfCheck',
  'hesabiReturnsHelpersSelfCheck',
  'hesabiSchedulesHelpersSelfCheck',
  'hesabiNotificationsHelpersSelfCheck',
  'hesabiOwnerSubscriptionHelpersSelfCheck',
  'hesabiPermissionsRoleGuardsSelfCheck',
  'hesabiFirestoreRulesAlignmentSelfCheck',
  'hesabiCustomerPurchaseSmokeSelfCheck',
  'hesabiTraderWorkflowSmokeSelfCheck',
  'hesabiAndroidNativeSmokeSelfCheck',
  'hesabiApkVersionFinalCheckSelfCheck',
  'hesabiProductionReleaseCandidateSelfCheck',
  'hesabiCustomerCatalogBugFixesSelfCheck',
  'hesabiPaymentsStatementsRealDataSelfCheck',
  'hesabiItemsMobileTableFixSelfCheck',
  'hesabiFinalReleaseValidationSelfCheck',
  'hesabiItemsActionsSearchFixSelfCheck',
  'hesabiUtf8ArabicEncodingRepairSelfCheck',
  'hesabiItemsFinalInteractionControllerSelfCheck',
  'hesabiItemsRemainingActionsFixSelfCheck',
  'hesabiSettingsInvoicesPageSweepSelfCheck',
  'hesabiPaymentsStatementsPageSweepSelfCheck',
  'hesabiOrdersApprovalPageSweepSelfCheck',
  'hesabiRemovePageExplanationsSelfCheck',
  'hesabiFullRuntimeSmokeSelfCheck',
  'hesabiReturnsSchedulesPageSweepSelfCheck',
  'hesabiMessagesNotificationsPageSweepSelfCheck',
  'hesabiCustomersOwnerPageSweepSelfCheck',
  'hesabiReportsPoliciesPageSweepSelfCheck',
  'hesabiCatalogCartPurchasePageSweepSelfCheck',
  'hesabiAuditUpdateCacheFinalSweepSelfCheck',
  'hesabiStockCollectionsPageSweepSelfCheck',
  'hesabiAuthCustomerLinkingPageSweepSelfCheck',
];

const HESABI_RUNTIME_TIMEOUT_MS = 25000;

window.__hesabiRuntime = {
  version: HESABI_APP_VERSION,
  build: HESABI_APP_BUILD_CODE,
  startedAt: Date.now(),
  phase: 'starting',
  moduleParts: HESABI_MODULE_PARTS.slice(),
  loadedParts: [],
  failedParts: [],
  checks: [],
  error: null
};

function setRuntimePhase(phase, extra = {}) {
  window.__hesabiRuntime = Object.assign(window.__hesabiRuntime || {}, extra, { phase, updatedAt: Date.now() });
  try { document.documentElement.setAttribute('data-hesabi-runtime-phase', phase); } catch (_) {}
}

function runtimeMessage(title, body, details) {
  const text = [body || '', details ? ('\n\n' + details) : ''].join('').trim();
  if (typeof window.showStartupRecoveryDialog === 'function') {
    window.showStartupRecoveryDialog(text || title || 'تعذر تشغيل التطبيق.');
    return;
  }
  const box = document.getElementById('msg');
  if (box) {
    box.innerHTML = '<div class="msg error"><b>' + escapeHtml(title || 'تعذر تشغيل التطبيق') + '</b><br>' +
      escapeHtml(text || 'حدّث الواجهات أو ثبّت آخر APK.') + '</div>';
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = HESABI_RUNTIME_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), timeoutMs);
  try {
    return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

async function loadPart(part, versionQuery) {
  const started = Date.now();
  const response = await fetchWithTimeout(part + versionQuery, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('تعذر تحميل ملف: ' + part + ' - HTTP ' + response.status);
  }
  const text = await response.text();
  if (!text || !text.trim()) {
    throw new Error('ملف فارغ أو غير صالح: ' + part);
  }
  window.__hesabiRuntime.loadedParts.push({ file: part, bytes: text.length, ms: Date.now() - started });
  return '\n/* ===== ' + part + ' ===== */\n' + text;
}

function validateRequiredGlobals() {
  const missing = HESABI_REQUIRED_GLOBALS.filter(name => typeof window[name] !== 'function');
  return { ok: missing.length === 0, missing };
}

function runPostImportChecks() {
  const results = [];
  const globals = validateRequiredGlobals();
  results.push({ name: 'required-window-globals', ok: globals.ok, missing: globals.missing });

  if (typeof window.hesabiRuntimeSelfCheck === 'function') {
    try { results.push({ name: 'runtime-self-check', result: window.hesabiRuntimeSelfCheck(), ok: !!window.hesabiRuntimeSelfCheck().ok }); }
    catch (error) { results.push({ name: 'runtime-self-check', ok: false, error: String(error && error.message || error) }); }
  }

  if (typeof window.hesabiFinalSelfCheck === 'function') {
    try { const finalResult = window.hesabiFinalSelfCheck(); results.push({ name: 'final-self-check', ok: !!finalResult.ok, result: finalResult }); }
    catch (error) { results.push({ name: 'final-self-check', ok: false, error: String(error && error.message || error) }); }
  }

  if (typeof window.hesabiUpdateCacheStabilitySelfCheck === 'function') {
    try { const cacheResult = window.hesabiUpdateCacheStabilitySelfCheck(); results.push({ name: 'update-cache-stability', ok: !!cacheResult.ok, result: cacheResult }); }
    catch (error) { results.push({ name: 'update-cache-stability', ok: false, error: String(error && error.message || error) }); }
  }

  if (typeof window.hesabiFullRuntimeSmokeSelfCheck === 'function') {
    try { const smokeResult = window.hesabiFullRuntimeSmokeSelfCheck(); results.push({ name: 'full-runtime-smoke', ok: !!smokeResult.ok, result: smokeResult }); }
    catch (error) { results.push({ name: 'full-runtime-smoke', ok: false, error: String(error && error.message || error) }); }
  }

  window.__hesabiRuntime.checks = results;
  const failed = results.filter(item => item.ok === false);
  if (failed.length) {
    console.warn('Hesabi runtime self-check warnings:', failed);
    try { localStorage.setItem('hesabi_last_runtime_warning', JSON.stringify({ version: HESABI_APP_VERSION, build: HESABI_APP_BUILD_CODE, failed, at: Date.now() })); } catch (_) {}
  }
  return { ok: failed.length === 0, results, failed };
}

async function loadHesabiRuntime() {
  setRuntimePhase('loading-manifest');
  const versionQuery = '?v=' + encodeURIComponent(HESABI_APP_VERSION + '-' + HESABI_APP_BUILD_CODE + '-' + Date.now());
  const sources = [];
  setRuntimePhase('loading-parts');
  for (const part of HESABI_MODULE_PARTS) {
    try {
      sources.push(await loadPart(part, versionQuery));
    } catch (error) {
      window.__hesabiRuntime.failedParts.push({ file: part, error: String(error && error.message || error) });
      throw error;
    }
  }

  setRuntimePhase('importing-runtime');
  const runtimeSource = sources.join('\n') + '\n//# sourceURL=hesabi-app-runtime-1.0.108.mjs\n';
  const runtimeUrl = URL.createObjectURL(new Blob([runtimeSource], { type: 'text/javascript' }));
  try {
    await import(runtimeUrl);
  } finally {
    setTimeout(() => URL.revokeObjectURL(runtimeUrl), 10000);
  }

  window.__hesabiRuntimeLoaded = true;
  setRuntimePhase('running-self-check');
  const check = runPostImportChecks();
  setRuntimePhase(check.ok ? 'ready' : 'ready-with-warnings', { selfCheck: check });
  try { document.documentElement.setAttribute('data-hesabi-runtime', 'loaded'); } catch (_) {}
  return check;
}

loadHesabiRuntime().catch(error => {
  console.error('Hesabi runtime load failed:', error);
  const message = error && (error.message || String(error));
  setRuntimePhase('failed', { error: message });
  try { localStorage.setItem('hesabi_last_runtime_error', JSON.stringify(window.__hesabiRuntime)); } catch (_) {}
  runtimeMessage('تعذر تحميل ملفات التطبيق', 'فشل تحميل أو تشغيل ملفات التطبيق بعد التقسيم.', message || '');
});

