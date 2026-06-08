// Hesabi App 1.0.59
// Bootstrap loader: combines functional source parts into one ES module at runtime.
// This keeps the original shared scope while making the source maintainable.
const HESABI_APP_VERSION = '1.0.59';
const HESABI_APP_BUILD_CODE = 59;

const HESABI_MODULE_PARTS = [
  'js/modules/00_core_update_auth.js',
  'js/modules/10_firebase_live_data.js',
  'js/modules/20_router_setup_profile.js',
  'js/modules/30_purchase_catalog.js',
  'js/modules/40_pages_tables.js',
  'js/modules/50_auth_order_approval.js',
  'js/modules/60_payments_returns_policies.js',
  'js/modules/70_settings_owner_items_bridge.js'
];

async function loadHesabiRuntime(){
  const versionQuery = '?v=' + encodeURIComponent(HESABI_APP_VERSION + '-' + HESABI_APP_BUILD_CODE);
  const sources = [];
  for (const part of HESABI_MODULE_PARTS) {
    const response = await fetch(part + versionQuery, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('تعذر تحميل ملف من ملفات التطبيق: ' + part + ' (' + response.status + ')');
    }
    const text = await response.text();
    sources.push('\n/* ===== ' + part + ' ===== */\n' + text);
  }

  const runtimeSource = sources.join('\n') + '\n//# sourceURL=hesabi-app-runtime-1.0.59.mjs\n';
  const runtimeUrl = URL.createObjectURL(new Blob([runtimeSource], { type: 'text/javascript' }));
  try {
    await import(runtimeUrl);
  } finally {
    setTimeout(() => URL.revokeObjectURL(runtimeUrl), 10000);
  }
}

loadHesabiRuntime().catch((error) => {
  console.error('Hesabi runtime load failed:', error);
  const message = error && (error.message || String(error));
  if (typeof window.showStartupRecoveryDialog === 'function') {
    window.showStartupRecoveryDialog(message || 'تعذر تحميل ملفات التطبيق.');
  } else {
    const box = document.getElementById('msg');
    if (box) {
      box.innerHTML = '<div class="msg error">تعذر تحميل ملفات التطبيق. حدّث الواجهات أو أعد تثبيت آخر APK.<br>' +
        String(message || '') + '</div>';
    }
  }
});
