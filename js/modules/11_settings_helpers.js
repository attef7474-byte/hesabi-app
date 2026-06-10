/* Hesabi 1.0.123 - Settings root completion.
   Single source for all settings tabs. No external injection, no final-check button. */
(function(){
  "use strict";

  const VERSION = "1.0.123";
  const BUILD_CODE = 123;
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
  function roleLabel(role){ return role === "trader" ? "鬲丕噩乇" : role === "customer" ? "毓賲賷賱" : "睾賷乇 賲丨丿丿"; }
  function boolText(value){ return value ? "賲賮毓賱" : "賲賱睾賷"; }
  function numberSafe(v, fallback){ const n = Number(v); return Number.isFinite(n) ? n : fallback; }

  function getTabs(){
    return [
      ["security", "馃攼", "丕賱兀賲丕賳"],
      ["appearance", "馃帹", "丕賱卮賰賱"],
      ["shop", "馃彧", "丕賱賲鬲噩乇"],
      ["permissions", "馃洝锔?, "丕賱氐賱丕丨賷丕鬲"],
      ["update", "猬嗭笍", "丕賱鬲丨丿賷孬"],
      ["backup", "馃捑", "丕賱賳爻禺"],
      ["account", "馃懁", "丕賱丨爻丕亘"],
      ["notifications", "馃敂", "丕賱鬲賳亘賷賴丕鬲"]
    ];
  }
  function normalizeTab(tab){
    const value = safeString(tab || "security");
    return REQUIRED_TABS.indexOf(value) >= 0 ? value : "security";
  }

  function appearanceDefaults(){ return { theme:"light", accent:"teal", brightness:100, background:"glass", compact:true }; }
  function currentAppearance(){
    try { if(typeof getAppearance === "function") return Object.assign(appearanceDefaults(), getAppearance() || {}); } catch (_) {}
    const s = getState();
    return Object.assign(appearanceDefaults(), s.appearance || {});
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
        notify("兀賰賲賱 鬲賴賷卅丞 賵囟毓 " + roleLabel(role) + ".", "notice");
        return;
      }
      if(typeof applyDualRoleProfile === "function") { applyDualRoleProfile(role); return; }
      const p = roleProfile(role);
      s.role = role;
      if(p && p.profileDone){
        Object.keys(p).forEach(function(k){ if(k !== "role") s[k] = p[k]; });
        s.profileDone = true;
      } else {
        s.profileDone = false;
      }
      try { if(typeof resetCacheForLiveData === "function") resetCacheForLiveData(); } catch (_) {}
      try { listenersStartedKey = ""; } catch (_) {}
      saveSafe();
      renderSafe();
      notify("鬲賲 丕賱鬲亘丿賷賱 廿賱賶 賵囟毓 " + roleLabel(role), "success");
    } catch(error) {
      notify("鬲毓匕乇 丕賱鬲亘丿賷賱: " + safeString(error && error.message || error), "error");
    }
  }

  async function settingsLogout(){
    try {
      if(typeof safeFullLogout === "function") { await safeFullLogout("settings-account"); return; }
    } catch(error) {
      console.warn("safeFullLogout failed, fallback logout", error);
    }
    try { if(typeof unsub !== "undefined" && Array.isArray(unsub)){ unsub.forEach(function(u){ try { if(typeof u === "function") u(); } catch(_) {} }); unsub = []; } } catch (_) {}
    try { if(typeof auth !== "undefined" && auth && typeof signOut === "function") await signOut(auth); } catch (_) {}
    try { currentUser = null; } catch (_) {}
    const s = getState();
    ["role","shopId","shopName","customerId","customerName","customerPhone","customerLinks","activeCustomerLink","activeShopId","uid","authEmail","authPhoneNumber","authPhoneKey","authProvider"].forEach(function(k){ try { delete s[k]; } catch(_) {} });
    s.profileDone = false;
    try { sessionStorage.clear(); } catch (_) {}
    saveSafe();
    notify("鬲賲 鬲爻噩賷賱 丕賱禺乇賵噩.", "success");
    renderSafe();
  }

  function securityHtml(){
    const s = getState();
    const lockEnabled = !!(s.appLockEnabled || s.lockEnabled);
    const pinSet = !!(s.appPin || s.lockPin || s.pinHash);
    const biometric = !!(s.biometricEnabled || s.biometricLockEnabled);
    const autoLock = numberSafe(s.autoLockMinutes || s.lockAfterMinutes, 5);
    const session = s.authPhoneNumber || s.authEmail || s.uid || "睾賷乇 賲爻噩賱";
    return `
      <div class="card settings-root-card" data-settings-root="security">
        <h2>丕賱兀賲丕賳</h2>
        <div class="grid">
          <div class="metric"><span class="muted">賯賮賱 丕賱鬲胤亘賷賯</span><b>${boolText(lockEnabled)}</b></div>
          <div class="metric"><span class="muted">乇賲夭 PIN</span><b>${pinSet ? "賲賵噩賵丿" : "睾賷乇 賲丨丿丿"}</b></div>
          <div class="metric"><span class="muted">丕賱亘氐賲丞</span><b>${boolText(biometric)}</b></div>
          <div class="metric"><span class="muted">丕賱噩賱爻丞</span><b>${escSafe(session)}</b></div>
        </div>
        <div class="grid">
          <div class="field"><label>乇賲夭 PIN 噩丿賷丿</label><input id="settingsPin1" type="password" inputmode="numeric" autocomplete="new-password" placeholder="4 兀乇賯丕賲 兀賵 兀賰孬乇"></div>
          <div class="field"><label>鬲兀賰賷丿 PIN</label><input id="settingsPin2" type="password" inputmode="numeric" autocomplete="new-password" placeholder="兀毓丿 賰鬲丕亘丞 丕賱乇賲夭"></div>
          <div class="field"><label>丕賱賯賮賱 丕賱鬲賱賯丕卅賷 亘毓丿</label><select id="settingsAutoLockMinutes"><option value="1"${selected(autoLock,1)}>丿賯賷賯丞</option><option value="5"${selected(autoLock,5)}>5 丿賯丕卅賯</option><option value="15"${selected(autoLock,15)}>15 丿賯賷賯丞</option><option value="30"${selected(autoLock,30)}>30 丿賯賷賯丞</option></select></div>
        </div>
        <div class="settings-compact-actions">
          <button class="btn ${lockEnabled ? "warn" : "ok"}" id="settingsToggleLock" type="button">${lockEnabled ? "廿賱睾丕亍 丕賱賯賮賱" : "鬲賮毓賷賱 丕賱賯賮賱"}</button>
          <button class="btn secondary" id="settingsSavePin" type="button">丨賮馗 PIN</button>
          <button class="btn light" id="settingsClearPin" type="button">丨匕賮 PIN</button>
          <button class="btn secondary" id="settingsToggleBiometric" type="button">${biometric ? "廿賷賯丕賮 丕賱亘氐賲丞" : "鬲賮毓賷賱 丕賱亘氐賲丞"}</button>
          <button class="btn danger" id="settingsClearLocalSession" type="button">賲爻丨 丕賱噩賱爻丞 丕賱賲丨賱賷丞</button>
        </div>
      </div>`;
  }

  function appearanceHtml(){
    const a = currentAppearance();
    return `
      <div class="card settings-root-card" data-settings-root="appearance">
        <h2>丕賱卮賰賱</h2>
        <div class="grid">
          <div class="metric"><span class="muted">丕賱賵囟毓</span><b>${a.theme === "dark" ? "賱賷賱賷" : "賳賴丕乇賷"}</b></div>
          <div class="metric"><span class="muted">丕賱賰孬丕賮丞</span><b>${a.compact === false ? "賵丕爻毓丞" : "賲丿賲噩丞"}</b></div>
          <div class="metric"><span class="muted">丕賱賱賵賳</span><b>${escSafe(a.accent || "teal")}</b></div>
          <div class="metric"><span class="muted">丕賱爻胤賵毓</span><b>${numberSafe(a.brightness,100)}%</b></div>
        </div>
        <div class="grid">
          <div class="field"><label>丕賱賵囟毓</label><select id="settingsTheme"><option value="light"${selected(a.theme,"light")}>賳賴丕乇賷</option><option value="dark"${selected(a.theme,"dark")}>賱賷賱賷</option></select></div>
          <div class="field"><label>賱賵賳 丕賱鬲胤亘賷賯</label><select id="settingsAccent"><option value="teal"${selected(a.accent,"teal")}>賮賷乇賵夭賷</option><option value="blue"${selected(a.accent,"blue")}>兀夭乇賯</option><option value="green"${selected(a.accent,"green")}>兀禺囟乇</option><option value="purple"${selected(a.accent,"purple")}>亘賳賮爻噩賷</option><option value="orange"${selected(a.accent,"orange")}>亘乇鬲賯丕賱賷</option></select></div>
          <div class="field"><label>丕賱禺賱賮賷丞</label><select id="settingsBackground"><option value="glass"${selected(a.background,"glass")}>夭噩丕噩賷丞</option><option value="soft"${selected(a.background,"soft")}>賳丕毓賲丞</option><option value="plain"${selected(a.background,"plain")}>亘爻賷胤丞</option></select></div>
          <div class="field"><label>丕賱爻胤賵毓</label><input id="settingsBrightness" type="range" min="75" max="120" value="${numberSafe(a.brightness,100)}"></div>
        </div>
        <label class="notice"><input id="settingsCompactMode" type="checkbox"${checked(a.compact !== false)}> 賵丕噩賴丞 賲丿賲噩丞 賱賱噩賵丕賱 賵丕賱噩丿丕賵賱</label>
        <div class="settings-compact-actions"><button class="btn ok" id="settingsSaveAppearance" type="button">丨賮馗 丕賱卮賰賱</button><button class="btn light" id="settingsCompactOn" type="button">賵丕噩賴丞 賲丿賲噩丞</button><button class="btn light" id="settingsCompactOff" type="button">賵丕噩賴丞 賵丕爻毓丞</button></div>
      </div>`;
  }

  function shopHtml(){
    const s = getState();
    const c = getCache();
    const shop = c.shop || {};
    const name = s.shopName || shop.name || "-";
    const phone = shop.phone || s.shopPhone || "-";
    const address = shop.address || s.shopAddress || "-";
    const status = shop.subscriptionStatus || shop.status || "睾賷乇 賲丨丿丿";
    return `
      <div class="card settings-root-card" data-settings-root="shop">
        <h2>丕賱賲鬲噩乇</h2>
        <div class="grid">
          <div class="metric"><span class="muted">丕爻賲 丕賱賲鬲噩乇</span><b>${escSafe(name)}</b></div>
          <div class="metric"><span class="muted">賰賵丿 丕賱賲鬲噩乇</span><b>${escSafe(s.shopId || "-")}</b></div>
          <div class="metric"><span class="muted">賴丕鬲賮 丕賱賲鬲噩乇</span><b>${escSafe(phone)}</b></div>
          <div class="metric"><span class="muted">丕賱丨丕賱丞</span><b>${escSafe(status)}</b></div>
        </div>
        <div class="notice">丕賱毓賳賵丕賳: <b>${escSafe(address)}</b></div>
        <div class="settings-compact-actions">
          <button class="btn secondary" id="settingsPolicies" type="button">丕賱爻賷丕爻丕鬲</button>
          <button class="btn secondary" id="settingsItems" type="button">丕賱兀氐賳丕賮</button>
          <button class="btn light" id="settingsShopCode" type="button">賰賵丿 丕賱鬲丕噩乇</button>
          <button class="btn light" id="settingsCustomers" type="button">丕賱毓賲賱丕亍</button>
        </div>
      </div>`;
  }

  function permissionsHtml(){
    const s = getState();
    return `
      <div class="card settings-root-card" data-settings-root="permissions">
        <h2>丕賱氐賱丕丨賷丕鬲 丨爻亘 丕賱丿賵乇</h2>
        <div class="notice">丿賵乇賰 丕賱丨丕賱賷: <b>${roleLabel(s.role)}</b></div>
        <div class="table-wrap"><table class="compact-table"><thead><tr><th>丕賱賵馗賷賮丞</th><th>丕賱鬲丕噩乇</th><th>丕賱毓賲賷賱</th><th>丨丕賱鬲賰</th></tr></thead><tbody>
          <tr><td>丕賱兀氐賳丕賮 賵丕賱兀爻毓丕乇 賵丕賱賲禺夭賵賳</td><td>廿囟丕賮丞/鬲毓丿賷賱/丨匕賮 賵鬲爻賵賷丞</td><td>毓乇囟 賵胤賱亘 賮賯胤</td><td>${s.role === "trader" ? "賰丕賲賱" : "賲丨丿賵丿"}</td></tr>
          <tr><td>丕賱爻賷丕爻丕鬲 賵丕賱馗賴賵乇 賵丕賱丿賵丕賲</td><td>鬲丨賰賲 賰丕賲賱</td><td>毓乇囟 賮賯胤</td><td>${s.role === "trader" ? "賰丕賲賱" : "毓乇囟"}</td></tr>
          <tr><td>丕賱胤賱亘丕鬲</td><td>賲乇丕噩毓丞/賯亘賵賱/乇賮囟 賵廿賳卮丕亍 賮丕鬲賵乇丞</td><td>廿賳卮丕亍 賵賲鬲丕亘毓丞 胤賱亘丕鬲賴 賮賯胤</td><td>${s.role === "trader" ? "廿丿丕乇丞" : "胤賱亘丕鬲賷"}</td></tr>
          <tr><td>丕賱爻丿丕丿 賵丕賱賮賵丕鬲賷乇 賵賰卮賮 丕賱丨爻丕亘</td><td>丕毓鬲賲丕丿/乇賮囟 賵賲乇丕噩毓丞</td><td>丨爻丕亘賴 賮賯胤</td><td>${s.role === "trader" ? "廿丿丕乇丞" : "丨爻丕亘賷"}</td></tr>
          <tr><td>丕賱賲丕賱賰 賵丕賱丕卮鬲乇丕賰丕鬲</td><td>賲丕賱賰 丕賱鬲胤亘賷賯 賮賯胤</td><td>賱丕 賷馗賴乇</td><td>${typeof isAppOwner === "function" && isAppOwner() ? "賲丕賱賰" : "睾賷乇 賲鬲丕丨"}</td></tr>
        </tbody></table></div>
      </div>`;
  }

  function updateHtml(){
    return `
      <div class="card settings-root-card" data-settings-root="update">
        <h2>丕賱鬲丨丿賷孬</h2>
        <div class="grid">
          <div class="metric"><span class="muted">廿氐丿丕乇 丕賱賵丕噩賴丕鬲</span><b>${escSafe(interfaceLabel())}</b></div>
          <div class="metric"><span class="muted">廿氐丿丕乇 APK</span><b>${escSafe(nativeLabel())}</b></div>
          <div class="metric"><span class="muted">賲乇丨賱丞 丕賱廿毓丿丕丿丕鬲</span><b>${VERSION}</b></div>
        </div>
        <div class="notice" id="settingsUpdateStatus">丕囟睾胤 丕賱夭乇 賱賮丨氐 丕賱鬲丨丿賷孬 賵鬲賳賮賷匕賴 毓賳丿 賵噩賵丿 賳爻禺丞 兀丨丿孬.</div>
        <div class="settings-compact-actions"><button class="btn ok" id="settingsSmartUpdate" type="button">賮丨氐 賵鬲丨丿賷孬 丕賱鬲胤亘賷賯</button></div>
      </div>`;
  }

  function backupHtml(){
    return `
      <div class="card settings-root-card" data-settings-root="backup">
        <h2>丕賱賳爻禺 賵丕賱丕爻鬲賷乇丕丿</h2>
        <p class="muted">丕賱鬲氐丿賷乇 丌賲賳 賵賱丕 賷睾賷乇 丕賱亘賷丕賳丕鬲. 丕賱丕爻鬲賷乇丕丿 賷鬲胤賱亘 鬲兀賰賷丿賸丕 賯亘賱 丕賱賰鬲丕亘丞.</p>
        <div class="grid">
          <div class="metric"><span class="muted">丕賱兀氐賳丕賮</span><b>${(getCache().items || []).length}</b></div>
          <div class="metric"><span class="muted">丕賱毓賲賱丕亍</span><b>${(getCache().customers || []).length}</b></div>
          <div class="metric"><span class="muted">丕賱賮賵丕鬲賷乇</span><b>${(getCache().invoices || []).length}</b></div>
          <div class="metric"><span class="muted">丕賱胤賱亘丕鬲</span><b>${(getCache().orders || []).length}</b></div>
        </div>
        <div class="field"><label>丕爻鬲賷乇丕丿 賳爻禺丞 JSON</label><input id="settingsImportJsonFile" type="file" accept="application/json,.json"></div>
        <div class="settings-compact-actions">
          <button class="btn ok" id="settingsExportFullJson" type="button">鬲氐丿賷乇 賳爻禺丞 賰丕賲賱丞 JSON</button>
          <button class="btn secondary" id="settingsExportItems" type="button">丕賱兀氐賳丕賮</button>
          <button class="btn light" id="settingsExportReports" type="button">丕賱鬲賯丕乇賷乇</button>
          <button class="btn light" id="settingsStatement" type="button">賰卮賮 丕賱丨爻丕亘</button>
          <button class="btn light" id="settingsInvoices" type="button">丕賱賮賵丕鬲賷乇</button>
        </div>
      </div>`;
  }

  function roleHtml(){
    const s = getState();
    const hasTrader = !!roleProfile("trader") || (s.role === "trader" && !!s.shopId);
    const hasCustomer = !!roleProfile("customer") || (s.role === "customer" && (!!s.customerId || (Array.isArray(s.customerLinks) && s.customerLinks.length)));
    return `
      <div class="card settings-root-card" id="hesabiRoleSettingsAccount" data-settings-root="account-role">
        <h2>賵囟毓 丕賱丨爻丕亘: 鬲丕噩乇 賵毓賲賷賱</h2>
        <div class="grid">
          <div class="metric"><span class="muted">丕賱賵囟毓 丕賱丨丕賱賷</span><b>${roleLabel(s.role)}</b></div>
          <div class="metric"><span class="muted">鬲丕噩乇</span><b>${hasTrader ? "賲賮毓賱" : "睾賷乇 賲賮毓賱"}</b></div>
          <div class="metric"><span class="muted">毓賲賷賱</span><b>${hasCustomer ? "賲賮毓賱" : "睾賷乇 賲賮毓賱"}</b></div>
        </div>
        <div class="settings-compact-actions">
          <button class="btn secondary" id="dualSwitchTrader" type="button">丕賱丿禺賵賱 賰鬲丕噩乇</button>
          <button class="btn secondary" id="dualSwitchCustomer" type="button">丕賱丿禺賵賱 賰毓賲賷賱</button>
          <button class="btn light" id="dualSetupTrader" type="button">鬲賴賷卅丞/丕爻鬲乇噩丕毓 鬲丕噩乇</button>
          <button class="btn light" id="dualSetupCustomer" type="button">乇亘胤 鬲丕噩乇 賰毓賲賷賱</button>
          <button class="btn ok" id="dualOpenStores" type="button">賲鬲丕噩乇賷 / 乇亘胤 賲鬲噩乇</button>
        </div>
      </div>`;
  }

  function accountHtml(){
    const s = getState();
    const identity = s.authPhoneNumber || s.authEmail || s.uid || "睾賷乇 賲爻噩賱";
    return `
      <div class="card settings-root-card" data-settings-root="account">
        <h2>丕賱丨爻丕亘</h2>
        <div class="grid">
          <div class="metric"><span class="muted">丕賱丿禺賵賱</span><b>${escSafe(identity)}</b></div>
          <div class="metric"><span class="muted">賳賵毓 丕賱丨爻丕亘</span><b>${roleLabel(s.role)}</b></div>
          <div class="metric"><span class="muted">賰賵丿 丕賱賲鬲噩乇</span><b>${escSafe(s.shopId || s.activeShopId || "-")}</b></div>
          <div class="metric"><span class="muted">丕爻賲 丕賱賲鬲噩乇/丕賱毓賲賷賱</span><b>${escSafe(s.shopName || s.customerName || "-")}</b></div>
        </div>
      </div>
      ${roleHtml()}
      <div class="card settings-root-card" data-settings-root="account-actions">
        <h2>廿丿丕乇丞 丕賱噩賱爻丞</h2>
        <div class="settings-compact-actions"><button class="btn danger" id="settingsLogout" type="button">鬲爻噩賷賱 禺乇賵噩</button><button class="btn light" id="settingsGoHome" type="button">丕賱乇卅賷爻賷丞</button></div>
      </div>`;
  }

  function notificationsHtml(){
    const s = getState();
    const n = Object.assign({ orders:true, payments:true, messages:true, stock:true, reminders:true }, s.notificationSettings || {});
    const counters = (typeof appNotificationCounters === "function") ? appNotificationCounters() : {};
    const permission = (typeof notificationPermissionState === "function") ? notificationPermissionState() : "unknown";
    return `
      <div class="card settings-root-card" data-settings-root="notifications">
        <h2>丕賱鬲賳亘賷賴丕鬲</h2>
        <div class="grid">
          <div class="metric"><span class="muted">丕賱廿噩賲丕賱賷 睾賷乇 丕賱賲賯乇賵亍</span><b>${Number(counters.notifications || 0)}</b></div>
          <div class="metric"><span class="muted">氐賱丕丨賷丞 丕賱鬲賳亘賷賴丕鬲</span><b>${escSafe(permission)}</b></div>
        </div>
        <div class="grid">
          <label class="notice"><input type="checkbox" id="settingsNotifyOrders"${checked(n.orders)}> 鬲賳亘賷賴丕鬲 丕賱胤賱亘丕鬲</label>
          <label class="notice"><input type="checkbox" id="settingsNotifyPayments"${checked(n.payments)}> 鬲賳亘賷賴丕鬲 丕賱爻丿丕丿</label>
          <label class="notice"><input type="checkbox" id="settingsNotifyMessages"${checked(n.messages)}> 鬲賳亘賷賴丕鬲 丕賱乇爻丕卅賱</label>
          <label class="notice"><input type="checkbox" id="settingsNotifyStock"${checked(n.stock)}> 鬲賳亘賷賴丕鬲 丕賱賲禺夭賵賳</label>
          <label class="notice"><input type="checkbox" id="settingsNotifyReminders"${checked(n.reminders)}> 丕賱鬲匕賰賷乇丕鬲</label>
        </div>
        <div class="settings-compact-actions">
          <button class="btn ok" id="settingsSaveNotifications" type="button">丨賮馗 丕賱鬲賳亘賷賴丕鬲</button>
          <button class="btn secondary" id="settingsEnableNotifications" type="button">鬲賮毓賷賱 氐賱丕丨賷丞 丕賱賴丕鬲賮</button>
          <button class="btn light" id="settingsOpenNotifications" type="button">賮鬲丨 丕賱廿卮毓丕乇丕鬲</button>
          <button class="btn light" id="settingsOpenMessages" type="button">賮鬲丨 丕賱乇爻丕卅賱</button>
          <button class="btn warn" id="settingsClearBadge" type="button">鬲氐賮賷乇 丕賱毓丿賾丕丿</button>
        </div>
      </div>`;
  }

  function renderSection(tab){
    const activeTab = normalizeTab(tab);
    if(activeTab === "security") return securityHtml();
    if(activeTab === "appearance") return appearanceHtml();
    if(activeTab === "shop") return shopHtml();
    if(activeTab === "permissions") return permissionsHtml();
    if(activeTab === "update") return updateHtml();
    if(activeTab === "backup") return backupHtml();
    if(activeTab === "account") return accountHtml();
    return notificationsHtml();
  }

  function bindSafeAction(id, label, handler){
    const el = document.getElementById(id);
    if(!el) return false;
    el.onclick = async function(){
      const wasDisabled = !!el.disabled;
      try { el.disabled = true; await handler(el); }
      catch(error){ try { console.error("settings action failed", id, error); } catch (_) {} notify("鬲毓匕乇 鬲賳賮賷匕 " + label + ": " + safeString(error && error.message || error), "error"); }
      finally { try { el.disabled = wasDisabled; } catch (_) {} }
    };
    return true;
  }
  function openSettingsTab(tab, renderSettingsFn){
    try {
      if(typeof setPageTab === "function") setPageTab("settings", normalizeTab(tab), renderSettingsFn);
      else { const s = getState(); s.settingsTab = normalizeTab(tab); saveSafe(); if(typeof renderSettingsFn === "function") renderSettingsFn(); }
    } catch (_) { if(typeof renderSettingsFn === "function") renderSettingsFn(); }
  }
  function navigate(page){ if(page && typeof show === "function") show(page); }
  function readValue(id, fallback){ const el = document.getElementById(id); return el ? el.value : fallback; }
  function readChecked(id, fallback){ const el = document.getElementById(id); return el ? !!el.checked : !!fallback; }

  function saveAppearanceFromForm(renderSettingsFn){
    const clean = {
      theme: readValue("settingsTheme", "light") === "dark" ? "dark" : "light",
      accent: readValue("settingsAccent", "teal"),
      background: readValue("settingsBackground", "glass"),
      brightness: Math.min(120, Math.max(75, Number(readValue("settingsBrightness", 100) || 100))),
      compact: readChecked("settingsCompactMode", true)
    };
    try { if(typeof saveAppearanceSettings === "function") saveAppearanceSettings(clean); else { const s = getState(); s.appearance = clean; saveSafe(); if(typeof applyAppearance === "function") applyAppearance(); } } catch (_) {}
    notify("鬲賲 丨賮馗 廿毓丿丕丿丕鬲 丕賱卮賰賱.", "success");
    if(typeof renderSettingsFn === "function") renderSettingsFn();
  }
  function saveNotifications(renderSettingsFn){
    const s = getState();
    s.notificationSettings = {
      orders: readChecked("settingsNotifyOrders", true),
      payments: readChecked("settingsNotifyPayments", true),
      messages: readChecked("settingsNotifyMessages", true),
      stock: readChecked("settingsNotifyStock", true),
      reminders: readChecked("settingsNotifyReminders", true)
    };
    saveSafe();
    notify("鬲賲 丨賮馗 廿毓丿丕丿丕鬲 丕賱鬲賳亘賷賴丕鬲.", "success");
    if(typeof renderSettingsFn === "function") renderSettingsFn();
  }
  function savePin(renderSettingsFn){
    const p1 = safeString(readValue("settingsPin1", "")).trim();
    const p2 = safeString(readValue("settingsPin2", "")).trim();
    if(p1.length < 4) { notify("乇賲夭 PIN 賷噩亘 兀賳 賷賰賵賳 4 兀乇賯丕賲 兀賵 兀賰孬乇.", "error"); return; }
    if(p1 !== p2) { notify("鬲兀賰賷丿 PIN 睾賷乇 賲胤丕亘賯.", "error"); return; }
    const s = getState();
    s.appPin = p1;
    s.appLockEnabled = true;
    s.lockEnabled = true;
    s.autoLockMinutes = Number(readValue("settingsAutoLockMinutes", 5) || 5);
    saveSafe();
    notify("鬲賲 丨賮馗 PIN 賵鬲賮毓賷賱 丕賱賯賮賱.", "success");
    if(typeof renderSettingsFn === "function") renderSettingsFn();
  }
  function clearPin(renderSettingsFn){
    const s = getState();
    delete s.appPin; delete s.lockPin; delete s.pinHash;
    saveSafe();
    notify("鬲賲 丨匕賮 乇賲夭 PIN.", "success");
    if(typeof renderSettingsFn === "function") renderSettingsFn();
  }
  function exportJson(){
    const payload = { exportedAt:new Date().toISOString(), version:VERSION, build:BUILD_CODE, state:getState(), cache:getCache() };
    const text = JSON.stringify(payload, null, 2);
    const blob = new Blob([text], { type:"application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hesabi-backup-" + new Date().toISOString().slice(0,10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
    notify("鬲賲 鬲噩賴賷夭 丕賱賳爻禺丞 丕賱丕丨鬲賷丕胤賷丞.", "success");
  }
  async function importJsonFile(file, renderSettingsFn){
    if(!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    if(!parsed || typeof parsed !== "object" || !parsed.state) throw new Error("賲賱賮 丕賱賳爻禺丞 睾賷乇 氐丨賷丨");
    const ok = confirm("爻賷鬲賲 丕爻鬲亘丿丕賱 廿毓丿丕丿丕鬲 賴匕丕 丕賱噩賴丕夭 賲賳 丕賱賳爻禺丞 丕賱賲丨丿丿丞. 賴賱 鬲乇賷丿 丕賱賲鬲丕亘毓丞責");
    if(!ok) return;
    Object.assign(getState(), parsed.state || {});
    saveSafe();
    notify("鬲賲 丕爻鬲賷乇丕丿 丕賱賳爻禺丞. 爻賷鬲賲 鬲丨丿賷孬 丕賱賵丕噩賴丞.", "success");
    if(typeof renderSettingsFn === "function") renderSettingsFn(); else renderSafe();
  }
  async function smartUpdate(btn){
    const status = document.getElementById("settingsUpdateStatus");
    if(status) status.textContent = "噩丕乇賷 賮丨氐 丕賱鬲丨丿賷孬...";
    let info = null;
    try { if(typeof fetchAndroidUpdateInfo === "function") info = await fetchAndroidUpdateInfo(); } catch (_) {}
    if(!info){
      try { const res = await fetch("android-update.json?v=" + Date.now(), { cache:"no-store" }); if(res.ok) info = await res.json(); } catch (_) {}
    }
    const latest = Number((info && (info.latestVersionCode || info.versionCode)) || 0);
    const current = nativeCode();
    if(status) status.textContent = info ? (latest > current ? "賷賵噩丿 鬲丨丿賷孬 噩丿賷丿." : "兀賳鬲 毓賱賶 丌禺乇 賳爻禺丞.") : "鬲毓匕乇 賮丨氐 丕賱鬲丨丿賷孬.";
    if(info && latest > current){ if(typeof downloadApkUpdate === "function") await downloadApkUpdate(); else if(info.apkUrl) location.href = info.apkUrl; }
    else notify(info ? "兀賳鬲 毓賱賶 丌禺乇 賳爻禺丞." : "鬲毓匕乇 賮丨氐 丕賱鬲丨丿賷孬.", info ? "success" : "error");
  }

  function bindActions(renderSettingsFn){
    try { if(typeof bindPageTabs === "function") bindPageTabs("settings", renderSettingsFn); } catch (_) {}
    try { document.querySelectorAll('#page_settings #settingsFinalCacheCheck,#page_settings [data-settings-final-cleanup],#page_settings .settings-final-cache-check').forEach(function(el){ el.remove(); }); } catch (_) {}
    const bound = [];
    function add(id, label, fn){ bound.push({ id, ok: bindSafeAction(id, label, fn) }); }
    function go(id, page){ add(id, "賮鬲丨 " + page, function(){ navigate(page); }); }

    add("settingsGoAccount", "丕賱丨爻丕亘", function(){ openSettingsTab("account", renderSettingsFn); });
    add("settingsGoHome", "丕賱乇卅賷爻賷丞", function(){ navigate("home"); });
    add("settingsLogout", "鬲爻噩賷賱 丕賱禺乇賵噩", settingsLogout);

    add("settingsToggleLock", "鬲亘丿賷賱 丕賱賯賮賱", function(){ const s = getState(); const next = !(s.appLockEnabled || s.lockEnabled); s.appLockEnabled = next; s.lockEnabled = next; s.autoLockMinutes = Number(readValue("settingsAutoLockMinutes", 5) || 5); saveSafe(); notify(next ? "鬲賲 鬲賮毓賷賱 丕賱賯賮賱." : "鬲賲 廿賱睾丕亍 丕賱賯賮賱.", "success"); if(typeof renderSettingsFn === "function") renderSettingsFn(); });
    add("settingsSavePin", "丨賮馗 PIN", function(){ savePin(renderSettingsFn); });
    add("settingsClearPin", "丨匕賮 PIN", function(){ clearPin(renderSettingsFn); });
    add("settingsToggleBiometric", "鬲亘丿賷賱 丕賱亘氐賲丞", function(){ const s = getState(); const next = !(s.biometricEnabled || s.biometricLockEnabled); s.biometricEnabled = next; s.biometricLockEnabled = next; saveSafe(); notify(next ? "鬲賲 鬲賮毓賷賱 禺賷丕乇 丕賱亘氐賲丞." : "鬲賲 廿賷賯丕賮 禺賷丕乇 丕賱亘氐賲丞.", "success"); if(typeof renderSettingsFn === "function") renderSettingsFn(); });
    add("settingsClearLocalSession", "賲爻丨 丕賱噩賱爻丞 丕賱賲丨賱賷丞", async function(){ if(confirm("賴賱 鬲乇賷丿 鬲爻噩賷賱 丕賱禺乇賵噩 賵賲爻丨 亘賷丕賳丕鬲 丕賱噩賱爻丞 賲賳 賴匕丕 丕賱噩賴丕夭責")) await settingsLogout(); });
    const autoLock = document.getElementById("settingsAutoLockMinutes");
    if(autoLock) autoLock.onchange = function(){ const s = getState(); s.autoLockMinutes = Number(autoLock.value || 5); s.lockAfterMinutes = s.autoLockMinutes; saveSafe(); };

    add("settingsSaveAppearance", "丨賮馗 丕賱卮賰賱", function(){ saveAppearanceFromForm(renderSettingsFn); });
    add("settingsCompactOn", "賵丕噩賴丞 賲丿賲噩丞", function(){ const s = getState(); s.appearance = Object.assign(currentAppearance(), { compact:true }); try { if(typeof saveAppearanceSettings === "function") saveAppearanceSettings({ compact:true }); else { saveSafe(); if(typeof applyAppearance === "function") applyAppearance(); } } catch (_) {} if(typeof renderSettingsFn === "function") renderSettingsFn(); });
    add("settingsCompactOff", "賵丕噩賴丞 賵丕爻毓丞", function(){ const s = getState(); s.appearance = Object.assign(currentAppearance(), { compact:false }); try { if(typeof saveAppearanceSettings === "function") saveAppearanceSettings({ compact:false }); else { saveSafe(); if(typeof applyAppearance === "function") applyAppearance(); } } catch (_) {} if(typeof renderSettingsFn === "function") renderSettingsFn(); });

    go("settingsPolicies", "policies");
    go("settingsItems", "items");
    go("settingsShopCode", "shopcode");
    go("settingsCustomers", "customers");
    go("settingsExportItems", "items");
    go("settingsExportReports", "reports");
    go("settingsStatement", "statement");
    go("settingsInvoices", "invoices");
    go("settingsOpenNotifications", "notifications");
    go("settingsOpenMessages", "messages");

    add("settingsSmartUpdate", "賮丨氐 賵鬲丨丿賷孬 丕賱鬲胤亘賷賯", smartUpdate);
    add("settingsExportFullJson", "鬲氐丿賷乇 賳爻禺丞 賰丕賲賱丞", exportJson);
    const importFile = document.getElementById("settingsImportJsonFile");
    if(importFile) importFile.onchange = function(){ importJsonFile(importFile.files && importFile.files[0], renderSettingsFn).catch(function(e){ notify("鬲毓匕乇 丕賱丕爻鬲賷乇丕丿: " + safeString(e && e.message || e), "error"); }); };

    add("dualSwitchTrader", "丕賱丿禺賵賱 賰鬲丕噩乇", function(){ applyRole("trader", false); });
    add("dualSwitchCustomer", "丕賱丿禺賵賱 賰毓賲賷賱", function(){ applyRole("customer", false); });
    add("dualSetupTrader", "鬲賴賷卅丞 鬲丕噩乇", function(){ applyRole("trader", true); });
    add("dualSetupCustomer", "乇亘胤 鬲丕噩乇 賰毓賲賷賱", function(){ applyRole("customer", true); });
    add("dualOpenStores", "賲鬲丕噩乇賷", function(){ rememberRole(); if(getState().role !== "customer") applyRole("customer", true); else navigate("shops"); });

    add("settingsSaveNotifications", "丨賮馗 丕賱鬲賳亘賷賴丕鬲", function(){ saveNotifications(renderSettingsFn); });
    add("settingsEnableNotifications", "鬲賮毓賷賱 丕賱鬲賳亘賷賴丕鬲", function(){ if(typeof requestNotificationPermission === "function") return requestNotificationPermission(true); throw new Error("requestNotificationPermission 睾賷乇 賲鬲丕丨丞"); });
    add("settingsClearBadge", "鬲氐賮賷乇 丕賱毓丿賾丕丿", function(){ if(typeof clearAllNotificationCounters === "function") clearAllNotificationCounters(); notify("鬲賲 鬲氐賮賷乇 丕賱毓丿賾丕丿.", "success"); if(typeof renderSettingsFn === "function") renderSettingsFn(); });

    window.__hesabiSettingsLastBindings = { ok:true, version:VERSION, build:BUILD_CODE, at:Date.now(), bound };
    return window.__hesabiSettingsLastBindings;
  }

  function selfCheck(){
    let finalButton = false;
    let roleOutsideAccount = false;
    try { finalButton = !!document.querySelector('#page_settings #settingsFinalCacheCheck,#page_settings [data-settings-final-cleanup]'); } catch (_) {}
    try {
      const role = document.getElementById("hesabiRoleSettingsAccount");
      const tab = (typeof pageTabState === "function") ? pageTabState("settings", "security") : getState().settingsTab;
      roleOutsideAccount = !!role && normalizeTab(tab) !== "account";
    } catch (_) {}
    const api = window.hesabiSettingsHelpers || {};
    const missingMethods = ["tabs", "normalizeTab", "renderSection", "bindActions"].filter(function(name){ return typeof api[name] !== "function"; });
    return { ok: missingMethods.length === 0 && !finalButton && !roleOutsideAccount, version:VERSION, build:BUILD_CODE, missingMethods, finalButton, roleOutsideAccount, tabs:getTabs().map(function(t){ return t[0]; }), checkedAt:new Date().toISOString() };
  }

  window.hesabiSettingsHelpers = { version:VERSION, build:BUILD_CODE, tabs:getTabs, normalizeTab, renderSection, bindActions, selfCheck };
  window.hesabiSettingsHelpersSelfCheck = selfCheck;
})();