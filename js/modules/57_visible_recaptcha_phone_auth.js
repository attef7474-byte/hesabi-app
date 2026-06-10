/* Hesabi 1.0.117 - Visible reCAPTCHA fallback for Firebase Phone Auth.
   Web UI/Auth hotfix only. No Firestore write logic is changed.
   Reason: Android WebView may hang on invisible reCAPTCHA; use a visible widget and pre-render it. */
(function(){
  "use strict";

  const VERSION = "1.0.117";
  const BUILD_CODE = 117;

  function byId(id){ try { return document.getElementById(id); } catch(_) { return null; } }
  function safeString(v){ try { return v == null ? "" : String(v); } catch(_) { return ""; } }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); else console.log(text); } catch(_) {} }

  function ensureStyle(){
    if(byId("hesabiVisibleRecaptcha117Style")) return true;
    const style = document.createElement("style");
    style.id = "hesabiVisibleRecaptcha117Style";
    style.textContent = `
      #recaptcha-container{
        display:flex!important;
        justify-content:center!important;
        align-items:center!important;
        min-height:86px!important;
        margin:8px 0!important;
        overflow:visible!important;
        position:relative!important;
        z-index:5!important;
      }
      #recaptcha-container:empty{
        min-height:0!important;
        margin:0!important;
      }
      .hesabi-recaptcha-hint{
        border:1px dashed #99f6e4;
        background:#f0fdfa;
        color:#115e59;
        border-radius:14px;
        padding:9px;
        font-size:12px;
        font-weight:800;
        line-height:1.6;
        margin:6px 0;
        text-align:center;
      }
    `;
    document.head.appendChild(style);
    return true;
  }

  function recaptchaContainer(){
    let box = byId("recaptcha-container");
    const smsBox = byId("smsAuthBox");
    if(!box && smsBox){
      box = document.createElement("div");
      box.id = "recaptcha-container";
      const send = byId("sendSmsCodeBtn");
      if(send && send.parentNode) send.parentNode.insertBefore(box, send.nextSibling);
      else smsBox.appendChild(box);
    }
    return box;
  }

  function addHint(){
    const box = recaptchaContainer();
    if(!box) return;
    if(byId("hesabiRecaptchaHint117")) return;
    const hint = document.createElement("div");
    hint.id = "hesabiRecaptchaHint117";
    hint.className = "hesabi-recaptcha-hint";
    hint.textContent = "إذا ظهر تحقق reCAPTCHA، أكمله أولًا ثم اضغط إرسال كود التحقق.";
    box.parentNode && box.parentNode.insertBefore(hint, box);
  }

  async function clearVerifier(){
    try { await recaptchaVerifier?.clear?.(); } catch(_) {}
    try { recaptchaVerifier = null; } catch(_) {}
    try { window.recaptchaWidgetId = null; } catch(_) {}
    const box = recaptchaContainer();
    if(box) box.innerHTML = "";
  }

  function buildVisibleVerifier(){
    ensureStyle();
    const box = recaptchaContainer();
    if(!box) throw new Error("recaptcha-container غير موجود");
    if(typeof auth !== "undefined" && auth){
      try { auth.languageCode = "ar"; } catch(_) {}
    }
    if(typeof RecaptchaVerifier === "undefined") throw new Error("RecaptchaVerifier غير متاحة");
    if(typeof auth === "undefined" || !auth) throw new Error("Firebase Auth غير جاهز");

    addHint();
    box.innerHTML = "";
    recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "normal",
      callback: function(){
        notify("تم تحقق reCAPTCHA، اضغط إرسال كود التحقق.", "success");
      },
      "expired-callback": function(){
        notify("انتهت صلاحية reCAPTCHA. أعد التحقق ثم حاول مرة أخرى.", "notice");
        try { window.recaptchaWidgetId = null; } catch(_) {}
      }
    });
    return recaptchaVerifier;
  }

  function ensureVisibleRecaptcha(){
    try {
      if(recaptchaVerifier) return recaptchaVerifier;
    } catch(_) {}
    return buildVisibleVerifier();
  }

  async function renderVisibleRecaptcha(){
    try {
      ensureStyle();
      const verifier = ensureVisibleRecaptcha();
      if(verifier && typeof verifier.render === "function"){
        const id = await verifier.render();
        try { window.recaptchaWidgetId = id; } catch(_) {}
        return id;
      }
    } catch(error) {
      console.error("visible recaptcha render failed", error);
      notify("تعذر تحميل reCAPTCHA: " + safeString(error && error.message || error), "error");
      return null;
    }
    return null;
  }

  function patchEnsureRecaptcha(){
    try {
      ensureRecaptcha = function(){
        return ensureVisibleRecaptcha();
      };
      window.ensureRecaptcha = ensureRecaptcha;
    } catch(_) {}
  }

  async function resetVisibleRecaptcha(){
    try {
      if(window.grecaptcha && window.recaptchaWidgetId != null){
        window.grecaptcha.reset(window.recaptchaWidgetId);
        return true;
      }
    } catch(_) {}
    await clearVerifier();
    await renderVisibleRecaptcha();
    return true;
  }

  function patchNoHangSender(){
    if(!window.hesabiSmsAuthNoHang || typeof window.hesabiSmsAuthNoHang.sendSmsCodeNoHang !== "function") return false;
    const base = window.hesabiSmsAuthNoHang.sendSmsCodeNoHang;
    if(base.__visibleRecaptcha117) return true;
    const wrapped = async function(){
      try {
        await renderVisibleRecaptcha();
      } catch(_) {}
      const result = await base.apply(this, arguments);
      if(!result) {
        try { await resetVisibleRecaptcha(); } catch(_) {}
      }
      return result;
    };
    wrapped.__visibleRecaptcha117 = true;
    window.hesabiSmsAuthNoHang.sendSmsCodeNoHang = wrapped;
    return true;
  }

  function bindSendButton(){
    const send = byId("sendSmsCodeBtn");
    if(!send) return false;
    addHint();
    renderVisibleRecaptcha();
    patchEnsureRecaptcha();

    // Keep the existing no-hang binding if present, but make sure the verifier is visible.
    if(window.hesabiSmsAuthNoHang && typeof window.hesabiSmsAuthNoHang.bindSmsNoHang === "function"){
      try { window.hesabiSmsAuthNoHang.bindSmsNoHang(); } catch(_) {}
      patchNoHangSender();
      return true;
    }

    return true;
  }

  function schedule(){
    setTimeout(bindSendButton, 0);
    setTimeout(bindSendButton, 250);
    setTimeout(bindSendButton, 1000);
  }

  function wrap(){
    const w = window.__hesabiVisibleRecaptcha117Wrapped || {};
    if(typeof render === "function" && !w.render){
      const base = render;
      render = function(){ const out = base.apply(this, arguments); schedule(); return out; };
      w.render = true;
    }
    if(typeof bindSmsAuthButtons === "function" && !w.bindSmsAuthButtons){
      const base = bindSmsAuthButtons;
      bindSmsAuthButtons = function(){ const out = base.apply(this, arguments); schedule(); return out; };
      w.bindSmsAuthButtons = true;
    }
    if(typeof bindAuthButtons === "function" && !w.bindAuthButtons){
      const base = bindAuthButtons;
      bindAuthButtons = function(){ const out = base.apply(this, arguments); schedule(); return out; };
      w.bindAuthButtons = true;
    }
    window.__hesabiVisibleRecaptcha117Wrapped = w;
  }

  function selfCheck(){
    ensureStyle();
    patchEnsureRecaptcha();
    const box = recaptchaContainer();
    const send = byId("sendSmsCodeBtn");
    return {
      ok: !!box && !!send,
      version: VERSION,
      build: BUILD_CODE,
      hasContainer: !!box,
      hasSendButton: !!send,
      hasVerifier: (function(){ try { return !!recaptchaVerifier; } catch(_) { return false; } })(),
      widgetId: (function(){ try { return window.recaptchaWidgetId ?? null; } catch(_) { return null; } })(),
      checkedAt: new Date().toISOString()
    };
  }

  ensureStyle();
  wrap();
  patchEnsureRecaptcha();
  schedule();
  try { new MutationObserver(function(){ schedule(); }).observe(document.documentElement, { childList:true, subtree:true }); } catch(_) {}

  window.hesabiVisibleRecaptchaPhoneAuth = {
    version: VERSION,
    build: BUILD_CODE,
    renderVisibleRecaptcha,
    resetVisibleRecaptcha,
    clearVerifier,
    bindSendButton,
    selfCheck
  };
  window.hesabiVisibleRecaptchaPhoneAuthSelfCheck = selfCheck;
})();
