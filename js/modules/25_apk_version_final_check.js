/* Hesabi 1.0.86 - APK Update / Version Final Check.
   Read-only final version diagnostics. No downloads, no installs, no Firestore writes. */
(function(){
  "use strict";
  const VERSION = "1.0.86";
  const BUILD_CODE = 86;
  const TARGET_VERSION = "1.0.111";
  const TARGET_BUILD = 111;

  function safeNumber(value){ const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
  function safeString(value){ try { return String(value == null ? "" : value); } catch (_) { return ""; } }
  function runtime(){ return window.__hesabiRuntime || {}; }
  function bridge(){ return window.hesabiAndroidBridge || {}; }
  function nativeVersionInfo(){
    const b = bridge();
    let versionCode = 0, versionName = "", platform = "web";
    try { platform = typeof b.getPlatform === "function" ? safeString(b.getPlatform()) : (window.HesabiAndroid ? "android" : "web"); } catch (_) {}
    try { versionCode = typeof b.getVersionCode === "function" ? safeNumber(b.getVersionCode()) : 0; } catch (_) {}
    try { versionName = typeof b.getVersionName === "function" ? safeString(b.getVersionName()) : ""; } catch (_) {}
    return { platform, versionCode, versionName, nativeAvailable: !!(b.hasNative ? b.hasNative() : window.HesabiAndroid) };
  }
  function runtimeVersionState(){
    const rt = runtime();
    const appVersion = typeof APP_VERSION !== "undefined" ? safeString(APP_VERSION) : "";
    const appBuild = typeof APP_BUILD_CODE !== "undefined" ? safeNumber(APP_BUILD_CODE) : 0;
    return {
      ok: safeString(rt.version) === TARGET_VERSION && safeNumber(rt.build) === TARGET_BUILD && appVersion === TARGET_VERSION && appBuild === TARGET_BUILD,
      targetVersion: TARGET_VERSION,
      targetBuild: TARGET_BUILD,
      runtimeVersion: safeString(rt.version),
      runtimeBuild: safeNumber(rt.build),
      appVersion,
      appBuild
    };
  }
  function normalizeUpdateInfo(info){
    info = info || {};
    return {
      versionName: safeString(info.latestVersionName || info.versionName),
      versionCode: safeNumber(info.latestVersionCode || info.versionCode),
      required: !!info.required,
      forceRefresh: !!info.forceRefresh,
      apkUrl: safeString(info.apkUrl),
      title: safeString(info.title),
      notes: safeString(info.releaseNotes || info.notes || info.message)
    };
  }
  function latestUpdateInfoFromStorage(){
    try {
      const raw = localStorage.getItem("hesabi_cache_update_stability_last_update_info") || "";
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      return normalizeUpdateInfo(parsed && (parsed.info || parsed));
    } catch (_) { return null; }
  }
  function updateInfoState(info){
    const normalized = normalizeUpdateInfo(info || latestUpdateInfoFromStorage() || {});
    const hasInfo = !!(normalized.versionName || normalized.versionCode || normalized.apkUrl);
    return {
      ok: !hasInfo || (normalized.versionName === TARGET_VERSION && normalized.versionCode === TARGET_BUILD),
      hasInfo,
      targetVersion: TARGET_VERSION,
      targetBuild: TARGET_BUILD,
      info: normalized,
      warning: hasInfo ? "" : "لا توجد نتيجة android-update.json مخزنة بعد؛ شغّل فحص التحديث من الإعدادات."
    };
  }
  function apkInstallReadiness(){
    const nativeInfo = nativeVersionInfo();
    const runtimeState = runtimeVersionState();
    const updateState = updateInfoState();
    const warnings = [];
    if(!nativeInfo.nativeAvailable) warnings.push("الجسر الأصلي غير متاح في المتصفح؛ هذا طبيعي خارج APK.");
    if(nativeInfo.nativeAvailable && nativeInfo.versionCode && nativeInfo.versionCode < TARGET_BUILD) warnings.push("APK المثبت أقدم من build المطلوب؛ ثبّت آخر APK من GitHub Actions.");
    if(!runtimeState.ok) warnings.push("نسخة runtime أو APP_VERSION لا تطابق 1.0.111 / build 111.");
    if(!updateState.ok) warnings.push("ملف android-update.json المخزن لا يطابق 1.0.111 / build 111.");
    return { ok: runtimeState.ok && updateState.ok, version: VERSION, build: BUILD_CODE, targetVersion: TARGET_VERSION, targetBuild: TARGET_BUILD, nativeInfo, runtimeState, updateState, warnings };
  }
  function selfCheck(){
    const required = ["nativeVersionInfo","runtimeVersionState","normalizeUpdateInfo","updateInfoState","apkInstallReadiness"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    const sample = runtimeVersionState();
    return { ok: missing.length === 0 && sample.targetVersion === TARGET_VERSION && sample.targetBuild === TARGET_BUILD, version: VERSION, build: BUILD_CODE, targetVersion: TARGET_VERSION, targetBuild: TARGET_BUILD, missing, sample };
  }
  const api = { version: VERSION, build: BUILD_CODE, targetVersion: TARGET_VERSION, targetBuild: TARGET_BUILD, nativeVersionInfo, runtimeVersionState, normalizeUpdateInfo, latestUpdateInfoFromStorage, updateInfoState, apkInstallReadiness };
  window.hesabiApkVersionFinalCheck = api;
  window.hesabiApkVersionFinalCheckSelfCheck = selfCheck;
})();
