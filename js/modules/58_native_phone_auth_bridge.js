/* Hesabi 1.0.119 - Native Firebase Android Phone Auth bridge.
   Uses Android Firebase Auth to send SMS without relying on WebView reCAPTCHA.
   The Web Firebase SDK still completes sign-in using the native verificationId + user code. */
(function(){
  "use strict";

  const VERSION = "1.0.119";
  const BUILD_CODE = 119;
  const TIMEOUT_MS = 70000;
  let pendingSend = null;
  let previousSendClick = null;
  let previousVerifyClick = null;

  function byId(id){ try { return document.getElementById(id); } catch(_) { return null; } }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); else console.log(text); } catch(_) {} }
  function safeString(v){ try { return v == null ? "" : String(v); } catch(_) { return ""; } }
  function normalizePhoneSafe(raw){ try { if(typeof normalizePhone === "function") return normalizePhone(raw); } catch(_) {} return safeString(raw).replace(/\D/g, ""); }
  function toInternationalSafe(raw){
    try { if(typeof toInternationalPhone === "function") return toInternationalPhone(raw); } catch(_) {}
    let v = safeString(raw).trim().replace(/[^\d+]/g, "");
    if(v.startsWith("+")) return v;
    let d = v.replace(/\D/g, "");
    if(d.startsWith("967")) return "+" + d;
    if(d.startsWith("0")) return "+967" + d.slice(1);
    if(d.length >= 7 && d.length <= 10) return "+967" + d;
    return "+" + d;
  }
  function nativeAvailable(){
    try { return !!(window.HesabiAndroid && typeof window.HesabiAndroid.sendNativeSmsCode === "function"); } catch(_) { return false; }
  }
  function setSmsBusySafe(kind, busy){
    try { if(typeof setSmsBusy === "function") { setSmsBusy(kind, busy); return; } } catch(_) {}
    const send = byId("sendSmsCodeBtn"), verify = byId("verifySmsCodeBtn");
    if(send){ send.disabled = !!busy; send.textContent = busy ? (kind === "verify" ? "جاري التحقق..." : "جاري إرسال كود التحقق...") : "إرسال كود التحقق"; }
    if(verify){ verify.disabled = !!busy; }
  }
  function friendly(error){
    const m = safeString(error && (error.message || error));
    if(m.includes("app") && m.includes("authorized")) return "تأكد من إضافة SHA-1 و SHA-256 في Firebase لتطبيق com.hesabi.app وتحديث ملف google-services.json الجديد.";
    if(m) return m;
    return "تعذر إرسال رمز التحقق SMS الخاص بك.";
  }
  function waitNativeCodeSent(phone){
    if(pendingSend && pendingSend.reject) { try { pendingSend.reject(new Error("هناك طلب SMS جديد.")); } catch(_) {} }
    return new Promise(function(resolve, reject){
      const timer = setTimeout(function(){ if(pendingSend && pendingSend.reject === reject) pendingSend = null; reject(new Error("انتهت مهلة Android Native SMS. حاول استخدام رمز reCAPTCHA العادي.")); }, TIMEOUT_MS);
      pendingSend = { phone, resolve, reject, timer };
      try { window.HesabiAndroid.sendNativeSmsCode(phone); }
      catch(error){ clearTimeout(timer); pendingSend = null; reject(error); }
    });
  }

  window.hesabiReceiveNativeSmsAuth = function(payload){
    let data = payload;
    try { if(typeof payload === "string") data = JSON.parse(payload); } catch(_) { data = { type:"failed", message:String(payload||"") }; }
    const type = safeString(data && data.type);
    const message = safeString(data && data.message);
    if(type === "sending") { notify(message || "جاري إرسال كود التحقق عبر Android...", "notice"); return; }
    if(type === "autoCompleted") {
      const smsCode = safeString(data && data.smsCode).replace(/\D/g, "");
      if(smsCode && byId("smsCode")) byId("smsCode").value = smsCode;
      notify(message || "تم تلقي كود التحقق SMS تلقائيًا.", smsCode ? "success" : "notice");
      return;
    }
    if(type === "codeSent") {
      if(pendingSend){ clearTimeout(pendingSend.timer); const resolve = pendingSend.resolve; pendingSend = null; resolve(data || {}); }
      return;
    }
    if(type === "failed") {
      if(pendingSend){ clearTimeout(pendingSend.timer); const reject = pendingSend.reject; pendingSend = null; reject(new Error(message || "تعذر إرسال كود التحقق SMS الخاص بك.")); }
      else { notify(message || "تعذر إرسال كود التحقق SMS الخاص بك.", "error"); }
    }
  };

  async function sendSmsNative(){
    const input = byId("smsPhone");
    const raw = (input && input.value || "").trim();
    const phone = toInternationalSafe(raw);
    const phoneKey = normalizePhoneSafe(raw);
    if(input && phone) input.value = phone;
    if(!phoneKey || phoneKey.length < 7 || !phone.startsWith("+")){
      notify("أدخل رقم الهاتف بصيغة صحيحة مثل +967771749776", "error");
      return false;
    }
    if(!nativeAvailable()){
      if(previousSendClick) return previousSendClick.call(byId("sendSmsCodeBtn"));
      if(window.hesabiSmsAuthNoHang && typeof window.hesabiSmsAuthNoHang.sendSmsCodeNoHang === "function") return window.hesabiSmsAuthNoHang.sendSmsCodeNoHang();
      notify("رمز التحقق SMS الخاص بك غير متاح خارج الـ APK. حدث الإصدار إلى 1.0.119 أو أعلى.", "error");
      return false;
    }
    try{
      setSmsBusySafe("send", true);
      notify("جاري إرسال كود التحقق عبر Android Native Auth...", "notice");
      const result = await waitNativeCodeSent(phone);
      const verificationId = safeString(result && result.verificationId);
      if(!verificationId) throw new Error("لم نحصل على Android verificationId من Firebase.");
      state.pendingSmsPhone = phone;
      state.pendingSmsPhoneKey = phoneKey;
      state.nativeSmsVerificationId = verificationId;
      state.authProvider = "phone-native-pending";
      if(typeof save === "function") save();
      notify("تم إرسال كود التحقق إلى " + phone, "success");
      setTimeout(function(){ try { byId("smsCode")?.focus(); } catch(_) {} }, 250);
      return true;
    } catch(error){ console.error("Native SMS send failed", error); notify("تعذر إرسال كود التحقق: " + friendly(error), "error"); return false; }
    finally { setSmsBusySafe("send", false); }
  }

  async function verifySmsNative(){
    const verificationId = safeString(state && state.nativeSmsVerificationId);
    if(!verificationId){ if(previousVerifyClick) return previousVerifyClick.call(byId("verifySmsCodeBtn")); notify("لم يتم حفظ معلومات إرسال كود التحقق", "error"); return false; }
    const code = safeString(byId("smsCode") && byId("smsCode").value).replace(/\D/g, "");
    if(code.length !== 6){ notify("أدخل كود التحقق المكون من 6 أرقام", "error"); return false; }
    try{
      setSmsBusySafe("verify", true);
      if(typeof PhoneAuthProvider === "undefined" || typeof signInWithCredential !== "function") throw new Error("Firebase Web Auth غير متاح للتحقق من كود SMS.");
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const cred = await signInWithCredential(auth, credential);
      currentUser = cred.user;
      authReady = true;
      state.uid = cred.user.uid;
      state.authPhoneNumber = cred.user.phoneNumber || state.pendingSmsPhone || "";
      state.authPhoneKey = state.pendingSmsPhoneKey || normalizePhoneSafe(state.authPhoneNumber || "");
      state.authProvider = "phone-native";
      delete state.pendingSmsPhone;
      delete state.pendingSmsPhoneKey;
      delete state.nativeSmsVerificationId;
      if(typeof save === "function") save();
      phoneConfirmationResult = null;
      if(typeof afterSuccessfulAuthLogin === "function") await afterSuccessfulAuthLogin();
      notify(state.profileDone ? "تم تسجيل الدخول برقم الهاتف وتوجيهك مباشر إلى حسابي التجاري" : "تم تسجيل الدخول برقم الهاتف. اكمل إعداد الحساب أو استرجاع حسابك التجاري السابق.", "success");
      if(typeof render === "function") render();
      return true;
    } catch(error){ console.error("Native SMS verify failed", error); notify("كود التحقق غير صحيح أو منتهي: " + (typeof friendlyAuthError === "function" ? friendlyAuthError(error) : friendly(error)), "error"); return false; }
    finally { setSmsBusySafe("verify", false); }
  }

  function bindNativeSms(){
    const send = byId("sendSmsCodeBtn");
    const verify = byId("verifySmsCodeBtn");
    if(send && !send.__hesabiNativeSms119Bound){ previousSendClick = send.onclick; send.__hesabiNativeSms119Bound = true; send.onclick = function(ev){ try { ev && ev.preventDefault && ev.preventDefault(); } catch(_) {} sendSmsNative(); return false; }; }
    if(verify && !verify.__hesabiNativeSms119Bound){ previousVerifyClick = verify.onclick; verify.__hesabiNativeSms119Bound = true; verify.onclick = function(ev){ try { ev && ev.preventDefault && ev.preventDefault(); } catch(_) {} verifySmsNative(); return false; }; }
    return !!(send || verify);
  }
  function scheduleBind(){ setTimeout(bindNativeSms,0); setTimeout(bindNativeSms,250); setTimeout(bindNativeSms,900); }
  function wrapRenderers(){
    const w = window.__hesabiNativeSms119Wrapped || {};
    if(typeof render === "function" && !w.render){ const base = render; render = function(){ const out = base.apply(this, arguments); scheduleBind(); return out; }; w.render = true; }
    if(typeof bindSmsAuthButtons === "function" && !w.bindSmsAuthButtons){ const base = bindSmsAuthButtons; bindSmsAuthButtons = function(){ const out = base.apply(this, arguments); scheduleBind(); return out; }; w.bindSmsAuthButtons = true; }
    if(typeof bindAuthButtons === "function" && !w.bindAuthButtons){ const base = bindAuthButtons; bindAuthButtons = function(){ const out = base.apply(this, arguments); scheduleBind(); return out; }; w.bindAuthButtons = true; }
    window.__hesabiNativeSms119Wrapped = w;
  }
  function selfCheck(){ return { ok:true, version:VERSION, build:BUILD_CODE, nativeAvailable:nativeAvailable(), hasReceiver:typeof window.hesabiReceiveNativeSmsAuth === "function", hasSendButton:!!byId("sendSmsCodeBtn"), hasVerifyButton:!!byId("verifySmsCodeBtn"), checkedAt:new Date().toISOString() }; }

  wrapRenderers();
  scheduleBind();
  try { new MutationObserver(function(){ scheduleBind(); }).observe(document.documentElement, { childList:true, subtree:true }); } catch(_) {}
  window.hesabiNativePhoneAuthBridge = { version:VERSION, build:BUILD_CODE, nativeAvailable, sendSmsNative, verifySmsNative, bindNativeSms, selfCheck };
  window.hesabiNativePhoneAuthBridgeSelfCheck = selfCheck;
})();