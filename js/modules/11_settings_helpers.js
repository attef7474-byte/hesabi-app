/* Hesabi 1.0.126 - Stable root settings.
   Single source for settings tabs. No external injection, no final diagnostics button. */
(function(){
  "use strict";

  const VERSION = "1.0.126";
  const BUILD_CODE = 126;
  const REQUIRED_TABS = ["security", "appearance", "shop", "permissions", "update", "backup", "account", "notifications"];

  function safeString(value){
    try { return value == null ? "" : String(value); } catch (_) { return ""; }
  }

  function escSafe(value){
    try { if(typeof esc === "function") return esc(value == null ? "" : value); } catch (_) {}
    return safeString(value).replace(/[&<>"']/g, function(ch){
      return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch] || ch);
    });
  }

  function byId(id){ try { return document.getElementById(id); } catch (_) { return null; } }
  function qsa(selector, root){ try { return Array.from((root || document).querySelectorAll(selector)); } catch (_) { return []; } }
  function getState(){ return (typeof state === "object" && state) ? state : {}; }
  function getCache(){ return (typeof cache === "object" && cache) ? cache : {}; }
  function saveSafe(){ try { if(typeof save === "function") save(); } catch (_) {} }
  function renderSafe(){ try { if(typeof render === "function") render(); } catch (_) {} }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch (_) {} }
  function boolText(value){ return value ? "مفعل" : "ملغي"; }
  function roleLabel(role){ return role === "trader" ? "تاجر" : role === "customer" ? "عميل" : "غير محدد"; }
  function selected(value, expected){ return safeString(value) === safeString(expected) ? " selected" : ""; }
  function checked(value){ return value ? " checked" : ""; }
  function num(value, fallback){ const n = Number(value); return Number.isFinite(n) ? n : fallback; }

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
    const value = safeString(tab || "security");
    return REQUIRED_TABS.indexOf(value) >= 0 ? value : "security";
  }

  function runtimeVersion(){
    try {
      if(window.__hesabiRuntime && window.__hesabiRuntime.version) return safeString(window.__hesabiRuntime.version);
    } catch (_) {}
    try { if(typeof HESABI_APP_VERSION !== "undefined") return safeString(HESABI_APP_VERSION); } catch (_) {}
    try { if(typeof APP_VERSION !== "undefined") return safeString(APP_VERSION); } catch (_) {}
    return VERSION;
  }

  function runtimeBuild(){
    try {
      if(window.__hesabiRuntime && window.__hesabiRuntime.build) return Number(window.__hesabiRuntime.build || 0);
    } catch (_) {}
    try { if(typeof HESABI_APP_BUILD_CODE !== "undefined") return Number(HESABI_APP_BUILD_CODE || 0); } catch (_) {}
    try { if(typeof APP_BUILD_CODE !== "undefined") return Number(APP_BUILD_CODE || 0); } catch (_) {}
    return BUILD_CODE;
  }

  function nativeCode(){ try { return typeof nativeVersionCode === "function" ? Number(nativeVersionCode() || 0) : 0; } catch (_) { return 0; } }
  function nativeName(){ try { return typeof nativeVersionName === "function" ? safeString(nativeVersionName() || "") : ""; } catch (_) { return ""; } }
  function nativeLabel(){ const n = nativeName(); const c = nativeCode(); return (n || "APK") + " (" + (c || "-") + ")"; }

  function appearanceDefaults(){
    return { theme:"light", accent:"teal", brightness:100, background:"glass", compact:true };
  }

  function currentAppearance(){
    try { if(typeof getAppearance === "function") return Object.assign(appearanceDefaults(), getAppearance() || {}); } catch (_) {}
    const s = getState();
    return Object.assign(appearanceDefaults(), s.appearance || {});
  }

  function applyAppearanceSettingsLocal(values){
    const s = getState();
    const current = currentAppearance();
    const clean = Object.assign({}, current, values || {});
    clean.theme = clean.theme === "dark" ? "dark" : "light";
    clean.accent = ["teal","blue","green","purple","orange"].indexOf(clean.accent) >= 0 ? clean.accent : "teal";
    clean.background = ["glass","soft","plain"].indexOf(clean.background) >= 0 ? clean.background : "glass";
    clean.brightness = Math.min(120, Math.max(75, num(clean.brightness, 100)));
    clean.compact = clean.compact !== false;
    try {
      if(typeof saveAppearanceSettings === "function") {
        saveAppearanceSettings(clean);
      } else {
        s.appearance = clean;
        saveSafe();
        try { if(typeof applyAppearance === "function") applyAppearance(); } catch (_) {}
      }
      notify("تم حفظ إعدادات الشكل.", "success");
    } catch (error) {
      notify("تعذر حفظ الشكل: " + safeString(error && error.message || error), "error");
    }
  }

  function roleProfile(role){
    try { if(typeof dualRoleProfileFor === "function") return dualRoleProfileFor(role); } catch (_) {}
    const s = getState();
    return (s.roleProfiles && s.roleProfiles[role]) || null;
  }

  function rememberRole(){
    try { if(typeof rememberCurrentDualRoleProfile === "function") rememberCurrentDualRoleProfile(); } catch (_) {}
  }

  function resetLiveData(){
    try { if(typeof resetCacheForLiveData === "function") resetCacheForLiveData(); } catch (_) {}
    try { listenersStartedKey = ""; } catch (_) {}
  }

  function applyRole(role, setupMode){
    const s = getState();
    rememberRole();
    try {
      if(setupMode){
        s.role = role;
        s.profileDone = false;
        resetLiveData();
        saveSafe();
        renderSafe();
        notify("أكمل تهيئة وضع " + roleLabel(role) + ".", "notice");
        return;
      }

      if(typeof applyDualRoleProfile === "function"){
        applyDualRoleProfile(role);
        return;
      }

      const p = roleProfile(role);
      s.role = role;
      if(p && p.profileDone){
        Object.keys(p).forEach(function(key){ if(key !== "role") s[key] = p[key]; });
        s.profileDone = true;
      } else {
        s.profileDone = false;
      }
      resetLiveData();
      saveSafe();
      renderSafe();
      notify("تم التبديل إلى وضع " + roleLabel(role) + ".", "success");
    } catch(error) {
      notify("تعذر التبديل: " + safeString(error && error.message || error), "error");
    }
  }

  function openStores(){
    try {
      rememberRole();
      const s = getState();
      if(s.role !== "customer"){
        const p = roleProfile("customer");
        if(p && p.profileDone && typeof applyDualRoleProfile === "function"){
          applyDualRoleProfile("customer");
          setTimeout(function(){ try { if(typeof show === "function") show("shops"); } catch (_) {} }, 250);
          return;
        }
        applyRole("customer", true);
        return;
      }
      if(typeof show === "function") show("shops");
    } catch(error) {
      notify("تعذر فتح المتاجر: " + safeString(error && error.message || error), "error");
    }
  }

  async function safeLogout(){
    try {
      if(typeof safeFullLogout === "function") {
        await safeFullLogout("settings-account");
        return;
      }
    } catch (_) {}

    const s = getState();
    try { if(Array.isArray(unsub)){ unsub.forEach(function(fn){ try { if(typeof fn === "function") fn(); } catch (_) {} }); unsub = []; } } catch (_) {}
    try { if(typeof auth !== "undefined" && auth && typeof signOut === "function") await signOut(auth); } catch (_) {}
    try { currentUser = null; authReady = false; } catch (_) {}

    [
      "role","shopId","shopName","customerId","customerName","customerPhone","activeShopId",
      "uid","authEmail","authPhoneNumber","authPhoneKey","authProvider"
    ].forEach(function(key){ try { delete s[key]; } catch (_) { s[key] = ""; } });
    s.profileDone = false;
    try { if(typeof active !== "undefined") active = "home"; } catch (_) {}
    try { sessionStorage.clear(); } catch (_) {}
    saveSafe();
    try { if(typeof hideAppDialog === "function") hideAppDialog(); } catch (_) {}
    renderSafe();
    notify("تم تسجيل الخروج.", "success");
  }

  function accountInfoHtml(){
    const s = getState();
    const c = getCache();
    const phone = s.authPhoneNumber || s.customerPhone || "";
    const email = s.authEmail || "";
    const shopName = s.shopName || (c.shop && c.shop.name) || "";
    const shopId = s.shopId || s.activeShopId || "";
    const customerName = s.customerName || "";
    return `
      <div class="grid">
        <div class="metric"><span class="muted">نوع الحساب الحالي</span><b>${escSafe(roleLabel(s.role))}</b></div>
        <div class="metric"><span class="muted">حالة التهيئة</span><b>${escSafe(s.profileDone ? "مكتملة" : "غير مكتملة")}</b></div>
        <div class="metric"><span class="muted">الهاتف</span><b dir="ltr">${escSafe(phone || "-")}</b></div>
        <div class="metric"><span class="muted">البريد</span><b dir="ltr">${escSafe(email || "-")}</b></div>
        <div class="metric"><span class="muted">كود المتجر</span><b dir="ltr">${escSafe(shopId || "-")}</b></div>
        <div class="metric"><span class="muted">اسم المتجر</span><b>${escSafe(shopName || "-")}</b></div>
        <div class="metric"><span class="muted">اسم العميل</span><b>${escSafe(customerName || "-")}</b></div>
      </div>`;
  }

  function roleCardHtml(){
    const s = getState();
    const hasTrader = !!roleProfile("trader") || (s.role === "trader" && !!s.shopId);
    const hasCustomer = !!roleProfile("customer") || (s.role === "customer" && (!!s.customerId || Array.isArray(s.customerLinks)));
    return `
      <div class="card" id="settingsAccountRoleCard">
        <h2>وضع الحساب: تاجر وعميل</h2>
        <div class="notice">
          الوضع الحالي: <b>${escSafe(roleLabel(s.role))}</b>
        </div>
        <div class="settings-status-row">
          <span class="hesabi-pill ${hasTrader ? "" : "off"}">تاجر: ${hasTrader ? "مفعل" : "غير مفعل"}</span>
          <span class="hesabi-pill ${hasCustomer ? "" : "off"}">عميل: ${hasCustomer ? "مفعل" : "غير مفعل"}</span>
        </div>
        <div class="settings-compact-actions settings-actions-2">
          <button class="btn secondary" id="settingsSwitchTrader" type="button">الدخول كتاجر</button>
          <button class="btn secondary" id="settingsSwitchCustomer" type="button">الدخول كعميل</button>
          <button class="btn light" id="settingsSetupTrader" type="button">تهيئة / استرجاع تاجر</button>
          <button class="btn light" id="settingsSetupCustomer" type="button">ربط تاجر كعميل</button>
          <button class="btn ok" id="settingsOpenStores" type="button">متاجري / ربط متجر</button>
        </div>
      </div>`;
  }

  function updateInfoHtml(){
    const rtVersion = runtimeVersion();
    const rtBuild = runtimeBuild();
    return `
      <div class="grid">
        <div class="metric"><span class="muted">إصدار الواجهات</span><b>${escSafe(rtVersion)}</b></div>
        <div class="metric"><span class="muted">Build الواجهات</span><b>${escSafe(rtBuild || "-")}</b></div>
        <div class="metric"><span class="muted">إصدار APK</span><b>${escSafe(nativeLabel())}</b></div>
        <div class="metric"><span class="muted">مرحلة الإعدادات</span><b>${escSafe(VERSION)}</b></div>
      </div>
      <div class="notice" id="settingsUpdateStatus">الإعدادات مستقرة. استخدم الزر أدناه لتحديث الواجهات أو فتح تحديث APK عند توفره.</div>
      <div class="settings-compact-actions settings-actions-1">
        <button class="btn ok" id="settingsSmartUpdate" type="button">تحديث التطبيق الآن</button>
      </div>`;
  }

  function renderSection(tab){
    const s = getState();
    const c = getCache();
    const activeTab = normalizeTab(tab);

    if(activeTab === "security"){
      return `
        <div class="card">
          <h2>الأمان</h2>
          <div class="grid">
            <div class="metric"><span class="muted">قفل التطبيق</span><b>${escSafe(boolText(s.appLockEnabled || s.lockEnabled))}</b></div>
            <div class="metric"><span class="muted">البصمة</span><b>${escSafe(boolText(s.biometricEnabled))}</b></div>
            <div class="metric"><span class="muted">رمز PIN</span><b>${escSafe(s.appPin || s.lockPin ? "محفوظ" : "غير محفوظ")}</b></div>
          </div>
          <div class="grid">
            <div class="field"><label>رمز PIN جديد</label><input id="settingsPinInput" type="password" inputmode="numeric" maxlength="12" placeholder="اكتب رمز PIN"></div>
            <div class="field"><label>القفل التلقائي بالدقائق</label><input id="settingsAutoLockMinutes" type="number" min="1" max="240" value="${escSafe(s.autoLockMinutes || 15)}"></div>
          </div>
          <div class="settings-compact-actions">
            <button class="btn ok" id="settingsSaveSecurity" type="button">حفظ الأمان</button>
            <button class="btn secondary" id="settingsToggleLock" type="button">${s.appLockEnabled || s.lockEnabled ? "إيقاف القفل" : "تفعيل القفل"}</button>
            <button class="btn light" id="settingsToggleBiometric" type="button">${s.biometricEnabled ? "إيقاف البصمة" : "تفعيل البصمة"}</button>
            <button class="btn warn" id="settingsClearPin" type="button">حذف PIN</button>
          </div>
        </div>`;
    }

    if(activeTab === "appearance"){
      const a = currentAppearance();
      return `
        <div class="card">
          <h2>الشكل</h2>
          <div class="grid">
            <div class="field"><label>الوضع</label><select id="settingsTheme"><option value="light"${selected(a.theme,"light")}>نهاري</option><option value="dark"${selected(a.theme,"dark")}>ليلي</option></select></div>
            <div class="field"><label>لون التطبيق</label><select id="settingsAccent"><option value="teal"${selected(a.accent,"teal")}>فيروزي</option><option value="blue"${selected(a.accent,"blue")}>أزرق</option><option value="green"${selected(a.accent,"green")}>أخضر</option><option value="purple"${selected(a.accent,"purple")}>بنفسجي</option><option value="orange"${selected(a.accent,"orange")}>برتقالي</option></select></div>
            <div class="field"><label>الخلفية</label><select id="settingsBackground"><option value="glass"${selected(a.background,"glass")}>زجاجية</option><option value="soft"${selected(a.background,"soft")}>هادئة</option><option value="plain"${selected(a.background,"plain")}>مسطحة</option></select></div>
            <div class="field"><label>السطوع</label><input id="settingsBrightness" type="range" min="75" max="120" value="${escSafe(a.brightness || 100)}"></div>
          </div>
          <label class="check-row"><input id="settingsCompact" type="checkbox"${checked(a.compact !== false)}> واجهة مدمجة للجوال</label>
          <div class="notice">المعاينة الحالية: ${escSafe(a.theme === "dark" ? "ليلي" : "نهاري")} / ${escSafe(a.accent || "teal")}</div>
          <div class="settings-compact-actions">
            <button class="btn ok" id="settingsSaveAppearance" type="button">حفظ الشكل</button>
            <button class="btn light" id="settingsResetAppearance" type="button">استعادة الافتراضي</button>
          </div>
        </div>`;
    }

    if(activeTab === "shop"){
      const shop = c.shop || {};
      const shopId = s.shopId || shop.shopId || shop.id || "";
      return `
        <div class="card">
          <h2>المتجر</h2>
          <div class="grid">
            <div class="metric"><span class="muted">كود المتجر</span><b dir="ltr">${escSafe(shopId || "-")}</b></div>
          </div>
          <div class="field"><label>اسم المتجر</label><input id="settingsShopName" value="${escSafe(s.shopName || shop.name || "")}"></div>
          <div class="field"><label>هاتف المتجر</label><input id="settingsShopPhone" value="${escSafe(shop.phone || s.shopPhone || "")}"></div>
          <div class="field"><label>مواعيد العمل</label><input id="settingsShopHours" value="${escSafe(shop.hours || "")}"></div>
          <div class="field"><label>سياسة الظهور للعميل</label><select id="settingsShopVisibility">
            <option value="public"${selected(shop.visibility, "public")}>عامة</option>
            <option value="private"${selected(shop.visibility, "private")}>خاصة</option>
          </select></div>
          <div class="grid">
            <div class="metric"><span class="muted">الحالة</span><b>${escSafe(shop.subscriptionStatus || shop.status || "نشط")}</b></div>
            <div class="metric"><span class="muted">تاريخ الاستحقاق</span><b>${escSafe(shop.subscriptionDueDate || "-")}</b></div>
          </div>
          <div class="settings-compact-actions">
            <button class="btn ok" id="settingsSaveShop" type="button">حفظ بيانات المتجر</button>
            <button class="btn secondary" id="settingsPolicies" type="button">السياسات</button>
            <button class="btn secondary" id="settingsItems" type="button">الأصناف</button>
            <button class="btn light" id="settingsShopCode" type="button">كود التاجر</button>
            <button class="btn light" id="settingsCustomers" type="button">العملاء</button>
          </div>
        </div>`;
    }

    if(activeTab === "permissions"){
      return `
        <div class="card">
          <h2>الصلاحيات حسب الدور</h2>
          <div class="notice">دورك الحالي: <b>${escSafe(roleLabel(s.role))}</b></div>
          <div class="table-wrap">
            <table class="compact-table">
              <thead><tr><th>الوظيفة</th><th>التاجر</th><th>العميل</th></tr></thead>
              <tbody>
                <tr><td>الأصناف والأسعار والمخزون</td><td>إضافة / تعديل / حذف / تسوية</td><td>عرض وطلب فقط حسب سياسة التاجر</td></tr>
                <tr><td>السياسات والظهور والدوام</td><td>تحكم كامل</td><td>عرض فقط</td></tr>
                <tr><td>الطلبات</td><td>مراجعة / قبول / رفض / إنشاء فاتورة</td><td>إنشاء ومتابعة طلباته فقط</td></tr>
                <tr><td>السداد والفواتير وكشف الحساب</td><td>اعتماد / رفض / مراجعة</td><td>حسابه فقط</td></tr>
                <tr><td>المالك والاشتراكات</td><td>مالك التطبيق فقط</td><td>لا يظهر</td></tr>
              </tbody>
            </table>
          </div>
        </div>`;
    }

    if(activeTab === "update"){
      return `<div class="card"><h2>التحديث</h2>${updateInfoHtml()}</div>`;
    }

    if(activeTab === "backup"){
      return `
        <div class="card">
          <h2>النسخ والاستيراد</h2>
          <div class="notice">كل العمليات هنا آمنة ولا تنفذ حذفًا مباشرًا.</div>
          <div class="grid">
            <div class="metric"><span class="muted">آخر نسخة محلية</span><b>${escSafe(s.lastBackupAt || "-")}</b></div>
            <div class="metric"><span class="muted">آخر استيراد</span><b>${escSafe(s.lastImportAt || "-")}</b></div>
            <div class="metric"><span class="muted">البيانات المحملة</span><b>${escSafe(((c.items||[]).length) + " صنف / " + ((c.customers||[]).length) + " عميل")}</b></div>
          </div>
          <input type="file" id="settingsImportFile" accept=".json" style="display: none;">
          <div class="settings-compact-actions">
            <button class="btn ok" id="settingsExportFull" type="button">تصدير نسخة كاملة JSON</button>
            <button class="btn secondary" id="settingsImportFull" type="button">استيراد نسخة كاملة JSON</button>
            <button class="btn light" id="settingsExportItems" type="button">تصدير الأصناف</button>
            <button class="btn light" id="settingsExportReports" type="button">التقارير</button>
            <button class="btn light" id="settingsStatement" type="button">كشف الحساب</button>
            <button class="btn light" id="settingsInvoices" type="button">الفواتير</button>
          </div>
        </div>`;
    }

    if(activeTab === "account"){
      return `
        <div class="card">
          <h2>الحساب</h2>
          ${accountInfoHtml()}
          <div class="settings-compact-actions">
            <button class="btn danger" id="settingsLogout" type="button">تسجيل خروج</button>
            <button class="btn light" id="settingsGoHome" type="button">الرئيسية</button>
          </div>
        </div>
        ${roleCardHtml()}`;
    }

    const counters = (typeof appNotificationCounters === "function") ? appNotificationCounters() : {};
    const permission = (typeof notificationPermissionState === "function") ? notificationPermissionState() : "unknown";
    const prefs = s.notificationPrefs || {};
    return `
      <div class="card">
        <h2>التنبيهات</h2>
        <div class="grid">
          <div class="metric"><span class="muted">الإجمالي غير المقروء</span><b>${escSafe(counters.notifications || 0)}</b></div>
          <div class="metric"><span class="muted">صلاحية التنبيهات</span><b>${escSafe(permission)}</b></div>
        </div>
        <label class="check-row"><input id="settingsNotifyOrders" type="checkbox"${checked(prefs.orders !== false)}> تنبيهات الطلبات</label>
        <label class="check-row"><input id="settingsNotifyPayments" type="checkbox"${checked(prefs.payments !== false)}> تنبيهات السداد</label>
        <label class="check-row"><input id="settingsNotifyMessages" type="checkbox"${checked(prefs.messages !== false)}> تنبيهات الرسائل</label>
        <label class="check-row"><input id="settingsNotifyStock" type="checkbox"${checked(prefs.stock !== false)}> تنبيهات المخزون</label>
        <div class="settings-compact-actions">
          <button class="btn ok" id="settingsEnableNotifications" type="button">تفعيل التنبيهات</button>
          <button class="btn secondary" id="settingsSaveNotificationPrefs" type="button">حفظ الخيارات</button>
          <button class="btn light" id="settingsOpenNotifications" type="button">فتح الإشعارات</button>
          <button class="btn light" id="settingsOpenMessages" type="button">فتح الرسائل</button>
          <button class="btn warn" id="settingsClearBadge" type="button">تصفير العدّاد</button>
        </div>
      </div>`;
  }

  function bindSafeAction(id, label, handler){
    const el = byId(id);
    if(!el) return false;
    el.onclick = async function(ev){
      try { if(ev && ev.preventDefault) ev.preventDefault(); } catch (_) {}
      const wasDisabled = !!el.disabled;
      try {
        el.disabled = true;
        await handler(el);
      } catch(error) {
        try { console.error("settings action failed", id, error); } catch (_) {}
        notify("تعذر تنفيذ " + label + ": " + safeString(error && error.message || error), "error");
      } finally {
        try { el.disabled = wasDisabled; } catch (_) {}
      }
    };
    return true;
  }

  function navigate(page){
    if(!page) return;
    try { if(typeof show === "function") show(page); } catch (_) {}
  }

  async function smartUpdate(){
    try {
      if(typeof fetchAndroidUpdateInfo === "function"){
        const info = await fetchAndroidUpdateInfo();
        const latest = Number((info && (info.latestVersionCode || info.versionCode)) || 0);
        if(latest && nativeCode() && latest > nativeCode()){
          if(typeof downloadApkUpdate === "function") return downloadApkUpdate();
        }
      }
    } catch (_) {}
    try {
      if(typeof refreshWebUiNow === "function") await refreshWebUiNow();
      const target = (location.pathname || "/") + "?v=" + encodeURIComponent(VERSION + "-" + Date.now());
      location.replace(target);
    } catch(error) {
      notify("تعذر تحديث الواجهات: " + safeString(error && error.message || error), "error");
    }
  }

  function exportJson(){
    try {
      const s = getState();
      const c = getCache();
      const payload = { exportedAt:new Date().toISOString(), version:VERSION, state:s, cache:c };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "hesabi-backup-" + new Date().toISOString().slice(0,10) + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
      s.lastBackupAt = new Date().toLocaleString("ar");
      saveSafe();
      notify("تم تجهيز النسخة الاحتياطية.", "success");
    } catch(error) {
      notify("تعذر تصدير النسخة: " + safeString(error && error.message || error), "error");
    }
  }

  let pendingImportData = null;

  function importJsonPreview(file) {
    try {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          pendingImportData = data;
          const previewHtml = `
            <div class="card">
              <h2>معاينة الاستيراد</h2>
              <div class="grid">
                <div class="metric"><span class="muted">تاريخ التصدير</span><b>${escSafe(data.exportedAt || "-")}</b></div>
                <div class="metric"><span class="muted">إصدار النسخة</span><b>${escSafe(data.version || "-")}</b></div>
                <div class="metric"><span class="muted">أصناف</span><b>${escSafe((data.cache && data.cache.items && data.cache.items.length) || 0)}</b></div>
                <div class="metric"><span class="muted">عملاء</span><b>${escSafe((data.cache && data.cache.customers && data.cache.customers.length) || 0)}</b></div>
              </div>
              <div class="settings-compact-actions">
                <button class="btn ok" id="settingsConfirmImport" type="button">تأكيد الاستيراد</button>
                <button class="btn secondary" id="settingsCancelImport" type="button">إلغاء</button>
              </div>
            </div>`;
          if (typeof showAppDialog === "function") {
            showAppDialog("معاينة النسخة الاحتياطية", previewHtml);
            const confirmBtn = byId("settingsConfirmImport");
            if (confirmBtn) confirmBtn.onclick = function() { confirmImport(); };
            const cancelBtn = byId("settingsCancelImport");
            if (cancelBtn) cancelBtn.onclick = function() { pendingImportData = null; if (typeof hideAppDialog === "function") hideAppDialog(); };
          }
        } catch (parseErr) {
          notify("ملف JSON غير صالح: " + safeString(parseErr && parseErr.message || parseErr), "error");
        }
      };
      reader.readAsText(file);
    } catch(error) {
      notify("تعذر قراءة الملف: " + safeString(error && error.message || error), "error");
    }
  }

  function confirmImport() {
    try {
      if (!pendingImportData) return;
      const s = getState();
      const c = getCache();
      if (pendingImportData.state) Object.assign(s, pendingImportData.state);
      if (pendingImportData.cache) Object.assign(c, pendingImportData.cache);
      s.lastImportAt = new Date().toLocaleString("ar");
      saveSafe();
      pendingImportData = null;
      if (typeof hideAppDialog === "function") hideAppDialog();
      resetLiveData();
      renderSafe();
      notify("تم استيراد النسخة بنجاح.", "success");
    } catch(error) {
      notify("تعذر استيراد النسخة: " + safeString(error && error.message || error), "error");
    }
  }

  function saveSecurity(){
    const s = getState();
    const pin = byId("settingsPinInput");
    const minutes = byId("settingsAutoLockMinutes");
    if(pin && pin.value.trim()){
      s.appPin = pin.value.trim();
      s.lockPin = pin.value.trim();
      s.appLockEnabled = true;
      s.lockEnabled = true;
    }
    if(minutes) s.autoLockMinutes = Math.min(240, Math.max(1, num(minutes.value, 15)));
    saveSafe();
    notify("تم حفظ إعدادات الأمان.", "success");
  }

  function saveNotificationPrefs(){
    const s = getState();
    s.notificationPrefs = {
      orders: !!(byId("settingsNotifyOrders") && byId("settingsNotifyOrders").checked),
      payments: !!(byId("settingsNotifyPayments") && byId("settingsNotifyPayments").checked),
      messages: !!(byId("settingsNotifyMessages") && byId("settingsNotifyMessages").checked),
      stock: !!(byId("settingsNotifyStock") && byId("settingsNotifyStock").checked)
    };
    saveSafe();
    notify("تم حفظ خيارات التنبيهات.", "success");
  }

  function bindActions(renderSettingsFn){
    try { if(typeof bindPageTabs === "function") bindPageTabs("settings", renderSettingsFn); } catch (_) {}
    const bound = [];

    function bind(id, label, handler){ bound.push({ id, ok: bindSafeAction(id, label, handler) }); }
    function go(id, page){ bind(id, "فتح " + page, function(){ navigate(page); }); }

    bind("settingsSaveSecurity", "حفظ الأمان", saveSecurity);
    bind("settingsToggleLock", "تبديل القفل", function(){
      const s = getState();
      const next = !(s.appLockEnabled || s.lockEnabled);
      s.appLockEnabled = next;
      s.lockEnabled = next;
      saveSafe();
      notify(next ? "تم تفعيل القفل." : "تم إيقاف القفل.", "success");
      if(typeof renderSettingsFn === "function") renderSettingsFn();
    });
    bind("settingsToggleBiometric", "تبديل البصمة", function(){
      const s = getState();
      s.biometricEnabled = !s.biometricEnabled;
      saveSafe();
      notify(s.biometricEnabled ? "تم تفعيل البصمة." : "تم إيقاف البصمة.", "success");
      if(typeof renderSettingsFn === "function") renderSettingsFn();
    });
    bind("settingsClearPin", "حذف PIN", function(){
      const s = getState();
      delete s.appPin; delete s.lockPin;
      saveSafe();
      notify("تم حذف PIN.", "success");
      if(typeof renderSettingsFn === "function") renderSettingsFn();
    });

    bind("settingsSaveAppearance", "حفظ الشكل", function(){
      applyAppearanceSettingsLocal({
        theme: byId("settingsTheme") ? byId("settingsTheme").value : "light",
        accent: byId("settingsAccent") ? byId("settingsAccent").value : "teal",
        background: byId("settingsBackground") ? byId("settingsBackground").value : "glass",
        brightness: byId("settingsBrightness") ? byId("settingsBrightness").value : 100,
        compact: byId("settingsCompact") ? byId("settingsCompact").checked : true
      });
      if(typeof renderSettingsFn === "function") renderSettingsFn();
    });
    bind("settingsResetAppearance", "استعادة الشكل", function(){
      applyAppearanceSettingsLocal(appearanceDefaults());
      if(typeof renderSettingsFn === "function") renderSettingsFn();
    });

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

    bind("settingsSmartUpdate", "تحديث التطبيق", smartUpdate);
    bind("settingsExportFull", "تصدير النسخة", exportJson);
    bind("settingsImportFull", "استيراد النسخة", function() {
      const fileInput = byId("settingsImportFile");
      if (fileInput) fileInput.click();
    });
    const fileInput = byId("settingsImportFile");
    if (fileInput) {
      fileInput.onchange = function(ev) {
        if (ev.target.files && ev.target.files[0]) {
          importJsonPreview(ev.target.files[0]);
          ev.target.value = "";
        }
      };
    }
    bind("settingsLogout", "تسجيل الخروج", safeLogout);

    bind("settingsSaveShop", "حفظ بيانات المتجر", async function() {
      const s = getState();
      const shop = c.shop || {};
      const nameInput = byId("settingsShopName");
      const phoneInput = byId("settingsShopPhone");
      const hoursInput = byId("settingsShopHours");
      const visibilityInput = byId("settingsShopVisibility");
      const updates = {
        name: nameInput ? nameInput.value : shop.name || s.shopName,
        phone: phoneInput ? phoneInput.value : shop.phone || s.shopPhone,
        hours: hoursInput ? hoursInput.value : shop.hours,
        visibility: visibilityInput ? visibilityInput.value : shop.visibility || "public",
        updatedAt: new Date().toISOString(),
        updatedMs: Date.now()
      };
      try {
        if (typeof db !== "undefined" && typeof updateDoc === "function" && s.shopId) {
          const shopRef = doc(db, "shops", s.shopId);
          await updateDoc(shopRef, updates);
          s.shopName = updates.name;
          s.shopPhone = updates.phone;
          saveSafe();
          notify("تم حفظ بيانات المتجر بنجاح.", "success");
        } else {
          s.shopName = updates.name;
          s.shopPhone = updates.phone;
          if (!c.shop) c.shop = {};
          Object.assign(c.shop, updates);
          saveSafe();
          notify("تم حفظ بيانات المتجر محليًا.", "success");
        }
        if (typeof renderSettingsFn === "function") renderSettingsFn();
      } catch (error) {
        notify("تعذر حفظ بيانات المتجر: " + safeString(error && error.message || error), "error");
      }
    });
    bind("settingsSwitchTrader", "الدخول كتاجر", function(){ applyRole("trader", false); });
    bind("settingsSwitchCustomer", "الدخول كعميل", function(){ applyRole("customer", false); });
    bind("settingsSetupTrader", "تهيئة تاجر", function(){ applyRole("trader", true); });
    bind("settingsSetupCustomer", "ربط عميل", function(){ applyRole("customer", true); });
    bind("settingsOpenStores", "فتح المتاجر", openStores);

    bind("settingsEnableNotifications", "تفعيل التنبيهات", function(){
      if(typeof requestNotificationPermission === "function") return requestNotificationPermission(true);
      notify("طلب صلاحية التنبيهات غير متاح في هذا الجهاز.", "notice");
    });
    bind("settingsSaveNotificationPrefs", "حفظ التنبيهات", saveNotificationPrefs);
    bind("settingsClearBadge", "تصفير العدّاد", function(){
      if(typeof clearAllNotificationCounters === "function") clearAllNotificationCounters();
      notify("تم تصفير العدّاد.", "success");
    });

    window.__hesabiSettingsLastBindings = { ok:true, at:Date.now(), bound };
    return window.__hesabiSettingsLastBindings;
  }

  function selfCheck(){
    const api = window.hesabiSettingsHelpers || {};
    const missingMethods = ["tabs","normalizeTab","renderSection","bindActions","selfCheck"].filter(function(name){ return typeof api[name] !== "function"; });
    const tabs = getTabs().map(function(t){ return t[0]; });
    const missingTabs = REQUIRED_TABS.filter(function(t){ return tabs.indexOf(t) === -1; });
    const forbidden = [("settings" + "FinalCacheCheck")];
    const foundForbidden = forbidden.filter(function(id){ return !!byId(id); });
    return {
      ok: missingMethods.length === 0 && missingTabs.length === 0 && foundForbidden.length === 0,
      version: VERSION,
      build: BUILD_CODE,
      missingMethods,
      missingTabs,
      foundForbidden,
      tabs,
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