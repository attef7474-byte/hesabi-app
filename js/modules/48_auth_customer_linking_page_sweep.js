/* Hesabi 1.0.108 - Login + Customer Trader Linking Page Sweep.
   Scope: UI binding, mobile layout, explicit input normalization, My Stores rendering and diagnostics only.
   Existing Firebase/Auth/Firestore functions are called as-is; no write logic is changed. */
(function(){
  "use strict";
  const VERSION = "1.0.108";
  const BUILD_CODE = 108;

  function byId(id){ try { return document.getElementById(id); } catch (_) { return null; } }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch (_) { return []; } }
  function safeString(value){ try { return String(value == null ? "" : value); } catch (_) { return ""; } }
  function escSafe(value){
    try { return typeof esc === "function" ? esc(value == null ? "" : value) : safeString(value).replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch])); }
    catch (_) { return ""; }
  }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch (_) {} }
  function saveState(){ try { if(typeof save === "function") save(); } catch (_) {} }
  function now(){ try { return Date.now(); } catch (_) { return 0; } }
  function role(){ try { return state && state.role; } catch (_) { return ""; } }
  function isCustomerRole(){ return role() === "customer"; }
  function moneySafe(value){ try { return typeof money === "function" ? money(value) : new Intl.NumberFormat("ar-YE").format(Number(value || 0)); } catch (_) { return safeString(value || 0); } }

  function ensureStyle(){
    if(byId("authCustomerLinkingSweepStyle")) return;
    const style = document.createElement("style");
    style.id = "authCustomerLinkingSweepStyle";
    style.textContent = `
      #authSetup,#roleSetup,#profileSetup,#page_shops{max-width:100%;overflow-x:hidden;box-sizing:border-box;}
      #authSetup .form,#profileSetup .form{display:grid;gap:10px;}
      #authSetup .auth-tabs{display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;}
      #authSetup .auth-tab-btn{white-space:nowrap;min-width:max-content;}
      #roleSetup .setupChoice{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;}
      #roleSetup .bigChoice{min-height:86px;display:flex;flex-direction:column;justify-content:center;gap:6px;}
      #profileSetup .shop-code-input-row,.auth-linking-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
      #profileSetup .shop-code-input-row input,.auth-linking-row input{flex:1 1 180px;min-width:0;}
      #profileSetup .icon-mini-btn,.auth-linking-row .btn{min-width:max-content;}
      #profileSetup .selected-setup-shops,.auth-linking-selected{display:grid;gap:6px;}
      .auth-linking-table-wrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
      .auth-linking-table{width:100%;min-width:560px;}
      .auth-linking-actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
      .auth-linking-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;}
      .auth-linking-stat{border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:10px;background:rgba(255,255,255,.55);}
      .auth-linking-stat span{display:block;font-size:12px;opacity:.75;}
      .auth-linking-stat b{font-size:16px;}
      #authSetup .notice,#authSetup .mini-help,#roleSetup p.muted,#profileSetup .notice,#profileSetup .mini-help,#page_shops p.muted{display:none!important;}
      @media(max-width:640px){
        #authSetup .actions,.auth-linking-actions{width:100%;}
        #authSetup .actions .btn,.auth-linking-actions .btn{flex:1 1 auto;}
        .auth-linking-table{min-width:520px;}
      }
    `;
    try { document.head.appendChild(style); } catch (_) {}
  }

  function toInternationalSafe(value){
    try { return typeof toInternationalPhone === "function" ? toInternationalPhone(value) : safeString(value); }
    catch (_) { return safeString(value); }
  }
  function normalizePhoneSafe(value){
    try { return typeof normalizePhone === "function" ? normalizePhone(value) : safeString(value).replace(/\D/g, ""); }
    catch (_) { return safeString(value).replace(/\D/g, ""); }
  }
  function extractShopCodeSafe(value){
    const raw = safeString(value).trim().toUpperCase();
    try {
      if(typeof extractShopCodeFromText === "function") {
        const x = extractShopCodeFromText(raw);
        if(x) return safeString(x).trim().toUpperCase();
      }
    } catch (_) {}
    const match = raw.match(/SHOP[-_ ]?[A-Z0-9]{3,}/i);
    return match ? match[0].replace(/[ _]/g,"-").toUpperCase() : raw;
  }
  function bindEnter(input, fn){
    if(!input || input.__hesabiAuthLinkEnterBound) return;
    input.__hesabiAuthLinkEnterBound = true;
    input.addEventListener("keydown", function(ev){
      if(ev.key === "Enter"){
        ev.preventDefault();
        try { fn(); } catch(e){ notify(e && e.message || e, "error"); }
      }
    });
  }
  function normalizeShopInput(input){
    if(!input || input.__hesabiShopCodeNormalizeBound) return;
    input.__hesabiShopCodeNormalizeBound = true;
    input.addEventListener("blur", function(){ input.value = extractShopCodeSafe(input.value); });
    input.addEventListener("input", function(){
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.value = safeString(input.value).toUpperCase();
      try { input.setSelectionRange(start, end); } catch (_) {}
    });
  }
  function normalizeNumericCode(input){
    if(!input || input.__hesabiSmsCodeNormalizeBound) return;
    input.__hesabiSmsCodeNormalizeBound = true;
    input.addEventListener("input", function(){ input.value = safeString(input.value).replace(/\D/g, "").slice(0, 6); });
  }

  function clickElement(id){ const el = byId(id); if(el && typeof el.click === "function") el.click(); }
  function bindAuthNow(){
    ensureStyle();
    const root = byId("authSetup");
    if(!root) return { ok:false, reason:"auth setup missing" };
    try { root.setAttribute("dir", "rtl"); } catch (_) {}
    const smsTab = byId("smsAuthTab"), legacyTab = byId("legacyAuthTab");
    if(smsTab) smsTab.onclick = function(){ try { if(typeof setAuthMode === "function") setAuthMode("sms"); } catch(_){} };
    if(legacyTab) legacyTab.onclick = function(){ try { if(typeof setAuthMode === "function") setAuthMode("legacy"); } catch(_){} };
    const smsPhone = byId("smsPhone"), smsCode = byId("smsCode"), authPhone = byId("authPhone"), authPass = byId("authPass");
    if(smsPhone && !smsPhone.__hesabiAuthPhoneBlurBound){
      smsPhone.__hesabiAuthPhoneBlurBound = true;
      smsPhone.addEventListener("blur", function(){ const v = toInternationalSafe(smsPhone.value); if(v) smsPhone.value = v; });
    }
    if(authPhone && !authPhone.__hesabiLegacyPhoneBlurBound){
      authPhone.__hesabiLegacyPhoneBlurBound = true;
      authPhone.addEventListener("blur", function(){ const v = normalizePhoneSafe(authPhone.value); if(v) authPhone.value = v; });
    }
    normalizeNumericCode(smsCode);
    bindEnter(smsPhone, function(){ clickElement("sendSmsCodeBtn"); });
    bindEnter(smsCode, function(){ clickElement("verifySmsCodeBtn"); });
    bindEnter(authPhone, function(){ if(authPass) authPass.focus(); });
    bindEnter(authPass, function(){ clickElement("loginBtn"); });
    try { if(typeof bindAuthButtons === "function") bindAuthButtons(); } catch (_) {}
    window.__hesabiAuthSweepBound = { at:now(), sms:!!byId("smsAuthBox"), legacy:!!byId("legacyAuthBox"), buttons:{ send:!!byId("sendSmsCodeBtn"), verify:!!byId("verifySmsCodeBtn"), login:!!byId("loginBtn"), signup:!!byId("signupBtn") } };
    return Object.assign({ ok:true }, window.__hesabiAuthSweepBound);
  }

  function selectedSetupShops(){
    try { return typeof setupShopSelections === "function" ? setupShopSelections() : (Array.isArray(state && state.setupSelectedShops) ? state.setupSelectedShops : []); }
    catch (_) { return []; }
  }
  function addSetupShop(){
    const input = byId("joinShopId");
    const code = extractShopCodeSafe(input ? input.value : "");
    if(input) input.value = code;
    if(!code){ notify("أدخل كود التاجر", "error"); return false; }
    try {
      if(typeof setupAddShopSelection === "function") setupAddShopSelection(code, "", true);
      else {
        if(!Array.isArray(state.setupSelectedShops)) state.setupSelectedShops = [];
        if(!state.setupSelectedShops.some(function(x){ return x.shopId === code; })) state.setupSelectedShops.push({ shopId:code, shopName:code });
        saveState();
      }
      try { if(typeof renderSelectedSetupShops === "function") renderSelectedSetupShops(); } catch (_) {}
      return true;
    } catch(e){ notify(e && e.message || "تعذر إضافة المتجر", "error"); return false; }
  }
  function bindProfileNow(){
    ensureStyle();
    const root = byId("profileSetup");
    if(!root) return { ok:false, reason:"profile setup missing" };
    try { root.setAttribute("dir", "rtl"); } catch (_) {}
    const shopPhone = byId("shopPhone"), custPhone = byId("custPhone"), joinShop = byId("joinShopId"), search = byId("shopSearchQuery");
    [shopPhone, custPhone].forEach(function(input){
      if(input && !input.__hesabiVerifiedPhoneLockBound){ input.__hesabiVerifiedPhoneLockBound = true; input.readOnly = true; input.classList.add("locked-phone"); }
    });
    normalizeShopInput(joinShop);
    bindEnter(joinShop, function(){ addSetupShop(); });
    bindEnter(search, function(){ try { if(typeof setupSearchStores === "function") setupSearchStores(); } catch(e){ notify(e && e.message || e, "error"); } });
    const add = byId("setupAddStore"), searchBtn = byId("setupSearchStores"), scan = byId("setupScanShopQr"), stop = byId("setupStopQrScan"), join = byId("joinShop"), recover = byId("recoverCustomer"), create = byId("createShop"), recoverShop = byId("recoverShop");
    if(add) add.onclick = addSetupShop;
    if(searchBtn) searchBtn.onclick = function(){ try { if(typeof setupSearchStores === "function") setupSearchStores(); } catch(e){ notify(e && e.message || e, "error"); } };
    if(scan) scan.onclick = function(){ try { if(typeof setupStartQrScan === "function") setupStartQrScan(); } catch(e){ notify("تعذر فتح الكاميرا", "error"); } };
    if(stop) stop.onclick = function(){ try { if(typeof setupStopQrScan === "function") setupStopQrScan(); } catch(_){} };
    if(join) join.onclick = function(){ if(!selectedSetupShops().length) addSetupShop(); try { if(typeof joinShop === "function") joinShop(); } catch(e){ notify(e && e.message || e, "error"); } };
    if(recover) recover.onclick = function(){ try { if(typeof recoverCustomerByPhone === "function") recoverCustomerByPhone(); } catch(e){ notify(e && e.message || e, "error"); } };
    if(create) create.onclick = function(){ try { if(typeof createShop === "function") createShop(); } catch(e){ notify(e && e.message || e, "error"); } };
    if(recoverShop) recoverShop.onclick = function(){ try { if(typeof recoverShopByPhone === "function") recoverShopByPhone(); } catch(e){ notify(e && e.message || e, "error"); } };
    try { if(typeof renderSelectedSetupShops === "function") renderSelectedSetupShops(); } catch (_) {}
    window.__hesabiProfileSetupSweepBound = { at:now(), role:role(), buttons:{ add:!!add, search:!!searchBtn, join:!!join, recover:!!recover, create:!!create, recoverShop:!!recoverShop }, selected:selectedSetupShops().length };
    return Object.assign({ ok:true }, window.__hesabiProfileSetupSweepBound);
  }

  function links(){
    try { return Array.isArray(state.customerLinks) ? state.customerLinks : []; }
    catch (_) { return []; }
  }
  function switchShop(shopId){ try { if(typeof setActiveCustomerShop === "function") setActiveCustomerShop(shopId); } catch(e){ notify(e && e.message || e, "error"); } }
  function renderShopsSweep(){
    ensureStyle();
    const root = byId("page_shops");
    if(!root) return;
    if(!isCustomerRole()){
      root.innerHTML = `<div class="card"><h2>متاجري</h2><div class="empty">هذه الصفحة خاصة بحساب العميل.</div></div>`;
      return;
    }
    const list = links();
    const activeShop = safeString(state && (state.activeShopId || state.shopId));
    const rows = list.map(function(x){
      const sid = safeString(x.shopId || "");
      const active = sid && sid === activeShop;
      return `<tr><td class="name"><b>${escSafe(x.shopName || sid || "متجر")}</b>${active ? '<span class="badge ok">نشط</span>' : ''}</td><td>${escSafe(sid)}</td><td>${escSafe(x.customerName || state.customerName || "")}</td><td><div class="auth-linking-actions"><button type="button" class="btn mini ${active ? 'light' : 'ok'}" data-auth-switch-shop="${escSafe(sid)}" ${active ? 'disabled' : ''}>تبديل</button></div></td></tr>`;
    }).join("");
    root.innerHTML = `
      <div class="card"><h2>متاجري</h2><div class="auth-linking-stats"><div class="auth-linking-stat"><span>عدد المتاجر</span><b>${moneySafe(list.length)}</b></div><div class="auth-linking-stat"><span>المتجر النشط</span><b>${escSafe(state.shopName || state.shopId || "-")}</b></div></div></div>
      <div class="card"><h2>المتاجر المرتبطة</h2><div class="auth-linking-table-wrap"><table class="compact-table auth-linking-table"><thead><tr><th>المتجر</th><th>الكود</th><th>اسم العميل</th><th>إجراء</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted">لا توجد متاجر مرتبطة</td></tr>'}</tbody></table></div></div>
      <div class="card"><h2>إضافة تاجر</h2><div class="auth-linking-row"><input id="newShopCode" inputmode="text" autocomplete="off" placeholder="SHOP-XXXXX"><button type="button" class="btn ok" id="addAnotherShopBtn">إضافة</button></div></div>
      <div class="card"><h2>استرجاع ربط سابق</h2><div class="auth-linking-row"><input id="recoverShopCode" inputmode="text" autocomplete="off" placeholder="SHOP-XXXXX"><input id="recoverCustomerPhone" inputmode="tel" autocomplete="off" value="${escSafe(state.customerPhone || state.authPhoneNumber || state.authPhoneKey || '')}" placeholder="رقم الهاتف"><button type="button" class="btn secondary" id="recoverShopLinkBtn">استرجاع</button></div></div>`;
    setTimeout(bindShopsNow, 0);
  }
  function bindShopsNow(){
    ensureStyle();
    const root = byId("page_shops");
    if(!root) return { ok:false, reason:"shops page missing" };
    normalizeShopInput(byId("newShopCode"));
    normalizeShopInput(byId("recoverShopCode"));
    bindEnter(byId("newShopCode"), function(){ clickElement("addAnotherShopBtn"); });
    bindEnter(byId("recoverShopCode"), function(){ clickElement("recoverShopLinkBtn"); });
    bindEnter(byId("recoverCustomerPhone"), function(){ clickElement("recoverShopLinkBtn"); });
    qsa("[data-auth-switch-shop]", root).forEach(function(btn){ btn.onclick = function(){ switchShop(btn.getAttribute("data-auth-switch-shop") || ""); }; });
    const add = byId("addAnotherShopBtn"), recover = byId("recoverShopLinkBtn");
    if(add) add.onclick = function(){ const input = byId("newShopCode"); if(input) input.value = extractShopCodeSafe(input.value); try { if(typeof addAnotherShop === "function") addAnotherShop(); } catch(e){ notify(e && e.message || e, "error"); } };
    if(recover) recover.onclick = function(){ const input = byId("recoverShopCode"); if(input) input.value = extractShopCodeSafe(input.value); try { if(typeof recoverShopLinkInMyStores === "function") recoverShopLinkInMyStores(); } catch(e){ notify(e && e.message || e, "error"); } };
    window.__hesabiShopsSweepBound = { at:now(), links:links().length, active:safeString(state && (state.activeShopId || state.shopId)), buttons:{ add:!!add, recover:!!recover, switchCount:qsa("[data-auth-switch-shop]", root).length } };
    return Object.assign({ ok:true }, window.__hesabiShopsSweepBound);
  }

  function afterRender(){
    setTimeout(function(){
      try { bindAuthNow(); } catch (_) {}
      try { bindProfileNow(); } catch (_) {}
      try { bindShopsNow(); } catch (_) {}
    }, 0);
  }
  function wrapFunction(name, binder){
    try{
      const current = (typeof window[name] === "function") ? window[name] : (typeof eval(name) === "function" ? eval(name) : null);
      if(!current || current.__hesabiAuthCustomerLinkingWrapped) return false;
      const wrapped = function(){ const result = current.apply(this, arguments); try { binder && binder(); } catch (_) {} return result; };
      wrapped.__hesabiAuthCustomerLinkingWrapped = true;
      try { window[name] = wrapped; } catch (_) {}
      try { eval(name + " = wrapped"); } catch (_) {}
      return true;
    }catch(_){ return false; }
  }
  function activate(){
    ensureStyle();
    const wrappedAuth = wrapFunction("bindAuthButtons", afterRender);
    const wrappedProfile = wrapFunction("renderProfileSetup", afterRender);
    let replacedShops = false;
    try { renderShops = renderShopsSweep; replacedShops = true; } catch (_) {}
    try { window.renderShops = renderShopsSweep; } catch (_) {}
    try { if(globalThis.__hesabiRenderers) globalThis.__hesabiRenderers.shops = renderShopsSweep; } catch (_) {}
    try { document.addEventListener("click", function(){ afterRender(); }, true); } catch (_) {}
    afterRender();
    window.__hesabiAuthCustomerLinkingPageSweepInstalled = { at:now(), wrappedAuth, wrappedProfile, replacedShops };
    return window.__hesabiAuthCustomerLinkingPageSweepInstalled;
  }
  function selfCheck(){
    const api = window.hesabiAuthCustomerLinkingPageSweep || {};
    const required = ["bindAuthNow","bindProfileNow","renderShopsSweep","bindShopsNow","activate"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    const funcs = [
      ["bindAuthButtons", typeof bindAuthButtons === "function"],
      ["renderProfileSetup", typeof renderProfileSetup === "function"],
      ["renderShops", typeof renderShops === "function"],
      ["joinShop", typeof joinShop === "function"],
      ["linkCustomerToShop", typeof linkCustomerToShop === "function"],
      ["setActiveCustomerShop", typeof setActiveCustomerShop === "function"]
    ];
    const missingFuncs = funcs.filter(function(x){ return !x[1]; }).map(function(x){ return x[0]; });
    let codeOk = false;
    try { codeOk = extractShopCodeSafe("  shop-abc12 ") === "SHOP-ABC12" || extractShopCodeSafe("SHOP-ABC12") === "SHOP-ABC12"; } catch (_) { codeOk = false; }
    return { ok: missing.length === 0 && missingFuncs.length === 0 && codeOk, version:VERSION, build:BUILD_CODE, missing, missingFuncs, codeOk, installed:!!window.__hesabiAuthCustomerLinkingPageSweepInstalled, bindings:{ auth:window.__hesabiAuthSweepBound || null, profile:window.__hesabiProfileSetupSweepBound || null, shops:window.__hesabiShopsSweepBound || null } };
  }

  const api = { version:VERSION, build:BUILD_CODE, bindAuthNow, bindProfileNow, renderShopsSweep, bindShopsNow, extractShopCodeSafe, activate, selfCheck };
  window.hesabiAuthCustomerLinkingPageSweep = api;
  window.hesabiAuthCustomerLinkingPageSweepSelfCheck = selfCheck;
  activate();
})();
