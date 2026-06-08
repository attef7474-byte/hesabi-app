/* Hesabi 1.0.73 - Settings page stabilization.
   Non-intrusive settings helpers only: no Firestore writes and no order/payment/catalog mutations. */
(function(){
  "use strict";

  const VERSION = "1.0.73";
  const BUILD_CODE = 73;
  const REQUIRED_TABS = ["security", "appearance", "shop", "permissions", "update", "backup", "account", "notifications"];

  function safeString(value){
    try {
      if(value && value.message) return String(value.message);
      return String(value == null ? "" : value);
    } catch (_) {
      return "";
    }
  }

  function escSafe(value){
    try {
      if(typeof esc === "function") return esc(value);
    } catch (_) {}
    return String(value == null ? "" : value).replace(/[&<>'"]/g, function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch];
    });
  }

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

  function normalizeTab(tab){
    const value = String(tab || "security");
    return REQUIRED_TABS.indexOf(value) >= 0 ? value : "security";
  }

  function boolText(value){ return value ? "مفعل" : "ملغي"; }

  function callCheck(fnName){
    const fn = window[fnName];
    if(typeof fn !== "function") return { ok: false, missing: true, fn: fnName };
    try {
      const result = fn();
      return Object.assign({ fn: fnName }, result && typeof result === "object" ? result : { ok: true, value: result });
    } catch (error) {
      return { ok: false, fn: fnName, error: safeString(error) };
    }
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
      return `<div class="card"><h2>الأمان</h2><div class="notice">قفل التطبيق: ${boolText(s.appLockEnabled || s.lockEnabled)}</div><p class="muted">تم تثبيت أزرار الإعدادات بحيث لا تكسر الصفحة إذا تعذر تنفيذ إجراء.</p><div class="settings-compact-actions"><button class="btn secondary" id="settingsDisableLock">إلغاء القفل مؤقتًا</button><button class="btn light" id="settingsGoAccount">الحساب</button></div></div>`;
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
      return `<div class="card"><h2>التحديث والكاش</h2>${updateStatusCard()}<div class="grid"><div class="metric"><span class="muted">إصدار الواجهات</span><b>${escSafe(appVersion)}</b></div><div class="metric"><span class="muted">إصدار APK</span><b>${escSafe(apkLabel)}</b></div><div class="metric"><span class="muted">مرحلة الإعدادات</span><b>${VERSION}</b></div></div><div class="settings-compact-actions"><button class="btn ok" id="settingsRefreshUi">تحديث الواجهات</button><button class="btn warn" id="settingsCleanCache">تنظيف الكاش</button><button class="btn secondary" id="settingsUpdateApk">تحديث APK</button><button class="btn light" id="settingsCheckApk">فحص APK</button><button class="btn light" id="settingsRunSelfCheck">فحص الإعدادات</button></div></div>`;
    }
    if(activeTab === "backup") {
      return `<div class="card"><h2>النسخ والاستيراد</h2><p class="muted">اختصارات آمنة للانتقال إلى صفحات التصدير دون تشغيل عملية حذف أو كتابة مباشرة.</p><div class="settings-compact-actions"><button class="btn secondary" id="settingsExportItems">الأصناف</button><button class="btn light" id="settingsExportReports">التقارير</button><button class="btn light" id="settingsStatement">كشف الحساب</button><button class="btn light" id="settingsInvoices">الفواتير</button></div></div>`;
    }
    if(activeTab === "account") {
      return `<div class="card"><h2>الحساب</h2><p class="muted">الخروج وإعادة الدخول تحل مشاكل الجلسات والصلاحيات القديمة.</p><div class="settings-compact-actions"><button class="btn danger" id="settingsLogout">تسجيل خروج</button><button class="btn light" id="settingsGoHome">الرئيسية</button></div></div>`;
    }
    const counters = (typeof appNotificationCounters === "function") ? appNotificationCounters() : {};
    const permission = (typeof notificationPermissionState === "function") ? notificationPermissionState() : "unknown";
    return `<div class="card"><h2>التنبيهات</h2><div class="grid"><div class="metric"><span class="muted">الإجمالي غير المقروء</span><b>${Number(counters.notifications || 0)}</b></div><div class="metric"><span class="muted">صلاحية التنبيهات</span><b>${escSafe(permission)}</b></div></div><p class="muted">العداد يظهر داخل التطبيق دائمًا، وعلى أيقونة التطبيق حسب دعم الهاتف واللانشر.</p><div class="settings-compact-actions"><button class="btn ok" id="settingsEnableNotifications">تفعيل التنبيهات</button><button class="btn secondary" id="settingsOpenNotifications">فتح الإشعارات</button><button class="btn light" id="settingsOpenMessages">فتح الرسائل</button><button class="btn warn" id="settingsClearBadge">تصفير العدّاد</button></div></div>`;
  }

  function bindSafeAction(id, label, handler){
    let el = null;
    try { el = $(id); } catch (_) { el = document.getElementById(id); }
    if(!el) return false;
    el.onclick = async function(){
      const wasDisabled = !!el.disabled;
      try {
        el.disabled = true;
        await handler(el);
      } catch (error) {
        try { console.error("settings action failed", id, error); } catch (_) {}
        try { msg("تعذر تنفيذ " + label + ": " + safeString(error), "error"); } catch (_) {}
      } finally {
        try { el.disabled = wasDisabled; } catch (_) {}
      }
    };
    return true;
  }

  function openSettingsTab(tab, renderSettingsFn){
    try {
      if(typeof setPageTab === "function") setPageTab("settings", normalizeTab(tab), renderSettingsFn);
      else {
        if(typeof state === "object" && state) state.settingsTab = normalizeTab(tab);
        if(typeof save === "function") save();
        if(typeof renderSettingsFn === "function") renderSettingsFn();
      }
    } catch (_) {
      if(typeof renderSettingsFn === "function") renderSettingsFn();
    }
  }

  function navigate(page){
    if(!page) return;
    if(typeof show === "function") show(page);
  }

  async function refreshUi(){
    if(typeof refreshWebUiNow === "function") await refreshWebUiNow();
    const updater = window.hesabiUpdateCacheStability;
    const target = updater && typeof updater.buildRefreshUrl === "function" ? updater.buildRefreshUrl({ settings: "refresh" }) : (location.pathname + "?v=" + Date.now());
    location.replace(target);
  }

  async function cleanCache(){
    if(typeof refreshWebUiNow === "function") await refreshWebUiNow();
    const updater = window.hesabiUpdateCacheStability;
    const target = updater && typeof updater.buildRefreshUrl === "function" ? updater.buildRefreshUrl({ settings: "clean" }) : (location.pathname + "?clean=" + Date.now());
    location.replace(target);
  }

  function showSettingsSelfCheck(){
    const current = selfCheck();
    const runtime = callCheck("hesabiFullRuntimeSmokeSelfCheck");
    const text = "فحص الإعدادات: " + (current.ok ? "سليم" : "يحتاج مراجعة") + "\n" +
      "فحص التشغيل العام: " + (runtime.ok !== false ? "سليم" : "يحتاج مراجعة") + "\n" +
      "الإصدار: " + VERSION + " / build " + BUILD_CODE;
    if(typeof showAppDialog === "function") showAppDialog("فحص الإعدادات", text, current.ok ? "success" : "warning", [{ text: "موافق", cls: "ok" }]);
    else if(typeof msg === "function") msg(text.replace(/\n/g, " - "), current.ok ? "success" : "notice");
  }

  function bindActions(renderSettingsFn){
    try { if(typeof bindPageTabs === "function") bindPageTabs("settings", renderSettingsFn); } catch (_) {}
    const bound = [];
    const go = function(id, page){ bound.push({ id, ok: bindSafeAction(id, "فتح " + page, function(){ navigate(page); }) }); };

    bound.push({ id: "settingsRefreshUi", ok: bindSafeAction("settingsRefreshUi", "تحديث الواجهات", refreshUi) });
    bound.push({ id: "settingsCleanCache", ok: bindSafeAction("settingsCleanCache", "تنظيف الكاش", cleanCache) });
    bound.push({ id: "settingsUpdateApk", ok: bindSafeAction("settingsUpdateApk", "تحديث APK", function(){ if(typeof downloadApkUpdate === "function") return downloadApkUpdate(); throw new Error("downloadApkUpdate غير متاحة"); }) });
    bound.push({ id: "settingsCheckApk", ok: bindSafeAction("settingsCheckApk", "فحص APK", function(){ if(typeof checkApkUpdateOnly === "function") return checkApkUpdateOnly(true); throw new Error("checkApkUpdateOnly غير متاحة"); }) });
    bound.push({ id: "settingsRunSelfCheck", ok: bindSafeAction("settingsRunSelfCheck", "فحص الإعدادات", showSettingsSelfCheck) });
    bound.push({ id: "settingsEnableNotifications", ok: bindSafeAction("settingsEnableNotifications", "تفعيل التنبيهات", function(){ if(typeof requestNotificationPermission === "function") return requestNotificationPermission(true); throw new Error("requestNotificationPermission غير متاحة"); }) });
    bound.push({ id: "settingsClearBadge", ok: bindSafeAction("settingsClearBadge", "تصفير العدّاد", function(){ if(typeof clearAllNotificationCounters === "function") clearAllNotificationCounters(); if(typeof msg === "function") msg("تم تصفير العدّاد.", "success"); }) });
    bound.push({ id: "settingsLogout", ok: bindSafeAction("settingsLogout", "تسجيل الخروج", function(){ if(typeof safeFullLogout === "function") return safeFullLogout("manual"); throw new Error("safeFullLogout غير متاحة"); }) });
    bound.push({ id: "settingsDisableLock", ok: bindSafeAction("settingsDisableLock", "إلغاء القفل مؤقتًا", function(){ if(typeof state === "object" && state){ state.appLockEnabled=false; state.lockEnabled=false; } if(typeof save === "function") save(); if(typeof msg === "function") msg("تم إلغاء القفل مؤقتًا", "success"); if(typeof renderSettingsFn === "function") renderSettingsFn(); }) });
    bound.push({ id: "settingsCompactOn", ok: bindSafeAction("settingsCompactOn", "تفعيل الواجهة المدمجة", function(){ if(typeof state === "object" && state){ state.appearance=state.appearance||{}; state.appearance.compact=true; } if(typeof save === "function") save(); if(typeof applyAppearance === "function") applyAppearance(); if(typeof renderSettingsFn === "function") renderSettingsFn(); }) });
    bound.push({ id: "settingsCompactOff", ok: bindSafeAction("settingsCompactOff", "تفعيل الواجهة الواسعة", function(){ if(typeof state === "object" && state){ state.appearance=state.appearance||{}; state.appearance.compact=false; } if(typeof save === "function") save(); if(typeof applyAppearance === "function") applyAppearance(); if(typeof renderSettingsFn === "function") renderSettingsFn(); }) });
    bound.push({ id: "settingsGoAccount", ok: bindSafeAction("settingsGoAccount", "الحساب", function(){ openSettingsTab("account", renderSettingsFn); }) });

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

    window.__hesabiSettingsLastBindings = { ok: true, at: Date.now(), bound };
    return window.__hesabiSettingsLastBindings;
  }

  function selfCheck(){
    const api = window.hesabiSettingsHelpers || {};
    const missingMethods = ["tabs", "normalizeTab", "renderSection", "bindActions"].filter(function(name){ return typeof api[name] !== "function"; });
    const tabValues = getTabs().map(function(t){ return t[0]; });
    const missingTabs = REQUIRED_TABS.filter(function(t){ return tabValues.indexOf(t) === -1; });
    return {
      ok: missingMethods.length === 0 && missingTabs.length === 0,
      version: VERSION,
      build: BUILD_CODE,
      missingMethods,
      missingTabs,
      tabs: tabValues,
      checkedAt: new Date().toISOString()
    };
  }

  window.hesabiSettingsHelpers = {
    version: VERSION,
    build: BUILD_CODE,
    tabs: getTabs,
    normalizeTab,
    renderSection,
    bindActions,
    selfCheck
  };
  window.hesabiSettingsHelpersSelfCheck = selfCheck;
})();
