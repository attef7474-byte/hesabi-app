/* Hesabi 1.0.114 - Restore role/store settings + unified smart update button. */
(function(){
  "use strict";
  const VERSION="1.0.114", BUILD_CODE=114;

  function byId(id){try{return document.getElementById(id)}catch(_){return null}}
  function qsa(sel,root){try{return Array.from((root||document).querySelectorAll(sel))}catch(_){return[]}}
  function s(v){try{return v==null?"":String(v)}catch(_){return""}}
  function esc(v){return s(v).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]||ch))}
  function msgSafe(t,type){try{if(typeof msg==="function")msg(t,type||"notice");else console.log(t)}catch(_){}}
  function saveSafe(){try{if(typeof save==="function")save()}catch(_){}}
  function renderSafe(){try{if(typeof render==="function")render()}catch(_){}}
  function showSafe(p){try{if(typeof show==="function")show(p)}catch(_){}}
  function text(el){try{return s(el&&el.textContent).replace(/\s+/g," ").trim()}catch(_){return""}}

  function ensureStyle(){
    if(byId("hesabiSettingsRoleUnifiedUpdate114Style")) return true;
    const st=document.createElement("style");
    st.id="hesabiSettingsRoleUnifiedUpdate114Style";
    st.textContent=`
      .dual-role-card{border:1px solid #dbe7ee;border-radius:18px;background:linear-gradient(180deg,#fff,#f8fbff);padding:10px;display:grid;gap:9px}
      .dual-role-pill{display:inline-flex;align-items:center;justify-content:center;border:1px solid #99f6e4;background:#ecfeff;color:#0f766e;border-radius:999px;padding:5px 9px;margin:2px 3px;font-size:12px;font-weight:900}
      .dual-role-pill.off{background:#f8fafc;color:#64748b;border-color:#e2e8f0}
      .dual-role-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .dual-role-actions .btn{width:100%!important;min-height:38px!important}
      .hesabi-unified-update-box{border:1px solid #99f6e4;background:#f0fdfa;color:#115e59;border-radius:16px;padding:10px;font-weight:900;line-height:1.65;margin:8px 0;white-space:pre-wrap}
      .hesabi-unified-update-actions{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;margin-top:8px!important}
      .hesabi-unified-update-actions .btn{width:100%!important;min-height:42px!important;font-size:14px!important;border-radius:14px!important}
      .hesabi-unified-update-actions .btn:disabled{opacity:.55!important;filter:grayscale(.3);cursor:not-allowed!important}
      #settingsRefreshUi,#settingsCleanCache,#settingsUpdateApk,#settingsCheckApk,#settingsRunSelfCheck,
      #hesabi113RefreshUi,#hesabi113DownloadApk,#hesabi113CheckVersion,
      #hesabiMenuRefreshUi,#hesabiMenuDownloadApk,#hesabiMenuCheckVersion{display:none!important}
      @media(max-width:460px){.dual-role-actions{grid-template-columns:1fr 1fr}.dual-role-actions .btn{font-size:12px!important;padding:8px 7px!important}}
    `;
    document.head.appendChild(st);
    return true;
  }

  function currentRoleLabel(){try{return state.role==="trader"?"تاجر":(state.role==="customer"?"عميل":"غير محدد")}catch(_){return"غير محدد"}}
  function roleProfile(role){try{return typeof dualRoleProfileFor==="function"?dualRoleProfileFor(role):((state.roleProfiles&&state.roleProfiles[role])||null)}catch(_){return null}}
  function rememberRole(){try{if(typeof rememberCurrentDualRoleProfile==="function")rememberCurrentDualRoleProfile()}catch(_){}}

  function switchRole(role,forceSetup){
    rememberRole();
    try{
      if(forceSetup){
        state.role=role; state.profileDone=false;
        try{if(typeof resetCacheForLiveData==="function")resetCacheForLiveData()}catch(_){}
        try{listenersStartedKey=""}catch(_){}
        saveSafe(); renderSafe();
        msgSafe("أكمل تهيئة وضع "+(role==="trader"?"تاجر":"عميل")+".","notice");
        return;
      }
      if(typeof applyDualRoleProfile==="function"){applyDualRoleProfile(role);return}
      const p=roleProfile(role); state.role=role;
      if(p&&p.profileDone){Object.keys(p).forEach(k=>{if(k!=="role")state[k]=p[k]});state.profileDone=true}else state.profileDone=false;
      saveSafe(); renderSafe();
    }catch(e){msgSafe("تعذر التبديل: "+s(e&&e.message||e),"error")}
  }

  function openStores(){
    rememberRole();
    try{
      if(state.role!=="customer"){
        const p=roleProfile("customer");
        if(p&&p.profileDone&&typeof applyDualRoleProfile==="function"){
          applyDualRoleProfile("customer");
          setTimeout(()=>showSafe("shops"),350);
          return;
        }
        switchRole("customer",true);
        return;
      }
      showSafe("shops");
    }catch(e){msgSafe("تعذر فتح متاجري: "+s(e&&e.message||e),"error")}
  }

  function dualRoleHtml(){
    let base="";
    try{if(typeof renderDualRoleSettingsBlock==="function")base=renderDualRoleSettingsBlock()}catch(_){}
    if(!base){
      const ht=!!roleProfile("trader"), hc=!!roleProfile("customer");
      base=`<div class="card" id="hesabiDualRoleSettingsCard"><h2>وضع الحساب: تاجر وعميل</h2><div class="dual-role-card"><div class="row"><b>الوضع الحالي</b><span class="dual-role-pill">${esc(currentRoleLabel())}</span></div><div><span class="dual-role-pill ${ht?"":"off"}">تاجر: ${ht?"مفعل":"غير مفعل"}</span><span class="dual-role-pill ${hc?"":"off"}">عميل: ${hc?"مفعل":"غير مفعل"}</span></div><div class="dual-role-actions"><button class="btn secondary" id="dualSwitchTrader">الدخول كتاجر</button><button class="btn secondary" id="dualSwitchCustomer">الدخول كعميل</button><button class="btn light" id="dualSetupTrader">تهيئة/استرجاع تاجر</button><button class="btn light" id="dualSetupCustomer">ربط تاجر كعميل</button></div></div></div>`;
    }
    if(base.indexOf("dualOpenStores")<0) base=base.replace("</div></div>",`<button class="btn ok" id="dualOpenStores" type="button">متاجري / ربط متجر</button></div></div>`);
    return base;
  }

  function bindDualRoleControls(){
    try{if(typeof bindDualRoleSettingsControls==="function")bindDualRoleSettingsControls()}catch(_){}
    const map=[
      ["dualSwitchTrader",()=>switchRole("trader",false)],
      ["dualSwitchCustomer",()=>switchRole("customer",false)],
      ["dualSetupTrader",()=>switchRole("trader",true)],
      ["dualSetupCustomer",()=>switchRole("customer",true)],
      ["dualOpenStores",openStores]
    ];
    map.forEach(([id,fn])=>{const el=byId(id);if(el)el.onclick=fn});
  }

  function ensureDualRoleInSettings(){
    ensureStyle();
    const page=byId("page_settings"); if(!page)return false;
    if(byId("dualSwitchTrader")||byId("hesabiDualRoleSettingsCard")){
      if(!byId("dualOpenStores")){
        const actions=page.querySelector(".dual-role-actions");
        if(actions){const b=document.createElement("button");b.className="btn ok";b.id="dualOpenStores";b.type="button";b.textContent="متاجري / ربط متجر";actions.appendChild(b)}
      }
      bindDualRoleControls(); return true;
    }
    const host=page.querySelector(".card");
    if(host) host.insertAdjacentHTML("beforebegin",dualRoleHtml()); else page.insertAdjacentHTML("afterbegin",dualRoleHtml());
    bindDualRoleControls(); return true;
  }

  function currentCode(){
    try{const n=typeof nativeVersionCode==="function"?Number(nativeVersionCode()||0):0;if(n)return n}catch(_){}
    try{if(typeof APP_BUILD_CODE!=="undefined")return Number(APP_BUILD_CODE||0)}catch(_){}
    try{return Number((window.__hesabiRuntime&&window.__hesabiRuntime.build)||0)}catch(_){}
    return 0;
  }
  function currentName(){
    try{const n=typeof nativeVersionName==="function"?s(nativeVersionName()||""):"";if(n)return n}catch(_){}
    try{if(typeof APP_VERSION!=="undefined")return s(APP_VERSION)}catch(_){}
    try{return s(window.__hesabiRuntime&&window.__hesabiRuntime.version)}catch(_){}
    return "";
  }

  async function fetchInfo(){
    try{if(typeof fetchAndroidUpdateInfo==="function"){const i=await fetchAndroidUpdateInfo();if(i)return i}}catch(_){}
    for(const u of ["android-update.json","/android-update.json"]){
      try{const r=await fetch(u+"?v="+Date.now(),{cache:"no-store",headers:{"Cache-Control":"no-cache"}});if(r.ok)return await r.json()}catch(_){}
    }
    return null;
  }
  function latestCode(i){return Number((i&&(i.latestVersionCode||i.versionCode))||0)}
  function latestName(i){return s((i&&(i.latestVersionName||i.versionName))||"")}

  async function getUpdateState(){
    const info=await fetchInfo(), cc=currentCode(), cn=currentName(), lc=latestCode(info), ln=latestName(info);
    return {ok:!!info,info,currentCode:cc,currentName:cn,latestCode:lc,latestName:ln,hasUpdate:!!(lc&&cc&&lc>cc)};
  }

  function setStatus(t){qsa("[data-hesabi-unified-update-status]").forEach(el=>el.textContent=t)}
  function setBtn(btn,st){
    if(!btn)return;
    if(!st.ok){btn.disabled=true;btn.textContent="تعذر فحص التحديث";return}
    if(st.hasUpdate){btn.disabled=false;btn.textContent="تحديث التطبيق الآن";return}
    btn.disabled=true;btn.textContent="أنت على آخر نسخة";
  }
  async function refreshUnifiedUpdateUi(){
    const st=await getUpdateState();
    const status=st.ok?(st.hasUpdate?`يوجد تحديث جديد: ${st.latestName||st.latestCode}\nنسختك الحالية: ${st.currentName||"-"} / build ${st.currentCode||"-"}`:`لا يوجد تحديث جديد.\nنسختك الحالية: ${st.currentName||"-"} / build ${st.currentCode||"-"}\nآخر نسخة متاحة: ${st.latestName||"-"} / build ${st.latestCode||"-"}`):"تعذر فحص التحديث. تأكد من الإنترنت.";
    setStatus(status);
    qsa("[data-hesabi-unified-update-btn]").forEach(btn=>{btn.__hesabiUpdateState=st;setBtn(btn,st)});
    return st;
  }
  async function runUnifiedUpdate(btn){
    let st=btn&&btn.__hesabiUpdateState; if(!st||!st.ok)st=await getUpdateState();
    if(!st.hasUpdate){setStatus("لا يوجد تحديث جديد. لن يتم تنظيف الكاش أو تنزيل APK لأن التطبيق على آخر نسخة.");msgSafe("أنت على آخر نسخة.","success");setBtn(btn,st);return st}
    try{
      if(btn){btn.disabled=true;btn.textContent="جاري التحديث..."}
      setStatus("يوجد تحديث جديد. جاري تنظيف الكاش وتجهيز الواجهات ثم فتح تحديث APK...");
      try{if(typeof prepareFullUpdateRefresh==="function")await prepareFullUpdateRefresh()}catch(_){}
      try{if(typeof refreshWebUiNow==="function")await refreshWebUiNow()}catch(_){}
      if(typeof downloadApkUpdate==="function")await downloadApkUpdate();
      else if(st.info&&st.info.apkUrl)location.href=s(st.info.apkUrl);
      setStatus("تم فتح تحديث APK. بعد تثبيت النسخة الجديدة افتح التطبيق مرة أخرى.");
      return st;
    }catch(e){setStatus("تعذر تنفيذ التحديث: "+s(e&&e.message||e));msgSafe("تعذر تنفيذ التحديث","error");if(btn)btn.disabled=false;return st}
  }
  function unifiedHtml(){return `<div class="hesabi-unified-update-box" data-hesabi-unified-update-status>جاري فحص التحديث...</div><div class="hesabi-unified-update-actions"><button class="btn ok" type="button" data-hesabi-unified-update-btn disabled>جاري الفحص...</button></div>`}
  function bindUnified(root){
    qsa("[data-hesabi-unified-update-btn]",root||document).forEach(btn=>{if(btn.__bound114)return;btn.__bound114=true;btn.onclick=()=>runUnifiedUpdate(btn)});
    refreshUnifiedUpdateUi();
  }

  function ensureSettingsUnifiedUpdate(){
    const page=byId("page_settings"); if(!page)return false;
    const ids=["settingsRefreshUi","settingsCleanCache","settingsUpdateApk","settingsCheckApk","settingsRunSelfCheck"].map(byId).filter(Boolean);
    if(!ids.length)return false;
    const actions=ids[0].closest(".settings-compact-actions,.actions,div");
    if(actions&&!actions.__unified114){actions.__unified114=true;actions.classList.add("hesabi-unified-update-actions");actions.innerHTML=unifiedHtml()}
    ids.forEach(b=>{try{b.style.setProperty("display","none","important")}catch(_){}});
    bindUnified(page); return true;
  }

  function closeModal(){const b=byId("hesabi114UnifiedUpdateBackdrop");if(b)b.remove()}
  function openUnifiedUpdateModal(){
    closeModal();
    const back=document.createElement("div");
    back.id="hesabi114UnifiedUpdateBackdrop"; back.className="hesabi113-modal-backdrop";
    back.innerHTML=`<div class="hesabi113-modal" role="dialog" aria-modal="true"><div class="hesabi113-modal-head"><h2>تحديث التطبيق</h2><button class="hesabi113-close" id="hesabi114UnifiedUpdateClose" type="button">×</button></div><div class="hesabi113-modal-body">${unifiedHtml()}</div></div>`;
    document.body.appendChild(back);
    const x=byId("hesabi114UnifiedUpdateClose"); if(x)x.onclick=closeModal;
    back.onclick=ev=>{if(ev.target===back)closeModal()};
    bindUnified(back);
  }

  function rebindTopMenuUpdate(){
    try{if(window.hesabiUiCleanupHeaderHomeNav&&typeof window.hesabiUiCleanupHeaderHomeNav.ensureHeaderMenu==="function")window.hesabiUiCleanupHeaderHomeNav.ensureHeaderMenu()}catch(_){}
    qsa('[data-top-menu-action="update"]').forEach(old=>{
      if(old.__unified114)return;
      const item=old.cloneNode(true); item.__unified114=true;
      old.parentNode.replaceChild(item,old);
      item.onclick=ev=>{ev.preventDefault();ev.stopPropagation();try{byId("hesabiTopOverflowMenu")?.classList.add("hidden")}catch(_){} openUnifiedUpdateModal(); return false};
    });
  }

  function applyAll(){ensureStyle();ensureDualRoleInSettings();ensureSettingsUnifiedUpdate();rebindTopMenuUpdate()}
  function installWrappers(){
    const w=window.__hesabiSettingsRoleUnifiedUpdate114Wrapped||{};
    if(typeof render==="function"&&!w.render){const b=render;render=function(){const o=b.apply(this,arguments);schedule();return o};w.render=true}
    if(typeof show==="function"&&!w.show){const b=show;show=function(){const o=b.apply(this,arguments);schedule();return o};w.show=true}
    if(typeof renderSettings==="function"&&!w.renderSettings){const b=renderSettings;renderSettings=function(){const o=b.apply(this,arguments);schedule();return o};w.renderSettings=true}
    window.__hesabiSettingsRoleUnifiedUpdate114Wrapped=w;
  }
  function schedule(){setTimeout(applyAll,0);setTimeout(applyAll,150);setTimeout(applyAll,500)}
  function installObserver(){
    if(window.__hesabiSettingsRoleUnifiedUpdate114Observer)return true;
    try{let p=false;const o=new MutationObserver(()=>{if(p)return;p=true;setTimeout(()=>{p=false;applyAll()},80)});o.observe(document.documentElement,{childList:true,subtree:true});window.__hesabiSettingsRoleUnifiedUpdate114Observer=o;return true}catch(_){return false}
  }
  function selfCheck(){
    ensureStyle();installWrappers();installObserver();applyAll();
    const hasDual=!!(byId("dualSwitchTrader")&&byId("dualSwitchCustomer")), hasStores=!!byId("dualOpenStores"), hasUnified=!!document.querySelector("[data-hesabi-unified-update-btn]");
    const visibleSeparate=["settingsRefreshUi","settingsCleanCache","settingsUpdateApk","settingsCheckApk","settingsRunSelfCheck"].filter(id=>{const el=byId(id);if(!el)return false;try{return getComputedStyle(el).display!=="none"}catch(_){return false}});
    const ok=hasDual&&hasStores&&visibleSeparate.length===0;
    const res={ok,version:VERSION,build:BUILD_CODE,hasDual,hasStores,hasUnified,visibleSeparate,role:currentRoleLabel(),currentBuild:currentCode(),checkedAt:new Date().toISOString()};
    window.__hesabiSettingsRoleUnifiedUpdate114=res; try{localStorage.setItem("hesabi_settings_role_unified_update_114",JSON.stringify({ok,role:res.role,currentBuild:res.currentBuild,at:res.checkedAt}))}catch(_){}
    return res;
  }

  ensureStyle();installWrappers();installObserver();schedule();
  window.hesabiSettingsRoleUnifiedUpdate={version:VERSION,build:BUILD_CODE,ensureDualRoleInSettings,ensureSettingsUnifiedUpdate,openUnifiedUpdateModal,refreshUnifiedUpdateUi,runUnifiedUpdate,getUpdateState,selfCheck};
  window.hesabiSettingsRoleUnifiedUpdateSelfCheck=selfCheck;
})();
