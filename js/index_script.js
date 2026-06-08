// Hesabi App 1.0.64
// Stable module loader + runtime self check.
// Loads module parts in a fixed order, imports them as one runtime module to preserve shared scope,
// and exposes diagnostics so startup errors are clear instead of leaving a blank screen.
const HESABI_APP_VERSION = '1.0.64';
const HESABI_APP_BUILD_CODE = 64;

const HESABI_MODULE_PARTS = [
  'js/modules/00_core_update_auth.js',
  'js/modules/08_dialogs_toasts.js',
  'js/modules/09_android_bridge.js',
  'js/modules/10_firebase_live_data.js',
  'js/modules/20_router_setup_profile.js',
  'js/modules/30_purchase_catalog.js',
  'js/modules/40_pages_tables.js',
  'js/modules/50_auth_order_approval.js',
  'js/modules/60_payments_returns_policies.js',
  'js/modules/70_settings_owner_items_bridge.js',
  'js/modules/99_runtime_missing_functions_fix.js'
];

const HESABI_REQUIRED_GLOBALS = [
  'hesabiFinalSelfCheck',
  'hesabiRuntimeSelfCheck',
  'showStartupRecoveryDialog',
  'refreshWebUiNow',
  'downloadApkUpdate',
  'hesabiDialogsToastsSelfCheck'
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
    window.showStartupRecoveryDialog(text || title || '鬲毓匕乇 鬲卮睾賷賱 丕賱鬲胤亘賷賯.');
    return;
  }
  const box = document.getElementById('msg');
  if (box) {
    box.innerHTML = '<div class="msg error"><b>' + escapeHtml(title || '鬲毓匕乇 鬲卮睾賷賱 丕賱鬲胤亘賷賯') + '</b><br>' +
      escapeHtml(text || '丨丿賾孬 丕賱賵丕噩賴丕鬲 兀賵 孬亘賾鬲 丌禺乇 APK.') + '</div>';
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
    throw new Error('鬲毓匕乇 鬲丨賲賷賱 賲賱賮: ' + part + ' - HTTP ' + response.status);
  }
  const text = await response.text();
  if (!text || !text.trim()) {
    throw new Error('賲賱賮 賮丕乇睾 兀賵 睾賷乇 氐丕賱丨: ' + part);
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
  const runtimeSource = sources.join('\n') + '\n//# sourceURL=hesabi-app-runtime-1.0.64.mjs\n';
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
  runtimeMessage('鬲毓匕乇 鬲丨賲賷賱 賲賱賮丕鬲 丕賱鬲胤亘賷賯', '賮卮賱 鬲丨賲賷賱 兀賵 鬲卮睾賷賱 賲賱賮丕鬲 丕賱鬲胤亘賷賯 亘毓丿 丕賱鬲賯爻賷賲.', message || '');
});

