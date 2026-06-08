async function initFirebase(){
  if(!state.firebaseConfig?.apiKey) return false;
  try{ app=initializeApp(state.firebaseConfig); db=getFirestore(app); auth=getAuth(app); try{await enableIndexedDbPersistence(db)}catch(e){} return true; }
  catch(e){console.error(e); msg('فشل الاتصال بـ Firebase: '+e.message,'error'); return false;}
}

async function waitForAuth(){
  if(!auth) return null;
  if(authReady) return currentUser;
  return new Promise(resolve=>{
    let resolved=false;
    const applyUser=(u)=>{
      currentUser=u||null;
      if(u?.uid) state.uid=u.uid;
      if(u?.email) state.authEmail=u.email;
      if(u?.phoneNumber){ state.authPhoneNumber=u.phoneNumber; state.authPhoneKey=normalizePhone(u.phoneNumber); state.authProvider='phone'; }
      save();
    };
    const resolveOnce=(u)=>{
      if(resolved) return;
      resolved=true;
      applyUser(u);
      authReady=true;
      resolve(currentUser);
      render();
    };
    try{
      onAuthStateChanged(auth,u=>{
        applyUser(u);
        if(!authReady) resolveOnce(u);
        else render();
      },err=>{
        console.error(err);
        msg('تعذر قراءة جلسة الدخول: '+(err.message||err),'error');
        if(!authReady) resolveOnce(null);
      });
    }catch(e){
      console.error(e);
      msg('تعذر بدء Firebase Auth: '+(e.message||e),'error');
      resolveOnce(null);
    }
    // في بعض متصفحات أندرويد عند فتح الملف المحلي content:// قد لا يرجع Auth بسرعة.
    // لا نترك الصفحة فارغة؛ نعرض شاشة الدخول، لكن إذا وصل المستخدم لاحقًا نحدث الواجهة.
    setTimeout(()=>resolveOnce(auth.currentUser||currentUser), 2500);
  });
}
function liveDataKey(){return [uid(),state.role||'',state.shopId||'',state.customerId||'',state.activeShopId||''].join('|')}
function resetCacheForLiveData(){cache={shop:null,items:[],customers:[],orders:[],payments:[],messages:[],invoices:[],customerLedger:[],auditLogs:[],stockLedger:[],returns:[],schedules:[]}}
function ensureLiveDataListeners(){
  if(!db || !uid() || !state.profileDone || !state.shopId) return;
  const key=liveDataKey();
  if(listenersStartedKey===key && unsub.length) return;
  listenersStartedKey=key;
  resetCacheForLiveData();
  startListeners();
}


function appearanceKey(){
  return uid() || state.uid || state.authPhoneKey || 'guest';
}
function defaultAppearance(){
  return {theme:'light',accent:'teal',brightness:100,background:'glass',compact:true};
}
function getAppearance(){
  const d=defaultAppearance();
  try{
    if(!state.appearanceByUser || typeof state.appearanceByUser!=='object') state.appearanceByUser={};
    const key=appearanceKey();
    const saved=state.appearanceByUser[key] || state.appearance || {};
    return {...d,...saved,brightness:Number(saved.brightness||d.brightness),compact:saved.compact!==false};
  }catch(e){return d;}
}
function saveAppearanceSettings(settings){
  try{
    const current=getAppearance();
    const clean={...current,...(settings||{})};
    clean.theme=clean.theme==='dark'?'dark':'light';
    clean.accent=['teal','blue','green','purple','orange'].includes(clean.accent)?clean.accent:'teal';
    clean.background=['glass','soft','plain'].includes(clean.background)?clean.background:'glass';
    clean.brightness=Math.min(120,Math.max(75,Number(clean.brightness||100)));
    clean.compact=clean.compact!==false;
    if(!state.appearanceByUser || typeof state.appearanceByUser!=='object') state.appearanceByUser={};
    state.appearanceByUser[appearanceKey()]=clean;
    delete state.appearance;
    save();
    applyAppearance();
  }catch(e){console.warn('save appearance failed',e)}
}


function dualRoleProfileFor(role){
  if(!state.roleProfiles) state.roleProfiles={};
  return state.roleProfiles[role] || null;
}
function rememberCurrentDualRoleProfile(){
  if(!state.profileDone || !state.role) return;
  if(!state.roleProfiles) state.roleProfiles={};
  if(state.role==='trader' && state.shopId){
    state.roleProfiles.trader={role:'trader',profileDone:true,shopId:state.shopId,shopName:state.shopName||cache.shop?.name||'',traderPin:state.traderPin||'',savedAt:Date.now()};
  }
  if(state.role==='customer' && (state.customerId || (state.customerLinks||[]).length)){
    state.roleProfiles.customer={role:'customer',profileDone:true,shopId:state.shopId||'',activeShopId:state.activeShopId||state.shopId||'',customerId:state.customerId||'',customerName:state.customerName||'',customerPhone:state.customerPhone||'',shopName:state.shopName||'',customerLinks:Array.isArray(state.customerLinks)?state.customerLinks:[],savedAt:Date.now()};
  }
}
function applyDualRoleProfile(role){
  const p=dualRoleProfileFor(role);
  state.role=role;
  if(p && p.profileDone){
    state.profileDone=true;
    if(role==='trader'){
      state.shopId=p.shopId||''; state.shopName=p.shopName||''; if(p.traderPin) state.traderPin=p.traderPin;
      delete state.customerId; delete state.customerName; delete state.customerPhone; delete state.activeShopId;
    }else{
      state.shopId=p.shopId||p.activeShopId||''; state.activeShopId=p.activeShopId||p.shopId||''; state.customerId=p.customerId||''; state.customerName=p.customerName||''; state.customerPhone=p.customerPhone||''; state.shopName=p.shopName||''; state.customerLinks=Array.isArray(p.customerLinks)?p.customerLinks:[];
    }
    resetCacheForLiveData(); listenersStartedKey=''; active='home'; save(); render(); msg('تم التبديل إلى وضع '+(role==='trader'?'تاجر':'عميل'),'success');
  }else{
    state.profileDone=false; active='home'; save(); render(); msg('أكمل تهيئة وضع '+(role==='trader'?'تاجر':'عميل')+' لهذا الحساب.','notice');
  }
}
function renderDualRoleSettingsBlock(){
  rememberCurrentDualRoleProfile();
  const hasTrader=!!dualRoleProfileFor('trader');
  const hasCustomer=!!dualRoleProfileFor('customer');
  const current=state.role==='trader'?'تاجر':'عميل';
  return `<div class="card"><h2>وضع الحساب: تاجر وعميل</h2><div class="dual-role-card"><div class="row"><b>الوضع الحالي</b><span class="dual-role-pill">${current}</span></div><p class="muted">يمكن لنفس رقم الدخول أن يعمل كتاجر وعميل. عند تهيئة الوضعين تستطيع التبديل بينهما بدون تسجيل خروج.</p><div><span class="dual-role-pill ${hasTrader?'':'off'}">تاجر: ${hasTrader?'مفعل':'غير مفعل'}</span><span class="dual-role-pill ${hasCustomer?'':'off'}">عميل: ${hasCustomer?'مفعل':'غير مفعل'}</span></div><div class="dual-role-actions"><button class="btn secondary" id="dualSwitchTrader">الدخول كتاجر</button><button class="btn secondary" id="dualSwitchCustomer">الدخول كعميل</button><button class="btn light" id="dualSetupTrader">تهيئة/استرجاع تاجر</button><button class="btn light" id="dualSetupCustomer">ربط تاجر كعميل</button></div></div></div>`;
}
function bindDualRoleSettingsControls(){
  const go=(role,forceSetup=false)=>{rememberCurrentDualRoleProfile(); if(forceSetup){state.role=role; state.profileDone=false; save(); resetCacheForLiveData(); listenersStartedKey=''; render(); return;} applyDualRoleProfile(role);};
  if($('dualSwitchTrader')) $('dualSwitchTrader').onclick=()=>go('trader',false);
  if($('dualSwitchCustomer')) $('dualSwitchCustomer').onclick=()=>go('customer',false);
  if($('dualSetupTrader')) $('dualSetupTrader').onclick=()=>go('trader',true);
  if($('dualSetupCustomer')) $('dualSetupCustomer').onclick=()=>go('customer',true);
}
function applyAppearance(){
  try{
    const a=getAppearance();
    const palettes={
      teal:['#0f766e','#14b8a6','#0b5f5a'],
      blue:['#2563eb','#60a5fa','#1d4ed8'],
      green:['#15803d','#22c55e','#166534'],
      purple:['#7c3aed','#a78bfa','#6d28d9'],
      orange:['#ea580c','#fb923c','#c2410c']
    };
    const [p1,p2,p3]=palettes[a.accent]||palettes.teal;
    const root=document.documentElement;
    root.style.setProperty('--primary',p1);
    root.style.setProperty('--primary2',p2);
    root.style.setProperty('--primaryDark',p3);
    if(a.theme==='dark'){
      root.style.setProperty('--bg','#0f172a');
      root.style.setProperty('--bg2','#111827');
      root.style.setProperty('--card','rgba(30,41,59,.96)');
      root.style.setProperty('--text','#e5e7eb');
      root.style.setProperty('--muted','#cbd5e1');
      root.style.setProperty('--line','#334155');
      root.style.setProperty('--soft','#0f2f33');
    }else{
      root.style.setProperty('--bg', a.background==='plain'?'#f8fafc':'#eef6f7');
      root.style.setProperty('--bg2','#f8fbff');
      root.style.setProperty('--card','rgba(255,255,255,.94)');
      root.style.setProperty('--text','#102033');
      root.style.setProperty('--muted','#64748b');
      root.style.setProperty('--line','#dbe7ee');
      root.style.setProperty('--soft','#ecfeff');
    }
    if(document.body){
      document.body.dataset.theme=a.theme;
      document.body.dataset.background=a.background;
      document.body.dataset.compact=a.compact?'yes':'no';
      root.style.setProperty('--app-brightness', `${Number(a.brightness||100)}%`);
      document.body.style.filter='';
      if(a.background==='plain') document.body.style.background=a.theme==='dark'?'#0f172a':'#f8fafc';
      else if(a.background==='soft') document.body.style.background=a.theme==='dark'?'linear-gradient(180deg,#111827,#0f172a)':'linear-gradient(180deg,#f8fbff,#eef6f7)';
      else document.body.style.background='';
    }
  }catch(e){console.warn('apply appearance failed',e)}
}

async function safeFullLogout(reason=''){
  try{ unsub.forEach(u=>{try{u()}catch(e){}}); unsub=[]; }catch(e){}
  try{ if(auth) await signOut(auth); }catch(e){ console.warn('logout failed', e); }
  currentUser=null;
  state.role='';
  state.profileDone=false;
  delete state.shopId; delete state.shopName; delete state.customerId; delete state.customerName;
  delete state.customerLinks; delete state.activeCustomerLink; delete state.uid;
  delete state.authEmail; delete state.authPhoneNumber; delete state.authPhoneKey; delete state.authProvider;
  try{ sessionStorage.clear(); }catch(e){}
  save();
  hideAppDialog();
  render();
}
function showPermissionDeniedLogoutDialog(label='البيانات', err){
  if(window.__hesabiPermissionDialogOpen) return;
  window.__hesabiPermissionDialogOpen=true;
  try{unsub.forEach(u=>{try{u()}catch{}}); unsub=[];}catch{}
  showAppDialog('مشكلة صلاحيات', 'تم منع قراءة '+label+' بسبب الصلاحيات. اضغط موافق لتسجيل الخروج والدخول من جديد. إذا استمرت المشكلة بعد الدخول فتأكد من نشر قواعد Firestore الجديدة من GitHub Actions.', 'error', [
    {text:'موافق - تسجيل خروج', cls:'danger', close:false, fn:async()=>{window.__hesabiPermissionDialogOpen=false; await safeFullLogout('permission-denied');}},
    {text:'تحديث الواجهات', cls:'secondary', fn:async()=>{window.__hesabiPermissionDialogOpen=false; try{await refreshWebUiNow()}catch(e){} location.replace(location.pathname+'?v='+Date.now())}},
    {text:'إلغاء', cls:'light', fn:()=>{window.__hesabiPermissionDialogOpen=false;}}
  ]);
}
function renderBasicListPage(pageId,title,description,rowsHtml='',headers=['البيان','الحالة']){
  const rows = rowsHtml || '<tr><td class="name">لا توجد بيانات معروضة حاليًا</td><td>—</td></tr>';
  const html = `<div class="card"><h2>${esc(title)}</h2>${description?`<p class="muted">${esc(description)}</p>`:''}</div><div class="table-wrap"><table class="compact-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  const el=$('page_'+pageId); if(el) el.innerHTML=html;
}

/* phase9: removed older duplicate renderSettings; final implementation appears later. */


/* phase9: removed older duplicate renderPolicies; final implementation appears later. */

function renderNotifications(){
  const c=appNotificationCounters();
  const notes=unreadNotifications();
  const rows=notes.map(n=>`<tr><td class="name"><b>${esc(n.title||'تنبيه')}</b><div class="muted">${esc(n.body||'')}</div></td><td>${dt(n.createdMs)}</td><td><button class="btn light" data-notify-open="${esc(n.page||'home')}">فتح</button></td></tr>`).join('');
  $('page_notifications').innerHTML=`<div class="card"><h2>الإشعارات</h2><div class="grid"><div class="metric"><span class="muted">الرسائل</span><b>${c.messages||0}</b></div><div class="metric"><span class="muted">الطلبات والمراجعات</span><b>${(c.orders||0)+(c.payments||0)+(c.returns||0)+(c.schedules||0)}</b></div></div><div class="actions"><button class="btn ok" id="enableNotifyBtn">تفعيل التنبيهات</button><button class="btn light" id="clearNotifyBtn">تصفير العدّاد</button><button class="btn secondary" id="testBadgeBtn">اختبار العدّاد</button></div><p class="muted">صلاحية التنبيهات: ${esc(notificationPermissionState())}</p></div><div class="table-wrap"><table class="compact-table"><thead><tr><th>التنبيه</th><th>الوقت</th><th>إجراء</th></tr></thead><tbody>${rows||'<tr><td colspan="3">لا توجد إشعارات غير مقروءة</td></tr>'}</tbody></table></div>`;
  setTimeout(()=>{
    if($('enableNotifyBtn')) $('enableNotifyBtn').onclick=()=>requestNotificationPermission(true);
    if($('clearNotifyBtn')) $('clearNotifyBtn').onclick=()=>{clearAllNotificationCounters(); msg('تم تصفير عداد الإشعارات.','success');};
    if($('testBadgeBtn')) $('testBadgeBtn').onclick=()=>{try{ if(window.hesabiAndroidBridge&&window.hesabiAndroidBridge.updateLauncherBadge) window.hesabiAndroidBridge.updateLauncherBadge(1,'اختبار عداد حسابي التجاري'); msg('تم إرسال اختبار للعداد. قد يظهر رقم أو نقطة حسب نوع الهاتف.','success'); }catch(e){msg('تعذر اختبار العداد: '+(e.message||e),'error')}};
    document.querySelectorAll('[data-notify-open]').forEach(b=>b.onclick=()=>openNotificationPage(b.dataset.notifyOpen));
  });
}

/* phase9: removed older duplicate renderMessages; final implementation appears later. */

function renderShops(){
  const links=state.customerLinks||[];
  const rows=links.map(x=>`<tr><td class="name">${esc(x.shopName||x.shopId)}</td><td>${esc(x.shopId||'')}</td></tr>`).join('');
  renderBasicListPage('shops','متاجري','المتاجر المرتبطة بحساب العميل.',rows,['المتجر','الكود']);
}
function renderShopCode(){
  $('page_shopcode').innerHTML=`<div class="card"><h2>كود التاجر</h2><p>كود المحل: <b>${esc(state.shopId||'-')}</b></p><div class="field"><label>رابط الدعوة</label><input readonly value="${esc(shopJoinLink(state.shopId||''))}"></div></div>`;
}

/* phase9: removed older duplicate renderOwnerConsole; final implementation appears later. */


