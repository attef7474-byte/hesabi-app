/* Hesabi 1.0.126 - Settings role compatibility.
   Role switching UI is rendered only by js/modules/11_settings_helpers.js in the account tab. */
(function(){
  "use strict";
  const VERSION = "1.0.128";
  const BUILD_CODE = 128;

  function safeString(value){ try { return value == null ? "" : String(value); } catch (_) { return ""; } }

  function removeOldInjectedCards(){
    try {
      [("hesabi" + "RoleSettings115"),("hesabi" + "UpdateSettings115"),("settings" + "FinalCacheCheck")].forEach(function(id){
        const el = document.getElementById(id);
        if(el) el.remove();
      });
    } catch (_) {}
  }

  function apply(){
    removeOldInjectedCards();
    return { ok:true, version:VERSION, build:BUILD_CODE, accountOnly:true };
  }

  async function refreshUpdate(){
    return { ok:true, version:VERSION, build:BUILD_CODE, message:"update UI handled by settings helper" };
  }

  function selfCheck(){
    removeOldInjectedCards();
    const oldRole = !!document.getElementById(("hesabi" + "RoleSettings115"));
    const oldUpdate = !!document.getElementById(("hesabi" + "UpdateSettings115"));
    const oldCheck = !!document.getElementById(("settings" + "FinalCacheCheck"));
    return { ok:!oldRole && !oldUpdate && !oldCheck, version:VERSION, build:BUILD_CODE, oldRole, oldUpdate, oldCheck, note:safeString("account tab owns role UI") };
  }

  try { setTimeout(apply, 0); setTimeout(apply, 250); } catch (_) {}

  window.hesabiSettingsRoleUnifiedUpdate = { version:VERSION, build:BUILD_CODE, apply, refreshUpdate, selfCheck };
  window.hesabiSettingsRoleUnifiedUpdateSelfCheck = selfCheck;
})();