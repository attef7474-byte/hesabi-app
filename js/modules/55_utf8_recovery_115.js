/* Hesabi 1.0.115 - UTF-8 recovery marker. */
(function(){
  "use strict";
  const VERSION = "1.0.115";
  function selfCheck(){
    const arabicOk = "حسابي التجاري" === "\u062d\u0633\u0627\u0628\u064a \u0627\u0644\u062a\u062c\u0627\u0631\u064a";
    return { ok: arabicOk, version: VERSION, arabic: "حسابي التجاري", checkedAt: new Date().toISOString() };
  }
  window.hesabiUtf8Recovery115SelfCheck = selfCheck;
})();
