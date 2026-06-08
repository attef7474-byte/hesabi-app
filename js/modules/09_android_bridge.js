(function(){
  "use strict";

  function hasNative(){
    return !!(window.HesabiAndroid);
  }

  function canCall(name){
    return !!(window.HesabiAndroid && typeof window.HesabiAndroid[name] === "function");
  }

  function callNative(name, args){
    try {
      if (!canCall(name)) return { ok:false, reason:"missing", name:name };
      const result = window.HesabiAndroid[name].apply(window.HesabiAndroid, args || []);
      return { ok:true, result:result };
    } catch (error) {
      console.warn("[HesabiAndroid] call failed:", name, error);
      return { ok:false, reason:"error", name:name, error:String(error && error.message || error) };
    }
  }

  function getPlatform(){
    const res = callNative("getPlatform");
    return res.ok ? String(res.result || "") : "";
  }

  function getVersionCode(){
    const res = callNative("getVersionCode");
    return res.ok ? Number(res.result || 0) : 0;
  }

  function getVersionName(){
    const res = callNative("getVersionName");
    return res.ok ? String(res.result || "") : "";
  }

  function clearWebCacheForUpdate(){
    return callNative("clearWebCacheForUpdate");
  }

  function openApkUrl(url){
    return callNative("openApkUrl", [url]);
  }

  function openLatestApk(){
    return callNative("openLatestApk");
  }

  function registerSession(payload){
    return callNative("registerSession", [payload]);
  }

  function updateLauncherBadge(total, detail){
    return callNative("updateLauncherBadge", [Number(total || 0), String(detail || "")]);
  }

  function scanItemBarcodeEmbedded(){
    return callNative("scanItemBarcodeEmbedded");
  }

  function scanItemBarcodeExternal(){
    return callNative("scanItemBarcodeExternal");
  }

  function scanItemOcrNative(){
    return callNative("scanItemOcrNative");
  }

  window.hesabiAndroidBridge = {
    hasNative: hasNative,
    canCall: canCall,
    callNative: callNative,
    getPlatform: getPlatform,
    getVersionCode: getVersionCode,
    getVersionName: getVersionName,
    clearWebCacheForUpdate: clearWebCacheForUpdate,
    openApkUrl: openApkUrl,
    openLatestApk: openLatestApk,
    registerSession: registerSession,
    updateLauncherBadge: updateLauncherBadge,
    scanItemBarcodeEmbedded: scanItemBarcodeEmbedded,
    scanItemBarcodeExternal: scanItemBarcodeExternal,
    scanItemOcrNative: scanItemOcrNative
  };

  window.hesabiNativeAvailable = hasNative;
  window.hesabiNativeCanCall = canCall;
  window.hesabiNativeCall = callNative;
  window.hesabiNativeClearWebCacheForUpdate = clearWebCacheForUpdate;
  window.hesabiNativeOpenApkUrl = openApkUrl;
  window.hesabiNativeOpenLatestApk = openLatestApk;
  window.hesabiNativeRegisterSession = registerSession;
  window.hesabiNativeUpdateLauncherBadge = updateLauncherBadge;
  window.hesabiNativeScanItemBarcodeEmbedded = scanItemBarcodeEmbedded;
  window.hesabiNativeScanItemBarcodeExternal = scanItemBarcodeExternal;
  window.hesabiNativeScanItemOcrNative = scanItemOcrNative;

  window.hesabiAndroidBridgeSelfCheck = function(){
    const required = [
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
    return {
      ok: true,
      nativeAvailable: hasNative(),
      availableMethods: required.filter(canCall),
      missingMethods: required.filter(function(name){ return !canCall(name); }),
      checkedAt: new Date().toISOString()
    };
  };

  console.log("[Hesabi] Android bridge module loaded", window.hesabiAndroidBridgeSelfCheck());
})();
