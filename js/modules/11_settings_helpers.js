/* Hesabi 1.0.124 - Stable settings root source.
   This file is the only renderer/binder for settings tabs. No external injection, no final-check button. */
(function(){
  "use strict";

  const VERSION = "1.0.124";
  const BUILD_CODE = 124;
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
  function getState(){ return (typeof state === "object" && state) ? state : {}; }
  function getCache(){ return (typeof cache === "object" && cache) ? cache : {}; }
  function saveSafe(){ try { if(typeof save === "function") save(); } catch (_) {} }
  function renderSafe(){ try { if(typeof render === "function") render(); } catch (_) {} }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch (_) {} }
  function roleLabel(role){ return role === "trader" ? "تاجر" : role === "customer" ? "عميل" : "غير محدد"; }
  function boolText(value){ return value ? "مفعل" : "ملغي"; }
  function numberSafe(value, fallback){ const n = Number(value); return Number.isFinite(n) ? n : fallback; }

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

  function currentAppearance(){
    const defaults = { theme:"light", accent:"teal", brightness:100, background:"glass", compact:true };
    try { if(typeof getAppearance === "function") return Object.assign(defaults, getAppearance() || {}); } catch (_) {}
    const s = getState();
    return Object.assign(defaults, s.appearance || {});
  }
  function selected(value, expected){ return safeString(value) === safeString(expected) ? " selected" : ""; }
  function checked(value){ return value ? " checked" : ""; }

  function nativeCode(){ try { return typeof nativeVersionCode === "function" ? Number(nativeVersionCode() || 0) : 0; } catch (_) { return 0; } }
  function nativeName(){ try { return typeof nativeVersionName === "function" ? safeString(nativeVersionName() || "") : ""; } catch (_) { return ""; } }
  function nativeLabel(){ const n = nativeName(); const c = nativeCode(); return (n || "APK") + " (" + (c || "-") + ")"; }
  function interfaceLabel(){ try { return typeof APP_VERSION !== "undefined" ? safeString(APP_VERSION) : VERSION; } catch (_) { return VERSION; } }

  function roleProfile(role){
    try { if(typeof dualRoleProfileFor === "function") return dualRoleProfileFor(role); } catch (_) {}
    const s = getState();
    return (s.roleProfiles && s.roleProfiles[role]) || null;
  }
  function rememberRole(){ try { if(typeof rememberCurrentDualRoleProfile === "function") rememberCurrentDualRoleProfile(); } catch (_) {} }
  function applyRole(role, setupMode){
    const s = getState();
    rememberRole();
    try {
      if(setupMode){
        s.role = role;
        s.profileDone = false;
        try { if(typeof resetCacheForLiveData === "function") resetCacheForLiveData(); } catch (_) {}
        try { listenersStartedKey = ""; } catch (_) {}
        saveSafe();
        renderSafe();
        notify("أكمل تهيئة وضع " + roleLabel(role) + ".", "notice");
        return;
      }
      if(typeof applyDualRoleProfile === "function") { applyDualRoleProfile(role); return; }
      const p = roleProfile(role);
      s.role = role;
      if(p && p.profileDone){
        Object.keys(p).forEach(function(key){ if(key !== "role") s[key] = p[key]; });
        s.profileDone = true;
      } else {
        s.profileDone = false;
      }
      try { if(typeof resetCacheForLiveData === "function") resetCacheForLiveData(); } catch (_) {}
      try { listenersStartedKey = ""; } catch (_) {}
      saveSafe();
      renderSafe();
      notify("تم التبديل إلى وضع " + roleLabel(role) + ".", "success");
    } catch (error) {
      notify("تعذر التبديل: " + safeString(error && error.message || error), "error");
    }
  }

  function accountIdentityHtml(){
    const s = getState();
    const c = getCache();
    const shop = c.shop || {};
    const phone = s.authPhoneNumber || s.customerPhone || s.phone || "-";
    const email = s.authEmail || "-";
    const shopName = s.shopName || shop.name || "-";
    const shopId = s.shopId || s.activeShopId || "-";
    const customer = s.customerName || "-";
    return `<div class="grid">
      <div class="metric"><span class="muted">الوضع الحالي</span><b>${escSafe(roleLabel(s.role))}</b></div>
      <div class="metric"><span class="muted">الهاتف</span><b>${escSafe(phone)}</b></div>
      <div class="metric"><span class="muted">البريد</span><b>${escSafe(email)}</b></div>
      <div class="metric"><span class="muted">كود المتجر</span><b>${escSafe(shopId)}</b></div>
      <div class="metric"><span class="muted">اسم المتجر</span><b>${escSafe(shopName)}</b></div>
      <div class="metric"><span class="muted">اسم العميل</span><b>${escSafe(customer)}</b></div>
    </div>`;
  }

  function roleSwitchHtml(){
    const s = getState();
    const hasTrader = !!roleProfile("trader") || !!s.shopId;
    const hasCustomer = !!roleProfile("customer") || !!s.customerId || (Array.isArray(s.customerLinks) && s.customerLinks.length > 0);
    return `<div class="card" id="settingsAccountRoleCard">
      <h2>وضع الحساب: تاجر وعميل</h2>
      <div class="notice">الوضع الحالي: <b>${escSafe(roleLabel(s.role))}</b></div>
      <div>
        <span class="pill ${hasTrader ? "" : "off"}">تاجر: ${hasTrader ? "مفعل" : "غير مفعل"}</span>
        <span class="pill ${hasCustomer ? "" : "off"}">عميل: ${hasCustomer ? "مفعل" : "غير مفعل"}</span>
      </div>
      <div class="settings-compact-actions">
        <button class="btn secondary" id="settingsSwitchTrader" type="button">الدخول كتاجر</button>
        <button class="btn secondary" id="settingsSwitchCustomer" type="button">الدخول كعميل</button>
        <button class="btn light" id="settingsSetupTrader" type="button">تهيئة / استرجاع تاجر</button>
        <button class="btn light" id="settingsSetupCustomer" type="button">ربط تاجر كعميل</button>
        <button class="btn ok" id="settingsOpenStores" type="button">متاجري / ربط متجر</button>
      </div>
    </div>`;
  }

  function renderSecurity(){
    const s = getState();
    const pin = s.appLockPin || s.lockPin || "";
    const auto = numberSafe(s.appLockAutoSeconds || s.lockAutoSeconds, 60);
    return `<div class="card">
      <h2>الأمان</h2>
      <div class="grid">
        <div class="metric"><span class="muted">قفل التطبيق</span><b>${escSafe(boolText(s.appLockEnabled || s.lockEnabled))}</b></div>
        <div class="metric"><span class="muted">البصمة</span><b>${escSafe(boolText(s.biometricEnabled || s.fingerprintEnabled))}</b></div>
        <div class="metric"><span class="muted">القفل التلقائي</span><b>${escSafe(auto)} ثانية</b></div>
      </div>
      <div class="grid">
        <div class="field"><label>رمز القفل PIN</label><input id="settingsPin" type="password" inputmode="numeric" maxlength="8" value="${escSafe(pin)}" placeholder="اتركه فارغًا بدون PIN"></div>
        <div class="field"><label>القفل التلقائي بعد</label><select id="settingsAutoLock"><option value="30"${selected(auto,30)}>30 ثانية</option><option value="60"${selected(auto,60)}>دقيقة</option><option value="300"${selected(auto,300)}>5 دقائق</option><option value="900"${selected(auto,900)}>15 دقيقة</option></select></div>
      </div>
      <div class="settings-compact-actions">
        <button class="btn ok" id="settingsSaveSecurity" type="button">حفظ الأمان</button>
        <button class="btn secondary" id="settingsToggleLock" type="button">${(s.appLockEnabled || s.lockEnabled) ? "إلغاء القفل" : "تفعيل القفل"}</button>
        <button class="btn light" id="settingsToggleBiometric" type="button">${(s.biometricEnabled || s.fingerprintEnabled) ? "إلغاء البصمة" : "تفعيل البصمة"}</button>
        <button class="btn light" id="settingsGoAccount" type="button">الحساب</button>
      </div>
    </div>`;
  }

  function renderAppearance(){
    const a = currentAppearance();
    return `<div class="card">
      <h2>الشكل</h2>
      <div class="grid">
        <div class="field"><label>الوضع</label><select id="settingsTheme"><option value="light"${selected(a.theme,"light")}>نهاري</option><option value="dark"${selected(a.theme,"dark")}>ليلي</option></select></div>
        <div class="field"><label>اللون</label><select id="settingsAccent"><option value="teal"${selected(a.accent,"teal")}>فيروزي</option><option value="blue"${selected(a.accent,"blue")}>أزرق</option><option value="green"${selected(a.accent,"green")}>أخضر</option><option value="purple"${selected(a.accent,"purple")}>بنفسجي</option><option value="orange"${selected(a.accent,"orange")}>برتقالي</option></select></div>
        <div class="field"><label>الخلفية</label><select id="settingsBackground"><option value="glass"${selected(a.background,"glass")}>زجاجية</option><option value="soft"${selected(a.background,"soft")}>ناعمة</option><option value="plain"${selected(a.background,"plain")}>بسيطة</option></select></div>
        <div class="field"><label>سطوع الواجهة</label><input id="settingsBrightness" type="number" min="75" max="120" value="${escSafe(a.brightness || 100)}"></div>
      </div>
      <label class="checkline"><input id="settingsCompact" type="checkbox"${checked(a.compact !== false)}> واجهة مدمجة للجوال</label>
      <div class="settings-compact-actions"><button class="btn ok" id="settingsSaveAppearance" type="button">حفظ الشكل</button><button class="btn light" id="settingsPreviewAppearance" type="button">معاينة</button></div>
    </div>`;
  }

  function renderShop(){
    const s = getState();
    const c = getCache();
    const shop = c.shop || {};
    const status = s.subscriptionStatus || shop.subscriptionStatus || shop.status || "-";
    const due = s.subscriptionDueDate || shop.subscriptionDueDate || "-";
    return `<div class="card">
      <h2>المتجر</h2>
      <div class="grid">
        <div class="metric"><span class="muted">اسم المتجر</span><b>${escSafe(s.shopName || shop.name || "-")}</b></div>
        <div class="metric"><span class="muted">كود المتجر</span><b>${escSafe(s.shopId || shop.shopId || "-")}</b></div>
        <div class="metric"><span class="muted">هاتف المتجر</span><b>${escSafe(shop.phone || s.shopPhone || "-")}</b></div>
        <div class="metric"><span class="muted">حالة الاشتراك</span><b>${escSafe(status)}</b></div>
        <div class="metric"><span class="muted">تاريخ الاستحقاق</span><b>${escSafe(due)}</b></div>
        <div class="metric"><span class="muted">الدور الحالي</span><b>${escSafe(roleLabel(s.role))}</b></div>
      </div>
      <div class="settings-compact-actions">
        <button class="btn secondary" id="settingsPolicies" type="button">السياسات</button>
        <button class="btn secondary" id="settingsItems" type="button">الأصناف</button>
        <button class="btn light" id="settingsShopCode" type="button">كود التاجر</button>
        <button class="btn light" id="settingsCustomers" type="button">العملاء</button>
        <button class="btn ok" id="settingsEditShop" type="button">تعديل بيانات المتجر</button>
      </div>
    </div>`;
  }

  function renderPermissions(){
    const s = getState();
    const current = roleLabel(s.role);
    return `<div class="card"><h2>الصلاحيات حسب الدور</h2><div class="notice">صلاحية حسابك الحالية: <b>${escSafe(current)}</b></div>
      <div class="table-wrap"><table class="compact-table"><thead><tr><th>الوظيفة</th><th>التاجر</th><th>العميل</th></tr></thead><tbody>
        <tr><td>الأصناف والأسعار والمخزون</td><td>إضافة وتعديل وحذف وتسوية</td><td>عرض وطلب حسب سياسة التاجر</td></tr>
        <tr><td>السياسات والظهور والدوام</td><td>تحكم كامل</td><td>عرض فقط</td></tr>
        <tr><td>الطلبات</td><td>مراجعة وقبول ورفض وإنشاء فاتورة</td><td>إنشاء ومتابعة طلباته فقط</td></tr>
        <tr><td>السداد والفواتير وكشف الحساب</td><td>اعتماد ورفض ومراجعة</td><td>حسابه فقط</td></tr>
        <tr><td>الاشتراكات والمالك</td><td>مالك التطبيق فقط</td><td>لا يظهر</td></tr>
      </tbody></table></div></div>`;
  }

  function renderUpdate(){
    return `<div class="card"><h2>التحديث</h2>
      <div class="grid">
        <div class="metric"><span class="muted">إصدار الواجهات</span><b>${escSafe(interfaceLabel())}</b></div>
        <div class="metric"><span class="muted">إصدار APK</span><b>${escSafe(nativeLabel())}</b></div>
        <div class="metric"><span class="muted">مرحلة الإعدادات</span><b>${VERSION}</b></div>
      </div>
      <p class="muted">زر واحد يقوم بفحص التحديث وتنفيذ المتاح بدون أزرار فحص متكررة.</p>
      <div class="settings-compact-actions"><button class="btn ok" id="settingsRunUpdate" type="button">تحديث التطبيق الآن</button></div>
    </div>`;
  }

  function renderBackup(){
    return `<div class="card"><h2>النسخ والاستيراد</h2><p class="muted">التصدير آمن ولا يغير البيانات. الاستيراد يحتاج تأكيد قبل تطبيقه.</p>
      <div class="settings-compact-actions">
        <button class="btn ok" id="settingsExportFull" type="button">تصدير نسخة كاملة JSON</button>
        <button class="btn warn" id="settingsImportFull" type="button">استيراد نسخة JSON</button>
        <button class="btn secondary" id="settingsExportItems" type="button">الأصناف</button>
        <button class="btn light" id="settingsExportReports" type="button">التقارير</button>
        <button class="btn light" id="settingsStatement" type="button">كشف الحساب</button>
        <button class="btn light" id="settingsInvoices" type="button">الفواتير</button>
      </div>
    </div>`;
  }

  function renderAccount(){
    return `<div class="card"><h2>الحساب</h2>${accountIdentityHtml()}</div>
      ${roleSwitchHtml()}
      <div class="card"><h2>جلسة الدخول</h2><p class="muted">الخروج وإعادة الدخول يحل مشاكل الجلسات والصلاحيات القديمة.</p><div class="settings-compact-actions"><button class="btn danger" id="settingsLogout" type="button">تسجيل خروج</button><button class="btn light" id="settingsGoHome" type="button">الرئيسية</button></div></div>`;
  }

  function renderNotifications(){
    const s = getState();
    const counters = (typeof appNotificationCounters === "function") ? appNotificationCounters() : {};
    const permission = (typeof notificationPermissionState === "function") ? notificationPermissionState() : "unknown";
    const prefs = Object.assign({ orders:true, payments:true, messages:true, stock:true }, s.notificationPrefs || {});
    return `<div class="card"><h2>التنبيهات</h2>
      <div class="grid"><div class="metric"><span class="muted">الإجمالي غير المقروء</span><b>${Number(counters.notifications || 0)}</b></div><div class="metric"><span class="muted">صلاحية التنبيهات</span><b>${escSafe(permission)}</b></div></div>
      <div class="grid">
        <label class="checkline"><input id="settingsNotifyOrders" type="checkbox"${checked(prefs.orders)}> تنبيهات الطلبات</label>
        <label class="checkline"><input id="settingsNotifyPayments" type="checkbox"${checked(prefs.payments)}> تنبيهات السداد</label>
        <label class="checkline"><input id="settingsNotifyMessages" type="checkbox"${checked(prefs.messages)}> تنبيهات الرسائل</label>
        <label class="checkline"><input id="settingsNotifyStock" type="checkbox"${checked(prefs.stock)}> تنبيهات المخزون</label>
      </div>
      <div class="settings-compact-actions"><button class="btn ok" id="settingsEnableNotifications" type="button">تفعيل التنبيهات</button><button class="btn secondary" id="settingsSaveNotifications" type="button">حفظ التفضيلات</button><button class="btn light" id="settingsOpenNotifications" type="button">فتح الإشعارات</button><button class="btn light" id="settingsOpenMessages" type="button">فتح الرسائل</button><button class="btn warn" id="settingsClearBadge" type="button">تصفير العدّاد</button></div>
    </div>`;
  }

  function renderSection(tab){
    const activeTab = normalizeTab(tab);
    if(activeTab === "security") return renderSecurity();
    if(activeTab === "appearance") return renderAppearance();
    if(activeTab === "shop") return renderShop();
    if(activeTab === "permissions") return renderPermissions();
    if(activeTab === "update") return renderUpdate();
    if(activeTab === "backup") return renderBackup();
    if(activeTab === "account") return renderAccount();
    return renderNotifications();
  }

  function bindSafeAction(id, label, handler){
    const el = document.getElementById(id);
    if(!el) return false;
    el.onclick = async function(){
      const oldDisabled = !!el.disabled;
      try {
        el.disabled = true;
        await handler(el);
      } catch (error) {
        try { console.error("settings action failed", id, error); } catch (_) {}
        notify("تعذر تنفيذ " + label + ": " + safeString(error && error.message || error), "error");
      } finally {
        try { el.disabled = oldDisabled; } catch (_) {}
      }
    };
    return true;
  }
  function openSettingsTab(tab, renderSettingsFn){
    try {
      if(typeof setPageTab === "function") setPageTab("settings", normalizeTab(tab), renderSettingsFn);
      else { const s = getState(); s.settingsTab = normalizeTab(tab); saveSafe(); if(typeof renderSettingsFn === "function") renderSettingsFn(); }
    } catch (_) { if(typeof renderSettingsFn === "function") renderSettingsFn(); }
  }
  function navigate(page){ try { if(typeof show === "function") show(page); } catch (_) {} }

  function saveSecurity(renderSettingsFn){
    const s = getState();
    const pinEl = document.getElementById("settingsPin");
    const autoEl = document.getElementById("settingsAutoLock");
    s.appLockPin = pinEl ? safeString(pinEl.value).trim() : (s.appLockPin || "");
    s.lockPin = s.appLockPin;
    s.appLockAutoSeconds = autoEl ? numberSafe(autoEl.value, 60) : 60;
    s.lockAutoSeconds = s.appLockAutoSeconds;
    if(s.appLockPin) { s.appLockEnabled = true; s.lockEnabled = true; }
    saveSafe();
    notify("تم حفظ إعدادات الأمان.", "success");
    if(typeof renderSettingsFn === "function") renderSettingsFn();
  }
  function toggleLock(renderSettingsFn){
    const s = getState();
    const next = !(s.appLockEnabled || s.lockEnabled);
    s.appLockEnabled = next; s.lockEnabled = next;
    saveSafe(); notify(next ? "تم تفعيل القفل." : "تم إلغاء القفل.", "success");
    if(typeof renderSettingsFn === "function") renderSettingsFn();
  }
  function toggleBiometric(renderSettingsFn){
    const s = getState();
    const next = !(s.biometricEnabled || s.fingerprintEnabled);
    s.biometricEnabled = next; s.fingerprintEnabled = next;
    saveSafe(); notify(next ? "تم تفعيل خيار البصمة." : "تم إلغاء خيار البصمة.", "success");
    if(typeof renderSettingsFn === "function") renderSettingsFn();
  }
  function readAppearanceForm(){
    const v = function(id, fallback){ const el = document.getElementById(id); return el ? el.value : fallback; };
    const compact = document.getElementById("settingsCompact");
    return {
      theme: v("settingsTheme", "light"),
      accent: v("settingsAccent", "teal"),
      background: v("settingsBackground", "glass"),
      brightness: Math.min(120, Math.max(75, numberSafe(v("settingsBrightness", 100), 100))),
      compact: compact ? !!compact.checked : true
    };
  }
  function applyAppearanceSettingsFromForm(renderSettingsFn, previewOnly){
    const settings = readAppearanceForm();
    try {
      if(typeof saveAppearanceSettings === "function") saveAppearanceSettings(settings);
      else { const s = getState(); s.appearance = settings; saveSafe(); if(typeof applyAppearance === "function") applyAppearance(); }
    } catch (_) {
      const s = getState(); s.appearance = settings; saveSafe();
    }
    notify(previewOnly ? "تم تطبيق المعاينة." : "تم حفظ الشكل.", "success");
    if(!previewOnly && typeof renderSettingsFn === "function") renderSettingsFn();
  }
  async function runUpdate(){
    if(typeof downloadApkUpdate === "function") { await downloadApkUpdate(); return; }
    if(typeof refreshWebUiNow === "function") { await refreshWebUiNow(); notify("تم تحديث الواجهات.", "success"); return; }
    notify("لا توجد دالة تحديث متاحة حاليًا.", "error");
  }
  function downloadText(filename, text, type){
    const blob = new Blob([text], { type:type || "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
  }
  function exportFullBackup(){
    const payload = { version:VERSION, build:BUILD_CODE, exportedAt:new Date().toISOString(), state:getState(), cache:getCache() };
    downloadText("hesabi-backup-" + new Date().toISOString().slice(0,10) + ".json", JSON.stringify(payload, null, 2));
    notify("تم تجهيز النسخة الاحتياطية.", "success");
  }
  function importFullBackup(){
    const input = document.createElement("input");
    input.type = "file"; input.accept = "application/json,.json";
    input.onchange = function(){
      const file = input.files && input.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = function(){
        try {
          const data = JSON.parse(String(reader.result || "{}"));
          if(!data || typeof data !== "object" || !data.state) throw new Error("ملف النسخة غير صحيح");
          if(!confirm("سيتم استيراد بيانات النسخة على هذا الجهاز. هل تريد المتابعة؟")) return;
          Object.assign(getState(), data.state || {});
          saveSafe(); renderSafe(); notify("تم استيراد النسخة.", "success");
        } catch (error) { notify("تعذر الاستيراد: " + safeString(error && error.message || error), "error"); }
      };
      reader.readAsText(file, "utf-8");
    };
    input.click();
  }
  async function logout(){
    if(typeof safeFullLogout === "function") { await safeFullLogout("settings-account"); return; }
    try { if(typeof unsub !== "undefined" && Array.isArray(unsub)){ unsub.forEach(function(fn){ try { fn(); } catch (_) {} }); unsub = []; } } catch (_) {}
    try { if(typeof auth !== "undefined" && auth && typeof signOut === "function") await signOut(auth); } catch (_) {}
    try { currentUser = null; } catch (_) {}
    const s = getState();
    ["role","shopId","shopName","customerId","customerName","customerPhone","activeShopId","uid","authEmail","authPhoneNumber","authPhoneKey","authProvider"].forEach(function(k){ try { delete s[k]; } catch (_) {} });
    s.profileDone = false;
    try { sessionStorage.clear(); } catch (_) {}
    saveSafe();
    try { if(typeof hideAppDialog === "function") hideAppDialog(); } catch (_) {}
    renderSafe();
  }
  function saveNotifications(){
    const s = getState();
    s.notificationPrefs = {
      orders: !!(document.getElementById("settingsNotifyOrders") || {}).checked,
      payments: !!(document.getElementById("settingsNotifyPayments") || {}).checked,
      messages: !!(document.getElementById("settingsNotifyMessages") || {}).checked,
      stock: !!(document.getElementById("settingsNotifyStock") || {}).checked
    };
    saveSafe(); notify("تم حفظ تفضيلات التنبيهات.", "success");
  }

  function bindActions(renderSettingsFn){
    try { if(typeof bindPageTabs === "function") bindPageTabs("settings", renderSettingsFn); } catch (_) {}
    const bound = [];
    const add = function(id, label, fn){ bound.push({ id, ok: bindSafeAction(id, label, fn) }); };
    const go = function(id, page){ add(id, "فتح " + page, function(){ navigate(page); }); };

    add("settingsSaveSecurity", "حفظ الأمان", function(){ saveSecurity(renderSettingsFn); });
    add("settingsToggleLock", "تبديل القفل", function(){ toggleLock(renderSettingsFn); });
    add("settingsToggleBiometric", "تبديل البصمة", function(){ toggleBiometric(renderSettingsFn); });
    add("settingsGoAccount", "الحساب", function(){ openSettingsTab("account", renderSettingsFn); });
    add("settingsSaveAppearance", "حفظ الشكل", function(){ applyAppearanceSettingsFromForm(renderSettingsFn, false); });
    add("settingsPreviewAppearance", "معاينة الشكل", function(){ applyAppearanceSettingsFromForm(renderSettingsFn, true); });
    add("settingsRunUpdate", "تحديث التطبيق", runUpdate);
    add("settingsExportFull", "تصدير نسخة كاملة", exportFullBackup);
    add("settingsImportFull", "استيراد نسخة", importFullBackup);
    add("settingsSwitchTrader", "الدخول كتاجر", function(){ applyRole("trader", false); });
    add("settingsSwitchCustomer", "الدخول كعميل", function(){ applyRole("customer", false); });
    add("settingsSetupTrader", "تهيئة تاجر", function(){ applyRole("trader", true); });
    add("settingsSetupCustomer", "تهيئة عميل", function(){ applyRole("customer", true); });
    add("settingsOpenStores", "متاجري", function(){ navigate("shops"); });
    add("settingsLogout", "تسجيل الخروج", logout);
    add("settingsSaveNotifications", "حفظ التنبيهات", saveNotifications);
    add("settingsEnableNotifications", "تفعيل التنبيهات", function(){ if(typeof requestNotificationPermission === "function") return requestNotificationPermission(true); notify("تفعيل التنبيهات غير متاح على هذا الجهاز.", "notice"); });
    add("settingsClearBadge", "تصفير العدّاد", function(){ if(typeof clearAllNotificationCounters === "function") clearAllNotificationCounters(); notify("تم تصفير العدّاد.", "success"); });

    go("settingsPolicies", "policies");
    go("settingsItems", "items");
    go("settingsShopCode", "shopcode");
    go("settingsCustomers", "customers");
    go("settingsEditShop", "shopcode");
    go("settingsExportItems", "items");
    go("settingsExportReports", "reports");
    go("settingsStatement", "statement");
    go("settingsInvoices", "invoices");
    go("settingsGoHome", "home");
    go("settingsOpenNotifications", "notifications");
    go("settingsOpenMessages", "messages");

    try {
      const root = document.getElementById("page_settings");
      if(root){
        root.querySelectorAll(".settings-final-check,.audit-cache-final-search").forEach(function(node){ try { node.remove(); } catch (_) {} });
      }
    } catch (_) {}

    window.__hesabiSettingsLastBindings = { ok:true, at:Date.now(), bound };
    return window.__hesabiSettingsLastBindings;
  }

  function selfCheck(){
    const api = window.hesabiSettingsHelpers || {};
    const missingMethods = ["tabs", "normalizeTab", "renderSection", "bindActions"].filter(function(name){ return typeof api[name] !== "function"; });
    const tabValues = getTabs().map(function(t){ return t[0]; });
    const missingTabs = REQUIRED_TABS.filter(function(t){ return tabValues.indexOf(t) === -1; });
    let forbidden = false;
    try {
      const root = document.getElementById("page_settings");
      forbidden = !!(root && root.querySelector(".settings-final-check"));
    } catch (_) {}
    return { ok: missingMethods.length === 0 && missingTabs.length === 0 && !forbidden, version:VERSION, build:BUILD_CODE, missingMethods, missingTabs, forbidden, tabs:tabValues, checkedAt:new Date().toISOString() };
  }

  window.hesabiSettingsHelpers = { version:VERSION, build:BUILD_CODE, tabs:getTabs, normalizeTab, renderSection, bindActions, selfCheck };
  window.hesabiSettingsHelpersSelfCheck = selfCheck;
})();
