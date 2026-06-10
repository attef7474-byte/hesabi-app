/* Hesabi 1.0.116 - SMS auth no-hang guard.
   Web UI/Auth binding hotfix only.
   Goal: the "جاري إرسال الكود..." button must never remain stuck forever.
   No Firestore write logic is changed. */
(function(){
  "use strict";

  const VERSION = "1.0.116";
  const BUILD_CODE = 116;
  const TIMEOUT_MS = 45000;

  function byId(id){ try { return document.getElementById(id); } catch(_) { return null; } }
  function safeString(v){ try { return v == null ? "" : String(v); } catch(_) { return ""; } }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); else console.log(text); } catch(_) {} }

  function toInternationalFallback(raw){
    const v = safeString(raw).trim();
    if(!v) return "";
    try {
      if(typeof toInternationalPhone === "function") return toInternationalPhone(v);
    } catch(_) {}
    let digits = v.replace(/[^\d+]/g, "");
    if(digits.startsWith("+")) return digits;
    digits = digits.replace(/\D/g, "");
    if(digits.startsWith("967")) return "+" + digits;
    if(digits.startsWith("0")) return "+967" + digits.slice(1);
    if(digits.length >= 7 && digits.length <= 10) return "+967" + digits;
    return "+" + digits;
  }

  function normalizePhoneFallback(raw){
    try {
      if(typeof normalizePhone === "function") return normalizePhone(raw);
    } catch(_) {}
    return safeString(raw).replace(/\D/g, "");
  }

  function friendly(error){
    const code = safeString(error && error.code);
    const message = safeString(error && (error.message || error));
    if(code.includes("captcha-check-failed")) return "فشل تحقق reCAPTCHA. أغلق التطبيق وافتحه ثم حاول مرة أخرى.";
    if(code.includes("invalid-phone-number")) return "رقم الهاتف غير صحيح. استخدم الصيغة الدولية مثل +967771749776.";
    if(code.includes("too-many-requests")) return "تم إرسال محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";
    if(code.includes("network-request-failed")) return "فشل الاتصال بالإنترنت أو Firebase. تحقق من الشبكة.";
    if(code.includes("quota-exceeded")) return "تم تجاوز حد رسائل SMS في Firebase.";
    if(message.includes("timeout") || message.includes("انتهت مهلة")) return "انتهت مهلة إرسال كود SMS. تحقق من الإنترنت أو إعدادات Firebase Phone Auth ثم حاول مرة أخرى.";
    return message || "تعذر إرسال كود التحقق.";
  }

  function withTimeout(promise, ms, label){
    return Promise.race([
      promise,
      new Promise(function(_, reject){
        setTimeout(function(){ reject(new Error(label || "انتهت المهلة")); }, ms);
      })
    ]);
  }

  function setSmsBusySafe(kind, busy){
    try {
      if(typeof setSmsBusy === "function") {
        setSmsBusy(kind, busy);
        return;
      }
    } catch(_) {}
    const send = byId("sendSmsCodeBtn");
    const verify = byId("verifySmsCodeBtn");
    if(send){
      send.disabled = !!busy;
      send.textContent = busy ? "جاري إرسال الكود..." : "إرسال كود التحقق";
    }
    if(verify){
      verify.disabled = !!busy;
    }
  }

  async function clearRecaptcha(){
    try { await recaptchaVerifier?.clear?.(); } catch(_) {}
    try { recaptchaVerifier = null; } catch(_) {}
    const holder = byId("recaptcha-container");
    if(holder) holder.innerHTML = "";
  }

  function ensureRecaptchaSafe(){
    if(typeof ensureRecaptcha === "function"){
      return ensureRecaptcha();
    }
    if(typeof RecaptchaVerifier === "undefined") throw new Error("RecaptchaVerifier غير متاحة");
    if(typeof auth === "undefined" || !auth) throw new Error("Firebase Auth غير جاهز");
    try {
      if(recaptchaVerifier) return recaptchaVerifier;
    } catch(_) {}
    recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size:"invisible" });
    return recaptchaVerifier;
  }

  async function sendSmsCodeNoHang(){
    const input = byId("smsPhone");
    const send = byId("sendSmsCodeBtn");
    const raw = (input && input.value || "").trim();
    const phone = toInternationalFallback(raw);
    const phoneKey = normalizePhoneFallback(raw);

    if(input && phone) input.value = phone;
    if(!phoneKey || phoneKey.length < 7 || !phone.startsWith("+")){
      notify("أدخل رقم الهاتف بصيغة صحيحة مثل +967771749776", "error");
      return false;
    }

    try {
      if(send && send.__smsSendingNow) return false;
      if(send) send.__smsSendingNow = true;
      setSmsBusySafe("send", true);
      notify("جاري إرسال كود التحقق...", "notice");

      await clearRecaptcha();
      const verifier = ensureRecaptchaSafe();
      if(typeof signInWithPhoneNumber !== "function") throw new Error("signInWithPhoneNumber غير متاحة");

      const result = await withTimeout(
        signInWithPhoneNumber(auth, phone, verifier),
        TIMEOUT_MS,
        "انتهت مهلة إرسال كود SMS"
      );

      phoneConfirmationResult = result;
      state.pendingSmsPhone = phone;
      state.pendingSmsPhoneKey = phoneKey;
      if(typeof save === "function") save();

      notify("تم إرسال كود التحقق إلى " + phone, "success");
      setTimeout(function(){ try { byId("smsCode")?.focus(); } catch(_) {} }, 250);
      return true;
    } catch(error) {
      console.error("SMS send failed or timed out", error);
      await clearRecaptcha();
      notify("تعذر إرسال كود التحقق: " + friendly(error), "error");
      return false;
    } finally {
      if(send) send.__smsSendingNow = false;
      setSmsBusySafe("send", false);
    }
  }

  function bindSmsNoHang(){
    const send = byId("sendSmsCodeBtn");
    if(!send) return false;
    send.disabled = false;
    if(send.textContent && /جاري إرسال/.test(send.textContent)) send.textContent = "إرسال كود التحقق";
    if(send.__hesabiSmsNoHangBound) return true;
    send.__hesabiSmsNoHangBound = true;
    send.dataset.bound = "1";
    send.onclick = function(ev){
      try { ev && ev.preventDefault && ev.preventDefault(); } catch(_) {}
      sendSmsCodeNoHang();
      return false;
    };
    const phone = byId("smsPhone");
    if(phone && !phone.__hesabiSmsNoHangEnter){
      phone.__hesabiSmsNoHangEnter = true;
      phone.addEventListener("keydown", function(ev){
        if(ev.key === "Enter"){
          ev.preventDefault();
          sendSmsCodeNoHang();
        }
      });
    }
    return true;
  }

  function scheduleBind(){
    setTimeout(bindSmsNoHang, 0);
    setTimeout(bindSmsNoHang, 250);
    setTimeout(bindSmsNoHang, 900);
  }

  function wrapRenderers(){
    const w = window.__hesabiSmsNoHang116Wrapped || {};
    if(typeof render === "function" && !w.render){
      const base = render;
      render = function(){ const out = base.apply(this, arguments); scheduleBind(); return out; };
      w.render = true;
    }
    if(typeof bindSmsAuthButtons === "function" && !w.bindSmsAuthButtons){
      const base = bindSmsAuthButtons;
      bindSmsAuthButtons = function(){ const out = base.apply(this, arguments); scheduleBind(); return out; };
      w.bindSmsAuthButtons = true;
    }
    if(typeof bindAuthButtons === "function" && !w.bindAuthButtons){
      const base = bindAuthButtons;
      bindAuthButtons = function(){ const out = base.apply(this, arguments); scheduleBind(); return out; };
      w.bindAuthButtons = true;
    }
    window.__hesabiSmsNoHang116Wrapped = w;
  }

  function selfCheck(){
    const send = byId("sendSmsCodeBtn");
    const ok = !!send && typeof send.onclick === "function";
    return {
      ok,
      version: VERSION,
      build: BUILD_CODE,
      hasSendButton: !!send,
      text: send ? send.textContent : "",
      disabled: send ? !!send.disabled : null,
      checkedAt: new Date().toISOString()
    };
  }

  wrapRenderers();
  scheduleBind();
  try { new MutationObserver(function(){ scheduleBind(); }).observe(document.documentElement, { childList:true, subtree:true }); } catch(_) {}

  window.hesabiSmsAuthNoHang = { version:VERSION, build:BUILD_CODE, bindSmsNoHang, sendSmsCodeNoHang, selfCheck };
  window.hesabiSmsAuthNoHangSelfCheck = selfCheck;
})();
