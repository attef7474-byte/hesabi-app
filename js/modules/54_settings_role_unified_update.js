/* Hesabi 1.0.124 - Settings role/update legacy module disabled.
   Settings are now rendered only by js/modules/11_settings_helpers.js. */
(function(){
  "use strict";
  const VERSION = "1.0.124";
  const BUILD_CODE = 124;

  function apply(){ return { ok:true, version:VERSION, build:BUILD_CODE, disabled:true, reason:"settings-root-source" }; }
  function refreshUpdate(){ return Promise.resolve(apply()); }
  function selfCheck(){
    let roleCardOutsideAccount = false;
    let finalCheck = false;
    try {
      const root = document.getElementById("page_settings");
      if(root){
        finalCheck = !!root.querySelector(".settings-final-check");
        const card = root.querySelector("#hesabiRoleSettings115");
        roleCardOutsideAccount = !!card;
      }
    } catch (_) {}
    return { ok:!roleCardOutsideAccount && !finalCheck, version:VERSION, build:BUILD_CODE, disabled:true, roleCardOutsideAccount, finalCheck };
  }

  window.hesabiSettingsRoleUnifiedUpdate = { version:VERSION, build:BUILD_CODE, apply, refreshUpdate, selfCheck, disabled:true };
  window.hesabiSettingsRoleUnifiedUpdateSelfCheck = selfCheck;
})();
