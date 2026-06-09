/* Hesabi 1.0.108 - Audit + Final Update/Cache Sweep.
   Scope: audit page bindings, local search/export, mobile containment, and final update/cache diagnostics only.
   No Firestore writes, orders, payments, invoices, items, or subscription logic are changed. */
(function(){
  "use strict";
  const VERSION = "1.0.108";
  const BUILD_CODE = 108;
  const STORE = "hesabi_audit_update_cache_final";

  function byId(id){ try { return document.getElementById(id); } catch (_) { return null; } }
  function page(name){ return byId("page_" + name); }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch (_) { return []; } }
  function safeString(value){ try { return value == null ? "" : String(value); } catch (_) { return ""; } }
  function escSafe(value){
    try { if(typeof esc === "function") return esc(value == null ? "" : value); } catch (_) {}
    return safeString(value).replace(/[&<>\"']/g, function(ch){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch]; });
  }
  function norm(value){
    return safeString(value).toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[أإآا]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/\s+/g, " ")
      .trim();
  }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch (_) {} }
  function now(){ return Date.now(); }
  function nowIso(){ try { return new Date().toISOString(); } catch (_) { return String(now()); } }
  function storageSet(store, key, value){ try { if(store && store.setItem){ store.setItem(key, safeString(value)); return true; } } catch (_) {} return false; }

  function ensureStyle(){
    if(byId("auditUpdateCacheFinalStyle")) return;
    const style = document.createElement("style");
    style.id = "auditUpdateCacheFinalStyle";
    style.textContent = `
      #page_audit,#page_settings{max-width:100%;overflow-x:hidden;}
      .audit-cache-final-safe-wrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
      .audit-cache-final-safe-table{width:100%;min-width:650px;}
      .audit-cache-final-toolbar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0;}
      .audit-cache-final-search{margin:10px 0;}
      .audit-cache-final-search-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
      .audit-cache-final-search-row input{flex:1 1 180px;min-width:0;}
      .audit-cache-final-details{max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:ltr;text-align:left;}
      #page_audit .page-tabs,#page_settings .page-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;}
      #page_audit .card,#page_settings .card{max-width:100%;box-sizing:border-box;}
      @media(max-width:640px){.audit-cache-final-safe-table{min-width:590px}.audit-cache-final-search-row .btn{flex:0 0 auto}.audit-cache-final-details{max-width:160px}}
    `;
    try { document.head.appendChild(style); } catch (_) {}
  }

  function ensureMobileTableGuard(root){
    if(!root) return;
    ensureStyle();
    try{
      qsa(".table-wrap,.tablewrap,.mobile-table-wrap", root).forEach(function(w){
        w.classList.add("audit-cache-final-safe-wrap");
        w.style.maxWidth = "100%";
        w.style.overflowX = "auto";
        w.style.webkitOverflowScrolling = "touch";
      });
      qsa("table", root).forEach(function(t){ t.classList.add("audit-cache-final-safe-table"); });
      qsa("tbody tr td:last-child", root).forEach(function(td){
        if((td.textContent || "").length > 60){ td.classList.add("audit-cache-final-details"); td.title = td.textContent || ""; }
      });
    }catch(_){ }
  }

  function searchableNodes(root){
    if(!root) return [];
    const nodes = qsa("tbody tr,.metric,.card:not(.audit-cache-final-search)", root);
    return nodes.filter(function(node){ return !(node.closest && node.closest(".audit-cache-final-search")); });
  }

  function applySearch(root, query){
    const q = norm(query);
    const targets = searchableNodes(root);
    let visible = 0;
    targets.forEach(function(el){
      const show = !q || norm(el.textContent || "").indexOf(q) >= 0;
      el.style.display = show ? "" : "none";
      if(show) visible++;
    });
    const count = root ? root.querySelector("[data-audit-cache-final-search-count]") : null;
    if(count) count.textContent = String(visible);
    return visible;
  }

  function ensureSearch(root, id, title){
    if(!root || byId(id)) return false;
    const host = root.querySelector(".page-tabs-card") || root.querySelector(".card") || root;
    const box = document.createElement("div");
    box.className = "card audit-cache-final-search";
    box.innerHTML = `<div class="field"><label>${escSafe(title || "بحث")}</label><div class="audit-cache-final-search-row"><input id="${escSafe(id)}" type="search" autocomplete="off" inputmode="search" placeholder="اكتب للبحث داخل الصفحة"><button type="button" class="btn secondary mini" id="${escSafe(id)}Apply">بحث</button><button type="button" class="btn light mini" id="${escSafe(id)}Clear">مسح</button></div><div class="subcell">المعروض: <b data-audit-cache-final-search-count="1">${searchableNodes(root).length}</b></div></div>`;
    try { host.insertAdjacentElement("afterend", box); } catch (_) { try { root.insertAdjacentElement("afterbegin", box); } catch(__){} }
    const input = byId(id), apply = byId(id + "Apply"), clear = byId(id + "Clear");
    if(input){
      input.addEventListener("input", function(){ /* no rerender while typing */ });
      input.addEventListener("keydown", function(ev){ if(ev.key === "Enter"){ ev.preventDefault(); applySearch(root, input.value); } });
    }
    if(apply) apply.onclick = function(){ applySearch(root, input ? input.value : ""); };
    if(clear) clear.onclick = function(){ if(input) input.value = ""; applySearch(root, ""); if(input) input.focus(); };
    applySearch(root, "");
    return true;
  }

  function auditRowsFromCache(){
    try { return Array.isArray(cache.auditLogs) ? cache.auditLogs.slice() : []; } catch (_) { return []; }
  }
  function csvEscape(value){ return '"' + safeString(value).replace(/"/g, '""') + '"'; }
  function downloadTextFile(filename, text){
    try{
      const blob = new Blob([text], { type:"text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
      return true;
    }catch(_){ return false; }
  }
  function exportAuditCsv(){
    const rows = auditRowsFromCache();
    const header = ["date","action","actorRole","actorName","details"];
    const lines = [header.map(csvEscape).join(",")];
    rows.forEach(function(a){
      const date = a && a.createdMs ? (new Date(Number(a.createdMs)).toISOString()) : "";
      lines.push([date, a && a.action, a && a.actorRole, a && a.actorName, JSON.stringify((a && a.details) || {})].map(csvEscape).join(","));
    });
    const ok = downloadTextFile("hesabi-audit-log-" + new Date().toISOString().slice(0,10) + ".csv", "\ufeff" + lines.join("\n"));
    if(ok) notify("تم تجهيز ملف سجل العمليات.", "success");
    else notify("تعذر تصدير سجل العمليات من هذا الجهاز.", "error");
    return ok;
  }

  function ensureAuditToolbar(root){
    if(!root || byId("auditFinalToolbar")) return false;
    const host = root.querySelector(".audit-cache-final-search") || root.querySelector(".page-tabs-card") || root.querySelector(".card") || root;
    const bar = document.createElement("div");
    bar.id = "auditFinalToolbar";
    bar.className = "card audit-cache-final-toolbar";
    bar.innerHTML = `<button type="button" class="btn secondary mini" id="auditFinalRefresh">تحديث</button><button type="button" class="btn light mini" id="auditFinalExportCsv">تصدير CSV</button><button type="button" class="btn light mini" id="auditFinalSelfCheck">فحص</button>`;
    try { host.insertAdjacentElement("afterend", bar); } catch (_) { try { root.insertAdjacentElement("afterbegin", bar); } catch(__){} }
    const refresh = byId("auditFinalRefresh");
    const exportBtn = byId("auditFinalExportCsv");
    const check = byId("auditFinalSelfCheck");
    if(refresh) refresh.onclick = function(){ try { if(typeof renderAudit === "function") renderAudit(); } catch (_) {} };
    if(exportBtn) exportBtn.onclick = exportAuditCsv;
    if(check) check.onclick = function(){ showFinalCheckDialog("سجل العمليات", selfCheck()); };
    return true;
  }

  function bindAuditNow(){
    const root = page("audit");
    if(!root) return { ok:false, reason:"audit page missing" };
    ensureMobileTableGuard(root);
    ensureSearch(root, "auditFinalSearch", "بحث في سجل العمليات");
    ensureAuditToolbar(root);
    try { if(typeof bindPageTabs === "function") bindPageTabs("audit", renderAudit); } catch (_) {}
    try { if(typeof bindDemandTable === "function") { bindDemandTable("auditList23", renderAudit); bindDemandTable("auditList", renderAudit); } } catch (_) {}
    window.__hesabiAuditFinalBound = { at: now(), rows: auditRowsFromCache().length, nodes: searchableNodes(root).length };
    return Object.assign({ ok:true }, window.__hesabiAuditFinalBound);
  }

  async function unregisterServiceWorkers(){
    const result = { ok:true, supported:false, count:0, errors:[] };
    try{
      if(!("serviceWorker" in navigator) || !navigator.serviceWorker.getRegistrations) return result;
      result.supported = true;
      const regs = await navigator.serviceWorker.getRegistrations();
      result.count = regs.length;
      for(const reg of regs){ try { await reg.unregister(); } catch(e){ result.ok = false; result.errors.push(safeString(e && e.message || e)); } }
    }catch(e){ result.ok = false; result.errors.push(safeString(e && e.message || e)); }
    return result;
  }
  async function deleteBrowserCaches(){
    const result = { ok:true, supported:false, keys:[], errors:[] };
    try{
      if(!("caches" in window) || !caches.keys) return result;
      result.supported = true;
      result.keys = await caches.keys();
      for(const key of result.keys){ try { await caches.delete(key); } catch(e){ result.ok = false; result.errors.push({ key, error:safeString(e && e.message || e) }); } }
    }catch(e){ result.ok = false; result.errors.push({ key:"*", error:safeString(e && e.message || e) }); }
    return result;
  }
  function clearAndroidCache(){
    const result = { ok:true, available:false, called:false, error:"" };
    try{
      if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.clearWebCacheForUpdate === "function"){
        result.available = true;
        window.hesabiAndroidBridge.clearWebCacheForUpdate();
        result.called = true;
      }
    }catch(e){ result.ok = false; result.error = safeString(e && e.message || e); }
    return result;
  }
  async function finalCacheSweep(reason){
    const updateApi = window.hesabiUpdateCacheStability || {};
    let base = null;
    try{
      if(updateApi && typeof updateApi.clearAppCaches === "function") base = await updateApi.clearAppCaches(reason || "final-sweep");
    }catch(e){ base = { ok:false, error:safeString(e && e.message || e) }; }
    const serviceWorkers = await unregisterServiceWorkers();
    const browserCaches = await deleteBrowserCaches();
    const android = clearAndroidCache();
    storageSet(localStorage, "hesabi_last_cache_clean", now());
    storageSet(localStorage, STORE + "_last_clear", JSON.stringify({ version:VERSION, build:BUILD_CODE, reason:reason || "final-sweep", at:nowIso() }));
    storageSet(sessionStorage, "hesabi_force_update_ts", now());
    const result = { ok: (!base || base.ok !== false) && serviceWorkers.ok && browserCaches.ok && android.ok, version:VERSION, build:BUILD_CODE, base, serviceWorkers, browserCaches, android, reason:reason || "final-sweep", at:nowIso() };
    window.__hesabiFinalCacheSweepLastResult = result;
    return result;
  }
  function cacheBusterUrl(extra){
    try{
      const u = new URL(location.href);
      u.searchParams.set("v", VERSION + "-" + BUILD_CODE + "-" + now());
      Object.keys(extra || {}).forEach(function(k){ u.searchParams.set(k, safeString(extra[k])); });
      return u.toString();
    }catch(_){ return location.pathname + "?v=" + encodeURIComponent(VERSION + "-" + BUILD_CODE + "-" + now()); }
  }
  async function refreshWebUiFinal(){
    await finalCacheSweep("final-web-ui-refresh");
    location.replace(cacheBusterUrl({ refresh:"1" }));
  }
  async function cleanCacheFinal(){
    const result = await finalCacheSweep("final-cache-clean");
    notify(result.ok ? "تم تنظيف الكاش." : "تمت محاولة التنظيف مع وجود تحذيرات.", result.ok ? "success" : "warn");
    return result;
  }
  function currentVersionState(){
    const rt = window.__hesabiRuntime || {};
    const appVersion = typeof APP_VERSION !== "undefined" ? safeString(APP_VERSION) : "";
    const appBuild = typeof APP_BUILD_CODE !== "undefined" ? Number(APP_BUILD_CODE || 0) : 0;
    return { ok: safeString(rt.version) === VERSION && Number(rt.build || 0) === BUILD_CODE && appVersion === VERSION && appBuild === BUILD_CODE, expectedVersion:VERSION, expectedBuild:BUILD_CODE, runtimeVersion:safeString(rt.version), runtimeBuild:Number(rt.build || 0), appVersion, appBuild };
  }
  function finalUpdateCheck(){
    const checks = [];
    [["runtime", "hesabiRuntimeSmokeSelfCheck"],["full-runtime", "hesabiFullRuntimeSmokeSelfCheck"],["apk", "hesabiApkVersionFinalCheckSelfCheck"],["update-cache", "hesabiUpdateCacheStabilitySelfCheck"]].forEach(function(pair){
      const fn = window[pair[1]];
      if(typeof fn !== "function") checks.push({ name:pair[0], ok:false, missing:true });
      else { try { const r = fn(); checks.push({ name:pair[0], ok:!(r && typeof r === "object" && r.ok === false), result:r }); } catch(e){ checks.push({ name:pair[0], ok:false, error:safeString(e && e.message || e) }); } }
    });
    const version = currentVersionState();
    const failed = checks.filter(function(x){ return x.ok === false; });
    return { ok: failed.length === 0 && version.ok, version:VERSION, build:BUILD_CODE, versionState:version, checks, failed, lastCache:window.__hesabiFinalCacheSweepLastResult || null, checkedAt:nowIso() };
  }
  function showFinalCheckDialog(title, result){
    const ok = result && result.ok !== false;
    const text = (ok ? "الفحص سليم." : "الفحص يحتاج مراجعة.") + "\nالإصدار: " + VERSION + " / build " + BUILD_CODE;
    if(typeof showAppDialog === "function") showAppDialog(title || "الفحص النهائي", text, ok ? "success" : "warn", [{ text:"موافق", cls:"ok" }]);
    else notify(text.replace(/\n/g, " - "), ok ? "success" : "warn");
  }

  function bindUpdateCacheNow(){
    const root = page("settings");
    if(!root) return { ok:false, reason:"settings page missing" };
    ensureMobileTableGuard(root);
    const refresh = byId("settingsRefreshUi");
    const clean = byId("settingsCleanCache");
    const update = byId("settingsUpdateApk");
    const checkApk = byId("settingsCheckApk");
    const self = byId("settingsRunSelfCheck");
    if(refresh && !refresh.__hesabiFinalCacheBound){ refresh.__hesabiFinalCacheBound = true; refresh.onclick = function(){ refreshWebUiFinal(); }; }
    if(clean && !clean.__hesabiFinalCacheBound){ clean.__hesabiFinalCacheBound = true; clean.onclick = function(){ cleanCacheFinal(); }; }
    if(update && !update.__hesabiFinalCacheBound){ update.__hesabiFinalCacheBound = true; update.onclick = function(){ if(typeof downloadApkUpdate === "function") downloadApkUpdate(); else notify("دالة تحديث APK غير متاحة.", "error"); }; }
    const runCheck = function(){ showFinalCheckDialog("فحص التحديث والكاش", finalUpdateCheck()); };
    if(checkApk && !checkApk.__hesabiFinalCacheBound){ checkApk.__hesabiFinalCacheBound = true; checkApk.onclick = runCheck; }
    if(self && !self.__hesabiFinalCacheBound){ self.__hesabiFinalCacheBound = true; self.onclick = runCheck; }
    if(!byId("settingsFinalCacheCheck")){
      const card = root.querySelector(".settings-compact-actions") || root.querySelector(".actions") || root.querySelector(".card") || root;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "settingsFinalCacheCheck";
      btn.className = "btn light";
      btn.textContent = "فحص نهائي";
      btn.onclick = runCheck;
      try { card.appendChild(btn); } catch (_) {}
    }
    window.__hesabiUpdateCacheFinalBound = { at: now(), buttons: { refresh:!!refresh, clean:!!clean, update:!!update, check:!!checkApk, self:!!self } };
    return Object.assign({ ok:true }, window.__hesabiUpdateCacheFinalBound);
  }

  function bindCurrentPages(){
    const result = {};
    if(page("audit")) result.audit = bindAuditNow();
    if(page("settings")) result.updateCache = bindUpdateCacheNow();
    return result;
  }
  function afterRender(pageName){
    setTimeout(function(){
      try{
        if(pageName === "audit") bindAuditNow();
        if(pageName === "settings") bindUpdateCacheNow();
      }catch(e){ try { console.warn("audit/update-cache final sweep bind failed", e); } catch(_){} }
    }, 0);
  }
  function wrapRenderer(name, pageName){
    try{
      const current = (typeof window[name] === "function") ? window[name] : (typeof eval(name) === "function" ? eval(name) : null);
      if(!current || current.__hesabiAuditUpdateCacheFinalWrapped) return false;
      const wrapped = function(){ const result = current.apply(this, arguments); afterRender(pageName); return result; };
      wrapped.__hesabiAuditUpdateCacheFinalWrapped = true;
      try { window[name] = wrapped; } catch (_) {}
      try { eval(name + " = wrapped"); } catch (_) {}
      return true;
    }catch(_){ return false; }
  }
  function activate(){
    ensureStyle();
    const wrappedAudit = wrapRenderer("renderAudit", "audit");
    const wrappedSettings = wrapRenderer("renderSettings", "settings");
    try { document.addEventListener("click", function(){ bindCurrentPages(); }, true); } catch (_) {}
    try { bindCurrentPages(); } catch (_) {}
    window.__hesabiAuditUpdateCacheFinalInstalled = { at:now(), wrappedAudit, wrappedSettings };
    return window.__hesabiAuditUpdateCacheFinalInstalled;
  }
  function selfCheck(){
    const api = window.hesabiAuditUpdateCacheFinalSweep || {};
    const required = ["bindAuditNow","bindUpdateCacheNow","finalCacheSweep","refreshWebUiFinal","cleanCacheFinal","finalUpdateCheck","activate"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    let searchOk = false;
    try{
      const div = document.createElement("div");
      div.innerHTML = '<table><tbody><tr><td>approve_order</td></tr><tr><td>quick_price_update</td></tr></tbody></table><b data-audit-cache-final-search-count="1"></b>';
      searchOk = applySearch(div, "price") === 1 && div.querySelectorAll("tbody tr")[0].style.display === "none";
    }catch(_){ searchOk = false; }
    const version = currentVersionState();
    return { ok: missing.length === 0 && searchOk && version.ok, version:VERSION, build:BUILD_CODE, missing, searchOk, versionState:version, installed:!!window.__hesabiAuditUpdateCacheFinalInstalled, bindings:{ audit:window.__hesabiAuditFinalBound || null, updateCache:window.__hesabiUpdateCacheFinalBound || null } };
  }

  const api = { version:VERSION, build:BUILD_CODE, bindAuditNow, bindUpdateCacheNow, bindCurrentPages, applySearch, ensureSearch, ensureMobileTableGuard, exportAuditCsv, finalCacheSweep, refreshWebUiFinal, cleanCacheFinal, finalUpdateCheck, currentVersionState, activate, selfCheck };
  window.hesabiAuditUpdateCacheFinalSweep = api;
  window.hesabiAuditUpdateCacheFinalSweepSelfCheck = selfCheck;
  activate();
})();
