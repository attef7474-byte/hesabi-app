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
    if(send){ send.disabled = !!busy; send.textContent = busy ? (kind === "verify" ? "噩丕乇賷 丕賱鬲丨賯賯..." : "噩丕乇賷 廿乇爻丕賱 丕賱賰賵丿...") : "廿乇爻丕賱 賰賵丿 丕賱鬲丨賯賯"; }
    if(verify){ verify.disabled = !!busy; }
  }
  function friendly(error){
    const m = safeString(error && (error.message || error));
    if(m.includes("app") && m.includes("authorized")) return "鬲兀賰丿 賲賳 廿囟丕賮丞 SHA-1 賵 SHA-256 賮賷 Firebase 賱賱鬲胤亘賷賯 com.hesabi.app 賵鬲賳夭賷賱 google-services.json 丕賱噩丿賷丿.";
    if(m) return m;
    return "鬲毓匕乇 鬲賳賮賷匕 鬲爻噩賷賱 SMS 丕賱兀氐賱賷.";
  }
  function waitNativeCodeSent(phone){
    if(pendingSend && pendingSend.reject) { try { pendingSend.reject(new Error("鬲賲 亘丿亍 胤賱亘 SMS 噩丿賷丿.")); } catch(_) {} }
    return new Promise(function(resolve, reject){
      const timer = setTimeout(function(){ if(pendingSend && pendingSend.reject === reject) pendingSend = null; reject(new Error("丕賳鬲賴鬲 賲賴賱丞 Android Native SMS. 鬲丨賯賯 賲賳 Firebase 兀賵 丕賱卮亘賰丞.")); }, TIMEOUT_MS);
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
    if(type === "sending") { notify(message || "噩丕乇賷 廿乇爻丕賱 賰賵丿 丕賱鬲丨賯賯 毓亘乇 Android...", "notice"); return; }
    if(type === "autoCompleted") {
      const smsCode = safeString(data && data.smsCode).replace(/\D/g, "");
      if(smsCode && byId("smsCode")) byId("smsCode").value = smsCode;
      notify(message || "鬲賲 丕賱鬲賯丕胤 賰賵丿 SMS 鬲賱賯丕卅賷賸丕.", smsCode ? "success" : "notice");
      return;
    }
    if(type === "codeSent") {
      if(pendingSend){ clearTimeout(pendingSend.timer); const resolve = pendingSend.resolve; pendingSend = null; resolve(data || {}); }
      return;
    }
    if(type === "failed") {
      if(pendingSend){ clearTimeout(pendingSend.timer); const reject = pendingSend.reject; pendingSend = null; reject(new Error(message || "賮卮賱 廿乇爻丕賱 賰賵丿 SMS 丕賱兀氐賱賷.")); }
      else { notify(message || "賮卮賱 廿乇爻丕賱 賰賵丿 SMS 丕賱兀氐賱賷.", "error"); }
    }
  };

  async function sendSmsNative(){
    const input = byId("smsPhone");
    const raw = (input && input.value || "").trim();
    const phone = toInternationalSafe(raw);
    const phoneKey = normalizePhoneSafe(raw);
    if(input && phone) input.value = phone;
    if(!phoneKey || phoneKey.length < 7 || !phone.startsWith("+")){
      notify("兀丿禺賱 乇賯賲 丕賱賴丕鬲賮 亘氐賷睾丞 氐丨賷丨丞 賲孬賱 +967771749776", "error");
      return false;
    }
    if(!nativeAvailable()){
      if(previousSendClick) return previousSendClick.call(byId("sendSmsCodeBtn"));
      if(window.hesabiSmsAuthNoHang && typeof window.hesabiSmsAuthNoHang.sendSmsCodeNoHang === "function") return window.hesabiSmsAuthNoHang.sendSmsCodeNoHang();
      notify("鬲爻噩賷賱 SMS 丕賱兀氐賱賷 睾賷乇 賲鬲丕丨 賮賷 賴匕丕 APK. 孬亘賾鬲 廿氐丿丕乇 1.0.119 兀賵 兀丨丿孬.", "error");
      return false;
    }
    try{
      setSmsBusySafe("send", true);
      notify("噩丕乇賷 廿乇爻丕賱 賰賵丿 丕賱鬲丨賯賯 毓亘乇 Android Native Auth...", "notice");
      const result = await waitNativeCodeSent(phone);
      const verificationId = safeString(result && result.verificationId);
      if(!verificationId) throw new Error("賱賲 賷乇噩毓 Android verificationId 賲賳 Firebase.");
      state.pendingSmsPhone = phone;
      state.pendingSmsPhoneKey = phoneKey;
      state.nativeSmsVerificationId = verificationId;
      state.authProvider = "phone-native-pending";
      if(typeof save === "function") save();
      notify("鬲賲 廿乇爻丕賱 賰賵丿 丕賱鬲丨賯賯 廿賱賶 " + phone, "success");
      setTimeout(function(){ try { byId("smsCode")?.focus(); } catch(_) {} }, 250);
      return true;
    } catch(error){ console.error("Native SMS send failed", error); notify("鬲毓匕乇 廿乇爻丕賱 賰賵丿 丕賱鬲丨賯賯: " + friendly(error), "error"); return false; }
    finally { setSmsBusySafe("send", false); }
  }

  async function verifySmsNative(){
    const verificationId = safeString(state && state.nativeSmsVerificationId);
    if(!verificationId){ if(previousVerifyClick) return previousVerifyClick.call(byId("verifySmsCodeBtn")); notify("丕囟睾胤 兀賵賱賸丕 毓賱賶 廿乇爻丕賱 賰賵丿 丕賱鬲丨賯賯", "error"); return false; }
    const code = safeString(byId("smsCode") && byId("smsCode").value).replace(/\D/g, "");
    if(code.length !== 6){ notify("兀丿禺賱 賰賵丿 丕賱鬲丨賯賯 丕賱賲賰賵賳 賲賳 6 兀乇賯丕賲", "error"); return false; }
    try{
      setSmsBusySafe("verify", true);
      if(typeof PhoneAuthProvider === "undefined" || typeof signInWithCredential !== "function") throw new Error("Firebase Web Auth 睾賷乇 噩丕賴夭 賱廿賰賲丕賱 鬲丨賯賯 SMS.");
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
      notify(state.profileDone ? "鬲賲 丕賱鬲丨賯賯 賲賳 乇賯賲 丕賱賴丕鬲賮 賵丕爻鬲乇噩丕毓 丨爻丕亘賰 亘賳噩丕丨" : "鬲賲 丕賱鬲丨賯賯 賲賳 乇賯賲 丕賱賴丕鬲賮. 丕禺鬲乇 賳賵毓 丕賱丨爻丕亘 兀賵 丕爻鬲乇噩毓 丨爻丕亘賰 丕賱爻丕亘賯.", "success");
      if(typeof render === "function") render();
      return true;
    } catch(error){ console.error("Native SMS verify failed", error); notify("賰賵丿 丕賱鬲丨賯賯 睾賷乇 氐丨賷丨 兀賵 賲賳鬲賴賷: " + (typeof friendlyAuthError === "function" ? friendlyAuthError(error) : friendly(error)), "error"); return false; }
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