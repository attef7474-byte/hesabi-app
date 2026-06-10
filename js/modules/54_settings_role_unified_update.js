/* Hesabi 1.0.122 - Settings role module retired from DOM injection.
   Root settings cleanup: role switch UI is now rendered only by 11_settings_helpers.js in the account tab. */
(function(){
  "use strict";
  const VERSION = "1.0.122";
  const BUILD_CODE = 122;
  function byId(id){ try { return document.getElementById(id); } catch(_) { return null; } }
  function removeLegacyRoleCards(){
    try {
      const settings = byId("page_settings");
      const activeTab = (typeof pageTabState === "function") ? pageTabState("settings", "security") : ((typeof state === "object" && state && state.settingsTab) || "security");
      const allowAccount = String(activeTab || "security") === "account";
      ["hesabiRoleSettings115"].forEach(function(id){ const el = byId(id); if(el) el.remove(); });
      if(settings && !allowAccount){
        const card = byId("settingsAccountRoleCard");
        if(card) card.remove();
      }
    } catch(_) {}
  }
  function apply(){ removeLegacyRoleCards(); return { ok:true, version:VERSION, build:BUILD_CODE, injected:false, accountOnly:true }; }
  function refreshUpdate(){ return Promise.resolve({ ok:true, retired:true, version:VERSION, build:BUILD_CODE }); }
  function selfCheck(){
    apply();
    return { ok: !byId("hesabiRoleSettings115"), version:VERSION, build:BUILD_CODE, retired:true, injected:false, accountOnly:true, checkedAt:new Date().toISOString() };
  }
  try { setTimeout(apply, 0); setTimeout(apply, 250); } catch(_) {}
  window.hesabiSettingsRoleUnifiedUpdate = { version:VERSION, build:BUILD_CODE, apply, refreshUpdate, selfCheck, retired:true };
  window.hesabiSettingsRoleUnifiedUpdateSelfCheck = selfCheck;
})();
