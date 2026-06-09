/* Hesabi 1.0.89 - App cache / update stability.
   Non-intrusive update helpers only: no Firestore writes and no order/payment/catalog mutations. */
(function(){
  "use strict";

  const VERSION = "1.0.106";
  const BUILD_CODE = 106;
  const STORAGE_PREFIX = "hesabi_cache_update_stability";
  const DEFAULT_UPDATE_URLS = ["android-update.json", "/android-update.json"];

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

  function storageSet(store, key, value){
    try {
      if(store && typeof store.setItem === "function") {
        store.setItem(key, String(value));
        return true;
      }
    } catch (_) {}
    return false;
  }

  function storageGet(store, key){
    try {
      if(store && typeof store.getItem === "function") return store.getItem(key);
    } catch (_) {}
    return null;
  }

  function storageRemove(store, key){
    try {
      if(store && typeof store.removeItem === "function") {
        store.removeItem(key);
        return true;
      }
    } catch (_) {}
    return false;
  }

  function cacheBusterValue(prefix){
    return String(prefix || "hesabi") + "-" + VERSION + "-" + BUILD_CODE + "-" + Date.now();
  }

  function buildUrlWithCacheBuster(url, extra){
    const params = Object.assign({}, extra || {});
    if(!params.v) params.v = cacheBusterValue("cache");
    try {
      const u = new URL(String(url || location.href), location.href);
      Object.keys(params).forEach(function(key){
        if(params[key] !== undefined && params[key] !== null) u.searchParams.set(key, String(params[key]));
      });
      return u.toString();
    } catch (_) {
      const join = String(url || "").indexOf("?") >= 0 ? "&" : "?";
      return String(url || "") + join + "v=" + encodeURIComponent(params.v);
    }
  }

  async function unregisterServiceWorkers(){
    const result = { ok: true, supported: false, count: 0, errors: [] };
    try {
      if(!("serviceWorker" in navigator) || !navigator.serviceWorker.getRegistrations) return result;
      result.supported = true;
      const regs = await navigator.serviceWorker.getRegistrations();
      result.count = Array.isArray(regs) ? regs.length : 0;
      for(const reg of regs || []) {
        try { await reg.unregister(); }
        catch (error) { result.ok = false; result.errors.push(safeString(error)); }
      }
    } catch (error) {
      result.ok = false;
      result.errors.push(safeString(error));
    }
    return result;
  }

  async function deleteBrowserCaches(){
    const result = { ok: true, supported: false, keys: [], errors: [] };
    try {
      if(!("caches" in window) || !caches.keys) return result;
      result.supported = true;
      const keys = await caches.keys();
      result.keys = Array.isArray(keys) ? keys.slice() : [];
      for(const key of result.keys) {
        try { await caches.delete(key); }
        catch (error) { result.ok = false; result.errors.push({ key, error: safeString(error) }); }
      }
    } catch (error) {
      result.ok = false;
      result.errors.push({ key: "*", error: safeString(error) });
    }
    return result;
  }

  function clearAndroidWebCache(){
    const result = { ok: true, available: false, called: false, error: "" };
    try {
      const bridge = window.hesabiAndroidBridge;
      if(bridge && typeof bridge.clearWebCacheForUpdate === "function") {
        result.available = true;
        bridge.clearWebCacheForUpdate();
        result.called = true;
      }
    } catch (error) {
      result.ok = false;
      result.error = safeString(error);
    }
    return result;
  }

  function rememberVersionLoad(){
    const previous = storageGet(localStorage, STORAGE_PREFIX + "_loaded_version");
    storageSet(localStorage, STORAGE_PREFIX + "_loaded_version", VERSION);
    storageSet(localStorage, STORAGE_PREFIX + "_loaded_build", BUILD_CODE);
    storageSet(localStorage, STORAGE_PREFIX + "_loaded_at", nowIso());
    if(previous && previous !== VERSION) {
      storageSet(sessionStorage, STORAGE_PREFIX + "_upgraded_from", previous);
      storageSet(sessionStorage, STORAGE_PREFIX + "_upgrade_seen_at", nowIso());
    }
    return { previous, current: VERSION, changed: !!(previous && previous !== VERSION) };
  }

  async function clearAppCaches(reason){
    const startedAt = nowIso();
    const serviceWorkers = await unregisterServiceWorkers();
    const browserCaches = await deleteBrowserCaches();
    const android = clearAndroidWebCache();
    storageSet(localStorage, "hesabi_last_cache_clean", Date.now());
    storageSet(localStorage, STORAGE_PREFIX + "_last_clear", JSON.stringify({ version: VERSION, build: BUILD_CODE, reason: reason || "manual", at: startedAt }));
    storageSet(sessionStorage, "hesabi_force_update_ts", Date.now());
    const result = {
      ok: serviceWorkers.ok && browserCaches.ok && android.ok,
      version: VERSION,
      build: BUILD_CODE,
      reason: reason || "manual",
      at: startedAt,
      serviceWorkers,
      browserCaches,
      android
    };
    window.__hesabiCacheUpdateStabilityLastClear = result;
    return result;
  }

  async function refreshWebUiNowStable(reason){
    const clearResult = await clearAppCaches(reason || "web-ui-refresh");
    storageSet(sessionStorage, STORAGE_PREFIX + "_refresh_requested", Date.now());
    return clearResult;
  }

  async function prepareFullApkUpdateStable(){
    storageSet(localStorage, "hesabi_last_update_prepare_ts", Date.now());
    storageSet(sessionStorage, "hesabi_force_full_apk_update_ts", Date.now());
    storageSet(sessionStorage, STORAGE_PREFIX + "_apk_update_requested", Date.now());
    return await clearAppCaches("full-apk-update");
  }

  async function fetchJsonNoStore(url){
    const target = buildUrlWithCacheBuster(url, { v: cacheBusterValue("json") });
    const response = await fetch(target, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
    if(!response.ok) throw new Error("HTTP " + response.status + " for " + url);
    return await response.json();
  }

  function normalizeUpdateInfo(info){
    if(!info || typeof info !== "object") return null;
    const latestVersionCode = Number(info.latestVersionCode || info.versionCode || 0);
    const latestVersionName = String(info.latestVersionName || info.versionName || "").trim();
    const apkUrl = String(info.apkUrl || "https://github.com/attef7474-byte/hesabi-app/releases/latest/download/hesabi-app-latest.apk").trim();
    if(!latestVersionCode && !latestVersionName && !apkUrl) return null;
    return Object.assign({}, info, { latestVersionCode, latestVersionName, apkUrl });
  }

  async function fetchUpdateInfoStable(urls){
    const list = Array.isArray(urls) && urls.length ? urls : DEFAULT_UPDATE_URLS;
    const errors = [];
    for(const url of list) {
      try {
        const info = normalizeUpdateInfo(await fetchJsonNoStore(url));
        if(info) {
          storageSet(localStorage, STORAGE_PREFIX + "_last_update_info", JSON.stringify({
            ok: true,
            version: info.latestVersionName || info.versionName || "",
            build: Number(info.latestVersionCode || info.versionCode || 0),
            source: url,
            at: nowIso()
          }));
          return info;
        }
        errors.push({ url, error: "invalid update info" });
      } catch (error) {
        errors.push({ url, error: safeString(error) });
      }
    }
    storageSet(localStorage, STORAGE_PREFIX + "_last_update_info", JSON.stringify({ ok: false, errors, at: nowIso() }));
    try { console.warn("Hesabi update info fetch warnings:", errors); } catch (_) {}
    return null;
  }

  function buildRefreshUrl(extra){
    return buildUrlWithCacheBuster(location.href, Object.assign({ refresh: "1" }, extra || {}));
  }

  function getVersionState(){
    const runtime = window.__hesabiRuntime || {};
    return {
      ok: String(runtime.version || "") === VERSION && Number(runtime.build || 0) === BUILD_CODE,
      expectedVersion: VERSION,
      expectedBuild: BUILD_CODE,
      runtimeVersion: String(runtime.version || ""),
      runtimeBuild: Number(runtime.build || 0),
      loadedVersion: storageGet(localStorage, STORAGE_PREFIX + "_loaded_version") || "",
      loadedBuild: Number(storageGet(localStorage, STORAGE_PREFIX + "_loaded_build") || 0)
    };
  }

  function selfCheck(){
    const methods = [
      "clearAppCaches",
      "refreshWebUiNow",
      "prepareFullApkUpdate",
      "fetchUpdateInfo",
      "buildRefreshUrl",
      "buildUrlWithCacheBuster",
      "getVersionState"
    ];
    const api = window.hesabiUpdateCacheStability || {};
    const missingMethods = methods.filter(function(name){ return typeof api[name] !== "function"; });
    const versionState = getVersionState();
    const storageWritable = storageSet(sessionStorage, STORAGE_PREFIX + "_self_check", nowIso());
    storageRemove(sessionStorage, STORAGE_PREFIX + "_self_check");
    return {
      ok: missingMethods.length === 0 && versionState.ok && storageWritable,
      version: VERSION,
      build: BUILD_CODE,
      missingMethods,
      versionState,
      storageWritable,
      checkedAt: nowIso()
    };
  }

  window.hesabiUpdateCacheStability = {
    version: VERSION,
    build: BUILD_CODE,
    clearAppCaches,
    refreshWebUiNow: refreshWebUiNowStable,
    prepareFullApkUpdate: prepareFullApkUpdateStable,
    fetchJsonNoStore,
    fetchUpdateInfo: fetchUpdateInfoStable,
    normalizeUpdateInfo,
    buildRefreshUrl,
    buildUrlWithCacheBuster,
    getVersionState,
    rememberVersionLoad,
    selfCheck
  };

  window.hesabiUpdateCacheStabilitySelfCheck = selfCheck;
  rememberVersionLoad();
})();
