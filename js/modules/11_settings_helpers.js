/* Hesabi 1.0.122 - Root settings stabilization.
   This file is the single owner of page_settings UI.
   No external module is allowed to inject settings cards/buttons. */
(function(){
  "use strict";

  const VERSION = "1.0.122";
  const BUILD_CODE = 122;
  const REQUIRED_TABS = ["security", "appearance", "shop", "permissions", "update", "backup", "account", "notifications"];

  function byId(id){ try { return document.getElementById(id); } catch(_) { return null; } }
  function safeString(value){ try { if(value && value.message) return String(value.message); return String(value == null ? "" : value); } catch (_) { return ""; } }
  function escSafe(value){
    try { if(typeof esc === "function") return esc(value); } catch (_) {}
    return safeString(value).replace(/[&<>'"]/g, function(ch){ return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]; });
  }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); else console.log(text); } catch(_) {} }
  function saveSafe(){ try { if(typeof save === "function") save(); } catch(_) {} }
  function renderSafe(){ try { if(typeof render === "function") render(); } catch(_) {} }

  function getTabs(){
    return [
      ["security", "🔐", "الأمان"],
      ["appearance", "🎨", "الشكل"],
      ["shop", "🏪", "المتجر"],
      ["permissions", "🛡️", "الصلاحيات"],
      ["update", "⬆️", "التحديث"],
      ["backup", "💾", "النسخ"],
      ["account", "👤", "الحساب"],
      ["notifications", "🔔", "التنبيهات"]
    ];
  }

  function normalizeTab(tab){ const value = String(tab || "security"); return REQUIRED_TABS.indexOf(value) >= 0 ? value : "security"; }
  function boolText(value){ return value ? "مفعل" : "ملغي"; }

  function callCheck(fnName){
    const fn = window[fnName];
    if(typeof fn !== "function") return { ok: true, missing: true, fn: fnName };
    try { const result = fn(); return Object.assign({ fn: fnName }, result && typeof result === "object" ? result : { ok: true, value: result }); }
    catch (error) { return { ok: false, fn: fnName, error: safeString(error) }; }
  }

  function roleProfile(role){
    try { if(typeof dualRoleProfileFor === "function") return dualRoleProfileFor(role); } catch(_) {}
    try { return (state && state.roleProfiles && state.roleProfiles[role]) || null; } catch(_) { return null; }
  }
  function rememberRole(){ try { if(typeof rememberCurrentDualRoleProfile === "function") rememberCurrentDualRoleProfile(); } catch(_) {} }

  function switchRoleFromSettings(role, setupMode){
    try {
      rememberRole();
      if(setupMode){
        state.role = role;
        state.profileDone = false;
        try { if(typeof resetCacheForLiveData === "function") resetCacheForLiveData(); } catch(_) {}
        try { listenersStartedKey = ""; } catch(_) {}
        saveSafe();
        renderSafe();
        notify("أكمل تهيئة وضع " + (role === "trader" ? "تاجر" : "عميل") + ".", "notice");
        return;
      }
      if(typeof applyDualRoleProfile === "function") { applyDualRoleProfile(role); return; }
      const p = roleProfile(role);
      state.role = role;
      if(p && p.profileDone){
        Object.keys(p).forEach(function(k){ if(k !== "role") state[k] = p[k]; });
        state.profileDone = true;
      } else {
        state.profileDone = false;
      }
      try { if(typeof resetCacheForLiveData === "function") resetCacheForLiveData(); } catch(_) {}
      try { listenersStartedKey = ""; } catch(_) {}
      saveSafe();
      renderSafe();
      notify("تم التبديل إلى وضع " + (role === "trader" ? "تاجر" : "عميل"), "success");
    } catch(error) {
      notify("تعذر التبديل: " + safeString(error && error.message || error), "error");
    }
  }

  function openStoresFromAccount(){
    rememberRole();
    try {
      if(state && state.role !== "customer"){
        const p = roleProfile("customer");
        if(p && p.profileDone && typeof applyDualRoleProfile === "function"){
          applyDualRoleProfile("customer");
          setTimeout(function(){ try { if(typeof show === "function") show("shops"); } catch(_) {} }, 300);
          return;
        }
        switchRoleFromSettings("customer", true);
        return;
      }
      if(typeof show === "function") show("shops");
    } catch(error) { notify("تعذر فتح متاجري: " + safeString(error && error.message || error), "error"); }
  }

  function roleAccountCardHtml(){
    const hasTrader = !!roleProfile("trader");
    const hasCustomer = !!roleProfile("customer");
    const current = state && state.role === "trader" ? "تاجر" : (state && state.role === "customer" ? "عميل" : "غير محدد");
    return `
      <div class="card" id="settingsAccountRoleCard">
        <h2>وضع الحساب: تاجر وعميل</h2>
        <div class="notice">الوضع الحالي: <b>${escSafe(current)}</b></div>
        <div class="settings-role-pills">
          <span class="hesabi-pill ${hasTrader ? "" : "off"}">تاجر: ${hasTrader ? "مفعل" : "غير مفعل"}</span>
          <span class="hesabi-pill ${hasCustomer ? "" : "off"}">عميل: ${hasCustomer ? "مفعل" : "غير مفعل"}</span>
        </div>
        <p class="muted">التبديل بين تاجر وعميل يظهر هنا فقط داخل صفحة الحساب.</p>
        <div class="settings-compact-actions settings-account-role-actions">
          <button class="btn secondary" id="dualSwitchTrader" type="button">الدخول كتاجر</button>
          <button class="btn secondary" id="dualSwitchCustomer" type="button">الدخول كعميل</button>
          <button class="btn light" id="dualSetupTrader" type="button">تهيئة/استرجاع تاجر</button>
          <button class="btn light" id="dualSetupCustomer" type="button">ربط تاجر كعميل</button>
          <button class="btn ok" id="dualOpenStores" type="button">متاجري / ربط متجر</button>
        </div>
      </div>`;
  }

  function updateStatusCard(){
    const updateCheck = callCheck("hesabiUpdateCacheStabilitySelfCheck");
    const runtimeCheck = callCheck("hesabiFullRuntimeSmokeSelfCheck");
    const updateOk = updateCheck.ok !== false;
    const runtimeOk = runtimeCheck.ok !== false;
    return `<div class="notice ${updateOk && runtimeOk ? "" : "warn"}">` +
      `فحص التحديث والكاش: <b>${updateOk ? "سليم" : "يحتاج مراجعة"}</b> · ` +
      `فحص التشغيل العام: <b>${runtimeOk ? "سليم" : "يحتاج مراجعة"}</b>` +
      `</div>`;
  }

  function renderSection(tab){
    const s = (typeof state === "object" && state) ? state : {};
    const activeTab = normalizeTab(tab);
    if(activeTab === "security") {
      return `<div class="card"><h2>الأمان</h2><div class="notice">قفل التطبيق: ${boolText(s.appLockEnabled || s.lockEnabled)}</div><p class="muted">إعدادات الأمان فقط. لا تظهر هنا أزرار الحساب أو التبديل.</p><div class="settings-compact-actions"><button class="btn secondary" id="settingsDisableLock">إلغاء القفل مؤقتًا</button><button class="btn light" id="settingsGoAccount">الحساب</button></div></div>`;
    }
    if(activeTab === "appearance") {
      const compact = !!(s.appearance && s.appearance.compact);
      return `<div class="card"><h2>الشكل</h2><div class="notice">وضع الواجهة الحالي: <b>${compact ? "مدمجة" : "واسعة"}</b></div><div class="settings-compact-actions"><button class="btn light" id="settingsCompactOn">واجهة مدمجة</button><button class="btn light" id="settingsCompactOff">واجهة واسعة</button></div></div>`;
    }
    if(activeTab === "shop") {
      return `<div class="card"><h2>المتجر</h2><p>كود المتجر: <b>${escSafe(s.shopId || "-")}</b></p><div class="settings-compact-actions"><button class="btn secondary" id="settingsPolicies">السياسات</button><button class="btn secondary" id="settingsItems">الأصناف</button><button class="btn light" id="settingsShopCode">كود التاجر</button><button class="btn light" id="settingsCustomers">العملاء</button></div></div>`;
    }
    if(activeTab === "permissions") {
      return `<div class="card"><h2>الصلاحيات حسب الدور</h2><div class="table-wrap"><table class="compact-table"><thead><tr><th>الوظيفة</th><th>التاجر</th><th>العميل</th></tr></thead><tbody><tr><td>الأصناف والأسعار والمخزون</td><td>إضافة/تعديل/حذف وتسوية</td><td>عرض وطلب فقط حسب سياسة التاجر</td></tr><tr><td>السياسات والظهور والدوام</td><td>تحكم كامل</td><td>عرض فقط</td></tr><tr><td>الطلبات</td><td>مراجعة/قبول/رفض وإنشاء فاتورة</td><td>إنشاء ومتابعة طلباته فقط</td></tr><tr><td>السداد والفواتير وكشف الحساب</td><td>اعتماد/رفض ومراجعة</td><td>حسابه فقط</td></tr><tr><td>المالك والاشتراكات</td><td>مالك التطبيق فقط</td><td>لا يظهر</td></tr></tbody></table></div></div>`;
    }
    if(activeTab === "update") {
      const apkLabel = (typeof nativeVersionName === "function" && typeof nativeVersionCode === "function") ? `${nativeVersionName()} (${nativeVersionCode()})` : "غير معروف";
      const appVersion = typeof APP_VERSION !== "undefined" ? APP_VERSION : VERSION;
      return `<div class="card"><h2>التحديث</h2>${updateStatusCard()}<div class="grid"><div class="metric"><span class="muted">إصدار الواجهات</span><b>${escSafe(appVersion)}</b></div><div class="metric"><span class="muted">إصدار APK</span><b>${escSafe(apkLabel)}</b></div><div class="metric"><span class="muted">مرحلة الإعدادات</span><b>${VERSION}</b></div></div><div class="settings-compact-actions"><button class="btn ok" id="settingsRefreshUi">تحديث الواجهات</button><button class="btn secondary" id="settingsUpdateApk">تحديث APK</button><button class="btn light" id="settingsCheckApk">فحص APK</button></div></div>`;
    }
    if(activeTab === "backup") {
      return `<div class="card"><h2>النسخ والاستيراد</h2><p class="muted">اختصارات آمنة للانتقال إلى صفحات التصدير دون تشغيل عملية حذف أو كتابة مباشرة.</p><div class="settings-compact-actions"><button class="btn secondary" id="settingsExportItems">الأصناف</button><button class="btn light" id="settingsExportReports">التقارير</button><button class="btn light" id="settingsStatement">كشف الحساب</button><button class="btn light" id="settingsInvoices">الفواتير</button></div></div>`;
    }
    if(activeTab === "account") {
      const userLabel = escSafe((s.authPhoneNumber || s.authPhoneKey || s.authEmail || "غير معروف"));
      return `<div class="card" id="settingsAccountMainCard"><h2>الحساب</h2><p class="muted">إدارة الجلسة الحالية والتبديل بين أوضاع الحساب.</p><div class="notice">المستخدم الحالي: <b>${userLabel}</b></div><div class="settings-compact-actions"><button class="btn danger" id="settingsLogout">تسجيل خروج</button><button class="btn light" id="settingsGoHome">الرئيسية</button></div></div>${roleAccountCardHtml()}`;
    }
    const counters = (typeof appNotificationCounters === "function") ? appNotificationCounters() : {};
    const permission = (typeof notificationPermissionState === "function") ? notificationPermissionState() : "unknown";
    return `<div class="card"><h2>التنبيهات</h2><div class="grid"><div class="metric"><span class="muted">الإجمالي غير المقروء</span><b>${Number(counters.notifications || 0)}</b></div><div class="metric"><span class="muted">صلاحية التنبيهات</span><b>${escSafe(permission)}</b></div></div><p class="muted">العداد يظهر داخل التطبيق دائمًا، وعلى أيقونة التطبيق حسب دعم الهاتف واللانشر.</p><div class="settings-compact-actions"><button class="btn ok" id="settingsEnableNotifications">تفعيل التنبيهات</button><button class="btn secondary" id="settingsOpenNotifications">فتح الإشعارات</button><button class="btn light" id="settingsOpenMessages">فتح الرسائل</button><button class="btn warn" id="settingsClearBadge">تصفير العدّاد</button></div></div>`;
  }

  function bindSafeAction(id, label, handler){
    let el = null;
    try { el = byId(id); } catch (_) { el = document.getElementById(id); }
    if(!el) return false;
    el.onclick = async function(){
      const wasDisabled = !!el.disabled;
      try { el.disabled = true; await handler(el); }
      catch (error) { try { console.error("settings action failed", id, error); } catch (_) {} try { msg("تعذر تنفيذ " + label + ": " + safeString(error), "error"); } catch (_) {} }
      finally { try { el.disabled = wasDisabled; } catch (_) {} }
    };
    return true;
  }

  function openSettingsTab(tab, renderSettingsFn){
    try {
      if(typeof setPageTab === "function") setPageTab("settings", normalizeTab(tab), renderSettingsFn);
      else {
        if(typeof state === "object" && state) state.settingsTab = normalizeTab(tab);
        saveSafe();
        if(typeof renderSettingsFn === "function") renderSettingsFn();
      }
    } catch (_) { if(typeof renderSettingsFn === "function") renderSettingsFn(); }
  }
  function navigate(page){ if(page && typeof show === "function") show(page); }
  async function refreshUi(){ if(typeof refreshWebUiNow === "function") await refreshWebUiNow(); const target = (location.pathname || "/") + "?v=" + Date.now(); location.replace(target); }
  async function cleanCache(){ if(typeof refreshWebUiNow === "function") await refreshWebUiNow(); notify("تم تجهيز الواجهات للتحديث.", "success"); }
  function showSettingsSelfCheck(){
    const current = selfCheck();
    const runtime = callCheck("hesabiFullRuntimeSmokeSelfCheck");
    const text = "فحص الإعدادات: " + (current.ok ? "سليم" : "يحتاج مراجعة") + "\n" + "فحص التشغيل العام: " + (runtime.ok !== false ? "سليم" : "يحتاج مراجعة") + "\n" + "الإصدار: " + VERSION + " / build " + BUILD_CODE;
    if(typeof showAppDialog === "function") showAppDialog("فحص الإعدادات", text, current.ok ? "success" : "warning", [{ text: "موافق", cls: "ok" }]);
    else notify(text.replace(/\n/g, " - "), current.ok ? "success" : "notice");
  }

  async function logoutFromSettings(){
    try {
      if(typeof safeFullLogout === "function") { await safeFullLogout("settings-account"); return; }
      try { if(Array.isArray(unsub)){ unsub.forEach(function(u){ try { u(); } catch(_) {} }); unsub = []; } } catch(_) {}
      try { if(typeof signOut === "function" && auth) await signOut(auth); } catch(e) { console.warn("logout signOut failed", e); }
      try { currentUser = null; authReady = false; } catch(_) {}
      try {
        state.role = "";
        state.profileDone = false;
        delete state.shopId; delete state.shopName; delete state.customerId; delete state.customerName;
        delete state.customerLinks; delete state.activeCustomerLink; delete state.uid;
        delete state.authEmail; delete state.authPhoneNumber; delete state.authPhoneKey; delete state.authProvider;
      } catch(_) {}
      try { sessionStorage.clear(); } catch(_) {}
      saveSafe();
      try { if(typeof hideAppDialog === "function") hideAppDialog(); } catch(_) {}
      renderSafe();
      notify("تم تسجيل الخروج.", "success");
    } catch(error) { notify("تعذر تسجيل الخروج: " + safeString(error && error.message || error), "error"); }
  }

  function bindRoleControls(){
    bindSafeAction("dualSwitchTrader", "الدخول كتاجر", function(){ switchRoleFromSettings("trader", false); });
    bindSafeAction("dualSwitchCustomer", "الدخول كعميل", function(){ switchRoleFromSettings("customer", false); });
    bindSafeAction("dualSetupTrader", "تهيئة تاجر", function(){ switchRoleFromSettings("trader", true); });
    bindSafeAction("dualSetupCustomer", "ربط تاجر كعميل", function(){ switchRoleFromSettings("customer", true); });
    bindSafeAction("dualOpenStores", "متاجري", openStoresFromAccount);
  }

  function bindActions(renderSettingsFn){
    try { if(typeof bindPageTabs === "function") bindPageTabs("settings", renderSettingsFn); } catch (_) {}
    const bound = [];
    const go = function(id, page){ bound.push({ id, ok: bindSafeAction(id, "فتح " + page, function(){ navigate(page); }) }); };

    bound.push({ id: "settingsRefreshUi", ok: bindSafeAction("settingsRefreshUi", "تحديث الواجهات", refreshUi) });
    bound.push({ id: "settingsCleanCache", ok: false });
    bound.push({ id: "settingsUpdateApk", ok: bindSafeAction("settingsUpdateApk", "تحديث APK", function(){ if(typeof downloadApkUpdate === "function") return downloadApkUpdate(); throw new Error("downloadApkUpdate غير متاحة"); }) });
    bound.push({ id: "settingsCheckApk", ok: bindSafeAction("settingsCheckApk", "فحص APK", function(){ if(typeof checkApkUpdateOnly === "function") return checkApkUpdateOnly(true); throw new Error("checkApkUpdateOnly غير متاحة"); }) });
    bound.push({ id: "settingsRunSelfCheck", ok: false });
    bound.push({ id: "settingsLogout", ok: bindSafeAction("settingsLogout", "تسجيل الخروج", logoutFromSettings) });
    bound.push({ id: "settingsDisableLock", ok: bindSafeAction("settingsDisableLock", "إلغاء القفل مؤقتًا", function(){ if(typeof state === "object" && state){ state.appLockEnabled=false; state.lockEnabled=false; } saveSafe(); notify("تم إلغاء القفل مؤقتًا", "success"); if(typeof renderSettingsFn === "function") renderSettingsFn(); }) });
    bound.push({ id: "settingsCompactOn", ok: bindSafeAction("settingsCompactOn", "تفعيل الواجهة المدمجة", function(){ if(typeof state === "object" && state){ state.appearance=state.appearance||{}; state.appearance.compact=true; } saveSafe(); try { if(typeof applyAppearance === "function") applyAppearance(); } catch(_) {} if(typeof renderSettingsFn === "function") renderSettingsFn(); }) });
    bound.push({ id: "settingsCompactOff", ok: bindSafeAction("settingsCompactOff", "تفعيل الواجهة الواسعة", function(){ if(typeof state === "object" && state){ state.appearance=state.appearance||{}; state.appearance.compact=false; } saveSafe(); try { if(typeof applyAppearance === "function") applyAppearance(); } catch(_) {} if(typeof renderSettingsFn === "function") renderSettingsFn(); }) });
    bound.push({ id: "settingsGoAccount", ok: bindSafeAction("settingsGoAccount", "الحساب", function(){ openSettingsTab("account", renderSettingsFn); }) });
    bindRoleControls();

    bound.push({ id: "settingsEnableNotifications", ok: bindSafeAction("settingsEnableNotifications", "تفعيل التنبيهات", function(){ if(typeof requestNotificationPermission === "function") return requestNotificationPermission(true); throw new Error("requestNotificationPermission غير متاحة"); }) });
    bound.push({ id: "settingsClearBadge", ok: bindSafeAction("settingsClearBadge", "تصفير العدّاد", function(){ if(typeof clearAllNotificationCounters === "function") clearAllNotificationCounters(); notify("تم تصفير العدّاد.", "success"); }) });

    go("settingsPolicies", "policies");
    go("settingsItems", "items");
    go("settingsShopCode", "shopcode");
    go("settingsCustomers", "customers");
    go("settingsExportItems", "items");
    go("settingsExportReports", "reports");
    go("settingsStatement", "statement");
    go("settingsInvoices", "invoices");
    go("settingsGoHome", "home");
    go("settingsOpenNotifications", "notifications");
    go("settingsOpenMessages", "messages");

    try { removeInjectedSettingsArtifacts(); } catch(_) {}
    window.__hesabiSettingsLastBindings = { ok: true, at: Date.now(), bound };
    return window.__hesabiSettingsLastBindings;
  }

  function removeInjectedSettingsArtifacts(){
    const root = byId("page_settings");
    if(!root) return;
    ["settingsFinalCacheCheck", "hesabiRoleSettings115", "hesabiUpdateSettings115", "hesabiUpdate115Modal"].forEach(function(id){
      const el = byId(id);
      if(el && id !== "settingsAccountRoleCard") { try { el.remove(); } catch(_) {} }
    });
    try {
      Array.from(root.querySelectorAll("button")).forEach(function(btn){
        if((btn.textContent || "").trim() === "فحص نهائي") btn.remove();
      });
    } catch(_) {}
  }

  function selfCheck(){
    const api = window.hesabiSettingsHelpers || {};
    const missingMethods = ["tabs", "normalizeTab", "renderSection", "bindActions"].filter(function(name){ return typeof api[name] !== "function"; });
    const tabValues = getTabs().map(function(t){ return t[0]; });
    const missingTabs = REQUIRED_TABS.filter(function(t){ return tabValues.indexOf(t) === -1; });
    let noFinalButton = true;
    let roleOnlyInAccount = true;
    try {
      const root = byId("page_settings");
      if(root){
        noFinalButton = Array.from(root.querySelectorAll("button")).every(function(btn){ return (btn.textContent || "").trim() !== "فحص نهائي"; });
        const roleCard = byId("settingsAccountRoleCard");
        const rawTab = typeof pageTabState === "function" ? pageTabState("settings", "security") : (state && state.settingsTab);
        const tab = normalizeTab(rawTab);
        roleOnlyInAccount = !roleCard || tab === "account";
      }
    } catch(_) {}
    return { ok: missingMethods.length === 0 && missingTabs.length === 0 && noFinalButton && roleOnlyInAccount, version: VERSION, build: BUILD_CODE, missingMethods, missingTabs, noFinalButton, roleOnlyInAccount, tabs: tabValues, checkedAt: new Date().toISOString() };
  }

  window.hesabiSettingsHelpers = { version: VERSION, build: BUILD_CODE, tabs: getTabs, normalizeTab, renderSection, bindActions, selfCheck };
  window.hesabiSettingsHelpersSelfCheck = selfCheck;
})();
