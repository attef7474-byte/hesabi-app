import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore, collection, doc, setDoc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,writeBatch, onSnapshot, query, where, serverTimestamp, enableIndexedDbPersistence, increment, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, updatePhoneNumber } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

const LS='hesabi_firebase_v3';
const OLD_LS='hesabi_firebase_v2';
const $=id=>document.getElementById(id);
let state=load();
if(!state.firebaseConfig){
  try{ const old=JSON.parse(localStorage.getItem(OLD_LS)||'{}'); if(old.firebaseConfig) state=old; }catch{}
}
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDzM7sFT6FvP740Yq6ySa_z-_kj8NT2pGw",
  authDomain: "hesabi-app-edc7e.firebaseapp.com",
  projectId: "hesabi-app-edc7e",
  storageBucket: "hesabi-app-edc7e.firebasestorage.app",
  messagingSenderId: "669487458406",
  appId: "1:669487458406:web:958c0218a3ba861e9365a7"
};
if(!state.firebaseConfig?.apiKey){ state.firebaseConfig = DEFAULT_FIREBASE_CONFIG; save(); }
let app=null, db=null, auth=null, currentUser=null, authReady=false, unsub=[];
let phoneConfirmationResult=null, recaptchaVerifier=null, smsSending=false, smsVerifying=false;
let appUnlockedSession=false;
let listenersStartedKey='';
let cache={shop:null,items:[],customers:[],orders:[],payments:[],messages:[],invoices:[],customerLedger:[],auditLogs:[],stockLedger:[],returns:[],schedules:[]};

// 氐賱丕丨賷丕鬲 丕賱鬲胤亘賷賯 丨爻亘 丕賱丿賵乇: 丕賱毓賲賷賱 賱丕 賷爻鬲胤賷毓 鬲毓丿賷賱 亘賷丕賳丕鬲 丕賱鬲丕噩乇 兀賵 丕賱兀氐賳丕賮 兀賵 丕賱兀爻毓丕乇 兀賵 丕賱賲禺夭賵賳.
function isTrader(){ return state.role==='trader'; }
function isCustomer(){ return state.role==='customer'; }
function roleName(){ return isTrader()?'鬲丕噩乇':(isCustomer()?'毓賲賷賱':'睾賷乇 賲丨丿丿'); }

const APP_OWNER_EMAIL='attef7474@gmail.com';
function isAppOwner(){
  const email=(currentUser?.email||state.authEmail||'').toLowerCase();
  return !!(uid() && email===APP_OWNER_EMAIL);
}
function requireAppOwnerAction(action='賴匕賴 丕賱毓賲賱賷丞'){
  if(!isAppOwner()){ msg(action+' 禺丕氐丞 亘賲丕賱賰 丕賱鬲胤亘賷賯 賮賯胤.','error'); return false; }
  return true;
}
function shopSubscriptionText(s){
  return ({active:'賳卮胤',trial:'鬲噩乇賷亘賷',warning:'廿賳匕丕乇',suspended:'賲賵賯賵賮',expired:'賲賳鬲賴賷'}[s]||s||'鬲噩乇賷亘賷');
}
function shopSubscriptionClass(s){return s==='suspended'?'rejected':(s==='warning'||s==='expired'?'pending':'approved')}
function lastSeenText(ms){
  ms=Number(ms||0); if(!ms) return '睾賷乇 賲毓乇賵賮';
  const diff=Date.now()-ms;
  if(diff<120000) return '賲鬲氐賱 丕賱丌賳';
  if(diff<3600000) return '賯亘賱 '+Math.max(2,Math.round(diff/60000))+' 丿賯賷賯丞';
  if(diff<86400000) return '賯亘賱 '+Math.round(diff/3600000)+' 爻丕毓丞';
  return dateText(ms);
}
function isOnlineMs(ms){return Number(ms||0) && (Date.now()-Number(ms)<120000)}
function permissionDenied(action='賴匕賴 丕賱毓賲賱賷丞'){
  msg(action+' 禺丕氐丞 亘丨爻丕亘 丕賱鬲丕噩乇 賮賯胤. 丨爻丕亘 丕賱毓賲賷賱 賱賱胤賱亘 賵丕賱爻丿丕丿 賵丕賱賲乇丕爻賱丞 賵賲鬲丕亘毓丞 丕賱丨爻丕亘 賮賯胤.','error');
  return false;
}
function requireTraderAction(action='賴匕賴 丕賱毓賲賱賷丞'){
  if(!isTrader()) return permissionDenied(action);
  if(!state.shopId){ msg('賱丕 賷賵噩丿 賲鬲噩乇 賳卮胤 賱丨爻丕亘 丕賱鬲丕噩乇','error'); return false; }
  return true;
}
function customerReadonlyNotice(){
  return `<div class="notice">兀賳鬲 丿丕禺賱 丕賱鬲胤亘賷賯 賰毓賲賷賱. 賷賲賰賳賰 賲卮丕賴丿丞 丕賱兀氐賳丕賮 丕賱賲鬲丕丨丞 賵丕賱胤賱亘 賵丕賱爻丿丕丿 賮賯胤. 鬲毓丿賷賱 丕賱兀氐賳丕賮 賵丕賱兀爻毓丕乇 賵丕賱賲禺夭賵賳 賵丕賱爻賷丕爻丕鬲 禺丕氐 亘丕賱鬲丕噩乇.</div>`;
}
function isTraderOnlyPage(p){
  return ['customers','audit','stock','collections','policies','reports'].includes(p);
}
let active='home';
let pendingMessageAttachment=null;
let activeRecorder=null;
let activeRecorderChunks=[];
let activeRecorderStartedAt=0;
let previousPage='home';
const APP_VERSION='1.0.114';
const APP_BUILD_CODE = 114;
let renderReports;

// 1.0.41: defaults and robust self-recovery helpers. These prevent the app from entering an endless recovery dialog when an older cached UI misses a helper function.
function shouldAppLock(){
  try{
    if(appUnlockedSession) return false;
    const sec = state.security || state.appSecurity || {};
    const enabled = !!(sec.enabled || sec.appLockEnabled || state.appLockEnabled || state.lockEnabled);
    if(!enabled) return false;
    const lastUnlock = Number(sessionStorage.getItem('hesabi_app_last_unlock')||0);
    const idleMinutes = Number(sec.idleMinutes || state.appLockIdleMinutes || 0);
    if(lastUnlock && idleMinutes>0 && Date.now()-lastUnlock < idleMinutes*60000) return false;
    return true;
  }catch(e){ return false; }
}
function markAppUnlocked(){
  appUnlockedSession=true;
  try{sessionStorage.setItem('hesabi_app_last_unlock', String(Date.now()));}catch(e){}
}
function renderAppLockScreen(){
  const el=$('appLockScreen'); if(!el) return;
  el.innerHTML=`<div class="security-lock-card"><div class="security-lock-icon">馃攼</div><h2>賯賮賱 丕賱鬲胤亘賷賯</h2><p class="muted">兀丿禺賱 乇賲夭 丕賱賯賮賱 兀賵 丕爻鬲禺丿賲 賮鬲丨 丕賱噩賴丕夭 廿匕丕 賰丕賳 賲賮毓賾賱賸丕.</p><div class="field"><input id="appLockPinInput" type="password" inputmode="numeric" placeholder="乇賲夭 丕賱賯賮賱"></div><div class="security-lock-actions"><button class="btn ok" id="unlockAppBtn">賮鬲丨</button><button class="btn light" id="skipLockBtn">廿賱睾丕亍 丕賱賯賮賱 賱賴匕賴 丕賱噩賱爻丞</button></div></div>`;
  setTimeout(()=>{
    const pinEl=$('appLockPinInput');
    const sec=state.security||state.appSecurity||{};
    const expected=String(sec.pin||state.appLockPin||state.lockPin||'');
    const unlock=()=>{ const v=String(pinEl?.value||''); if(expected && v!==expected){msg('乇賲夭 丕賱賯賮賱 睾賷乇 氐丨賷丨','error'); return;} markAppUnlocked(); render(); };
    if($('unlockAppBtn')) $('unlockAppBtn').onclick=unlock;
    if($('skipLockBtn')) $('skipLockBtn').onclick=()=>{markAppUnlocked();render();};
    if(pinEl){pinEl.focus(); pinEl.onkeydown=e=>{if(e.key==='Enter') unlock();};}
  });
}
async function refreshWebUiNow(){
  try{
    const updater=window.hesabiUpdateCacheStability;
    if(updater && typeof updater.refreshWebUiNow==='function'){
      await updater.refreshWebUiNow('legacy-refreshWebUiNow');
      return;
    }
    if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations(); for(const r of regs){try{await r.unregister()}catch(e){}}}
    if('caches' in window){const keys=await caches.keys(); for(const k of keys){try{await caches.delete(k)}catch(e){}}}
    try{localStorage.setItem('hesabi_last_cache_clean', String(Date.now()));}catch(e){}
    try{sessionStorage.setItem('hesabi_force_update_ts', String(Date.now()));}catch(e){}
    if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.clearWebCacheForUpdate==='function'){try{window.hesabiAndroidBridge.clearWebCacheForUpdate();}catch(e){}}
  }catch(e){console.warn('refreshWebUiNow failed',e)}
}
function latestApkDirectUrl(){return 'https://github.com/attef7474-byte/hesabi-app/releases/latest/download/hesabi-app-latest.apk';}
async function downloadApkUpdate(){
  let apkUrl=latestApkDirectUrl();
  try{const info=await fetchAndroidUpdateInfo(); if(info) apkUrl=latestApkUrlFromInfo(info)||apkUrl;}catch(e){}
  try{await prepareFullUpdateRefresh();}catch(e){}
  try{openApkDownloadUrl(apkUrl);}catch(e){try{location.href=apkUrl;}catch(_){}}
}
window.refreshWebUiNow=refreshWebUiNow;
window.downloadApkUpdate=downloadApkUpdate;

function nativeAndroidAvailable(){
  return !!(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.getPlatform==='function' && window.hesabiAndroidBridge.hasNative());
}
function nativeVersionCode(){
  try{
    if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.getVersionCode==='function'){
      return Number(window.hesabiAndroidBridge.getVersionCode()||0);
    }
  }catch(e){}
  return 0;
}
function nativeVersionName(){
  try{
    if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.getVersionName==='function'){
      return String(window.hesabiAndroidBridge.getVersionName()||'');
    }
  }catch(e){}
  return '';
}
function nativeVersionLabel(){
  const name=nativeVersionName();
  const code=nativeVersionCode();
  if(name || code) return `${name||'APK'} (${code||'-'})`;
  return nativeAndroidAvailable()?'APK 睾賷乇 賲毓乇賵賮':'賲鬲氐賮丨 / Web';
}
async function fetchAndroidUpdateInfo(){
  const urls=['android-update.json','/android-update.json'];
  const updater=window.hesabiUpdateCacheStability;
  if(updater && typeof updater.fetchUpdateInfo==='function'){
    return await updater.fetchUpdateInfo(urls);
  }
  let lastErr='';
  for(const u of urls){
    try{
      const res=await fetch(u+'?v='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const info=await res.json();
      if(info && (info.apkUrl || info.latestVersionCode || info.versionCode)) return info;
    }catch(e){ lastErr=e.message||String(e); }
  }
  console.warn('android-update.json fetch failed', lastErr);
  return null;
}
function latestVersionCodeFromInfo(info){return Number((info&&info.latestVersionCode)|| (info&&info.versionCode)||0)}
function latestVersionNameFromInfo(info){return String((info&&info.latestVersionName)|| (info&&info.versionName)||'')}
function latestApkUrlFromInfo(info){return String((info&&info.apkUrl)||'https://github.com/attef7474-byte/hesabi-app/releases/latest/download/hesabi-app-latest.apk').trim()}
async function checkApkUpdateOnly(showIfNoUpdate=true){
  const info=await fetchAndroidUpdateInfo();
  if(!info){
    msg('鬲毓匕乇 賮丨氐 丕賱鬲丨丿賷孬. 鬲兀賰丿 賲賳 丕賱廿賳鬲乇賳鬲 孬賲 丕囟睾胤 鬲丨丿賷孬 APK 賲乇丞 兀禺乇賶.','error');
    return null;
  }
  const current=nativeVersionCode();
  const latest=latestVersionCodeFromInfo(info);
  const latestName=latestVersionNameFromInfo(info)||latest;
  if(!nativeAndroidAvailable()){
    msg(`兀賳鬲 鬲爻鬲禺丿賲 賳爻禺丞 Web. 丌禺乇 APK 賲鬲丕丨: ${latestName}.`, 'notice');
  }else if(!current){
    msg(`賱賲 兀爻鬲胤毓 賯乇丕亍丞 廿氐丿丕乇 APK 丕賱賲孬亘鬲. 丌禺乇 廿氐丿丕乇 賲鬲丕丨: ${latestName}.`, 'notice');
  }else if(latest && latest>current){
    msg(`賷賵噩丿 鬲丨丿賷孬 APK 噩丿賷丿: ${latestName}. 爻賷鬲賲 鬲賳夭賷賱 丌禺乇 賳爻禺丞 賲鬲賵賮乇丞 賵賱賷爻 賳爻禺丞 賯丿賷賲丞.`, 'notice');
  }else if(showIfNoUpdate){
    msg(`賱丕 賷賵噩丿 鬲丨丿賷孬 APK 兀丨丿孬. 丕賱賲孬亘鬲: ${nativeVersionLabel()}貙 丕賱賲鬲丕丨: ${latestName||'-'}.`, 'success');
  }
  return info;
}
async function prepareFullUpdateRefresh(){
  state.lastManualUpdateAt = Date.now();
  state.pendingFullApkRefresh = true;
  save();
  const updater=window.hesabiUpdateCacheStability;
  if(updater && typeof updater.prepareFullApkUpdate==='function'){
    await updater.prepareFullApkUpdate();
    return;
  }
  if('serviceWorker' in navigator){
    try{ const regs=await navigator.serviceWorker.getRegistrations(); for(const reg of regs){try{await reg.unregister();}catch(e){}} }catch(e){}
  }
  if('caches' in window){
    try{ const keys=await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k))); }catch(e){}
  }
  try{ localStorage.setItem('hesabi_last_update_prepare_ts', String(Date.now())); }catch(e){}
  try{ sessionStorage.setItem('hesabi_force_full_apk_update_ts', String(Date.now())); }catch(e){}
  if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.clearWebCacheForUpdate==='function'){
    try{ window.hesabiAndroidBridge.clearWebCacheForUpdate(); }catch(e){}
  }
}
function openApkDownloadUrl(apkUrl){
  if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.openApkUrl==='function'){
    const nativeOpen = window.hesabiAndroidBridge.openApkUrl(apkUrl);
    if(nativeOpen && nativeOpen.ok) return true;
  }
  if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.openLatestApk==='function'){
    const latestOpen = window.hesabiAndroidBridge.openLatestApk();
    if(latestOpen && latestOpen.ok) return true;
  }
  try{
    const a=document.createElement('a');
    a.href=apkUrl;
    a.target='_blank';
    a.rel='noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>a.remove(),1000);
  }catch(e){ location.href=apkUrl; }
  setTimeout(()=>{ try{ location.href=apkUrl; }catch(e){} },900);
  return false;
}
async function forceApkUpdate(){
  try{
    const info=await checkApkUpdateOnly(false);
    const apkUrl=latestApkUrlFromInfo(info);
    await prepareFullUpdateRefresh();
    const current=nativeVersionCode();
    const latest=latestVersionCodeFromInfo(info);
    const latestName=latestVersionNameFromInfo(info)||'丌禺乇 廿氐丿丕乇';
    msg(`噩丕乇賷 鬲賳夭賷賱 ${latestName}. 廿匕丕 賰丕賳 丕賱賴丕鬲賮 賯丿賷賲賸丕 賵乇賮囟 丕賱鬲孬亘賷鬲 亘爻亘亘 丕禺鬲賱丕賮 丕賱鬲賵賯賷毓貙 丕丨匕賮 丕賱賳爻禺丞 丕賱賯丿賷賲丞 賲乇丞 賵丕丨丿丞 孬賲 孬亘鬲 丕賱賳爻禺丞 丕賱噩丿賷丿丞貙 賵賱賳 鬲鬲賰乇乇 丕賱賲卮賰賱丞 亘毓丿 鬲孬亘賷鬲 丕賱賳爻禺丞 丕賱賲賵賯毓丞 丕賱孬丕亘鬲丞.`, 'notice');
    setTimeout(()=>openApkDownloadUrl(apkUrl), 450);
  }catch(e){
    msg('鬲毓匕乇 亘丿亍 鬲丨丿賷孬 APK: '+(e.message||e),'error');
  }
}
async function autoCheckCriticalApkUpdate(){
  try{
    const info=await fetchAndroidUpdateInfo(); if(!info) return;
    const current=nativeVersionCode(); const latest=latestVersionCodeFromInfo(info);
    const minRequired=Number(info.minimumSupportedVersionCode||0);
    if(nativeAndroidAvailable() && current && ((latest && latest>current && info.required) || (minRequired && current<minRequired))){
      msg('賷賵噩丿 鬲丨丿賷孬 賲賴賲 賱賱鬲胤亘賷賯. 賲賳 丕賱兀賮囟賱 鬲丨丿賷孬 APK 丕賱丌賳 賱賱丨氐賵賱 毓賱賶 丌禺乇 丕賱賵丕噩賴丕鬲 賵丕賱氐賱丕丨賷丕鬲 亘丿賵賳 賲卮丕賰賱.', 'notice');
    }
  }catch(e){}
}
async function refreshWebOnly(){
  try{
    msg('噩丕乇賷 鬲丨丿賷孬 丕賱賵丕噩賴丕鬲 賮賯胤 亘丿賵賳 鬲孬亘賷鬲 APK...', 'notice');
    state.lastManualUpdateAt = Date.now();
    save();
    const updater=window.hesabiUpdateCacheStability;
    if(updater && typeof updater.refreshWebUiNow==='function'){
      await updater.refreshWebUiNow('web-only-refresh');
    }else{
      if('serviceWorker' in navigator){
        try{
          const regs = await navigator.serviceWorker.getRegistrations();
          for(const reg of regs){ try{ await reg.update(); }catch(e){} }
        }catch(e){}
      }
      if('caches' in window){
        try{
          const keys = await caches.keys();
          await Promise.all(keys.map(k=>caches.delete(k)));
        }catch(e){}
      }
      try{ sessionStorage.setItem('hesabi_force_update_ts', String(Date.now())); }catch(e){}
    }
    const nextUrl = updater && typeof updater.buildRefreshUrl==='function' ? updater.buildRefreshUrl({refresh:'1'}) : (()=>{const url = new URL(location.href); url.searchParams.set('v', String(Date.now())); url.searchParams.set('refresh','1'); return url.toString();})();
    setTimeout(()=>location.replace(nextUrl), 450);
  }catch(e){
    msg('鬲毓匕乇 鬲丨丿賷孬 丕賱賵丕噩賴丕鬲: '+(e.message||e),'error');
  }
}



function getJoinShopParam(){
  try{
    const u=new URL(location.href);
    return String(u.searchParams.get('joinShop')||u.searchParams.get('shop')||'').trim();
  }catch{return ''}
}
const URL_JOIN_SHOP_ID=getJoinShopParam();
if(URL_JOIN_SHOP_ID){ state.pendingJoinShopId=URL_JOIN_SHOP_ID; save(); }
setTimeout(()=>autoCheckCriticalApkUpdate(), 2500);
function appBaseUrl(){
  try{return location.origin && location.origin!=='null' ? (location.origin + location.pathname) : 'https://hesabi-app-edc7e.web.app/'}catch{return 'https://hesabi-app-edc7e.web.app/'}
}
function shopJoinLink(shopId=state.shopId){
  const base=appBaseUrl();
  const u=new URL(base, location.href);
  u.searchParams.set('joinShop', String(shopId||'').trim());
  u.searchParams.set('v','join');
  return u.toString();
}
function qrImageUrl(text){return 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data='+encodeURIComponent(text)}
function extractShopCodeFromText(text){
  const v=String(text||'').trim();
  if(!v) return '';
  try{const u=new URL(v); return String(u.searchParams.get('joinShop')||u.searchParams.get('shop')||'').trim() || v.match(/SHOP-[A-Z0-9-]+/i)?.[0] || ''}catch{return v.match(/SHOP-[A-Z0-9-]+/i)?.[0] || v}
}


function load(){try{return JSON.parse(localStorage.getItem(LS))||{}}catch{return {}}}
function save(){localStorage.setItem(LS,JSON.stringify(state))}
function hesabiUtils(){return window.hesabiUtilsHelpers||{}}
function esc(v){const u=hesabiUtils(); if(typeof u.escapeHtml==='function') return u.escapeHtml(v); return String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function hideAppDialog(){
  const dialogs=window.hesabiDialogsToasts;
  if(dialogs&&typeof dialogs.hideAppDialog==='function') return dialogs.hideAppDialog();
  try{$('hesabiDialogBackdrop')?.classList.add('hidden')}catch{}
}
function showAppDialog(title, body, type='notice', buttons){
  const dialogs=window.hesabiDialogsToasts;
  if(dialogs&&typeof dialogs.showAppDialog==='function') return dialogs.showAppDialog(title, body, type, buttons);
  const back=$('hesabiDialogBackdrop'), ttl=$('hesabiDialogTitle'), icon=$('hesabiDialogIcon'), bdy=$('hesabiDialogBody'), acts=$('hesabiDialogActions');
  if(!back||!ttl||!bdy||!acts){ if($('msg')) $('msg').innerHTML=`<div class="notice ${type}">${esc(body||title)}</div>`; return; }
  const kind=type==='error'?'dialog-error':(type==='success'?'dialog-success':(type==='warn'?'dialog-warn':''));
  back.className='hesabi-dialog-backdrop '+kind;
  ttl.textContent=title||'鬲賳亘賷賴'; bdy.textContent=body||''; icon.textContent=type==='error'?'鈿狅笍':(type==='success'?'鉁?:(type==='warn'?'馃Ч':'鈩癸笍'));
  const list=buttons&&buttons.length?buttons:[{text:'賲賵丕賮賯',cls:type==='error'?'danger':'ok',fn:hideAppDialog}];
  acts.className='hesabi-dialog-actions '+(list.length===1?'one':(list.length===3?'three':''));
  acts.innerHTML=list.map((x,i)=>`<button type="button" class="btn ${esc(x.cls||'secondary')}" data-dialog-action="${i}">${esc(x.text||'賲賵丕賮賯')}</button>`).join('');
  acts.querySelectorAll('[data-dialog-action]').forEach(btn=>{btn.onclick=()=>{const x=list[Number(btn.dataset.dialogAction)]; try{ if(x.close!==false) hideAppDialog(); if(typeof x.fn==='function') x.fn(); }catch(e){console.warn('dialog action failed',e)} };});
}
function msg(t,type='notice'){
  const dialogs=window.hesabiDialogsToasts;
  if(dialogs&&typeof dialogs.msg==='function') return dialogs.msg(t,type);
  const text=String(t||'');
  const isErr=type==='error'||/禺胤兀|賮卮賱|鬲毓匕乇|Missing|Firebase|Uncaught|Error|ReferenceError/i.test(text);
  showAppDialog(isErr?'鬲賳亘賷賴 賲賴賲':(type==='success'?'鬲賲 亘賳噩丕丨':'鬲賳亘賷賴'), text, isErr?'error':type);
}
function safeMsg(t,type='notice'){
  const dialogs=window.hesabiDialogsToasts;
  if(dialogs&&typeof dialogs.safeMsg==='function') return dialogs.safeMsg(t,type);
  try{msg(t,type)}catch(e){console.warn('safeMsg failed',e,t)}
}
function showStartupRecoveryDialog(errorText=''){
  const details=errorText?('\n\n丕賱鬲賮丕氐賷賱: '+String(errorText).slice(0,180)):'';
  showAppDialog('鬲毓匕乇 鬲卮睾賷賱 丕賱氐賮丨丞', '丨氐賱 禺賱賱 賮賷 鬲丨賲賷賱 丕賱賵丕噩賴丞. 賷賲賰賳賰 廿氐賱丕丨賴 丕賱丌賳 亘丿賵賳 丕賱禺乇賵噩 賲賳 丕賱鬲胤亘賷賯.'+details, 'warn', [
    {text:'鬲丨丿賷孬 丕賱賵丕噩賴丕鬲',cls:'ok',fn:async()=>{try{await refreshWebUiNow()}catch(e){} try{location.replace(location.pathname+'?v='+Date.now())}catch(e){location.reload()}}},
    {text:'鬲賳馗賷賮 丕賱賰丕卮',cls:'warn',fn:async()=>{try{await refreshWebUiNow()}catch(e){} try{location.replace(location.pathname+'?clean='+Date.now())}catch(e){location.reload()}}},
    {text:'鬲丨丿賷孬 APK',cls:'secondary',fn:()=>{try{downloadApkUpdate()}catch(e){location.href=latestApkDirectUrl()}}}
  ]);
}

function money(n){const u=hesabiUtils(); if(typeof u.formatMoney==='function') return u.formatMoney(n,'乇賷丕賱'); return Number(n||0).toLocaleString('ar-YE')+' 乇賷丕賱'}
function todayIso(){const u=hesabiUtils(); if(typeof u.todayIso==='function') return u.todayIso(); return new Date().toISOString().slice(0,10)}
function fileToDataUrl(file, maxBytes=700000){
  const u=hesabiUtils();
  if(typeof u.fileToDataUrl==='function') return u.fileToDataUrl(file,maxBytes);
  return new Promise((resolve,reject)=>{
    if(!file){resolve(null);return}
    if(file.size>maxBytes){reject(new Error('丨噩賲 氐賵乇丞 丕賱廿賷氐丕賱 賰亘賷乇 噩丿賸丕. 丕禺鬲乇 氐賵乇丞 兀賯賱 賲賳 700KB 兀賵 氐睾賾乇賴丕 賯亘賱 丕賱廿乇爻丕賱.'));return}
    const r=new FileReader(); r.onload=()=>resolve({name:file.name,type:file.type,size:file.size,dataUrl:r.result}); r.onerror=()=>reject(new Error('鬲毓匕乇 賯乇丕亍丞 氐賵乇丞 丕賱廿賷氐丕賱')); r.readAsDataURL(file);
  })
}
function id(prefix){const u=hesabiUtils(); if(typeof u.makeId==='function') return u.makeId(prefix); return prefix+'-'+Math.random().toString(36).slice(2,7).toUpperCase()+Date.now().toString().slice(-4)}
function statusText(s){return ({pending:'賲毓賱賾賯',pending_trader:'亘丕賳鬲馗丕乇 賲賵丕賮賯丞 丕賱鬲丕噩乇',pending_customer:'亘丕賳鬲馗丕乇 賲賵丕賮賯丞 丕賱毓賲賷賱',approved:'賲賯亘賵賱',rejected:'賲乇賮賵囟',cancelled:'賲賱睾賷'}[s]||s||'賲毓賱賾賯')}
function payTypeText(v){return v==='credit'?'丌噩賱':'賰丕卮'}
function ledgerTypeText(v){return ({debit_invoice:'賮丕鬲賵乇丞 丌噩賱',cash_invoice:'賮丕鬲賵乇丞 賰丕卮',payment:'爻丿丕丿',return_credit:'賲乇鬲噩毓 丌噩賱',return_cash:'賲乇鬲噩毓 賰丕卮',adjustment:'鬲爻賵賷丞'}[v]||v||'丨乇賰丞')}
function onlineBadge(){const on=navigator.onLine;$('netBadge').className='badge '+(on?'online':'offline');$('netBadge').textContent=on?'賲鬲氐賱 亘丕賱廿賳鬲乇賳鬲':'睾賷乇 賲鬲氐賱'}
function normalizePhone(v){
  const u=hesabiUtils();
  if(typeof u.normalizePhone==='function') return u.normalizePhone(v);
  let x=String(v||'').trim();
  const ar='贍佟佗伲伽佶佴侑侉侃'; const fa='郯郾鄄鄢鄞鄣鄱鄯鄹酃';
  x=x.replace(/[贍-侃]/g,d=>String(ar.indexOf(d))).replace(/[郯-酃]/g,d=>String(fa.indexOf(d)));
  x=x.replace(/[^0-9]/g,'');
  if(x.startsWith('00')) x=x.slice(2);
  if(x.startsWith('967') && x.length>=12) x='0'+x.slice(3);
  if(x.startsWith('7') && x.length===9) x='0'+x;
  return x;
}
function phoneKeyToInternational(phoneKey){
  const u=hesabiUtils();
  if(typeof u.phoneKeyToInternational==='function') return u.phoneKeyToInternational(phoneKey);
  let x=normalizePhone(phoneKey);
  if(x.startsWith('0')) x=x.slice(1);
  if(x.startsWith('967')) return '+'+x;
  return '+967'+x;
}
function toInternationalPhone(v){
  const u=hesabiUtils();
  if(typeof u.toInternationalPhone==='function') return u.toInternationalPhone(v);
  let raw=String(v||'').trim();
  const ar='贍佟佗伲伽佶佴侑侉侃'; const fa='郯郾鄄鄢鄞鄣鄱鄯鄹酃';
  raw=raw.replace(/[贍-侃]/g,d=>String(ar.indexOf(d))).replace(/[郯-酃]/g,d=>String(fa.indexOf(d)));
  let x=raw.replace(/[^0-9+]/g,'');
  if(x.startsWith('+')) return x;
  x=x.replace(/[^0-9]/g,'');
  if(x.startsWith('00')) x=x.slice(2);
  if(x.startsWith('967')) return '+'+x;
  if(x.startsWith('0')) x=x.slice(1);
  if(x.startsWith('7') && x.length===9) return '+967'+x;
  return '+'+x;
}
function authEmailFromPhone(phoneKey){return 'u'+phoneKey+'@hesabi.local'}
function uid(){return currentUser?.uid || state.uid || ''}

let lastNativeSessionKey='';
function nativeSessionPayload(){
  return {
    uid: uid(),
    role: state.role || '',
    shopId: state.shopId || '',
    activeShopId: state.activeShopId || state.shopId || '',
    customerId: state.customerId || '',
    phoneKey: state.authPhoneKey || '',
    shopName: state.shopName || cache.shop?.name || '',
    customerName: state.customerName || '',
    app: 'hesabi',
    ts: Date.now()
  };
}
function notifyAndroidSession(){
  try{
    if(!uid() || !state.profileDone || !window.hesabiAndroidBridge || !window.hesabiAndroidBridge.hasNative()) return;
    const payload=nativeSessionPayload();
    const key=JSON.stringify(payload);
    if(key===lastNativeSessionKey) return;
    lastNativeSessionKey=key;
    window.hesabiAndroidBridge.registerSession(key);
  }catch(e){console.warn('Android bridge session skipped',e)}
}

function notificationPermissionState(){
  try{ return ('Notification' in window) ? Notification.permission : 'unsupported'; }catch(e){ return 'unsupported'; }
}
async function requestNotificationPermission(showResult=true){
  try{
    if(!('Notification' in window)){ if(showResult) msg('賴匕丕 丕賱噩賴丕夭 賱丕 賷丿毓賲 廿卮毓丕乇丕鬲 Web 丿丕禺賱 賴匕賴 丕賱賳爻禺丞. 爻賷亘賯賶 毓丿丕丿 丕賱鬲胤亘賷賯 丕賱丿丕禺賱賷 賷毓賲賱.', 'notice'); return false; }
    let p=Notification.permission;
    if(p==='default') p=await Notification.requestPermission();
    state.notifyEnabled = p==='granted';
    state.notifyPermission = p;
    save();
    if(showResult){
      if(p==='granted') showAppDialog('鬲賲 鬲賮毓賷賱 丕賱鬲賳亘賷賴丕鬲','鬲賲 鬲賮毓賷賱 丕賱鬲賳亘賷賴丕鬲 丿丕禺賱 丕賱鬲胤亘賷賯. 馗賴賵乇 丕賱乇賯賲 賮賵賯 兀賷賯賵賳丞 丕賱鬲胤亘賷賯 賷毓鬲賲丿 毓賱賶 賳賵毓 丕賱賴丕鬲賮 賵丕賱賱丕賳卮乇.', 'success', [{text:'賲賵丕賮賯',cls:'ok'}]);
      else showAppDialog('丕賱鬲賳亘賷賴丕鬲 睾賷乇 賲賮毓賱丞','賱賲 賷鬲賲 賲賳丨 氐賱丕丨賷丞 丕賱鬲賳亘賷賴丕鬲. 賷賲賰賳賰 鬲賮毓賷賱賴丕 賲賳 廿毓丿丕丿丕鬲 丕賱賴丕鬲賮貙 賵爻賷亘賯賶 毓丿丕丿 丕賱鬲賳亘賷賴丕鬲 丿丕禺賱 丕賱鬲胤亘賷賯 馗丕賴乇賸丕.', 'warn', [{text:'賲賵丕賮賯',cls:'ok'}]);
    }
    updateAndroidLauncherBadge();
    return p==='granted';
  }catch(e){ console.warn('notification permission failed',e); if(showResult) msg('鬲毓匕乇 胤賱亘 氐賱丕丨賷丞 丕賱鬲賳亘賷賴丕鬲: '+(e.message||e),'error'); return false; }
}
function appNotificationCounters(){
  try{ return unreadCounters(); }catch(e){ return {orders:0,messages:0,payments:0,returns:0,schedules:0,notifications:0}; }
}
function updateAndroidLauncherBadge(){
  try{
    if(!state.profileDone) return;
    const c=appNotificationCounters();
    const total=Number(c.notifications||0);
    const parts=[];
    if(c.messages) parts.push('乇爻丕卅賱: '+c.messages);
    if(c.orders) parts.push('胤賱亘丕鬲: '+c.orders);
    if(c.payments) parts.push('爻丿丕丿: '+c.payments);
    if(c.returns) parts.push('賲乇鬲噩毓丕鬲: '+c.returns);
    if(c.schedules) parts.push('丕爻鬲丨賯丕賯丕鬲: '+c.schedules);
    const detail=parts.length?parts.join(' | '):'賱丕 鬲賵噩丿 賲乇丕噩毓丕鬲 噩丿賷丿丞';
    if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.updateLauncherBadge==='function') window.hesabiAndroidBridge.updateLauncherBadge(total, detail);
    try{ document.querySelectorAll('[data-home-page="notifications"] .qbadge,[data-tab="notifications"] .nav-badge').forEach(el=>{el.textContent=total>99?'99+':String(total);}); }catch(e){}
  }catch(e){console.warn('Android badge update skipped',e)}
}
function clearAllNotificationCounters(){
  markNotificationsRead();
  try{ if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.updateLauncherBadge==='function') window.hesabiAndroidBridge.updateLauncherBadge(0, '賱丕 鬲賵噩丿 賲乇丕噩毓丕鬲 噩丿賷丿丞'); }catch(e){}
  renderNav();
  if(active==='notifications') renderNotifications();
}
async function markMessagesReadForActiveUser(){
  try{
    if(!db || !state.shopId || !state.profileDone) return;
    const updates=[];
    const now=Date.now();
    for(const m of (cache.messages||[])){
      const other = state.role==='trader' ? m.fromRole==='customer' : m.fromRole==='trader';
      if(!other) continue;
      if(state.role==='trader' && !m.readByTrader) updates.push(updateDoc(doc(db,'shops',state.shopId,'messages',m.id),{readByTrader:true,readAt:serverTimestamp(),updatedAt:serverTimestamp(),readMs:now}).catch(e=>console.warn('mark trader read failed',e)));
      if(state.role==='customer' && !m.readByCustomer) updates.push(updateDoc(doc(db,'shops',state.shopId,'messages',m.id),{readByCustomer:true,readAt:serverTimestamp(),updatedAt:serverTimestamp(),readMs:now}).catch(e=>console.warn('mark customer read failed',e)));
    }
    if(updates.length) await Promise.all(updates);
    markPageNotificationsRead('messages');
  }catch(e){ console.warn('mark messages read failed',e); }
}
window.hesabiReceiveFcmToken = async function(token){
  try{
    if(!token || !db || !uid() || !state.profileDone || !state.shopId) return;
    const payload=nativeSessionPayload();
    await setDoc(doc(db,'deviceTokens',token),{
      ...payload,
      token,
      platform:'android',
      userAgent:navigator.userAgent || '',
      enabled:true,
      updatedAt:serverTimestamp()
    },{merge:true});
  }catch(e){console.warn('FCM token save failed',e)}
};
window.hesabiOpenFromNotification = function(page){
  try{
    const allowed=['home','orders','payments','messages','returns','schedules','notifications','statement','invoices','collections','reports'];
    if(allowed.includes(page)) { active=page; render(); }
    else { active='notifications'; render(); }
  }catch(e){console.warn('open notification failed',e)}
};

function requireAuth(){ if(!uid()){msg('賷噩亘 鬲爻噩賷賱 丕賱丿禺賵賱 兀賵賱賸丕','error'); return false} return true }
function validPhoneOrWarn(phone,label='乇賯賲 丕賱賴丕鬲賮'){
  const key=normalizePhone(phone);
  if(key.length<7){msg(label+' 睾賷乇 氐丨賷丨 兀賵 賯氐賷乇 噩丿賸丕','error'); return null}
  return key;
}
function verifiedCurrentPhoneKey(){
  const fromUser = normalizePhone(currentUser?.phoneNumber || '');
  const fromState = normalizePhone(state.authPhoneNumber || state.authPhoneKey || '');
  if(fromUser) return fromUser;
  if(state.authProvider==='phone' && fromState) return fromState;
  return '';
}
function canClaimRecordByVerifiedPhone(recordPhoneKey){
  const k=normalizePhone(recordPhoneKey || '');
  const verified=verifiedCurrentPhoneKey();
  return !!(k && verified && k===verified);
}
function isPhoneAuthSession(){return state.authProvider==='phone' || !!currentUser?.phoneNumber || !!state.authPhoneNumber}
function verifiedPhoneDisplay(){
  const k=verifiedCurrentPhoneKey() || normalizePhone(state.authPhoneNumber || state.authPhoneKey || '');
  return k ? phoneKeyToInternational(k) : '';
}
function requireVerifiedPhoneInput(phone,label='乇賯賲 丕賱賴丕鬲賮'){
  const key=validPhoneOrWarn(phone,label);
  if(!key) return null;
  const verified=verifiedCurrentPhoneKey();
  if(isPhoneAuthSession() && verified && key!==verified){
    msg(`${label} 賷噩亘 兀賳 賷賰賵賳 賳賮爻 丕賱乇賯賲 丕賱匕賷 鬲賲 丕賱鬲丨賯賯 賲賳賴 亘賰賵丿 SMS: ${phoneKeyToInternational(verified)}`,'error');
    return null;
  }
  return key;
}
async function saveUserAccountProfile(extra={}){
  try{
    if(!db || !uid()) return;
    const phoneKey=verifiedCurrentPhoneKey() || state.authPhoneKey || '';
    const payload={
      uid:uid(),
      authProvider:state.authProvider || (currentUser?.phoneNumber?'phone':'email'),
      authPhoneNumber:state.authPhoneNumber || currentUser?.phoneNumber || (phoneKey?phoneKeyToInternational(phoneKey):''),
      authPhoneKey:phoneKey,
      authEmail:(currentUser?.email||state.authEmail||''),
      role:state.role || '',
      profileDone:!!state.profileDone,
      shopId:state.shopId || '',
      activeShopId:state.activeShopId || state.shopId || '',
      customerId:state.customerId || '',
      shopName:state.shopName || cache.shop?.name || '',
      customerName:state.customerName || '',
      customerPhone:state.customerPhone || '',
      customerLinks:Array.isArray(state.customerLinks)?state.customerLinks:[],
      updatedAt:serverTimestamp(),
      lastSeenAt:serverTimestamp(),
      lastSeenMs:Date.now(),
      online:true,
      ...extra
    };
    await setDoc(doc(db,'users',uid()),payload,{merge:true});
    if(phoneKey){
      await setDoc(doc(db,'phoneUidLinks',phoneKey),{phoneKey,uid:uid(),provider:payload.authProvider,updatedAt:serverTimestamp()},{merge:true});
    }
  }catch(e){console.warn('save user profile failed',e)}
}

let presenceTimer=null;
function startPresenceHeartbeat(){
  if(presenceTimer || !db || !uid()) return;
  const beat=()=>saveUserAccountProfile({lastSeenMs:Date.now(),online:true});
  beat();
  presenceTimer=setInterval(beat,60000);
  try{document.addEventListener('visibilitychange',()=>{if(!document.hidden) beat();});}catch(e){}
}

async function loadUserAccountProfile(){
  try{
    if(!db || !uid()) return false;
    const snap=await getDoc(doc(db,'users',uid()));
    if(!snap.exists()) return false;
    const d=snap.data()||{};
    if(d.role) state.role=d.role;
    if(d.profileDone){
      state.profileDone=true;
      if(d.shopId) state.shopId=d.shopId;
      if(d.activeShopId) state.activeShopId=d.activeShopId;
      if(d.customerId) state.customerId=d.customerId;
      if(d.shopName) state.shopName=d.shopName;
      if(d.customerName) state.customerName=d.customerName;
      if(d.customerPhone) state.customerPhone=d.customerPhone;
      if(Array.isArray(d.customerLinks)) state.customerLinks=d.customerLinks;
    }
    if(d.authPhoneKey && !state.authPhoneKey) state.authPhoneKey=d.authPhoneKey;
    if(d.authPhoneNumber && !state.authPhoneNumber) state.authPhoneNumber=d.authPhoneNumber;
    save();
    return !!d.profileDone;
  }catch(e){console.warn('load user profile failed',e); return false;}
}
async function afterSuccessfulAuthLogin(){
  try{
    await loadUserAccountProfile();
    await saveUserAccountProfile({lastLoginAt:serverTimestamp()});
  }catch(e){console.warn('after login profile sync failed',e)}
}
window.addEventListener('online',onlineBadge);window.addEventListener('offline',onlineBadge);onlineBadge();
applyAppearance();
function isIgnorableBrowserError(m){
  m=String(m||'');
  return m==='Script error.' || m==='Script error' ||
    m.includes('reading getContext') ||
    m.includes('Cannot read properties of undefined') && m.includes('getContext') ||
    m.includes('ResizeObserver loop') ||
    m.includes('Non-Error promise rejection captured');
}
window.addEventListener('error',e=>{try{const m=String(e.message||e.error?.message||e||''); console.warn('window.error',m,e.error||e); if(isIgnorableBrowserError(m)) return; showStartupRecoveryDialog(m)}catch{}});
window.addEventListener('unhandledrejection',e=>{try{const m=String(e.reason?.message||e.reason||e); console.warn('unhandledrejection',m,e.reason); if(isIgnorableBrowserError(m)) return; showStartupRecoveryDialog(m)}catch{}});

function normalizeCustomerLinks(){
  if(state.role==='customer'){
    if(!Array.isArray(state.customerLinks)) state.customerLinks=[];
    if(state.customerId && state.shopId && !state.customerLinks.some(x=>x.shopId===state.shopId && x.customerId===state.customerId)){
      state.customerLinks.push({shopId:state.shopId,customerId:state.customerId,customerName:state.customerName||'毓賲賷賱',customerPhone:state.customerPhone||'',shopName:state.shopName||state.shopId});
    }
    if(state.customerLinks.length && (!state.activeShopId || !state.customerLinks.some(x=>x.shopId===state.activeShopId))){
      state.activeShopId=state.customerLinks[0].shopId;
    }
    const link=currentCustomerLink();
    if(link){state.shopId=link.shopId; state.customerId=link.customerId; state.customerName=link.customerName; state.customerPhone=link.customerPhone||state.customerPhone||''; state.shopName=link.shopName||link.shopId;}
    save();
  }
}
function currentCustomerLink(){return (state.customerLinks||[]).find(x=>x.shopId===state.activeShopId) || (state.customerLinks||[])[0] || null}
function setActiveCustomerShop(shopId){
  const link=(state.customerLinks||[]).find(x=>x.shopId===shopId);
  if(!link){msg('賱賲 賷鬲賲 丕賱毓孬賵乇 毓賱賶 賴匕丕 丕賱鬲丕噩乇 賮賷 乇賵丕亘胤賰','error');return}
  state.activeShopId=shopId; state.shopId=link.shopId; state.customerId=link.customerId; state.customerName=link.customerName; state.customerPhone=link.customerPhone||''; state.shopName=link.shopName||shopId; save(); resetCacheForLiveData(); listenersStartedKey=''; startListeners(); active='home'; render(); msg('鬲賲 丕賱鬲亘丿賷賱 廿賱賶 丨爻丕亘: '+(link.shopName||shopId),'success');
}
function beep(kind='notification'){
  if(!state.soundEnabled) return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    const ctx=new AC();
    const selected=state.notifySound || 'classic';
    const presets={
      classic:[880],
      soft:[660,880],
      bell:[1040,1320],
      message:[740,980],
      alert:[620,620,980],
      silent:[]
    };
    const notes=presets[selected]||presets.classic;
    if(!notes.length){ctx.close();return;}
    let t=ctx.currentTime;
    notes.forEach((freq,idx)=>{
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.type=selected==='soft'?'triangle':'sine';
      osc.frequency.value=freq;
      gain.gain.setValueAtTime(0.0001,t);
      gain.gain.exponentialRampToValueAtTime(0.08,t+0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001,t+0.16);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t+0.18);
      t+=0.17;
    });
    setTimeout(()=>ctx.close(), Math.ceil((t-ctx.currentTime+0.25)*1000));
  }catch(e){}
}
function notifyLocal(title,body){
  try{ beep(); }catch(e){}
  if(state.notifyEnabled && 'Notification' in window && Notification.permission==='granted'){
    try{new Notification(title,{body:body||'',tag:'hesabi-'+Date.now(),renotify:false,dir:'rtl'})}catch(e){}
  }
  updateAndroidLauncherBadge();
}
function ensureNotifyState(){
  if(!state.knownNotifyIds) state.knownNotifyIds={};
  if(!state.readNotifyIds) state.readNotifyIds={};
}
function notificationKey(n){return n.id}
function getNotifications(){
  const notes=[];
  const shopName=state.role==='customer' ? (state.shopName||state.shopId||'丕賱鬲丕噩乇') : (cache.shop?.name||'丕賱賲丨賱');
  for(const o of cache.orders||[]){
    if(state.role==='trader' && (o.status==='pending'||o.status==='pending_trader') && o.source!=='trader'){
      notes.push({id:`order:${state.shopId}:${o.id}:${o.status}`,type:'order',page:'orders',createdMs:Number(o.createdMs||0),title:'胤賱亘 卮乇丕亍 噩丿賷丿',body:`${o.customerName||'毓賲賷賱'} - ${money(o.total)} - ${payTypeText(o.paymentType)}`});
    }
    if(state.role==='customer'){
      if(o.status==='pending_customer' && o.source==='trader'){
        notes.push({id:`order:${state.shopId}:${o.id}:pending_customer`,type:'order',page:'orders',createdMs:Number(o.createdMs||0),title:'胤賱亘 亘賷毓 賲賳 丕賱鬲丕噩乇',body:`${shopName} - ${money(o.total)} - 賷丨鬲丕噩 賲賵丕賮賯鬲賰`});
      }
      if((o.status==='approved'||o.status==='rejected'||o.status==='cancelled') && o.source!=='customer_ack'){
        notes.push({id:`order:${state.shopId}:${o.id}:${o.status}`,type:'order',page:'orders',createdMs:Number(o.createdMs||Date.now()),title:o.status==='approved'?'鬲賲 賯亘賵賱 胤賱亘賰':(o.status==='cancelled'?'鬲賲 廿賱睾丕亍 丕賱胤賱亘':'鬲賲 乇賮囟 胤賱亘賰'),body:`${shopName} - ${money(o.total)}${o.traderNote?' - '+o.traderNote:''}`});
      }
    }
  }
  for(const p of cache.payments||[]){
    if(state.role==='trader' && p.status==='pending'){
      notes.push({id:`payment:${state.shopId}:${p.id}:pending`,type:'payment',page:'payments',createdMs:Number(p.createdMs||0),title:'胤賱亘 爻丿丕丿 噩丿賷丿',body:`${p.customerName||'毓賲賷賱'} - ${money(p.amount)}`});
    }
    if(state.role==='customer' && (p.status==='approved'||p.status==='rejected')){
      notes.push({id:`payment:${state.shopId}:${p.id}:${p.status}`,type:'payment',page:'payments',createdMs:Number(p.createdMs||Date.now()),title:p.status==='approved'?'鬲賲 賯亘賵賱 丕賱爻丿丕丿':'鬲賲 乇賮囟 丕賱爻丿丕丿',body:`${money(p.amount)}${p.traderNote?' - '+p.traderNote:''}`});
    }
  }
  for(const r of cache.returns||[]){
    if(state.role==='trader' && r.status==='pending'){
      notes.push({id:`return:${state.shopId}:${r.id}:pending`,type:'return',page:'returns',createdMs:Number(r.createdMs||0),title:'胤賱亘 賲乇鬲噩毓 噩丿賷丿',body:`${r.customerName||'毓賲賷賱'} - ${esc(r.itemName||'氐賳賮')} - ${money(r.amount)}`});
    }
    if(state.role==='customer' && (r.status==='approved'||r.status==='rejected')){
      notes.push({id:`return:${state.shopId}:${r.id}:${r.status}`,type:'return',page:'returns',createdMs:Number(r.reviewedMs||r.createdMs||Date.now()),title:r.status==='approved'?'鬲賲 賯亘賵賱 丕賱賲乇鬲噩毓':'鬲賲 乇賮囟 丕賱賲乇鬲噩毓',body:`${esc(r.itemName||'氐賳賮')} - ${money(r.amount)}${r.traderNote?' - '+r.traderNote:''}`});
    }
  }
  const todayIso=new Date().toISOString().slice(0,10);
  for(const sch of cache.schedules||[]){
    if(sch.status!=='pending') continue;
    const due=String(sch.dueDate||'');
    if(due && due<=todayIso){
      const late=due<todayIso;
      if(state.role==='customer') notes.push({id:`schedule:${state.shopId}:${sch.id}:${due}:${sch.status}`,type:'schedule',page:'schedules',createdMs:Number(sch.createdMs||Date.now()),title:late?'賯爻胤 賲鬲兀禺乇':'賯爻胤 賲爻鬲丨賯 丕賱賷賵賲',body:`${shopName} - ${money(sch.amount)} - 鬲丕乇賷禺 丕賱丕爻鬲丨賯丕賯 ${due}`});
      if(state.role==='trader') notes.push({id:`schedule:${state.shopId}:${sch.id}:${due}:${sch.status}`,type:'schedule',page:'schedules',createdMs:Number(sch.createdMs||Date.now()),title:late?'賯爻胤 毓賲賷賱 賲鬲兀禺乇':'賯爻胤 毓賲賷賱 賲爻鬲丨賯 丕賱賷賵賲',body:`${sch.customerName||'毓賲賷賱'} - ${money(sch.amount)} - ${due}`});
    }
  }
  for(const m of cache.messages||[]){
    const other = state.role==='trader' ? m.fromRole==='customer' : m.fromRole==='trader';
    if(other){
      notes.push({id:`message:${state.shopId}:${m.id}`,type:'message',page:'messages',createdMs:Number(m.createdMs||0),title:'乇爻丕賱丞 噩丿賷丿丞',body:`${m.fromName||''}: ${String(m.text||'').slice(0,90)}`});
    }
  }
  return notes.sort((a,b)=>(b.createdMs||0)-(a.createdMs||0));
}
function unreadNotifications(){
  ensureNotifyState();
  return getNotifications().filter(n=>!state.readNotifyIds[notificationKey(n)]);
}
function unreadCount(){return unreadNotifications().length}
function unreadByPage(page){
  return unreadNotifications().filter(n=>n.page===page).length;
}
function unreadCounters(){
  const pages={orders:0,messages:0,payments:0,returns:0,schedules:0,notifications:unreadCount()};
  for(const n of unreadNotifications()){
    if(Object.prototype.hasOwnProperty.call(pages,n.page)) pages[n.page]++;
  }
  return pages;
}
function badgeHtml(count, cls='qbadge'){
  const n=Number(count||0);
  return n>0?`<span class="${cls}">${n>99?'99+':n}</span>`:'';
}
function markPageNotificationsRead(page){
  const before=unreadByPage(page);
  if(before>0){ markNotificationsRead(n=>n.page===page); return true; }
  return false;
}
function checkNotifications(){
  ensureNotifyState();
  const notes=getNotifications();
  const fresh=notes.filter(n=>!state.knownNotifyIds[notificationKey(n)]);
  if(fresh.length){
    for(const n of fresh) state.knownNotifyIds[notificationKey(n)]=Date.now();
    save();
    // 賱丕 賳氐丿乇 氐賵鬲賸丕 毓賳丿 丕賱鬲丨賲賷賱 丕賱兀賵賱 賱賱丨爻丕亘 丨鬲賶 賱丕 賷乇賳 丕賱鬲胤亘賷賯 毓賱賶 亘賷丕賳丕鬲 賯丿賷賲丞 賰孬賷乇丞.
    if(state.notifyInitialized){
      notifyLocal('丨爻丕亘賷 丕賱鬲噩丕乇賷', fresh[0].title + (fresh.length>1 ? ` + ${fresh.length-1}` : ''), fresh[0].body || '');
    }
  }
  if(!state.notifyInitialized){state.notifyInitialized=true; save();}
  updateAndroidLauncherBadge();
}
function markNotificationsRead(filterFn=null){
  ensureNotifyState();
  const notes=getNotifications().filter(n=>!filterFn || filterFn(n));
  for(const n of notes) state.readNotifyIds[notificationKey(n)]=Date.now();
  save();
  updateAndroidLauncherBadge();
}
function openNotificationPage(page){
  const p=page||'notifications';
  show(p);
  if(p!=='notifications') markPageNotificationsRead(p);
  updateAndroidLauncherBadge();
}


