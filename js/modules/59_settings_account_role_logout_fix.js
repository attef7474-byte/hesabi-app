/* Hesabi 1.0.120 - Settings account-only role switch + reliable logout.
   Web UI hotfix only. No Firestore data write logic is changed. */
(function(){
  "use strict";

  const VERSION = "1.0.120";
  const BUILD_CODE = 120;

  function byId(id){ try { return document.getElementById(id); } catch(_) { return null; } }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch(_) { return []; } }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch(_) {} }
  function saveSafe(){ try { if(typeof save === "function") save(); } catch(_) {} }
  function renderSafe(){ try { if(typeof render === "function") render(); } catch(_) {} }

  function currentSettingsTab(){
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

  function settingsAccountCard(page){
    const logout = byId("settingsLogout");
    if(logout && logout.closest) {
      const card = logout.closest(".card");
      if(card) return card;
    }
    return qsa(".card", page).find(function(c){
      return /الحساب|تسجيل خروج/.test(c.textContent || "");
    }) || null;
  }

  function keepRoleCardInAccountOnly(){
    const page = byId("page_settings");
    if(!page) return false;

    const tab = currentSettingsTab();
    let roleCard = byId("hesabiRoleSettings115");

    try {
      document.documentElement.setAttribute("data-settings-tab", tab);
      document.documentElement.setAttribute("data-settings-account-tab", tab === "account" ? "yes" : "no");
    } catch(_) {}

    if(tab !== "account"){
      if(roleCard) roleCard.remove();
      return true;
    }

    if(!roleCard){
      try {
        if(window.hesabiSettingsRoleUnifiedUpdate && typeof window.hesabiSettingsRoleUnifiedUpdate.apply === "function") {
          window.hesabiSettingsRoleUnifiedUpdate.apply();
        }
      } catch(_) {}
      roleCard = byId("hesabiRoleSettings115");
    }

    const account = settingsAccountCard(page);
    if(roleCard && account && roleCard.parentNode !== account){
      const actions = qsa(".settings-compact-actions", account)[0];
      if(actions) account.insertBefore(roleCard, actions);
      else account.appendChild(roleCard);
    }

    return true;
  }

  async function robustSettingsLogout(){
    try {
      try {
        if(typeof unsub !== "undefined" && Array.isArray(unsub)){
          unsub.forEach(function(u){ try { if(typeof u === "function") u(); } catch(_) {} });
          unsub = [];
        }
      } catch(_) {}

      try { if(typeof rememberCurrentDualRoleProfile === "function") rememberCurrentDualRoleProfile(); } catch(_) {}

      try {
        if(typeof auth !== "undefined" && auth && typeof signOut === "function") {
          await signOut(auth);
        }
      } catch(error) {
        console.warn("settings logout Firebase signOut failed", error);
      }

      try { currentUser = null; } catch(_) {}
      try { authReady = false; } catch(_) {}
      try { appUnlockedSession = false; } catch(_) {}
      try { listenersStartedKey = ""; } catch(_) {}
      try { if(typeof resetCacheForLiveData === "function") resetCacheForLiveData(); } catch(_) {}

      if(typeof state === "object" && state){
        state.role = "";
        state.profileDone = false;
        delete state.shopId;
        delete state.shopName;
        delete state.customerId;
        delete state.customerName;
        delete state.customerPhone;
        delete state.customerLinks;
        delete state.activeShopId;
        delete state.activeCustomerLink;
        delete state.uid;
        delete state.authEmail;
        delete state.authPhoneNumber;
        delete state.authPhoneKey;
        delete state.authProvider;
        delete state.pendingSmsPhone;
        delete state.pendingSmsPhoneKey;
      }

      try { sessionStorage.clear(); } catch(_) {}
      saveSafe();
      try { if(typeof hideAppDialog === "function") hideAppDialog(); } catch(_) {}
      try { active = "home"; } catch(_) {}
      renderSafe();
      notify("تم تسجيل الخروج بنجاح.", "success");
      return true;
    } catch(error) {
      console.error("settings logout failed", error);
      notify("تعذر تسجيل الخروج: " + (error && error.message ? error.message : String(error)), "error");
      return false;
    }
  }

  function bindLogoutButton(){
    const btn = byId("settingsLogout");
    if(!btn || btn.__hesabiAccountLogout120) return !!btn;

    const clone = btn.cloneNode(true);
    clone.__hesabiAccountLogout120 = true;
    clone.onclick = function(ev){
      try { if(ev) { ev.preventDefault(); ev.stopPropagation(); } } catch(_) {}
      robustSettingsLogout();
      return false;
    };

    btn.parentNode.replaceChild(clone, btn);
    return true;
  }

  function apply(){
    keepRoleCardInAccountOnly();
    bindLogoutButton();
  }

  function schedule(){
    [0, 80, 220, 700, 1200].forEach(function(ms){ setTimeout(apply, ms); });
  }

  function wrap(){
    const w = window.__hesabiSettingsAccountLogout120Wrapped || {};
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
    if(typeof renderSettings === "function" && !w.renderSettings){
      const base = renderSettings;
      renderSettings = function(){ const out = base.apply(this, arguments); schedule(); return out; };
      w.renderSettings = true;
    }
    window.__hesabiSettingsAccountLogout120Wrapped = w;
  }

  function selfCheck(){
    apply();
    const tab = currentSettingsTab();
    const hasRole = !!byId("hesabiRoleSettings115");
    const logout = byId("settingsLogout");
    return {
      ok: true,
      version: VERSION,
      build: BUILD_CODE,
      settingsTab: tab,
      roleAccountOnly: tab === "account" ? hasRole : !hasRole,
      logoutButtonSeen: !!logout,
      logoutBound: !!(logout && logout.__hesabiAccountLogout120),
      checkedAt: new Date().toISOString()
    };
  }

  wrap();
  schedule();
  try { new MutationObserver(function(){ schedule(); }).observe(document.documentElement, { childList:true, subtree:true }); } catch(_) {}

  window.hesabiSettingsAccountRoleLogoutFix = { version:VERSION, build:BUILD_CODE, apply, robustSettingsLogout, selfCheck };
  window.hesabiSettingsAccountRoleLogoutFixSelfCheck = selfCheck;
})();