/* Hesabi 1.0.121 - Final settings cleanup.
   Centralizes settings page cleanup after many older hotfix modules:
   - remove repeated final-check button from settings
   - keep trader/customer switch only inside Account tab
   - repair Account logout binding
   Web UI only. No Firestore writes are changed. */
(function(){
  "use strict";

  const VERSION = "1.0.121";
  const BUILD_CODE = 121;

  function byId(id){ try { return document.getElementById(id); } catch(_) { return null; } }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch(_) { return []; } }
  function txt(v){ try { return v == null ? "" : String(v); } catch(_) { return ""; } }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); else console.log(text); } catch(_) {} }
  function saveSafe(){ try { if(typeof save === "function") save(); } catch(_) {} }
  function renderSafe(){ try { if(typeof render === "function") render(); } catch(_) {} }
  function showSafe(page){ try { if(typeof show === "function") show(page); } catch(_) {} }

  function ensureStyle(){
    if(byId("hesabiSettingsFinalCleanup121Style")) return;
    const style = document.createElement("style");
    style.id = "hesabiSettingsFinalCleanup121Style";
    style.textContent = `
      #page_settings #settingsFinalCacheCheck{display:none!important;}
      #page_settings[data-settings-tab-final-cleanup]:not([data-settings-tab-final-cleanup="account"]) #hesabiRoleSettings115{display:none!important;}
      #page_settings .hesabi-final-cleanup-hidden{display:none!important;}
    `;
    try { document.head.appendChild(style); } catch(_) {}
  }

  function currentSettingsTab(){
    try {
      if(typeof pageTabState === "function") return String(pageTabState("settings", "security") || "security");
    } catch(_) {}
    try {
      if(typeof state === "object" && state){
        if(state.pageTabs && state.pageTabs.settings) return String(state.pageTabs.settings || "security");
        if(state.settingsTab) return String(state.settingsTab || "security");
      }
    } catch(_) {}
    try {
      const page = byId("page_settings");
      const active = page && page.querySelector(".page-tab.active,[data-tab].active,[data-page-tab].active,.page-tabs .active");
      const val = active && (active.dataset.tab || active.dataset.pageTab || active.getAttribute("data-tab"));
      if(val) return String(val);
      const text = txt(active && active.textContent);
      if(text.includes("丕賱丨爻丕亘")) return "account";
      if(text.includes("丕賱鬲丨丿賷孬")) return "update";
      if(text.includes("丕賱兀賲丕賳")) return "security";
    } catch(_) {}
    return "security";
  }

  function removeFinalCheckButtons(){
    const page = byId("page_settings");
    if(!page) return 0;
    let removed = 0;
    qsa("#settingsFinalCacheCheck", page).forEach(function(el){
      try { el.remove(); removed++; } catch(_) { try { el.classList.add("hesabi-final-cleanup-hidden"); } catch(__){} }
    });
    qsa("button", page).forEach(function(btn){
      const text = txt(btn.textContent).trim();
      if(text === "賮丨氐 賳賴丕卅賷"){
        try { btn.remove(); removed++; } catch(_) { try { btn.classList.add("hesabi-final-cleanup-hidden"); } catch(__){} }
      }
    });
    return removed;
  }

  function fixRoleCardPlacement(){
    const page = byId("page_settings");
    if(!page) return { ok:false, reason:"settings page missing" };
    const tab = currentSettingsTab();
    page.setAttribute("data-settings-tab-final-cleanup", tab);
    const cards = qsa("#hesabiRoleSettings115", page);
    if(tab !== "account"){
      cards.forEach(function(card){ try { card.remove(); } catch(_) { card.classList.add("hesabi-final-cleanup-hidden"); } });
      return { ok:true, tab, visible:false, count:0 };
    }
    if(cards.length > 1){
      cards.slice(1).forEach(function(card){ try { card.remove(); } catch(_){} });
    }
    const card = byId("hesabiRoleSettings115");
    if(card){
      card.classList.remove("hesabi-final-cleanup-hidden");
      try {
        const tabs = page.querySelector(".page-tabs,.page-tabs-card");
        if(tabs && tabs.nextSibling !== card) tabs.insertAdjacentElement("afterend", card);
      } catch(_) {}
      return { ok:true, tab, visible:true, count:1 };
    }
    return { ok:true, tab, visible:false, count:0 };
  }

  async function fallbackLogout(){
    try {
      if(typeof unsub !== "undefined" && Array.isArray(unsub)){
        unsub.forEach(function(u){ try { if(typeof u === "function") u(); } catch(_) {} });
        unsub.length = 0;
      }
    } catch(_) {}
    try { if(typeof auth !== "undefined" && auth && typeof signOut === "function") await signOut(auth); } catch(e) { console.warn("fallback logout signOut failed", e); }
    try { currentUser = null; } catch(_) {}
    try { authReady = false; } catch(_) {}
    try {
      if(typeof state === "object" && state){
        state.role = "";
        state.profileDone = false;
        delete state.shopId; delete state.shopName; delete state.customerId; delete state.customerName; delete state.customerPhone;
        delete state.customerLinks; delete state.activeCustomerLink; delete state.activeShopId; delete state.uid;
        delete state.authEmail; delete state.authPhoneNumber; delete state.authPhoneKey; delete state.authProvider;
        delete state.pendingSmsPhone; delete state.pendingSmsPhoneKey;
      }
    } catch(_) {}
    try { sessionStorage.clear(); } catch(_) {}
    saveSafe();
    try { if(typeof hideAppDialog === "function") hideAppDialog(); } catch(_) {}
    renderSafe();
  }

  function bindLogout(){
    const btn = byId("settingsLogout");
    if(!btn) return false;
    btn.onclick = async function(ev){
      try { ev && ev.preventDefault && ev.preventDefault(); } catch(_) {}
      try {
        btn.disabled = true;
        if(typeof safeFullLogout === "function") await safeFullLogout("settings-account");
        else await fallbackLogout();
        notify("鬲賲 鬲爻噩賷賱 丕賱禺乇賵噩.", "success");
      } catch(error) {
        console.error("settings logout failed", error);
        try { await fallbackLogout(); notify("鬲賲 鬲爻噩賷賱 丕賱禺乇賵噩 亘毓丿 廿毓丕丿丞 囟亘胤 丕賱噩賱爻丞.", "success"); }
        catch(e){ notify("鬲毓匕乇 鬲爻噩賷賱 丕賱禺乇賵噩: " + txt(e && e.message || e), "error"); }
      } finally {
        try { btn.disabled = false; } catch(_) {}
      }
      return false;
    };
    return true;
  }

  function cleanup(){
    ensureStyle();
    const removedFinal = removeFinalCheckButtons();
    const role = fixRoleCardPlacement();
    const logout = bindLogout();
    window.__hesabiSettingsFinalCleanup121Last = { ok:true, version:VERSION, build:BUILD_CODE, tab:currentSettingsTab(), removedFinal, role, logout, at:Date.now() };
    return window.__hesabiSettingsFinalCleanup121Last;
  }

  function schedule(){
    setTimeout(cleanup, 0);
    setTimeout(cleanup, 120);
    setTimeout(cleanup, 450);
  }

  function wrap(){
    const w = window.__hesabiSettingsFinalCleanup121Wrapped || {};
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
    window.__hesabiSettingsFinalCleanup121Wrapped = w;
  }

  function selfCheck(){
    cleanup();
    const page = byId("page_settings");
    const tab = currentSettingsTab();
    const finalButtons = page ? qsa("button", page).filter(function(b){ return txt(b.textContent).trim() === "賮丨氐 賳賴丕卅賷" || b.id === "settingsFinalCacheCheck"; }).length : 0;
    const roleCard = byId("hesabiRoleSettings115");
    const roleVisibleWrongTab = !!(roleCard && tab !== "account" && page && page.contains(roleCard));
    return {
      ok: finalButtons === 0 && !roleVisibleWrongTab,
      version: VERSION,
      build: BUILD_CODE,
      tab,
      finalButtons,
      hasRoleCard: !!roleCard,
      roleVisibleWrongTab,
      hasLogoutButton: !!byId("settingsLogout"),
      last: window.__hesabiSettingsFinalCleanup121Last || null,
      checkedAt: new Date().toISOString()
    };
  }

  ensureStyle();
  wrap();
  schedule();
  try { new MutationObserver(function(){ schedule(); }).observe(document.documentElement, { childList:true, subtree:true }); } catch(_) {}

  window.hesabiSettingsFinalCleanup = { version:VERSION, build:BUILD_CODE, cleanup, selfCheck };
  window.hesabiSettingsFinalCleanupSelfCheck = selfCheck;
})();