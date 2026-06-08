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

// صلاحيات التطبيق حسب الدور: العميل لا يستطيع تعديل بيانات التاجر أو الأصناف أو الأسعار أو المخزون.
function isTrader(){ return state.role==='trader'; }
function isCustomer(){ return state.role==='customer'; }
function roleName(){ return isTrader()?'تاجر':(isCustomer()?'عميل':'غير محدد'); }

const APP_OWNER_EMAIL='attef7474@gmail.com';
function isAppOwner(){
  const email=(currentUser?.email||state.authEmail||'').toLowerCase();
  return !!(uid() && email===APP_OWNER_EMAIL);
}
function requireAppOwnerAction(action='هذه العملية'){
  if(!isAppOwner()){ msg(action+' خاصة بمالك التطبيق فقط.','error'); return false; }
  return true;
}
function shopSubscriptionText(s){
  return ({active:'نشط',trial:'تجريبي',warning:'إنذار',suspended:'موقوف',expired:'منتهي'}[s]||s||'تجريبي');
}
function shopSubscriptionClass(s){return s==='suspended'?'rejected':(s==='warning'||s==='expired'?'pending':'approved')}
function lastSeenText(ms){
  ms=Number(ms||0); if(!ms) return 'غير معروف';
  const diff=Date.now()-ms;
  if(diff<120000) return 'متصل الآن';
  if(diff<3600000) return 'قبل '+Math.max(2,Math.round(diff/60000))+' دقيقة';
  if(diff<86400000) return 'قبل '+Math.round(diff/3600000)+' ساعة';
  return dateText(ms);
}
function isOnlineMs(ms){return Number(ms||0) && (Date.now()-Number(ms)<120000)}
function permissionDenied(action='هذه العملية'){
  msg(action+' خاصة بحساب التاجر فقط. حساب العميل للطلب والسداد والمراسلة ومتابعة الحساب فقط.','error');
  return false;
}
function requireTraderAction(action='هذه العملية'){
  if(!isTrader()) return permissionDenied(action);
  if(!state.shopId){ msg('لا يوجد متجر نشط لحساب التاجر','error'); return false; }
  return true;
}
function customerReadonlyNotice(){
  return `<div class="notice">أنت داخل التطبيق كعميل. يمكنك مشاهدة الأصناف المتاحة والطلب والسداد فقط. تعديل الأصناف والأسعار والمخزون والسياسات خاص بالتاجر.</div>`;
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
const APP_VERSION='1.0.81';
const APP_BUILD_CODE = 81;
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
  el.innerHTML=`<div class="security-lock-card"><div class="security-lock-icon">🔐</div><h2>قفل التطبيق</h2><p class="muted">أدخل رمز القفل أو استخدم فتح الجهاز إذا كان مفعّلًا.</p><div class="field"><input id="appLockPinInput" type="password" inputmode="numeric" placeholder="رمز القفل"></div><div class="security-lock-actions"><button class="btn ok" id="unlockAppBtn">فتح</button><button class="btn light" id="skipLockBtn">إلغاء القفل لهذه الجلسة</button></div></div>`;
  setTimeout(()=>{
    const pinEl=$('appLockPinInput');
    const sec=state.security||state.appSecurity||{};
    const expected=String(sec.pin||state.appLockPin||state.lockPin||'');
    const unlock=()=>{ const v=String(pinEl?.value||''); if(expected && v!==expected){msg('رمز القفل غير صحيح','error'); return;} markAppUnlocked(); render(); };
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
  return nativeAndroidAvailable()?'APK غير معروف':'متصفح / Web';
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
    msg('تعذر فحص التحديث. تأكد من الإنترنت ثم اضغط تحديث APK مرة أخرى.','error');
    return null;
  }
  const current=nativeVersionCode();
  const latest=latestVersionCodeFromInfo(info);
  const latestName=latestVersionNameFromInfo(info)||latest;
  if(!nativeAndroidAvailable()){
    msg(`أنت تستخدم نسخة Web. آخر APK متاح: ${latestName}.`, 'notice');
  }else if(!current){
    msg(`لم أستطع قراءة إصدار APK المثبت. آخر إصدار متاح: ${latestName}.`, 'notice');
  }else if(latest && latest>current){
    msg(`يوجد تحديث APK جديد: ${latestName}. سيتم تنزيل آخر نسخة متوفرة وليس نسخة قديمة.`, 'notice');
  }else if(showIfNoUpdate){
    msg(`لا يوجد تحديث APK أحدث. المثبت: ${nativeVersionLabel()}، المتاح: ${latestName||'-'}.`, 'success');
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
    const latestName=latestVersionNameFromInfo(info)||'آخر إصدار';
    msg(`جاري تنزيل ${latestName}. إذا كان الهاتف قديمًا ورفض التثبيت بسبب اختلاف التوقيع، احذف النسخة القديمة مرة واحدة ثم ثبت النسخة الجديدة، ولن تتكرر المشكلة بعد تثبيت النسخة الموقعة الثابتة.`, 'notice');
    setTimeout(()=>openApkDownloadUrl(apkUrl), 450);
  }catch(e){
    msg('تعذر بدء تحديث APK: '+(e.message||e),'error');
  }
}
async function autoCheckCriticalApkUpdate(){
  try{
    const info=await fetchAndroidUpdateInfo(); if(!info) return;
    const current=nativeVersionCode(); const latest=latestVersionCodeFromInfo(info);
    const minRequired=Number(info.minimumSupportedVersionCode||0);
    if(nativeAndroidAvailable() && current && ((latest && latest>current && info.required) || (minRequired && current<minRequired))){
      msg('يوجد تحديث مهم للتطبيق. من الأفضل تحديث APK الآن للحصول على آخر الواجهات والصلاحيات بدون مشاكل.', 'notice');
    }
  }catch(e){}
}
async function refreshWebOnly(){
  try{
    msg('جاري تحديث الواجهات فقط بدون تثبيت APK...', 'notice');
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
    msg('تعذر تحديث الواجهات: '+(e.message||e),'error');
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
  ttl.textContent=title||'تنبيه'; bdy.textContent=body||''; icon.textContent=type==='error'?'⚠️':(type==='success'?'✅':(type==='warn'?'🧹':'ℹ️'));
  const list=buttons&&buttons.length?buttons:[{text:'موافق',cls:type==='error'?'danger':'ok',fn:hideAppDialog}];
  acts.className='hesabi-dialog-actions '+(list.length===1?'one':(list.length===3?'three':''));
  acts.innerHTML=list.map((x,i)=>`<button type="button" class="btn ${esc(x.cls||'secondary')}" data-dialog-action="${i}">${esc(x.text||'موافق')}</button>`).join('');
  acts.querySelectorAll('[data-dialog-action]').forEach(btn=>{btn.onclick=()=>{const x=list[Number(btn.dataset.dialogAction)]; try{ if(x.close!==false) hideAppDialog(); if(typeof x.fn==='function') x.fn(); }catch(e){console.warn('dialog action failed',e)} };});
}
function msg(t,type='notice'){
  const dialogs=window.hesabiDialogsToasts;
  if(dialogs&&typeof dialogs.msg==='function') return dialogs.msg(t,type);
  const text=String(t||'');
  const isErr=type==='error'||/خطأ|فشل|تعذر|Missing|Firebase|Uncaught|Error|ReferenceError/i.test(text);
  showAppDialog(isErr?'تنبيه مهم':(type==='success'?'تم بنجاح':'تنبيه'), text, isErr?'error':type);
}
function safeMsg(t,type='notice'){
  const dialogs=window.hesabiDialogsToasts;
  if(dialogs&&typeof dialogs.safeMsg==='function') return dialogs.safeMsg(t,type);
  try{msg(t,type)}catch(e){console.warn('safeMsg failed',e,t)}
}
function showStartupRecoveryDialog(errorText=''){
  const details=errorText?('\n\nالتفاصيل: '+String(errorText).slice(0,180)):'';
  showAppDialog('تعذر تشغيل الصفحة', 'حصل خلل في تحميل الواجهة. يمكنك إصلاحه الآن بدون الخروج من التطبيق.'+details, 'warn', [
    {text:'تحديث الواجهات',cls:'ok',fn:async()=>{try{await refreshWebUiNow()}catch(e){} try{location.replace(location.pathname+'?v='+Date.now())}catch(e){location.reload()}}},
    {text:'تنظيف الكاش',cls:'warn',fn:async()=>{try{await refreshWebUiNow()}catch(e){} try{location.replace(location.pathname+'?clean='+Date.now())}catch(e){location.reload()}}},
    {text:'تحديث APK',cls:'secondary',fn:()=>{try{downloadApkUpdate()}catch(e){location.href=latestApkDirectUrl()}}}
  ]);
}

function money(n){const u=hesabiUtils(); if(typeof u.formatMoney==='function') return u.formatMoney(n,'ريال'); return Number(n||0).toLocaleString('ar-YE')+' ريال'}
function todayIso(){const u=hesabiUtils(); if(typeof u.todayIso==='function') return u.todayIso(); return new Date().toISOString().slice(0,10)}
function fileToDataUrl(file, maxBytes=700000){
  const u=hesabiUtils();
  if(typeof u.fileToDataUrl==='function') return u.fileToDataUrl(file,maxBytes);
  return new Promise((resolve,reject)=>{
    if(!file){resolve(null);return}
    if(file.size>maxBytes){reject(new Error('حجم صورة الإيصال كبير جدًا. اختر صورة أقل من 700KB أو صغّرها قبل الإرسال.'));return}
    const r=new FileReader(); r.onload=()=>resolve({name:file.name,type:file.type,size:file.size,dataUrl:r.result}); r.onerror=()=>reject(new Error('تعذر قراءة صورة الإيصال')); r.readAsDataURL(file);
  })
}
function id(prefix){const u=hesabiUtils(); if(typeof u.makeId==='function') return u.makeId(prefix); return prefix+'-'+Math.random().toString(36).slice(2,7).toUpperCase()+Date.now().toString().slice(-4)}
function statusText(s){return ({pending:'معلّق',pending_trader:'بانتظار موافقة التاجر',pending_customer:'بانتظار موافقة العميل',approved:'مقبول',rejected:'مرفوض',cancelled:'ملغي'}[s]||s||'معلّق')}
function payTypeText(v){return v==='credit'?'آجل':'كاش'}
function ledgerTypeText(v){return ({debit_invoice:'فاتورة آجل',cash_invoice:'فاتورة كاش',payment:'سداد',return_credit:'مرتجع آجل',return_cash:'مرتجع كاش',adjustment:'تسوية'}[v]||v||'حركة')}
function onlineBadge(){const on=navigator.onLine;$('netBadge').className='badge '+(on?'online':'offline');$('netBadge').textContent=on?'متصل بالإنترنت':'غير متصل'}
function normalizePhone(v){
  const u=hesabiUtils();
  if(typeof u.normalizePhone==='function') return u.normalizePhone(v);
  let x=String(v||'').trim();
  const ar='٠١٢٣٤٥٦٧٨٩'; const fa='۰۱۲۳۴۵۶۷۸۹';
  x=x.replace(/[٠-٩]/g,d=>String(ar.indexOf(d))).replace(/[۰-۹]/g,d=>String(fa.indexOf(d)));
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
  const ar='٠١٢٣٤٥٦٧٨٩'; const fa='۰۱۲۳۴۵۶۷۸۹';
  raw=raw.replace(/[٠-٩]/g,d=>String(ar.indexOf(d))).replace(/[۰-۹]/g,d=>String(fa.indexOf(d)));
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
    if(!('Notification' in window)){ if(showResult) msg('هذا الجهاز لا يدعم إشعارات Web داخل هذه النسخة. سيبقى عداد التطبيق الداخلي يعمل.', 'notice'); return false; }
    let p=Notification.permission;
    if(p==='default') p=await Notification.requestPermission();
    state.notifyEnabled = p==='granted';
    state.notifyPermission = p;
    save();
    if(showResult){
      if(p==='granted') showAppDialog('تم تفعيل التنبيهات','تم تفعيل التنبيهات داخل التطبيق. ظهور الرقم فوق أيقونة التطبيق يعتمد على نوع الهاتف واللانشر.', 'success', [{text:'موافق',cls:'ok'}]);
      else showAppDialog('التنبيهات غير مفعلة','لم يتم منح صلاحية التنبيهات. يمكنك تفعيلها من إعدادات الهاتف، وسيبقى عداد التنبيهات داخل التطبيق ظاهرًا.', 'warn', [{text:'موافق',cls:'ok'}]);
    }
    updateAndroidLauncherBadge();
    return p==='granted';
  }catch(e){ console.warn('notification permission failed',e); if(showResult) msg('تعذر طلب صلاحية التنبيهات: '+(e.message||e),'error'); return false; }
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
    if(c.messages) parts.push('رسائل: '+c.messages);
    if(c.orders) parts.push('طلبات: '+c.orders);
    if(c.payments) parts.push('سداد: '+c.payments);
    if(c.returns) parts.push('مرتجعات: '+c.returns);
    if(c.schedules) parts.push('استحقاقات: '+c.schedules);
    const detail=parts.length?parts.join(' | '):'لا توجد مراجعات جديدة';
    if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.updateLauncherBadge==='function') window.hesabiAndroidBridge.updateLauncherBadge(total, detail);
    try{ document.querySelectorAll('[data-home-page="notifications"] .qbadge,[data-tab="notifications"] .nav-badge').forEach(el=>{el.textContent=total>99?'99+':String(total);}); }catch(e){}
  }catch(e){console.warn('Android badge update skipped',e)}
}
function clearAllNotificationCounters(){
  markNotificationsRead();
  try{ if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.updateLauncherBadge==='function') window.hesabiAndroidBridge.updateLauncherBadge(0, 'لا توجد مراجعات جديدة'); }catch(e){}
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

function requireAuth(){ if(!uid()){msg('يجب تسجيل الدخول أولًا','error'); return false} return true }
function validPhoneOrWarn(phone,label='رقم الهاتف'){
  const key=normalizePhone(phone);
  if(key.length<7){msg(label+' غير صحيح أو قصير جدًا','error'); return null}
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
function requireVerifiedPhoneInput(phone,label='رقم الهاتف'){
  const key=validPhoneOrWarn(phone,label);
  if(!key) return null;
  const verified=verifiedCurrentPhoneKey();
  if(isPhoneAuthSession() && verified && key!==verified){
    msg(`${label} يجب أن يكون نفس الرقم الذي تم التحقق منه بكود SMS: ${phoneKeyToInternational(verified)}`,'error');
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
      state.customerLinks.push({shopId:state.shopId,customerId:state.customerId,customerName:state.customerName||'عميل',customerPhone:state.customerPhone||'',shopName:state.shopName||state.shopId});
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
  if(!link){msg('لم يتم العثور على هذا التاجر في روابطك','error');return}
  state.activeShopId=shopId; state.shopId=link.shopId; state.customerId=link.customerId; state.customerName=link.customerName; state.customerPhone=link.customerPhone||''; state.shopName=link.shopName||shopId; save(); resetCacheForLiveData(); listenersStartedKey=''; startListeners(); active='home'; render(); msg('تم التبديل إلى حساب: '+(link.shopName||shopId),'success');
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
  const shopName=state.role==='customer' ? (state.shopName||state.shopId||'التاجر') : (cache.shop?.name||'المحل');
  for(const o of cache.orders||[]){
    if(state.role==='trader' && (o.status==='pending'||o.status==='pending_trader') && o.source!=='trader'){
      notes.push({id:`order:${state.shopId}:${o.id}:${o.status}`,type:'order',page:'orders',createdMs:Number(o.createdMs||0),title:'طلب شراء جديد',body:`${o.customerName||'عميل'} - ${money(o.total)} - ${payTypeText(o.paymentType)}`});
    }
    if(state.role==='customer'){
      if(o.status==='pending_customer' && o.source==='trader'){
        notes.push({id:`order:${state.shopId}:${o.id}:pending_customer`,type:'order',page:'orders',createdMs:Number(o.createdMs||0),title:'طلب بيع من التاجر',body:`${shopName} - ${money(o.total)} - يحتاج موافقتك`});
      }
      if((o.status==='approved'||o.status==='rejected'||o.status==='cancelled') && o.source!=='customer_ack'){
        notes.push({id:`order:${state.shopId}:${o.id}:${o.status}`,type:'order',page:'orders',createdMs:Number(o.createdMs||Date.now()),title:o.status==='approved'?'تم قبول طلبك':(o.status==='cancelled'?'تم إلغاء الطلب':'تم رفض طلبك'),body:`${shopName} - ${money(o.total)}${o.traderNote?' - '+o.traderNote:''}`});
      }
    }
  }
  for(const p of cache.payments||[]){
    if(state.role==='trader' && p.status==='pending'){
      notes.push({id:`payment:${state.shopId}:${p.id}:pending`,type:'payment',page:'payments',createdMs:Number(p.createdMs||0),title:'طلب سداد جديد',body:`${p.customerName||'عميل'} - ${money(p.amount)}`});
    }
    if(state.role==='customer' && (p.status==='approved'||p.status==='rejected')){
      notes.push({id:`payment:${state.shopId}:${p.id}:${p.status}`,type:'payment',page:'payments',createdMs:Number(p.createdMs||Date.now()),title:p.status==='approved'?'تم قبول السداد':'تم رفض السداد',body:`${money(p.amount)}${p.traderNote?' - '+p.traderNote:''}`});
    }
  }
  for(const r of cache.returns||[]){
    if(state.role==='trader' && r.status==='pending'){
      notes.push({id:`return:${state.shopId}:${r.id}:pending`,type:'return',page:'returns',createdMs:Number(r.createdMs||0),title:'طلب مرتجع جديد',body:`${r.customerName||'عميل'} - ${esc(r.itemName||'صنف')} - ${money(r.amount)}`});
    }
    if(state.role==='customer' && (r.status==='approved'||r.status==='rejected')){
      notes.push({id:`return:${state.shopId}:${r.id}:${r.status}`,type:'return',page:'returns',createdMs:Number(r.reviewedMs||r.createdMs||Date.now()),title:r.status==='approved'?'تم قبول المرتجع':'تم رفض المرتجع',body:`${esc(r.itemName||'صنف')} - ${money(r.amount)}${r.traderNote?' - '+r.traderNote:''}`});
    }
  }
  const todayIso=new Date().toISOString().slice(0,10);
  for(const sch of cache.schedules||[]){
    if(sch.status!=='pending') continue;
    const due=String(sch.dueDate||'');
    if(due && due<=todayIso){
      const late=due<todayIso;
      if(state.role==='customer') notes.push({id:`schedule:${state.shopId}:${sch.id}:${due}:${sch.status}`,type:'schedule',page:'schedules',createdMs:Number(sch.createdMs||Date.now()),title:late?'قسط متأخر':'قسط مستحق اليوم',body:`${shopName} - ${money(sch.amount)} - تاريخ الاستحقاق ${due}`});
      if(state.role==='trader') notes.push({id:`schedule:${state.shopId}:${sch.id}:${due}:${sch.status}`,type:'schedule',page:'schedules',createdMs:Number(sch.createdMs||Date.now()),title:late?'قسط عميل متأخر':'قسط عميل مستحق اليوم',body:`${sch.customerName||'عميل'} - ${money(sch.amount)} - ${due}`});
    }
  }
  for(const m of cache.messages||[]){
    const other = state.role==='trader' ? m.fromRole==='customer' : m.fromRole==='trader';
    if(other){
      notes.push({id:`message:${state.shopId}:${m.id}`,type:'message',page:'messages',createdMs:Number(m.createdMs||0),title:'رسالة جديدة',body:`${m.fromName||''}: ${String(m.text||'').slice(0,90)}`});
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
    // لا نصدر صوتًا عند التحميل الأول للحساب حتى لا يرن التطبيق على بيانات قديمة كثيرة.
    if(state.notifyInitialized){
      notifyLocal('حسابي التجاري', fresh[0].title + (fresh.length>1 ? ` + ${fresh.length-1}` : ''), fresh[0].body || '');
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

