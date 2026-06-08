/* Hesabi 1.0.85 - Android Native Features Smoke.
   Safe Android bridge diagnostics only. Missing native methods are warnings in browser, not fatal errors. */
(function(){
  "use strict";
  const VERSION = "1.0.85";
  const BUILD_CODE = 85;
  const EXPECTED_NATIVE_METHODS = [
    "getPlatform",
    "getVersionCode",
    "getVersionName",
    "clearWebCacheForUpdate",
    "openApkUrl",
    "openLatestApk",
    "registerSession",
    "updateLauncherBadge",
    "scanItemBarcodeEmbedded",
    "scanItemBarcodeExternal",
    "scanItemOcrNative"
  ];
  function bridge(){ return window.hesabiAndroidBridge || {}; }
  function hasNative(){ try { return !!(bridge().hasNative ? bridge().hasNative() : window.HesabiAndroid); } catch (_) { return false; } }
  function canCall(name){ try { return !!(bridge().canCall ? bridge().canCall(name) : (window.HesabiAndroid && typeof window.HesabiAndroid[name] === "function")); } catch (_) { return false; } }
  function methodStatus(){ return EXPECTED_NATIVE_METHODS.map(function(name){ return { name, available: canCall(name) }; }); }
  function versionInfo(){
    const b = bridge();
    let code = 0, name = "", platform = "";
    try { if(typeof b.getVersionCode === "function") code = Number(b.getVersionCode() || 0); } catch (_) {}
    try { if(typeof b.getVersionName === "function") name = String(b.getVersionName() || ""); } catch (_) {}
    try { if(typeof b.getPlatform === "function") platform = String(b.getPlatform() || ""); } catch (_) {}
    return { platform, versionCode:code, versionName:name };
  }
  function runSmoke(){
    const nativeAvailable = hasNative();
    const methods = methodStatus();
    const missing = methods.filter(function(m){ return !m.available; }).map(function(m){ return m.name; });
    const info = versionInfo();
    const ok = true; // Browser mode is allowed; missing native methods are warnings only.
    const result = { ok, version:VERSION, build:BUILD_CODE, nativeAvailable, info, methods, missingMethods:missing, warning: nativeAvailable ? "" : "Native bridge غير متاح في المتصفح؛ هذا طبيعي خارج APK.", checkedAt:new Date().toISOString() };
    try { localStorage.setItem("hesabi_last_android_native_smoke", JSON.stringify({ ok:result.ok, nativeAvailable, missing, at:result.checkedAt })); } catch (_) {}
    return result;
  }
  function selfCheck(){
    const missing = ["hasNative","canCall","methodStatus","versionInfo","runSmoke"].filter(function(name){ return typeof api[name] !== "function"; });
    const sample = methodStatus();
    return { ok: missing.length === 0 && Array.isArray(sample) && sample.length === EXPECTED_NATIVE_METHODS.length, version:VERSION, build:BUILD_CODE, missing, expectedMethods:EXPECTED_NATIVE_METHODS.length };
  }
  const api = { version:VERSION, build:BUILD_CODE, expectedNativeMethods:EXPECTED_NATIVE_METHODS.slice(), hasNative, canCall, methodStatus, versionInfo, runSmoke };
  window.hesabiAndroidNativeSmoke = api;
  window.hesabiAndroidNativeSmokeSelfCheck = selfCheck;
})();
