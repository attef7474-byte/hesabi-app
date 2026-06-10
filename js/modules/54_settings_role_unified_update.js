/* Hesabi 1.0.120 - Settings role/store recovery + one smart update button.
   Web UI hotfix only. UTF-8 safe. No Firestore write logic is changed. */
(function(){
  "use strict";

  const VERSION = "1.0.121";
  const BUILD_CODE = 121;

  function byId(id){ try { return document.getElementById(id); } catch(_) { return null; } }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch(_) { return []; } }
  function safeString(v){ try { return v == null ? "" : String(v); } catch(_) { return ""; } }
  function esc(v){
    return safeString(v).replace(/[&<>"']/g, function(ch){
      return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch] || ch);
    });
  }
  function notify(text, type){
    try { if(typeof msg === "function") msg(text, type || "notice"); else console.log(text); } catch(_) {}
  }
  function saveSafe(){ try { if(typeof save === "function") save(); } catch(_) {} }
  function renderSafe(){ try { if(typeof render === "function") render(); } catch(_) {} }
  function showSafe(page){ try { if(typeof show === "function") show(page); } catch(_) {} }

  function ensureStyle(){
    if(byId("hesabiSettingsRoleUnifiedUpdate115Style")) return true;
    const style = document.createElement("style");
    style.id = "hesabiSettingsRoleUnifiedUpdate115Style";
    style.textContent = `
      .hesabi-role-card,.hesabi-update-card{background:var(--card,#fff);border:1px solid var(--line,#dbe7ee);border-radius:20px;padding:14px;margin:12px 0;box-shadow:var(--shadow,0 8px 24px rgba(16,24,40,.08));}
      .hesabi-role-card h2,.hesabi-update-card h2{margin-top:0;}
      .hesabi-role-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px;}
      .hesabi-role-actions .btn,.hesabi-update-actions .btn{width:100%!important;min-height:42px!important;border-radius:14px!important;}
      .hesabi-pill{display:inline-flex;border:1px solid #99f6e4;background:#ecfeff;color:#0f766e;border-radius:999px;padding:5px 9px;margin:2px;font-size:12px;font-weight:900;}
      .hesabi-pill.off{background:#f8fafc;color:#64748b;border-color:#e2e8f0;}
      .hesabi-update-status{border:1px solid #99f6e4;background:#f0fdfa;color:#115e59;border-radius:16px;padding:10px;margin:9px 0;font-weight:900;white-space:pre-wrap;line-height:1.65;}
      .hesabi-update-actions{display:grid;grid-template-columns:1fr;gap:8px;}
      .hesabi-update-actions .btn:disabled{opacity:.55!important;filter:grayscale(.3);cursor:not-allowed!important;}
      #settingsRefreshUi,#settingsCleanCache,#settingsUpdateApk,#settingsCheckApk,#settingsRunSelfCheck{display:none!important;}
      @media(max-width:460px){.hesabi-role-actions{grid-template-columns:1fr 1fr}.hesabi-role-actions .btn{font-size:12px!important;padding:8px 6px!important}}
    `;
    document.head.appendChild(style);
    return true;
  }

  function roleProfile(role){
    try {
      if(typeof dualRoleProfileFor === "function") return dualRoleProfileFor(role);
      return (state && state.roleProfiles && state.roleProfiles[role]) || null;
    } catch(_) { return null; }
  }

  function rememberRole(){
    try { if(typeof rememberCurrentDualRoleProfile === "function") rememberCurrentDualRoleProfile(); } catch(_) {}
  }

  function switchRole(role, setupMode){
    rememberRole();
    try {
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

      if(typeof applyDualRoleProfile === "function"){
        applyDualRoleProfile(role);
        return;
      }

      const p = roleProfile(role);
      state.role = role;
      if(p && p.profileDone){
        Object.keys(p).forEach(function(k){ if(k !== "role") state[k] = p[k]; });
        state.profileDone = true;
      } else {
        state.profileDone = false;
      }
      saveSafe();
      renderSafe();
    } catch(error) {
      notify("تعذر التبديل: " + safeString(error && error.message || error), "error");
    }
  }

  function openStores(){
    rememberRole();
    try {
      if(state && state.role !== "customer"){
        const p = roleProfile("customer");
        if(p && p.profileDone && typeof applyDualRoleProfile === "function"){
          applyDualRoleProfile("customer");
          setTimeout(function(){ showSafe("shops"); }, 300);
          return;
        }
        switchRole("customer", true);
        return;
      }
      showSafe("shops");
    } catch(error) {
      notify("تعذر فتح متاجري: " + safeString(error && error.message || error), "error");
    }
  }

  function roleCardHtml(){
    const hasTrader = !!roleProfile("trader");
    const hasCustomer = !!roleProfile("customer");
    const current = state && state.role === "trader" ? "تاجر" : (state && state.role === "customer" ? "عميل" : "غير محدد");
    return `
      <div class="hesabi-role-card" id="hesabiRoleSettings115">
        <h2>وضع الحساب: تاجر وعميل</h2>
        <div><b>الوضع الحالي: </b><span class="hesabi-pill">${esc(current)}</span></div>
        <div>
          <span class="hesabi-pill ${hasTrader ? "" : "off"}">تاجر: ${hasTrader ? "مفعل" : "غير مفعل"}</span>
          <span class="hesabi-pill ${hasCustomer ? "" : "off"}">عميل: ${hasCustomer ? "مفعل" : "غير مفعل"}</span>
        </div>
        <div class="hesabi-role-actions">
          <button class="btn secondary" id="dualSwitchTrader" type="button">الدخول كتاجر</button>
          <button class="btn secondary" id="dualSwitchCustomer" type="button">الدخول كعميل</button>
          <button class="btn light" id="dualSetupTrader" type="button">تهيئة/استرجاع تاجر</button>
          <button class="btn light" id="dualSetupCustomer" type="button">ربط تاجر كعميل</button>
          <button class="btn ok" id="dualOpenStores" type="button">متاجري / ربط متجر</button>
        </div>
      </div>`;
  }

  function bindRoleControls(){
    const map = [
      ["dualSwitchTrader", function(){ switchRole("trader", false); }],
      ["dualSwitchCustomer", function(){ switchRole("customer", false); }],
      ["dualSetupTrader", function(){ switchRole("trader", true); }],
      ["dualSetupCustomer", function(){ switchRole("customer", true); }],
      ["dualOpenStores", openStores]
    ];
    map.forEach(function(pair){
      const el = byId(pair[0]);
      if(el) el.onclick = pair[1];
    });
  }
  function currentSettingsTab115(){
    try {
      if(typeof pageTabState === "function") return String(pageTabState("settings", "security") || "security");
    } catch(_) {}
    try {
      if(typeof state === "object" && state) {
        if(state.pageTabs && state.pageTabs.settings) return String(state.pageTabs.settings || "security");
        if(state.settingsTab) return String(state.settingsTab || "security");
      }
    } catch(_) {}
    return "security";
  }

  function settingsAccountCard115(page){
    const logout = byId("settingsLogout");
    if(logout && logout.closest) {
      const card = logout.closest(".card");
      if(card) return card;
    }
    return qsa(".card", page).find(function(c){
      return /الحساب|تسجيل خروج/.test(c.textContent || "");
    }) || null;
  }

  function currentSettingsTabForRole115(){
    try {
      if(typeof pageTabState === "function") return pageTabState("settings", "security");
    } catch(_) {}
    try {
      if(typeof state === "object" && state){
        if(state.pageTabs && state.pageTabs.settings) return String(state.pageTabs.settings || "security");
        if(state.settingsTab) return String(state.settingsTab || "security");
      }
    } catch(_) {}
    try {
      const active = document.querySelector("#page_settings .page-tab.active,[data-page-tab].active,.page-tabs .active");
      const val = active && (active.dataset.tab || active.dataset.pageTab || active.getAttribute("data-tab"));
      if(val) return String(val);
    } catch(_) {}
    return "security";
  }
  function ensureRoleCard(){
    const page = byId("page_settings");
    if(!page) return false;
    const roleAccountOnly115 = currentSettingsTabForRole115() === "account";
    if(!roleAccountOnly115){
      const oldRoleCard115 = byId("hesabiRoleSettings115");
      if(oldRoleCard115) oldRoleCard115.remove();
      return true;
    }

    const tab = currentSettingsTab115();
    let card = byId("hesabiRoleSettings115");

    if(tab !== "account"){
      if(card) card.remove();
      return true;
    }

    const accountCard = settingsAccountCard115(page);
    if(!accountCard) return false;

    if(!card){
      accountCard.insertAdjacentHTML("beforeend", roleCardHtml());
      card = byId("hesabiRoleSettings115");
    }

    if(card && card.parentNode !== accountCard){
      const actions = qsa(".settings-compact-actions", accountCard)[0];
      if(actions) accountCard.insertBefore(card, actions);
      else accountCard.appendChild(card);
    }

    bindRoleControls();
    return true;
  }
function nativeCode(){
    try {
      const n = typeof nativeVersionCode === "function" ? Number(nativeVersionCode() || 0) : 0;
      if(n) return n;
    } catch(_) {}
    return 0;
  }

  function nativeName(){
    try { return typeof nativeVersionName === "function" ? safeString(nativeVersionName() || "") : ""; } catch(_) { return ""; }
  }

  function nativeLabel(){
    try { if(typeof nativeVersionLabel === "function") return nativeVersionLabel(); } catch(_) {}
    return (nativeName() || "APK") + " (" + (nativeCode() || "-") + ")";
  }

  async function fetchUpdateInfo(){
    try {
      if(typeof fetchAndroidUpdateInfo === "function"){
        const info = await fetchAndroidUpdateInfo();
        if(info) return info;
      }
    } catch(_) {}
    for(const u of ["android-update.json", "/android-update.json"]){
      try {
        const res = await fetch(u + "?v=" + Date.now(), { cache:"no-store", headers:{ "Cache-Control":"no-cache" } });
        if(res.ok) return await res.json();
      } catch(_) {}
    }
    return null;
  }

  async function updateState(){
    const info = await fetchUpdateInfo();
    const currentCode = nativeCode();
    const currentName = nativeName();
    const latestCode = Number((info && (info.latestVersionCode || info.versionCode)) || 0);
    const latestName = safeString((info && (info.latestVersionName || info.versionName)) || "");
    return { ok:!!info, info, currentCode, currentName, latestCode, latestName, hasUpdate:!!(currentCode && latestCode && latestCode > currentCode) };
  }

  function setStatus(text){
    qsa("[data-update115-status]").forEach(function(el){ el.textContent = text; });
  }

  function setButton(btn, st){
    if(!btn) return;
    if(!st.ok){
      btn.disabled = true;
      btn.textContent = "تعذر فحص التحديث";
    } else if(st.hasUpdate){
      btn.disabled = false;
      btn.textContent = "تحديث التطبيق الآن";
    } else {
      btn.disabled = true;
      btn.textContent = "أنت على آخر نسخة";
    }
  }

  async function refreshUpdate(){
    const st = await updateState();
    const status = st.ok
      ? (st.hasUpdate
          ? `يوجد تحديث جديد: ${st.latestName || st.latestCode}\nنسختك الحالية: ${st.currentName || "-"} / build ${st.currentCode || "-"}`
          : `لا يوجد تحديث جديد.\nنسختك الحالية: ${st.currentName || "-"} / build ${st.currentCode || "-"}\nآخر نسخة متاحة: ${st.latestName || "-"} / build ${st.latestCode || "-"}`)
      : "تعذر فحص التحديث. تأكد من الإنترنت.";
    setStatus(status);
    qsa("[data-update115-btn]").forEach(function(btn){ btn.__hesabiUpdateState115 = st; setButton(btn, st); });
    return st;
  }

  async function runUpdate(btn){
    const st = (btn && btn.__hesabiUpdateState115) || await updateState();
    if(!st.hasUpdate){
      setStatus("أنت على آخر نسخة. لا حاجة لتنظيف الكاش أو تنزيل APK.");
      notify("أنت على آخر نسخة.", "success");
      setButton(btn, st);
      return;
    }
    try {
      if(btn){ btn.disabled = true; btn.textContent = "جاري التحديث..."; }
      setStatus("جاري تنظيف الكاش وتحديث الواجهات ثم فتح APK...");
      try { if(typeof refreshWebUiNow === "function") await refreshWebUiNow(); } catch(_) {}
      if(typeof downloadApkUpdate === "function") await downloadApkUpdate();
      else if(st.info && st.info.apkUrl) location.href = st.info.apkUrl;
    } catch(error) {
      setStatus("تعذر تنفيذ التحديث: " + safeString(error && error.message || error));
      if(btn) btn.disabled = false;
    }
  }

  function updateCardHtml(){
    return `
      <div class="hesabi-update-card" id="hesabiUpdateSettings115">
        <h2>التحديث</h2>
        <div class="grid">
          <div class="metric"><span class="muted">إصدار الواجهات</span><b>${VERSION}</b></div>
          <div class="metric"><span class="muted">إصدار APK</span><b>${esc(nativeLabel())}</b></div>
        </div>
        <div class="hesabi-update-status" data-update115-status>جاري فحص التحديث...</div>
        <div class="hesabi-update-actions">
          <button class="btn ok" type="button" data-update115-btn disabled>جاري الفحص...</button>
        </div>
      </div>`;
  }

  function bindUpdate(root){
    qsa("[data-update115-btn]", root || document).forEach(function(btn){
      if(btn.__hesabiUpdateBound115) return;
      btn.__hesabiUpdateBound115 = true;
      btn.onclick = function(){ runUpdate(btn); };
    });
    refreshUpdate();
  }

  function replaceOldUpdateCard(){
    const page = byId("page_settings");
    if(!page) return false;
    const oldButtons = ["settingsRefreshUi","settingsCleanCache","settingsUpdateApk","settingsCheckApk","settingsRunSelfCheck"].map(byId).filter(Boolean);
    if(!oldButtons.length && byId("hesabiUpdateSettings115")){
      bindUpdate(page);
      return true;
    }
    let card = oldButtons[0] && oldButtons[0].closest && oldButtons[0].closest(".card");
    if(!card){
      card = qsa(".card", page).find(function(c){ return /التحديث|الكاش|APK|إصدار الواجهات/.test(c.textContent || ""); });
    }
    if(card){
      card.outerHTML = updateCardHtml();
      bindUpdate(page);
      return true;
    }
    return false;
  }

  function openUpdateModal(){
    const old = byId("hesabiUpdate115Modal");
    if(old) old.remove();
    const back = document.createElement("div");
    back.id = "hesabiUpdate115Modal";
    back.className = "hesabi113-modal-backdrop";
    back.innerHTML = `<div class="hesabi113-modal"><div class="hesabi113-modal-head"><h2>تحديث التطبيق</h2><button class="hesabi113-close" id="closeUpdate115" type="button">×</button></div><div class="hesabi113-modal-body">${updateCardHtml()}</div></div>`;
    document.body.appendChild(back);
    const close = byId("closeUpdate115");
    if(close) close.onclick = function(){ back.remove(); };
    back.onclick = function(ev){ if(ev.target === back) back.remove(); };
    bindUpdate(back);
  }

  function rebindTopMenu(){
    try {
      if(window.hesabiUiCleanupHeaderHomeNav && typeof window.hesabiUiCleanupHeaderHomeNav.ensureHeaderMenu === "function"){
        window.hesabiUiCleanupHeaderHomeNav.ensureHeaderMenu();
      }
    } catch(_) {}
    qsa('[data-top-menu-action="update"]').forEach(function(oldItem){
      if(oldItem.__hesabiUpdate115) return;
      const item = oldItem.cloneNode(true);
      item.__hesabiUpdate115 = true;
      oldItem.parentNode.replaceChild(item, oldItem);
      item.onclick = function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        try { byId("hesabiTopOverflowMenu")?.classList.add("hidden"); } catch(_) {}
        openUpdateModal();
        return false;
      };
    });
  }

  function apply(){
    ensureStyle();
    ensureRoleCard();
    replaceOldUpdateCard();
    rebindTopMenu();
  }

  function schedule(){
    setTimeout(apply, 0);
    setTimeout(apply, 150);
    setTimeout(apply, 600);
  }

  function wrap(){
    const w = window.__hesabiSettingsUpdate115Wrapped || {};
    if(typeof render === "function" && !w.render){
      const base = render;
      render = function(){ const out = base.apply(this, arguments); schedule(); return out; };
      w.render = true;
    }
    if(typeof show === "function" && !w.show){
      const base = show;
      show = function(){ const out = base.apply(this, arguments); schedule(); return out; };
      w.show = true;
    }
    if(typeof renderSettings === "function" && !w.settings){
      const base = renderSettings;
      renderSettings = function(){ const out = base.apply(this, arguments); schedule(); return out; };
      w.settings = true;
    }
    window.__hesabiSettingsUpdate115Wrapped = w;
  }

    function selfCheck(){
    apply();
    const old = byId("settingsRefreshUi");
    let oldVisible = false;
    try { oldVisible = !!old && getComputedStyle(old).display !== "none"; } catch(_) {}
    const tab = currentSettingsTab115();
    const hasRole = !!byId("hesabiRoleSettings115");
    const roleOk = tab === "account" ? hasRole : !hasRole;
    const ok = roleOk && !!byId("hesabiUpdateSettings115") && !oldVisible;
    return { ok, version:VERSION, build:BUILD_CODE, settingsTab:tab, hasRole, roleAccountOnly:true, hasUpdate:!!byId("hesabiUpdateSettings115"), oldVisible, checkedAt:new Date().toISOString() };
  }

  ensureStyle();
  wrap();
  schedule();
  try { new MutationObserver(function(){ schedule(); }).observe(document.documentElement, { childList:true, subtree:true }); } catch(_) {}

  window.hesabiSettingsRoleUnifiedUpdate = { version:VERSION, build:BUILD_CODE, apply, refreshUpdate, selfCheck };
  window.hesabiSettingsRoleUnifiedUpdateSelfCheck = selfCheck;
})();
