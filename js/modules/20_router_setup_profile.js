function render(){
  applyAppearance();
  normalizeCustomerLinks();
  const hasCfg=!!state.firebaseConfig?.apiKey;
  const signed=!!uid();
  if(signed) startPresenceHeartbeat();
  $('firebaseSetup').classList.toggle('hidden', hasCfg);
  $('authSetup').classList.toggle('hidden', !hasCfg || signed);
  $('roleSetup').classList.toggle('hidden', !hasCfg || !signed || !!state.role);
  $('profileSetup').classList.toggle('hidden', !signed || !state.role || !!state.profileDone);
  const locked = signed && !!state.profileDone && shouldAppLock();
  if($('appLockScreen')) $('appLockScreen').classList.toggle('hidden', !locked);
  $('main').classList.toggle('hidden', !signed || !state.profileDone || locked);
  $('nav').classList.toggle('hidden', !signed || !state.profileDone || locked);
  if($('setupBackFloating')) $('setupBackFloating').classList.toggle('hidden', !signed || !!state.profileDone);
  bindSetupBackFloating();
  $('subTitle').textContent = signed ? (state.profileDone ? (state.role==='trader'?`تاجر | كود المحل: ${state.shopId||'-'} | حساب آمن`:`عميل | التاجر الحالي: ${state.shopName||state.shopId||'-'} | عدد التجار: ${(state.customerLinks||[]).length||1} | حساب آمن`) : 'تم تسجيل الدخول الآمن') : '';
  if(!hasCfg){fillCfg(); return}
  if(hasCfg && !signed){bindAuthButtons(); return}
  if(state.role && !state.profileDone){renderProfileSetup(); return}
  if(locked){renderAppLockScreen(); return}
  if(state.profileDone){try{if(state.startPage && !sessionStorage.getItem('hesabi_start_page_applied')){active=state.startPage;sessionStorage.setItem('hesabi_start_page_applied','1')}}catch(e){} rememberCurrentDualRoleProfile(); ensureLiveDataListeners(); notifyAndroidSession(); renderNav(); updateAndroidLauncherBadge(); show(active); setTimeout(()=>{notifyAndroidSession();updateAndroidLauncherBadge();},600)}
}

function fillCfg(){['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'].forEach(k=>{$('cfg_'+k).value=state.firebaseConfig?.[k]||''})}
$('saveFirebaseConfig').onclick=async()=>{state.firebaseConfig={apiKey:$('cfg_apiKey').value.trim(),authDomain:$('cfg_authDomain').value.trim(),projectId:$('cfg_projectId').value.trim(),storageBucket:$('cfg_storageBucket').value.trim(),messagingSenderId:$('cfg_messagingSenderId').value.trim(),appId:$('cfg_appId').value.trim()}; if(!state.firebaseConfig.apiKey||!state.firebaseConfig.projectId){msg('أدخل apiKey و projectId على الأقل','error');return} save(); await initFirebase(); render(); msg('تم حفظ إعدادات Firebase','success')}

function bindAuthButtons(){
  bindSmsAuthButtons();
  bindLegacyAuthButtons();
}
function setAuthMode(mode){
  const sms=mode!=='legacy';
  $('smsAuthBox')?.classList.toggle('hidden', !sms);
  $('legacyAuthBox')?.classList.toggle('hidden', sms);
  $('smsAuthTab')?.classList.toggle('active', sms);
  $('legacyAuthTab')?.classList.toggle('active', !sms);
}
function ensureRecaptcha(){
  if(recaptchaVerifier) return recaptchaVerifier;
  if(!auth) throw new Error('Firebase Auth غير جاهز');
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size:'invisible' });
  return recaptchaVerifier;
}
function setSmsBusy(kind,busy){
  if(kind==='send') smsSending=busy; else smsVerifying=busy;
  const send=$('sendSmsCodeBtn'), verify=$('verifySmsCodeBtn');
  if(send){send.disabled=smsSending||smsVerifying; send.textContent=smsSending?'جاري إرسال الكود...':'إرسال كود التحقق'}
  if(verify){verify.disabled=smsSending||smsVerifying; verify.textContent=smsVerifying?'جاري التحقق...':'تحقق ودخول'}
}
function bindSmsAuthButtons(){
  $('smsAuthTab')?.addEventListener('click',()=>setAuthMode('sms'));
  $('legacyAuthTab')?.addEventListener('click',()=>setAuthMode('legacy'));
  const send=$('sendSmsCodeBtn'), verify=$('verifySmsCodeBtn');
  if(send && !send.dataset.bound){
    send.dataset.bound='1';
    send.onclick=async()=>{
      const raw=($('smsPhone')?.value||'').trim();
      const phone=toInternationalPhone(raw);
      const phoneKey=normalizePhone(raw);
      if(!phoneKey || phoneKey.length<7 || !phone.startsWith('+')){msg('أدخل رقم الهاتف بصيغة صحيحة مثل +967771749776','error');return}
      try{
        setSmsBusy('send',true);
        const verifier=ensureRecaptcha();
        phoneConfirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
        state.pendingSmsPhone=phone; state.pendingSmsPhoneKey=phoneKey; save();
        msg('تم إرسال كود التحقق إلى '+phone,'success');
        setTimeout(()=>{$('smsCode')?.focus()},300);
      }catch(e){
        console.error(e);
        try{await recaptchaVerifier?.clear?.()}catch{}
        recaptchaVerifier=null;
        msg('تعذر إرسال كود التحقق: '+friendlyAuthError(e),'error');
      }finally{setSmsBusy('send',false)}
    };
  }
  if(verify && !verify.dataset.bound){
    verify.dataset.bound='1';
    verify.onclick=async()=>{
      const code=String($('smsCode')?.value||'').replace(/\D/g,'');
      if(!phoneConfirmationResult){msg('اضغط أولًا على إرسال كود التحقق','error');return}
      if(code.length!==6){msg('أدخل كود التحقق المكون من 6 أرقام','error');return}
      try{
        setSmsBusy('verify',true);
        const cred=await phoneConfirmationResult.confirm(code);
        currentUser=cred.user; authReady=true;
        state.uid=cred.user.uid;
        state.authPhoneNumber=cred.user.phoneNumber || state.pendingSmsPhone || '';
        state.authPhoneKey=state.pendingSmsPhoneKey || normalizePhone(state.authPhoneNumber||'');
        state.authProvider='phone';
        delete state.pendingSmsPhone; delete state.pendingSmsPhoneKey;
        save();
        phoneConfirmationResult=null;
        await afterSuccessfulAuthLogin();
        msg(state.profileDone?'تم التحقق من رقم الهاتف واسترجاع حسابك بنجاح':'تم التحقق من رقم الهاتف. اختر نوع الحساب أو استرجع حسابك السابق.','success');
        render();
      }catch(e){
        console.error(e);
        msg('كود التحقق غير صحيح أو منتهي: '+friendlyAuthError(e),'error');
      }finally{setSmsBusy('verify',false)}
    };
  }
}
function bindLegacyAuthButtons(){
  if(!$('loginBtn')) return;
  $('loginBtn').onclick=async()=>{
    const phoneKey=validPhoneOrWarn($('authPhone').value,'رقم الهاتف'); const pass=$('authPass').value;
    if(!phoneKey||!pass){msg('أدخل رقم الهاتف وكلمة المرور','error');return}
    try{
      $('loginBtn').disabled=true;
      const cred=await signInWithEmailAndPassword(auth,authEmailFromPhone(phoneKey),pass);
      currentUser=cred.user; authReady=true; state.uid=cred.user.uid; state.authEmail=cred.user.email; state.authPhoneKey=phoneKey; state.authProvider='email'; save();
      await afterSuccessfulAuthLogin();
      msg('تم تسجيل الدخول','success');
      render();
    }
    catch(e){msg('فشل الدخول: '+friendlyAuthError(e),'error')}
    finally{$('loginBtn').disabled=false;}
  };
  $('signupBtn').onclick=async()=>{
    const phoneKey=validPhoneOrWarn($('authPhone').value,'رقم الهاتف'); const pass=$('authPass').value;
    if(!phoneKey||!pass||pass.length<6){msg('أدخل رقم هاتف صحيح وكلمة مرور 6 أحرف على الأقل','error');return}
    try{
      $('signupBtn').disabled=true;
      const cred=await createUserWithEmailAndPassword(auth,authEmailFromPhone(phoneKey),pass);
      currentUser=cred.user; authReady=true; state.uid=cred.user.uid; state.authEmail=cred.user.email; state.authPhoneKey=phoneKey; state.authProvider='email'; save();
      await afterSuccessfulAuthLogin();
      msg('تم إنشاء الحساب الآمن. اختر الآن نوع الحساب: تاجر أو عميل.','success');
      render();
    }
    catch(e){msg('تعذر إنشاء الحساب: '+friendlyAuthError(e),'error')}
    finally{$('signupBtn').disabled=false;}
  };
}


function friendlyDbError(e, fallback='تعذر تنفيذ العملية'){
  const m=String(e?.message||e||'');
  const code=String(e?.code||'');
  if(code.includes('permission-denied') || m.includes('Missing or insufficient permissions')){
    return fallback+' بسبب صلاحيات قاعدة البيانات. تم تجهيز قواعد Firestore في هذا التحديث، تأكد من نشر firestore.rules من GitHub Actions أو Firebase.';
  }
  if(m.includes('offline') || m.includes('unavailable')) return fallback+' بسبب ضعف الاتصال. تأكد من الإنترنت ثم حاول مرة أخرى.';
  return m || fallback;
}

function friendlyAuthError(e){
  const code=String(e?.code||''); const m=String(e?.message||e||'');
  if(code.includes('email-already-in-use')) return 'هذا الرقم لديه حساب سابق. استخدم زر دخول بدل إنشاء حساب.';
  if(code.includes('invalid-credential')||code.includes('wrong-password')) return 'رقم الهاتف أو كلمة المرور غير صحيحة.';
  if(code.includes('weak-password')) return 'كلمة المرور ضعيفة. استخدم 6 أحرف أو أرقام على الأقل.';
  if(code.includes('configuration-not-found')) return 'يجب تفعيل مزود الدخول المطلوب من Firebase Authentication.';
  if(code.includes('captcha-check-failed')) return 'فشل تحقق reCAPTCHA. حدّث الصفحة وحاول مرة أخرى.';
  if(code.includes('invalid-phone-number')) return 'رقم الهاتف غير صحيح. استخدم الصيغة الدولية مثل +967771749776.';
  if(code.includes('too-many-requests')) return 'تم إرسال محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.';
  if(code.includes('invalid-verification-code')) return 'كود التحقق غير صحيح.';
  if(code.includes('code-expired')) return 'انتهت صلاحية كود التحقق. أرسل كود جديد.';
  if(code.includes('network-request-failed')) return 'فشل الاتصال بالإنترنت أو Firebase. تحقق من الشبكة.';
  if(code.includes('account-exists-with-different-credential') || code.includes('credential-already-in-use') || code.includes('phone-number-already-exists')) return 'هذا الرقم مسجل سابقًا في Firebase على حساب آخر. لا يمكن ربطه مباشرة بنفس الحساب، لذلك سيستخدم التطبيق تغيير رقم داخلي آمن بعد تحقق SMS أو يمكنك تسجيل الدخول/استرجاع الحساب الموجود بذلك الرقم.';
  return m;
}

$('chooseTrader').onclick=()=>{state.role='trader';save();render()}
$('chooseCustomer').onclick=()=>{state.role='customer';save();render()}

function backToRoleChoice(){
  state.role='';
  state.profileDone=false;
  delete state.shopId;
  delete state.customerId;
  save();
  if($('profileSetup')) $('profileSetup').innerHTML='';
  render();
}

async function backFromRoleChoice(){
  try{ if(auth) await signOut(auth); }catch(e){ console.warn('sign out before role choice back failed', e); }
  currentUser=null;
  state.role='';
  state.profileDone=false;
  delete state.uid;
  delete state.authEmail;
  delete state.authPhoneNumber;
  delete state.authPhoneKey;
  delete state.authProvider;
  delete state.pendingSmsPhone;
  delete state.pendingSmsPhoneKey;
  save();
  render();
}

function bindSetupBackFloating(){
  const btn=$('setupBackFloating');
  if(!btn || btn.dataset.bound==='1') return;
  btn.dataset.bound='1';
  btn.onclick=()=>{
    if(state.role && !state.profileDone) backToRoleChoice();
    else backFromRoleChoice();
  };
}

function renderProfileSetup(){
  if(state.role==='trader') {
    const phoneDefault=esc(state.authPhoneNumber||state.authPhoneKey||'');
    $('profileSetup').innerHTML=`<h2>تهيئة التاجر</h2><div class="notice">رقم الهاتف موثق بكود SMS. استخدم نفس الرقم لإنشاء المحل أو استرجاعه حتى يكون الربط آمنًا ونهائيًا.</div><div class="notice">إذا كان المحل موجودًا مسبقًا، أدخل PIN واضغط استرجاع محل موجود، أو اضغط إنشاء وسيتم تحويلك للاسترجاع إذا كان الرقم موجودًا.</div><div class="form"><div class="field"><label>اسم المحل</label><input id="shopName" placeholder="مثال: بقالة الخير"></div><div class="field"><label>رقم هاتف المحل</label><input id="shopPhone" value="${phoneDefault}" readonly inputmode="tel" class="locked-phone" placeholder="رقم الحساب الموثق"></div><div class="field"><label>رمز إدارة المحل PIN</label><input id="shopPin" type="password" placeholder="مثال: 1234"></div><button class="btn" id="createShop">إنشاء/استرجاع محل بهذا الرقم</button><button class="btn secondary" id="recoverShop">استرجاع محل موجود برقم الهاتف</button></div>`;
  } else {
    const phoneDefault=esc(state.customerPhone||state.authPhoneNumber||state.authPhoneKey||'');
    const nameDefault=esc(state.customerName||'');
    $('profileSetup').innerHTML=`<h2>تهيئة العميل</h2><div class="notice">إذا اخترت النوع بالخطأ يمكنك الرجوع إلى صفحة اختيار تاجر أو عميل بدون تسجيل خروج.</div><div class="notice">يمكنك إدخال كود التاجر يدويًا، أو مسح QR، أو البحث عن المتاجر المسجلة، ثم إضافة متجر أو عدة متاجر والربط بها دفعة واحدة.</div><div class="form customer-setup-form"><div class="field"><label>اسم العميل</label><input id="custName" value="${nameDefault}" placeholder="اسمك عند التاجر"></div><div class="field"><label>رقم الهاتف</label><input id="custPhone" value="${phoneDefault}" readonly inputmode="tel" class="locked-phone" placeholder="رقم الحساب الموثق"></div><div class="field"><label>كود المحل من التاجر</label><div class="shop-code-input-row"><input id="joinShopId" placeholder="SHOP-XXXXX"><button class="icon-mini-btn" id="setupScanShopQr" type="button" title="مسح كود التاجر">📷</button><button class="icon-mini-btn" id="setupSearchStores" type="button" title="بحث عن متجر">🔎</button><button class="icon-mini-btn" id="setupAddStore" type="button" title="إضافة متجر للقائمة">➕</button></div></div><video id="setupQrVideo" class="scan-video setup-scan-video" playsinline></video><div class="settings-compact-actions setup-scan-actions hidden" id="setupScanActions"><button class="btn light" id="setupStopQrScan" type="button">إيقاف الكاميرا</button></div><div class="field"><label>بحث عن متجر مسجل</label><input id="shopSearchQuery" placeholder="اكتب اسم المتجر أو كود التاجر أو رقم الهاتف"></div><div id="shopSearchResults" class="compact-shop-results hidden"></div><div id="selectedSetupShops" class="selected-setup-shops"></div><button class="btn" id="joinShop">ربط المتاجر المحددة</button><button class="btn secondary" id="recoverCustomer">استرجاع حساب عميل موجود</button></div>`;
  }
  setTimeout(()=>{
    if(state.role==='trader'){ $('createShop').onclick=createShop; $('recoverShop').onclick=recoverShopByPhone; }
    else {
      if(URL_JOIN_SHOP_ID && $('joinShopId')) {$('joinShopId').value=URL_JOIN_SHOP_ID; setupAddShopSelection(URL_JOIN_SHOP_ID,'من الرابط',false);}
      $('joinShop').onclick=joinShop; $('recoverCustomer').onclick=recoverCustomerByPhone;
      $('setupAddStore').onclick=()=>setupAddShopSelection(($('joinShopId')?.value||''),'',true);
      $('setupSearchStores').onclick=setupSearchStores;
      $('shopSearchQuery').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();setupSearchStores();}};
      $('setupScanShopQr').onclick=setupStartQrScan;
      $('setupStopQrScan').onclick=setupStopQrScan;
      renderSelectedSetupShops();
    }
  });
}

async function recoverShopByPhone(){
  if(!requireAuth()) return;
  const phone=$('shopPhone').value.trim(), pin=$('shopPin').value.trim();
  const phoneKey=requireVerifiedPhoneInput(phone,'رقم هاتف المحل');
  if(!phoneKey||!pin){msg('أدخل رقم هاتف المحل ورمز الإدارة PIN لاسترجاع المحل','error');return}
  try{
    const phoneSnap=await getDoc(doc(db,'shopPhones',phoneKey));
    if(!phoneSnap.exists()){msg('لا يوجد محل مسجل بهذا الرقم. يمكنك إنشاء محل جديد.','error');return}
    const shopId=phoneSnap.data().shopId;
    const shopSnap=await getDoc(doc(db,'shops',shopId));
    if(!shopSnap.exists()){msg('تم العثور على الرقم لكن سجل المحل غير موجود','error');return}
    const shop=shopSnap.data();
    if(String(shop.pin||'')!==String(pin)){msg('رمز PIN غير صحيح لهذا المحل','error');return}
    const claimByPhone = shop.ownerUid && shop.ownerUid!==uid() && canClaimRecordByVerifiedPhone(shop.phoneKey||phoneKey);
    if(shop.ownerUid && shop.ownerUid!==uid() && !claimByPhone){msg('هذا المحل مربوط بحساب دخول آخر. يجب الدخول برقم SMS نفسه المسجل للمحل ثم إدخال PIN الصحيح.','error');return}
    if(!shop.ownerUid || claimByPhone){
      await updateDoc(doc(db,'shops',shopId),{
        ownerUid:uid(),
        ownerPhoneKey:verifiedCurrentPhoneKey()||state.authPhoneKey||phoneKey,
        previousOwnerUid: shop.ownerUid || '',
        securityUpgradedAt:serverTimestamp()
      });
      await setDoc(doc(db,'shopPhones',phoneKey),{shopId,name:shop.name||shopId,phone:shop.phone||phone,phoneKey,ownerUid:uid(),updatedAt:serverTimestamp()},{merge:true});
    }
    state.shopId=shopId; state.traderPin=pin; state.profileDone=true; state.shopName=shop.name||shopId; state.role='trader'; save();
    await saveUserAccountProfile({traderShopId:shopId});
    startListeners(); render(); msg(claimByPhone?'تم نقل ربط المحل إلى حساب الهاتف الموثق واسترجاع البيانات بنجاح':'تم استرجاع المحل والبيانات من Firebase بنجاح','success');
  }catch(e){msg(friendlyDbError(e,'تعذر استرجاع المحل'),'error')}
}


function setupShopSelections(){
  if(!Array.isArray(state.setupSelectedShops)) state.setupSelectedShops=[];
  state.setupSelectedShops=state.setupSelectedShops.filter(x=>x&&x.shopId);
  return state.setupSelectedShops;
}
function setupAddShopSelection(raw, name='', showMessage=true){
  const sid=extractShopCodeFromText(raw||'');
  if(!sid){ if(showMessage) msg('أدخل أو اختر كود متجر صحيح أولًا','error'); return false; }
  const list=setupShopSelections();
  if(list.some(x=>x.shopId===sid)){ if(showMessage) msg('هذا المتجر موجود في قائمة الربط','error'); return false; }
  list.push({shopId:sid,shopName:name||sid});
  state.setupSelectedShops=list; save(); renderSelectedSetupShops();
  if(showMessage) msg('تمت إضافة المتجر لقائمة الربط','success');
  return true;
}
function setupRemoveShopSelection(shopId){
  state.setupSelectedShops=setupShopSelections().filter(x=>x.shopId!==shopId);
  save(); renderSelectedSetupShops();
}
function renderSelectedSetupShops(){
  const box=$('selectedSetupShops'); if(!box) return;
  const list=setupShopSelections();
  if(!list.length){box.innerHTML='<div class="muted compact-note">لم يتم اختيار متاجر بعد. يمكنك اختيار متجر أو عدة متاجر قبل الربط.</div>'; return;}
  box.innerHTML=`<div class="setup-selected-title">المتاجر المختارة (${list.length})</div><div class="setup-selected-list">${list.map(x=>`<span class="setup-store-chip"><b>${esc(x.shopName||x.shopId)}</b><small>${esc(x.shopId)}</small><button type="button" data-remove-setup-shop="${esc(x.shopId)}">×</button></span>`).join('')}</div>`;
  box.querySelectorAll('[data-remove-setup-shop]').forEach(b=>b.onclick=()=>setupRemoveShopSelection(b.getAttribute('data-remove-setup-shop')));
}
async function setupSearchStores(){
  if(!db){msg('الاتصال بقاعدة البيانات غير جاهز','error');return}
  const q=($('shopSearchQuery')?.value||$('joinShopId')?.value||'').trim();
  const out=$('shopSearchResults'); if(out){out.classList.remove('hidden'); out.innerHTML='<div class="muted compact-note">جاري البحث عن المتاجر...</div>';}
  try{
    const snap=await getDocs(collection(db,'shops'));
    const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(sh=>{
      if(!q) return true;
      return searchMatch(`${sh.shopId||sh.id} ${sh.name||''} ${sh.phone||''} ${sh.phoneKey||''}`, q);
    }).slice(0,50);
    if(!out) return;
    if(!rows.length){out.innerHTML='<div class="catalog-search-empty">لم يتم العثور على متجر مطابق.</div>';return;}
    out.innerHTML=`<div class="setup-results-head">نتائج المتاجر</div><div class="table-wrap"><table class="mini-table setup-shop-table"><thead><tr><th>المتجر</th><th>الكود</th><th></th></tr></thead><tbody>${rows.map(sh=>`<tr><td><b>${esc(sh.name||'متجر')}</b><div class="muted mini-line">${esc(sh.phone||'')}</div></td><td class="mono-cell">${esc(sh.shopId||sh.id)}</td><td><button class="mini-action-btn" data-pick-shop="${esc(sh.shopId||sh.id)}" data-pick-name="${esc(sh.name||'متجر')}">اختيار</button></td></tr>`).join('')}</tbody></table></div>`;
    out.querySelectorAll('[data-pick-shop]').forEach(b=>b.onclick=()=>{const sid=b.getAttribute('data-pick-shop'); const nm=b.getAttribute('data-pick-name')||sid; if($('joinShopId')) $('joinShopId').value=sid; setupAddShopSelection(sid,nm,true);});
  }catch(e){ if(out) out.innerHTML='<div class="notice error">تعذر البحث عن المتاجر: '+esc(e.message||e)+'</div>'; }
}
let setupQrStream=null, setupQrTimer=null;
async function setupStartQrScan(){
  try{
    if(!('BarcodeDetector' in window)){msg('هذا المتصفح لا يدعم مسح QR بالكاميرا. استخدم إدخال الكود أو البحث عن المتجر.','error');return}
    const video=$('setupQrVideo'); if(!video) return;
    $('setupScanActions')?.classList.remove('hidden');
    setupQrStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    video.srcObject=setupQrStream; video.classList.add('active'); await video.play();
    const detector=new BarcodeDetector({formats:['qr_code']});
    setupQrTimer=setInterval(async()=>{
      try{const codes=await detector.detect(video); if(codes&&codes.length){const code=extractShopCodeFromText(codes[0].rawValue||''); if(code){$('joinShopId').value=code; setupAddShopSelection(code,'من QR',true); setupStopQrScan();}}}catch{}
    },700);
  }catch(e){msg('تعذر تشغيل الكاميرا. إذا كنت داخل تطبيق أندرويد فقد يحتاج التطبيق إلى صلاحية الكاميرا. يمكنك إدخال الكود يدويًا أو استخدام البحث.','error')}
}
function setupStopQrScan(){
  try{ if(setupQrTimer){clearInterval(setupQrTimer); setupQrTimer=null;} if(setupQrStream){setupQrStream.getTracks().forEach(t=>t.stop()); setupQrStream=null;} const v=$('setupQrVideo'); if(v){v.pause(); v.srcObject=null; v.classList.remove('active');} $('setupScanActions')?.classList.add('hidden'); }catch{}
}

async function recoverCustomerByPhone(){
  if(!requireAuth()) return;
  const name=($('custName')?.value||'').trim(), phone=($('custPhone')?.value||'').trim();
  const selected=setupShopSelections().map(x=>x.shopId).filter(Boolean);
  const typed=extractShopCodeFromText(($('joinShopId')?.value||'').trim());
  const shopIds=[...new Set(selected.length?selected:(typed?[typed]:[]))];
  const phoneKey=requireVerifiedPhoneInput(phone,'رقم هاتف العميل');
  if(!phoneKey||!shopIds.length){msg('أدخل رقم الهاتف واختر متجرًا واحدًا على الأقل لاسترجاع الحساب','error');return}
  let ok=0, last='';
  for(const sidRaw of shopIds){
    try{
      const sid=String(sidRaw).trim();
      const shopSnap=await getDoc(doc(db,'shops',sid));
      if(!shopSnap.exists()){msg('كود المحل غير صحيح: '+sid,'error');continue}
      const phoneSnap=await getDoc(doc(db,'shops',sid,'customerPhones',phoneKey));
      if(!phoneSnap.exists()){msg('لا يوجد عميل بهذا الرقم عند المتجر: '+sid,'error');continue}
      const customerId=phoneSnap.data().customerId;
      const custSnap=await getDoc(doc(db,'shops',sid,'customers',customerId));
      if(!custSnap.exists()){msg('تم العثور على الرقم لكن سجل العميل غير موجود','error');continue}
      const shop=shopSnap.data(); const c=custSnap.data();
      const claimCustomerByPhone = c.customerUid && c.customerUid!==uid() && canClaimRecordByVerifiedPhone(c.phoneKey||phoneKey);
      if(c.customerUid && c.customerUid!==uid() && !claimCustomerByPhone){msg('هذا العميل مربوط بحساب دخول آخر. ادخل برقم SMS نفسه المسجل عند التاجر.','error');continue}
      if(!c.customerUid || claimCustomerByPhone){
        await updateDoc(doc(db,'shops',sid,'customers',customerId),{customerUid:uid(),previousCustomerUid:c.customerUid||'',securityUpgradedAt:serverTimestamp()});
        await setDoc(doc(db,'shops',sid,'customerPhones',phoneKey),{customerId,shopId:sid,phoneKey,customerUid:uid(),updatedAt:serverTimestamp()},{merge:true});
      }
      await setDoc(doc(db,'shops',sid,'customerUidLinks',uid()),{customerId,shopId:sid,phoneKey,linkedAt:serverTimestamp()},{merge:true});
      await setDoc(doc(db,'customerPhoneLinks',phoneKey,'shops',sid),{customerId,shopId:sid,shopName:shop.name||sid,name:c.name||name||'عميل',phone:c.phone||phone,phoneKey,updatedAt:serverTimestamp()},{merge:true});
      if(!Array.isArray(state.customerLinks)) state.customerLinks=[];
      state.customerLinks=state.customerLinks.filter(x=>x.shopId!==sid);
      state.customerLinks.push({shopId:sid,customerId,customerName:c.name||name||'عميل',customerPhone:c.phone||phone,phoneKey,shopName:shop.name||sid});
      state.activeShopId=state.activeShopId||sid; state.shopId=state.activeShopId; state.customerId=currentCustomerLink()?.customerId||customerId; state.customerName=c.name||name||'عميل'; state.customerPhone=c.phone||phone; state.shopName=currentCustomerLink()?.shopName||shop.name||sid; state.profileDone=true; state.role='customer';
      ok++; last=shop.name||sid;
    }catch(e){msg(friendlyDbError(e,'تعذر استرجاع حساب العميل'),'error')}
  }
  if(ok){
    save(); await saveUserAccountProfile(); startListeners(); render(); msg(ok===1?`تم استرجاع حساب العميل لدى ${last}`:`تم استرجاع ${ok} حسابات عميل بنجاح`,'success');
  }
}


async function createShop(){
  if(!requireAuth()) return;
  const name=$('shopName').value.trim(), phone=$('shopPhone').value.trim(), pin=$('shopPin').value.trim();
  const phoneKey=requireVerifiedPhoneInput(phone,'رقم هاتف المحل');
  if(!name||!phoneKey||!pin){msg('أدخل اسم المحل ورقم الهاتف ورمز الإدارة','error');return}
  const phoneRef=doc(db,'shopPhones',phoneKey);
  try{
    const existingPhone=await getDoc(phoneRef);
    if(existingPhone.exists()){
      const shopId=existingPhone.data().shopId;
      const shopSnap=await getDoc(doc(db,'shops',shopId));
      if(shopSnap.exists() && String(shopSnap.data().pin||'')===String(pin)){
        msg('هذا الرقم لديه محل سابق. سيتم استرجاعه بدل إنشاء محل مكرر.','notice');
        await recoverShopByPhone();
        return;
      }
      msg('يوجد محل مسجل بهذا الرقم. أدخل PIN الصحيح ثم اضغط استرجاع محل موجود.','error');
      return;
    }
    const shopId=id('SHOP');
    const shopRef=doc(db,'shops',shopId);
    await runTransaction(db, async(tx)=>{
      const existing=await tx.get(phoneRef);
      if(existing.exists()) throw new Error('يوجد محل تجاري مسجل مسبقًا بنفس رقم الهاتف. لا يمكن تكرار رقم هاتف المحل.');
      tx.set(shopRef,{shopId,name,phone,phoneKey,pin,ownerUid:uid(),ownerPhoneKey:verifiedCurrentPhoneKey()||state.authPhoneKey||phoneKey,currency:'YER',allowCustomerOrders:true,allowReturns:true,allowOutOfStockOrders:false,showCustomerPrices:true,showCustomerStock:true,customerMessagingMode:'linked_only',workingHoursEnabled:false,workingOpenTime:'08:00',workingCloseTime:'22:00',workingClosedMessage:'المتجر مغلق حاليًا. سيتم استقبال طلبك عند وقت الدوام.',requireCustomerApproval:true,defaultCreditLimit:0,defaultCustomerStatus:'active',invoicePrefix:'INV',subscriptionStatus:'trial',subscriptionPlan:'trial',subscriptionAmount:0,subscriptionDueDate:'',subscriptionNote:'',ownerWarning:'',createdAt:serverTimestamp(),securityMode:isPhoneAuthSession()?'phone_verified':'legacy'});
      tx.set(phoneRef,{shopId,name,phone,phoneKey,ownerUid:uid(),createdAt:serverTimestamp()});
    });
    state.shopId=shopId; state.traderPin=pin; state.profileDone=true; state.role='trader'; state.shopName=name; save();
    await saveUserAccountProfile({traderShopId:shopId});
    startListeners(); render(); msg('تم إنشاء المحل وربطه برقم الهاتف الموثق. أعطِ هذا الكود للعملاء: '+shopId,'success');
  }catch(e){msg(friendlyDbError(e,'تعذر إنشاء المحل'),'error')}
}

async function joinShop(){
  if(!requireAuth()) return;
  const name=($('custName')?.value||'').trim(), phone=($('custPhone')?.value||'').trim();
  const selected=setupShopSelections().map(x=>x.shopId).filter(Boolean);
  const typed=extractShopCodeFromText(($('joinShopId')?.value||'').trim());
  const shopIds=[...new Set(selected.length?selected:(typed?[typed]:[]))];
  if(!name||!phone||!shopIds.length){msg('أدخل الاسم والهاتف واختر متجرًا واحدًا على الأقل','error');return}
  const btn=$('joinShop');
  try{
    if(btn){btn.disabled=true; btn.textContent='جاري ربط المتاجر...';}
    let okCount=0, lastName='';
    for(let i=0;i<shopIds.length;i++){
      const res=await linkCustomerToShop(shopIds[i],name,phone,i===0);
      if(res?.ok){okCount++; lastName=res.shopName||lastName;}
    }
    if(okCount>0){
      state.setupSelectedShops=[]; save();
      msg(okCount===1 ? `تم الارتباط بالمتجر: ${lastName||shopIds[0]}` : `تم الارتباط بعدد ${okCount} متاجر بنجاح`,'success');
    }
  }finally{
    if(btn){btn.disabled=false; btn.textContent='ربط المتاجر المحددة';}
  }
}
async function linkCustomerToShop(shopId,name,phone,first=false){
  if(!requireAuth()) return;
  const sid=String(shopId||'').trim();
  const phoneKey=requireVerifiedPhoneInput(phone,'رقم هاتف العميل');
  if(!sid){msg('أدخل كود التاجر/المحل','error');return}
  if(!phoneKey){return}
  if((state.customerLinks||[]).some(x=>x.shopId===sid)){msg('أنت مرتبط بهذا التاجر مسبقًا','error');return {ok:true,already:true,shopId:sid};}
  let customerId=id('CUS');
  let customerName=name;
  let customerPhone=phone;
  let shop=null;
  let existed=false;
  const shopRef=doc(db,'shops',sid);
  const phoneRef=doc(db,'shops',sid,'customerPhones',phoneKey);
  try{
    await runTransaction(db, async(tx)=>{
      const s=await tx.get(shopRef); if(!s.exists()) throw new Error('كود المحل غير صحيح');
      shop=s.data();
      const existing=await tx.get(phoneRef);
      if(existing.exists()){
        existed=true;
        customerId=existing.data().customerId;
        const existingCustomerRef=doc(db,'shops',sid,'customers',customerId);
        const cs=await tx.get(existingCustomerRef);
        if(!cs.exists()) throw new Error('رقم العميل موجود لكن سجل العميل غير موجود');
        const c=cs.data();
        const canUseExisting=(!c.customerUid || c.customerUid===uid() || canClaimRecordByVerifiedPhone(c.phoneKey||phoneKey));
        if(!canUseExisting) throw new Error('هذا الرقم مرتبط مسبقًا بهذا التاجر بحساب آخر. ادخل بنفس رقم SMS المسجل لهذا العميل.');
        customerName=c.name||name||'عميل';
        customerPhone=c.phone||phone;
        tx.update(existingCustomerRef,{customerUid:uid(),previousCustomerUid:c.customerUid&&c.customerUid!==uid()?c.customerUid:'',securityUpgradedAt:serverTimestamp()});
        tx.set(phoneRef,{customerId,shopId:sid,phoneKey,customerUid:uid(),updatedAt:serverTimestamp()},{merge:true});
      }else{
        const customerRef=doc(db,'shops',sid,'customers',customerId);
        tx.set(customerRef,{customerId,shopId:sid,name,phone,phoneKey,customerUid:uid(),balance:0,creditLimit:Number(shop.defaultCreditLimit||0),status:shop.defaultCustomerStatus||'active',createdAt:serverTimestamp(),securityMode:isPhoneAuthSession()?'phone_verified':'legacy'});
        tx.set(phoneRef,{customerId,shopId:sid,name,phone,phoneKey,customerUid:uid(),createdAt:serverTimestamp()});
      }
      tx.set(doc(db,'shops',sid,'customerUidLinks',uid()),{customerId,shopId:sid,phoneKey,linkedAt:serverTimestamp()},{merge:true});
      tx.set(doc(db,'customerPhoneLinks',phoneKey,'shops',sid),{customerId,shopId:sid,shopName:shop.name||sid,name:customerName||name,phone:customerPhone||phone,phoneKey,updatedAt:serverTimestamp()},{merge:true});
    });
    if(!Array.isArray(state.customerLinks)) state.customerLinks=[];
    state.customerLinks.push({shopId:sid,customerId,customerName:customerName||name,customerPhone:customerPhone||phone,phoneKey,shopName:shop.name||sid});
    state.activeShopId=sid; state.shopId=sid; state.customerId=customerId; state.customerName=customerName||name; state.customerPhone=customerPhone||phone; state.shopName=shop.name||sid; state.profileDone=true; state.role='customer'; save();
    await saveUserAccountProfile();
    startListeners(); render(); msg(existed?`تم استرجاع وربط حسابك السابق لدى ${shop.name||sid}`:(first?'تم ربطك بالمحل بنجاح':'تمت إضافة تاجر جديد لحسابك'),'success');
    try{ if(!existed) await notifyShopLinked(sid, customerId, customerName||name, customerPhone||phone, shop?.name||sid); }catch(e){console.warn('link notify failed', e)}
    return {ok:true, shopId:sid, shopName:shop?.name||sid, customerId, customerName:customerName||name, customerPhone:customerPhone||phone, existed};
  }catch(e){msg(friendlyDbError(e,'تعذر ربط العميل بالمحل'),'error'); return {ok:false,error:e};}
}

async function notifyShopLinked(shopId, customerId, customerName, customerPhone, shopName){
  if(!db || !shopId || !customerId) return;
  const now=Date.now();
  const traderText=`تم ارتباط عميل جديد بالمتجر: ${customerName||'عميل'} - رقم الهاتف: ${customerPhone||'-'}`;
  const customerText=`تم ارتباطك بنجاح بالمتجر: ${shopName||shopId}. يمكنك الآن الطلب والسداد ومتابعة حسابك.`;
  await addDoc(collection(db,'shops',shopId,'messages'),{shopId,customerId,customerUid:uid(),customerName:customerName||'عميل',fromRole:'customer',fromName:customerName||'عميل',text:traderText,type:'customer_linked',createdAt:serverTimestamp(),createdMs:now,readByTrader:false,readByCustomer:true});
  await addDoc(collection(db,'shops',shopId,'messages'),{shopId,customerId,customerUid:uid(),customerName:customerName||'عميل',fromRole:'trader',fromName:shopName||'التاجر',text:customerText,type:'link_confirmed',createdAt:serverTimestamp(),createdMs:now+1,readByTrader:true,readByCustomer:false});
}
async function addAnotherShop(){
  const sid=($('newShopCode')?.value||'').trim();
  const name=state.customerName || prompt('اسمك لدى التاجر:') || '';
  const phone=state.customerPhone || prompt('رقم هاتفك:') || '';
  if(!name||!phone||!sid){msg('أدخل كود التاجر وتأكد من وجود اسم ورقم هاتف','error');return}
  await linkCustomerToShop(sid,name,phone,false);
}
async function recoverShopLinkInMyStores(){
  const sid=($('recoverShopCode')?.value||'').trim();
  const phone=($('recoverCustomerPhone')?.value||state.customerPhone||'').trim();
  const phoneKey=requireVerifiedPhoneInput(phone,'رقم الهاتف المسجل عند التاجر');
  if(!sid||!phoneKey){msg('أدخل كود المحل ورقم الهاتف السابق','error');return}
  if((state.customerLinks||[]).some(x=>x.shopId===sid)){msg('هذا المتجر موجود مسبقًا في قائمة متاجري','error');return}
  try{
    const shopSnap=await getDoc(doc(db,'shops',sid));
    if(!shopSnap.exists()) throw new Error('كود المحل غير صحيح');
    const phoneSnap=await getDoc(doc(db,'shops',sid,'customerPhones',phoneKey));
    if(!phoneSnap.exists()) throw new Error('لم يتم العثور على عميل بهذا الرقم عند هذا التاجر');
    const customerId=phoneSnap.data().customerId;
    const custSnap=await getDoc(doc(db,'shops',sid,'customers',customerId));
    if(!custSnap.exists()) throw new Error('حساب العميل غير موجود أو تم حذفه من عند التاجر');
    const shop=shopSnap.data(); const c=custSnap.data();
    const claimCustomerByPhone = c.customerUid && c.customerUid!==uid() && canClaimRecordByVerifiedPhone(c.phoneKey||phoneKey);
    if(c.customerUid && c.customerUid!==uid() && !claimCustomerByPhone){msg('هذا العميل مربوط بحساب دخول آخر. إذا كان رقم الهاتف موثقًا عبر SMS بنفس رقم العميل، استخدم نفس الرقم لاسترجاع الحساب.','error');return}
    if(!c.customerUid || claimCustomerByPhone){
      await updateDoc(doc(db,'shops',sid,'customers',customerId),{customerUid:uid(),previousCustomerUid:c.customerUid||'',securityUpgradedAt:serverTimestamp()});
      await setDoc(doc(db,'shops',sid,'customerPhones',phoneKey),{customerId,shopId:sid,phoneKey,customerUid:uid(),updatedAt:serverTimestamp()},{merge:true});
    }
    await setDoc(doc(db,'shops',sid,'customerUidLinks',uid()),{customerId,shopId:sid,phoneKey,linkedAt:serverTimestamp()},{merge:true});
    if(!Array.isArray(state.customerLinks)) state.customerLinks=[];
    state.customerLinks.push({shopId:sid,customerId,customerName:c.name||state.customerName||'',customerPhone:c.phone||phone,phoneKey,shopName:shop.name||sid});
    state.customerPhone=c.phone||phone; state.customerName=c.name||state.customerName||''; save();
    setActiveCustomerShop(sid);
    msg('تم استرجاع المتجر وربطه بحسابك مرة أخرى','success');
  }catch(e){msg(friendlyDbError(e,'تعذر استرجاع المتجر'),'error')}
}

function customerUidById(customerId){ const c=(cache.customers||[]).find(x=>x.customerId===customerId); return c?.customerUid||'' }
function customerUidForRecord(customerId){
  if(state.role==='customer' && customerId===state.customerId) return uid();
  return customerUidById(customerId)||'';
}
function customerOwnedFields(customerId, customerName=''){
  return {customerId:customerId||state.customerId||'', customerUid:customerUidForRecord(customerId||state.customerId), customerName:customerName||state.customerName||''};
}
function listenQuerySafe(target, ok, label='البيانات'){
  const fail=(e)=>{
    console.warn('Firestore listener failed:', label, e);
    if(e && (e.code==='permission-denied' || String(e.message||'').includes('permission'))){
      showPermissionDeniedLogoutDialog(label, e);
      return;
    }
    msg('تعذر تحميل '+label+': '+friendlyFirestoreError(e),'error');
  };
  try{ const u=onSnapshot(target, ok, fail); unsub.push(u); return u; }
  catch(e){ fail(e); return null; }
}
function friendlyFirestoreError(e){
  const m=String(e?.message||e||'');
  if(e?.code==='permission-denied' || /permission/i.test(m)) return 'مشكلة صلاحيات، أعد تسجيل الدخول أو تأكد من نشر القواعد.';
  if(/network|unavailable/i.test(m)) return 'مشكلة اتصال بالإنترنت.';
  return m.slice(0,160)||'خطأ غير معروف';
}

function isUserTypingCriticalField(){
  const el=document.activeElement;
  if(!el) return false;
  const tag=String(el.tagName||'').toUpperCase();
  if(tag!=='INPUT' && tag!=='TEXTAREA') return false;
  return ['customerPurchaseSearch','messageText','globalSearchInput','catalogSearch'].includes(el.id || '');
}
function safeRefreshActivePage(){
  if(!state.profileDone) return;
  if(isUserTypingCriticalField()) return;
  show(active);
}

function renderNav(){
  const c=unreadCounters();
  const navItems=[
    {page:'home', icon:'🏠', label:'الرئيسية', count:0},
    {page:'back', icon:'↩️', label:'رجوع', count:0, back:true},
    {page:'settings', icon:'⚙️', label:'الإعدادات', count:0},
    ...(isAppOwner()?[{page:'owner', icon:'👑', label:'المالك', count:0}]:[]),
    {page:'notifications', icon:'🔔', label:'الإشعارات', count:c.notifications},
    {page:'messages', icon:'💬', label:'الرسائل', count:c.messages}
  ];
  $('navInner').innerHTML=navItems.map(it=>`<button class="tab ${active===it.page?'active':''}" ${it.back?'data-back="1"':`data-tab="${it.page}"`} aria-label="${esc(it.label)}"><span class="nav-ico">${it.icon}</span><span class="nav-label">${esc(it.label)}</span>${badgeHtml(it.count,'nav-badge')}</button>`).join('');
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>show(b.dataset.tab));
  document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>goBack());
}
function goBack(){
  const target = previousPage && previousPage!==active ? previousPage : 'home';
  show(target);
}
function renderPageLoadFallback(pageName){
  // 1.0.54: لا نعرض للمستخدم صفحة "غير جاهز" إلا إذا كانت الصفحة غير معروفة فعلاً.
  // إذا حدث نقص في محرك العرض، نعيد بناء سجل الصفحات ثم نحاول مرة واحدة قبل إظهار شاشة استرداد.
  try{
    buildPageRendererRegistry();
    const fn = globalThis.__hesabiRenderers && globalThis.__hesabiRenderers[pageName];
    if(typeof fn==='function') { fn(); return; }
  }catch(e){ console.warn('fallback retry failed', pageName, e); }
  const el=$('page_'+pageName)||$('page_home');
  if(el){
    el.innerHTML='<div class="card"><h2>تعذر فتح القسم</h2><p class="muted">لم يتم العثور على شاشة هذا القسم داخل الواجهة الحالية. جرّب تحديث الواجهات أو الرجوع للرئيسية.</p><div class="actions"><button class="btn ok" id="fallbackGoHome">الرئيسية</button><button class="btn secondary" id="fallbackRefreshUi">تحديث الواجهات</button></div></div>';
  }
  setTimeout(()=>{if($('fallbackGoHome')) $('fallbackGoHome').onclick=()=>show('home'); if($('fallbackRefreshUi')) $('fallbackRefreshUi').onclick=async()=>{try{await refreshWebUiNow()}catch(e){} location.replace(location.pathname+'?v='+Date.now())};});
}
function buildPageRendererRegistry(){
  globalThis.__hesabiRenderers={
    home:typeof renderHome==='function'?renderHome:null,
    search:typeof renderSearch==='function'?renderSearch:null,
    tasks:typeof renderTasks==='function'?renderTasks:null,
    items:typeof renderItems==='function'?renderItems:null,
    orders:typeof renderOrders==='function'?renderOrders:null,
    customers:typeof renderCustomers==='function'?renderCustomers:null,
    shops:typeof renderShops==='function'?renderShops:null,
    messages:typeof renderMessages==='function'?renderMessages:null,
    payments:typeof renderPayments==='function'?renderPayments:null,
    invoices:typeof renderInvoices==='function'?renderInvoices:null,
    statement:typeof renderStatement==='function'?renderStatement:null,
    audit:typeof renderAudit==='function'?renderAudit:null,
    stock:typeof renderStock==='function'?renderStock:null,
    returns:typeof renderReturns==='function'?renderReturns:null,
    schedules:typeof renderSchedules==='function'?renderSchedules:null,
    collections:typeof renderCollections==='function'?renderCollections:null,
    reports:typeof renderReports==='function'?renderReports:null,
    policies:typeof renderPolicies==='function'?renderPolicies:null,
    notifications:typeof renderNotifications==='function'?renderNotifications:null,
    shopcode:typeof renderShopCode==='function'?renderShopCode:null,
    settings:typeof renderSettings==='function'?renderSettings:null,
    owner:typeof renderOwnerConsole==='function'?renderOwnerConsole:null
  };
  return globalThis.__hesabiRenderers;
}
function safeRendererForPage(p){
  const reg = (globalThis.__hesabiRenderers && Object.keys(globalThis.__hesabiRenderers).length) ? globalThis.__hesabiRenderers : buildPageRendererRegistry();
  return typeof reg[p]==='function'?reg[p]:null;
}
function show(p){
  try{stopItemBarcodeScanner(false)}catch(e){}

  if(p==='owner' && !isAppOwner()){ msg('صفحة مالك التطبيق خاصة بحساب المالك فقط','error'); p='home'; }
  if(!isTrader() && isTraderOnlyPage(p)) { msg('هذه الصفحة خاصة بالتاجر فقط','error'); p='home'; } if(isTrader() && p==='shops') p='home';
  if(p!==active){ previousPage=active || 'home'; }
  active=p;
  ['home','search','tasks','items','orders','customers','shops','messages','payments','invoices','statement','audit','stock','returns','schedules','collections','reports','policies','notifications','shopcode','settings','owner'].forEach(x=>{const el=$('page_'+x); if(el) el.classList.toggle('hidden',x!==p)});
  renderNav();
  const renderer=safeRendererForPage(p);
  try{
    if(typeof renderer==='function') renderer();
    else { console.warn('missing renderer for page',p); renderPageLoadFallback(p); }
  }catch(e){
    console.error('page render failed',p,e);
    showAppDialog('تعذر تشغيل الصفحة','حدث خطأ داخل هذا القسم: '+String(e.message||e),'warn',[{text:'الرئيسية',cls:'ok',fn:()=>show('home')},{text:'تحديث الواجهات',cls:'secondary',fn:async()=>{try{await refreshWebUiNow()}catch(x){} location.replace(location.pathname+'?v='+Date.now())}}]);
  }
  if(['orders','payments','returns','schedules'].includes(p) && markPageNotificationsRead(p)){
    renderNav();
    updateAndroidLauncherBadge();
    if(active==='home') renderHome();
  }
  updateAndroidLauncherBadge();
}


async function ensureCustomerPurchaseAccess(){
  // ضمان رابط العميل قبل تحميل الأصناف وإنشاء الطلبات.
  // هذا يمنع خطأ الصلاحيات عند الأجهزة التي لديها حالة محلية قديمة أو رابط ناقص.
  try{
    if(!db || !uid() || state.role!=='customer' || !state.shopId || !state.customerId) return;
    const phoneKey=normalizePhone(state.customerPhone||state.authPhoneKey||verifiedCurrentPhoneKey()||'');
    await setDoc(doc(db,'shops',state.shopId,'customerUidLinks',uid()),{
      customerId:state.customerId,
      shopId:state.shopId,
      phoneKey,
      linkedAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    },{merge:true});
    await setDoc(doc(db,'shops',state.shopId,'customers',state.customerId),{
      customerId:state.customerId,
      shopId:state.shopId,
      name:state.customerName||'عميل',
      phone:state.customerPhone||'',
      phoneKey,
      customerUid:uid(),
      updatedAt:serverTimestamp()
    },{merge:true});
  }catch(e){
    console.warn('ensure customer purchase access failed', e);
  }
}

function startListeners(){
  unsub.forEach(f=>{try{f()}catch(e){}});unsub=[];
  normalizeCustomerLinks();
  cache.customers = [];
  if(!db||!state.shopId) return;
  listenersStartedKey=liveDataKey();
  const base=(name)=>collection(db,'shops',state.shopId,name);
  listenQuerySafe(doc(db,'shops',state.shopId),s=>{
    cache.shop=s.exists()?s.data():null;
    if(state.role==='customer'){
      const link=currentCustomerLink();
      if(link&&cache.shop?.name&&link.shopName!==cache.shop.name){link.shopName=cache.shop.name; state.shopName=cache.shop.name; save();}
    }
    safeRefreshActivePage()
  }, 'بيانات المتجر');
  if(state.role==='customer') ensureCustomerPurchaseAccess();
  const itemsQuery = base('items');
  listenQuerySafe(itemsQuery,s=>{cache.items=s.docs.map(d=>({id:d.id,...d.data()})).filter(i=>state.role!=='customer'||customerCanSeeItem(i)).sort((a,b)=>(a.name||'').localeCompare(b.name||'')); safeRefreshActivePage()}, 'الأصناف');

  if(state.role==='trader'){
    listenQuerySafe(base('customers'),s=>{cache.customers=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.name||'').localeCompare(b.name||'')); safeRefreshActivePage()}, 'العملاء');
  }else if(state.role==='customer' && state.customerId){
    listenQuerySafe(doc(db,'shops',state.shopId,'customers',state.customerId),s=>{
      cache.customers=s.exists()?[{id:s.id,...s.data()}]:[];
      const c=cache.customers[0];
      if(c){
        state.customerName=c.name||state.customerName||'';
        state.customerPhone=c.phone||state.customerPhone||'';
        const link=currentCustomerLink();
        if(link){link.customerName=state.customerName; link.customerPhone=state.customerPhone;}
        save();
      }
      safeRefreshActivePage()
    }, 'بيانات العميل');
  }

  // Query by customerId so old records that do not yet have customerUid remain visible to the linked customer.
  // Firestore Rules still verify that this customerId belongs to the current signed-in user.
  const customerQuery = (name)=> state.role==='customer' ? query(base(name), where('customerId','==',state.customerId)) : base(name);

  let oq=customerQuery('purchaseRequests');
  let pq=customerQuery('paymentRequests');
  let mq=customerQuery('messages');
  let iq=customerQuery('invoices');
  let lq=customerQuery('customerLedger');
  listenQuerySafe(oq,s=>{cache.orders=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdMs||0)-(a.createdMs||0)); checkNotifications(); safeRefreshActivePage()}, 'الطلبات');
  listenQuerySafe(pq,s=>{cache.payments=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdMs||0)-(a.createdMs||0)); checkNotifications(); safeRefreshActivePage()}, 'السداد');
  listenQuerySafe(mq,s=>{cache.messages=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.createdMs||0)-(b.createdMs||0)); checkNotifications(); safeRefreshActivePage()}, 'الرسائل');
  listenQuerySafe(iq,s=>{cache.invoices=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdMs||0)-(a.createdMs||0)); safeRefreshActivePage()}, 'الفواتير');
  listenQuerySafe(lq,s=>{cache.customerLedger=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdMs||0)-(a.createdMs||0)); safeRefreshActivePage()}, 'كشف الحساب');
  const rq=customerQuery('returnRequests');
  listenQuerySafe(rq,s=>{cache.returns=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdMs||0)-(a.createdMs||0)); checkNotifications(); safeRefreshActivePage()}, 'المرتجعات');
  const sq=customerQuery('paymentSchedules');
  listenQuerySafe(sq,s=>{cache.schedules=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||''))); checkNotifications(); safeRefreshActivePage()}, 'الأقساط');
  if(state.role==='trader') listenQuerySafe(base('auditLogs'),s=>{cache.auditLogs=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdMs||0)-(a.createdMs||0)).slice(0,100); safeRefreshActivePage()}, 'سجل العمليات');
  if(state.role==='trader') listenQuerySafe(base('stockLedger'),s=>{cache.stockLedger=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdMs||0)-(a.createdMs||0)).slice(0,300); safeRefreshActivePage()}, 'حركات المخزون');
}

function customerStatusText(s){return ({active:'نشط',cash_only:'كاش فقط',blocked:'موقوف'}[s]||s||'نشط')}
function customerDebtInfo(customerId=state.customerId){
  const c=cache.customers.find(x=>x.customerId===customerId) || {};
  const balance=Number(c.balance||0), limit=Number(c.creditLimit||0), remaining=Math.max(limit-balance,0);
  return {c,balance,limit,remaining};
}
function pendingCreditForCustomer(customerId, excludeOrderId=''){
  return cache.orders.filter(o=>o.customerId===customerId && o.id!==excludeOrderId && o.paymentType==='credit' && (o.status==='pending_trader'||o.status==='pending_customer'||o.status==='pending')).reduce((a,o)=>a+Number(o.total||0),0);
}

function invoiceNumber(){
  const d=new Date();
  const prefix=(cache.shop?.invoicePrefix||'INV').trim()||'INV'; return prefix+'-'+d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+'-'+Math.random().toString(36).slice(2,6).toUpperCase()+Date.now().toString().slice(-5);
}
function actorName(){return state.role==='trader'?(cache.shop?.name||'التاجر'):(state.customerName||'العميل')}
async function addAudit(action, details={}){
  try{
    if(!db||!state.shopId)return;
    await addDoc(collection(db,'shops',state.shopId,'auditLogs'),{shopId:state.shopId,ownerUid:cache.shop?.ownerUid||uid(),action,actorRole:state.role||'',actorName:actorName(),details,createdAt:serverTimestamp(),createdMs:Date.now()});
  }catch(e){console.warn('audit failed',e)}
}


function effectiveItemPrice(item, paymentType='credit'){
  const cash=Number(item?.cashPrice||item?.price||0);
  const credit=Number(item?.creditPrice||item?.price||cash||0);
  return paymentType==='cash' ? cash : credit;
}
function itemById(itemId){return cache.items.find(i=>i.id===itemId)}

function normalizeSearchText(v){
  return String(v??'')
    .toLowerCase()
    .replace(/[أإآ]/g,'ا')
    .replace(/ى/g,'ي')
    .replace(/ة/g,'ه')
    .replace(/[\u064B-\u0652]/g,'')
    .replace(/[^\p{L}\p{N}]+/gu,' ')
    .trim();
}
function digitsOnly(v){return String(v??'').replace(/\D/g,'')}
function searchMatch(raw, q){
  const s=normalizeSearchText(raw);
  const nq=normalizeSearchText(q);
  if(!nq) return true;
  const terms=nq.split(/\s+/).filter(Boolean);
  const rawDigits=digitsOnly(raw);
  return terms.every(t=>{
    if(s.includes(t)) return true;
    const td=digitsOnly(t);
    return td.length>0 && rawDigits.includes(td);
  });
}
function dateText(ms){try{return new Date(Number(ms||Date.now())).toLocaleString('ar-YE')}catch{return ''}}
function paymentTypeText(t){return t==='credit'?'آجل':t==='cash'?'كاش':String(t||'')}
function customerNameById(customerId){return (cache.customers||[]).find(c=>c.customerId===customerId)?.name || customerId || ''}
function itemLinesText(lines=[]){return (lines||[]).map(l=>`${l.name||''} ${l.qty||''} ${l.unit||''} ${money(l.total||0)}`).join(' | ')}
function buildSearchRows(){
  const rows=[];
  const add=(type,label,title,subtitle,searchText,page,meta={})=>rows.push({type,label,title,subtitle,searchText,page,meta});
  if(state.role==='customer'){
    (state.customerLinks||[]).forEach(l=>add('shops','متجر',l.shopName||l.shopId,`كود: ${l.shopId} | رقمك: ${l.customerPhone||'-'}`,`${l.shopName} ${l.shopId} ${l.customerPhone} ${l.customerId}`,'shops',{shopId:l.shopId}));
  }
  (cache.items||[]).forEach(i=>add('items','صنف',i.name||'صنف',`السعر: ${money(i.price)} | الكمية: ${Number(i.stock||0)} ${i.unit||''} | الحالة: ${i.isActive===false?'معطل':'نشط'}`,`${i.name} ${i.unit} ${i.price} ${i.stock} ${i.minStock} ${i.isActive===false?'معطل':'نشط'} ${i.id}`,'items',{itemId:i.id}));
  if(state.role==='trader'){
    (cache.customers||[]).forEach(c=>add('customers','عميل',c.name||'عميل',`هاتف: ${c.phone||'-'} | الدين: ${money(c.balance)} | السقف: ${money(c.creditLimit)} | الحالة: ${customerStatusText(c.status||'active')}`,`${c.name} ${c.phone} ${c.customerId} ${c.phoneKey} ${c.balance} ${c.creditLimit} ${customerStatusText(c.status||'active')}`,'customers',{customerId:c.customerId}));
  }
  (cache.orders||[]).forEach(o=>add('orders','طلب',`طلب ${statusText(o.status)} - ${o.customerName||customerNameById(o.customerId)}`,`الإجمالي: ${money(o.total)} | ${paymentTypeText(o.paymentType)} | ${dateText(o.createdMs)} | ${o.traderNote||''}`,`${o.id} ${o.invoiceNo||''} ${o.customerName} ${customerNameById(o.customerId)} ${statusText(o.status)} ${paymentTypeText(o.paymentType)} ${o.traderNote} ${itemLinesText(o.lines)} ${o.total}`,'orders',{orderId:o.id,customerId:o.customerId}));
  (cache.invoices||[]).forEach(inv=>add('invoices','فاتورة',inv.invoiceNo||inv.id,`${inv.customerName||customerNameById(inv.customerId)} | ${paymentTypeText(inv.paymentType)} | ${money(inv.total)} | ${dateText(inv.createdMs)}`,`${inv.id} ${inv.invoiceNo} ${inv.customerName} ${customerNameById(inv.customerId)} ${paymentTypeText(inv.paymentType)} ${itemLinesText(inv.lines)} ${inv.total}`,'invoices',{invoiceId:inv.id,customerId:inv.customerId}));
  (cache.payments||[]).forEach(p=>add('payments','سداد',`سداد ${statusText(p.status)} - ${p.customerName||customerNameById(p.customerId)}`,`${money(p.amount)} | ${p.method||''} | مرجع: ${p.referenceNo||'-'} | ${p.traderNote||p.note||''}`,`${p.id} ${p.customerName} ${customerNameById(p.customerId)} ${statusText(p.status)} ${p.method} ${p.referenceNo} ${p.traderNote} ${p.note} ${p.amount}`,'payments',{paymentId:p.id,customerId:p.customerId}));
  (cache.returns||[]).forEach(r=>add('returns','مرتجع',`مرتجع ${statusText(r.status)} - ${r.customerName||customerNameById(r.customerId)}`,`${r.itemName||''} | كمية: ${r.qty||0} | ${money(r.total)} | ${r.reason||r.traderNote||''}`,`${r.id} ${r.customerName} ${customerNameById(r.customerId)} ${statusText(r.status)} ${r.itemName} ${r.reason} ${r.traderNote} ${r.total} ${r.qty}`,'returns',{returnId:r.id,customerId:r.customerId}));
  (cache.messages||[]).forEach(m=>add('messages','رسالة',m.fromRole==='trader'?'رسالة من التاجر':'رسالة من العميل',`${m.customerName||customerNameById(m.customerId)} | ${dateText(m.createdMs)} | ${m.text||''}`,`${m.id} ${m.text} ${m.customerName} ${customerNameById(m.customerId)} ${m.fromRole}`,'messages',{messageId:m.id,customerId:m.customerId}));
  (cache.schedules||[]).forEach(s=>add('schedules','استحقاق',`استحقاق ${s.status||''} - ${s.customerName||customerNameById(s.customerId)}`,`${money(s.amount)} | تاريخ: ${s.dueDate||''} | ${s.note||''}`,`${s.id} ${s.customerName} ${customerNameById(s.customerId)} ${s.status} ${s.dueDate} ${s.amount} ${s.note}`,'schedules',{scheduleId:s.id,customerId:s.customerId}));
  (cache.customerLedger||[]).forEach(l=>add('statement','حركة حساب',`${ledgerTypeText(l.type)} - ${l.customerName||customerNameById(l.customerId)}`,`${money(l.amount)} | ${dateText(l.createdMs)} | ${l.note||''}`,`${l.id} ${ledgerTypeText(l.type)} ${l.customerName} ${customerNameById(l.customerId)} ${l.note} ${l.amount}`,'statement',{customerId:l.customerId}));
  if(state.role==='trader'){
    (cache.stockLedger||[]).forEach(m=>add('stock','حركة مخزون',`${m.itemName||'صنف'} - ${m.type||''}`,`كمية: ${m.qtyChange||m.qty||0} | ${m.reason||''} | ${dateText(m.createdMs)}`,`${m.id} ${m.itemName} ${m.type} ${m.reason} ${m.qtyChange} ${m.qty} ${m.itemId}`,'stock',{itemId:m.itemId}));
    (cache.auditLogs||[]).forEach(a=>add('audit','سجل',a.action||'عملية',`${a.actorName||''} | ${dateText(a.createdMs)} | ${JSON.stringify(a.details||{})}`,`${a.id} ${a.action} ${a.actorName} ${JSON.stringify(a.details||{})}`,'audit',{}));
  }
  return rows;
}
function searchTypeOptions(){
  const common=[['all','كل النتائج'],['items','الأصناف'],['orders','الطلبات'],['invoices','الفواتير'],['payments','السداد'],['messages','الرسائل'],['returns','المرتجعات'],['schedules','الاستحقاقات'],['statement','كشف الحساب']];
  const extra=state.role==='trader'?[['customers','العملاء'],['stock','المخزون'],['audit','السجل']]:[['shops','متاجري']];
  return common.concat(extra).map(([v,t])=>`<option value="${v}" ${state.searchType===v?'selected':''}>${t}</option>`).join('');
}
function renderSearch(){
  state.searchType=state.searchType||'all';
  const q=state.searchQuery||'';
  const type=state.searchType||'all';
  const rows=buildSearchRows().filter(r=>(type==='all'||r.type===type||r.page===type) && searchMatch(r.searchText,q)).slice(0,120);
  const counts=buildSearchRows().reduce((acc,r)=>{acc[r.type]=(acc[r.type]||0)+1; return acc;},{});
  $('page_search').innerHTML=`<div class="card"><h2>البحث السريع</h2><p class="muted">ابحث في الأصناف، العملاء، الطلبات، الفواتير، السداد، الرسائل، كشف الحساب، المخزون والاستحقاقات. النتائج محصورة في التاجر الحالي فقط، وعند العميل في حسابه مع التاجر الحالي.</p><div class="grid"><div class="field"><label>كلمة البحث</label><input id="globalSearchInput" value="${esc(q)}" placeholder="اكتب اسم عميل، رقم هاتف، صنف، فاتورة، مبلغ، مرجع سداد، رسالة..."></div><div class="field"><label>نوع البحث</label><select id="globalSearchType">${searchTypeOptions()}</select></div></div><div class="actions"><button class="btn light" id="clearGlobalSearch">مسح البحث</button><button class="btn secondary" id="refreshGlobalSearch">تحديث النتائج</button></div><div class="muted">إجمالي النتائج: ${rows.length} | الأصناف: ${counts.items||0} | الطلبات: ${counts.orders||0} | الفواتير: ${counts.invoices||0} | السداد: ${counts.payments||0}</div></div><div class="card"><h2>النتائج</h2><div class="list">${rows.map(r=>`<div class="item"><div class="row"><h3>${esc(r.title)}</h3><span class="status approved">${esc(r.label)}</span></div><div class="muted">${esc(r.subtitle)}</div><div class="actions"><button class="btn secondary" data-open-result='${esc(JSON.stringify({page:r.page,meta:r.meta}))}'>فتح المكان</button>${r.meta?.customerId?`<button class="btn light" data-open-statement="${esc(r.meta.customerId)}">كشف الحساب</button>`:''}</div></div>`).join('')||'<p class="muted">لا توجد نتائج مطابقة. جرّب البحث برقم الهاتف أو اسم الصنف أو رقم الفاتورة أو مرجع السداد.</p>'}</div></div>`;
  $('globalSearchInput').oninput=e=>{state.searchQuery=e.target.value; save(); renderSearch()};
  $('globalSearchType').onchange=e=>{state.searchType=e.target.value; save(); renderSearch()};
  $('clearGlobalSearch').onclick=()=>{state.searchQuery='';state.searchType='all';save();renderSearch()};
  $('refreshGlobalSearch').onclick=()=>renderSearch();
  document.querySelectorAll('[data-open-result]').forEach(b=>b.onclick=()=>{try{const r=JSON.parse(b.getAttribute('data-open-result')); if(r.meta?.customerId){state.statementCustomer=r.meta.customerId; state.messageCustomer=r.meta.customerId;} if(r.meta?.itemId){state.stockFilterItem=r.meta.itemId;} save(); show(r.page||'home')}catch{show('home')}});
  document.querySelectorAll('[data-open-statement]').forEach(b=>b.onclick=()=>{state.statementCustomer=b.getAttribute('data-open-statement'); save(); show('statement')});
}



function buildDailyTasks(){
  const c=unreadCounters();
  const orders=cache.orders||[];
  const payments=cache.payments||[];
  const returnsRows=cache.returns||[];
  const schedules=cache.schedules||[];
  const items=cache.items||[];
  const customers=cache.customers||[];
  const tasks=[];
  const add=(icon,title,count,body,page,cls='')=>tasks.push({icon,title,count:Number(count||0),body,page,cls});
  if(state.role==='trader'){
    add('🧾','طلبات تحتاج موافقة', orders.filter(o=>o.status==='pending'||o.status==='pending_trader').length, 'راجع الطلبات الجديدة واعتمدها أو ارفضها مع ملاحظة واضحة.', 'orders', 'urgent');
    add('💵','مدفوعات معلقة', payments.filter(p=>p.status==='pending').length, 'اعتمد السدادات المرسلة من العملاء أو ارفضها عند وجود خطأ.', 'payments', 'urgent');
    add('💬','رسائل غير مقروءة', c.messages, 'رد على رسائل العملاء الجديدة بسرعة.', 'messages', c.messages?'urgent':'');
    add('↩️','مرتجعات معلقة', returnsRows.filter(r=>r.status==='pending').length, 'راجع طلبات المرتجع واعتمد الحركة المناسبة.', 'returns');
    add('⏰','استحقاقات اليوم/متأخرة', schedules.filter(x=>String(x.status||'pending')==='pending' && String(x.dueDate||'')<=todayIso()).length, 'تابع التحصيلات والمواعيد المستحقة.', 'schedules');
    add('🏬','أصناف منخفضة المخزون', items.filter(i=>Number(i.stock||0)<=Number(i.minStock||0) && Number(i.minStock||0)>0).length, 'راجع الأصناف التي وصلت حد التنبيه.', 'stock');
    add('👥','عملاء عليهم رصيد', customers.filter(cu=>Number(cu.balance||0)>0).length, 'راجع أرصدة العملاء وأرسل كشف الحساب عند الحاجة.', 'statement');
  }else{
    add('🛒','طلبات بانتظار التاجر', orders.filter(o=>o.status==='pending'||o.status==='pending_trader').length, 'طلباتك المرسلة وما زالت بانتظار موافقة التاجر.', 'orders');
    add('✅','طلبات تحتاج موافقتك', orders.filter(o=>o.status==='pending_customer').length, 'راجع الطلبات التي أنشأها التاجر وتحتاج موافقتك.', 'orders', 'urgent');
    add('💵','سدادات بانتظار الاعتماد', payments.filter(p=>p.status==='pending').length, 'سدادات أرسلتها ولم يعتمدها التاجر بعد.', 'payments');
    add('💬','رسائل جديدة', c.messages, 'رسائل غير مقروءة من التاجر.', 'messages', c.messages?'urgent':'');
    add('⏰','استحقاقات مستحقة', schedules.filter(x=>String(x.status||'pending')==='pending' && String(x.dueDate||'')<=todayIso()).length, 'مواعيد أو أقساط مستحقة عليك.', 'schedules', 'urgent');
    add('🏪','المتاجر المرتبطة', (state.customerLinks||[]).length, 'المتاجر التي تم ربطك بها كعميل.', 'shops', (state.customerLinks||[]).length?'good':'');
  }
  return tasks;
}
function renderTasks(){
  const tasks=buildDailyTasks();
  const openTasks=tasks.filter(t=>t.count>0).length;
  $('page_tasks').innerHTML=`<div class="card"><div class="row"><h2>المهام اليومية</h2><span class="status ${openTasks?'pending':'approved'}">${openTasks?openTasks+' مفتوحة':'لا توجد مهام عاجلة'}</span></div><p class="muted">هذه الصفحة تجمع أهم الواجبات اليومية حسب وضعك الحالي: ${state.role==='trader'?'تاجر':'عميل'}.</p></div><div class="tasks-grid">${tasks.map(t=>`<div class="task-card ${t.cls||''}"><div class="task-head"><div><span>${t.icon}</span> <span class="task-title">${esc(t.title)}</span></div><span class="task-count">${Number(t.count||0).toLocaleString('ar-YE')}</span></div><div class="task-body">${esc(t.body)}</div><div class="task-actions"><button class="btn secondary" data-task-page="${esc(t.page)}">فتح</button></div></div>`).join('')}</div>`;
  document.querySelectorAll('[data-task-page]').forEach(b=>b.onclick=()=>show(b.getAttribute('data-task-page')||'home'));
}
function dailyTaskCount(){return buildDailyTasks().filter(t=>t.count>0).length}

function homeQuickItems(){
  const c=unreadCounters();
  const trader=[
    ['tasks','✅','المهام',dailyTaskCount()],['search','🔎','بحث',0],['shopcode','🔳','كود التاجر',0],['items','📦','الأصناف',0],['customers','👥','العملاء',0],['orders','🧾','الطلبات',c.orders],
    ['messages','💬','الرسائل',c.messages],['payments','💵','السداد',c.payments],['invoices','📄','الفواتير',0],['statement','📊','كشف الحساب',0],
    ['stock','🏬','المخزون',0],['returns','↩️','المرتجعات',c.returns],['schedules','⏰','الاستحقاقات',c.schedules],['collections','🧮','التحصيل',0],
    ['reports','📈','التقارير',0],['audit','🗂️','السجل',0],['policies','⚙️','السياسات',0],[ 'notifications','🔔','الإشعارات',c.notifications],['settings','🛠️','الإعدادات',0]
  ];
  const customer=[
    ['tasks','✅','المهام',dailyTaskCount()],['search','🔎','بحث',0],['shopcode','📷','مسح كود',0],['shops','🏪','متاجري',0],['items','🛒','شراء',0],['orders','🧾','طلباتي',c.orders],
    ['messages','💬','الرسائل',c.messages],['payments','💵','السداد',c.payments],['invoices','📄','الفواتير',0],['statement','📊','كشف الحساب',0],
    ['returns','↩️','المرتجعات',c.returns],['schedules','⏰','الاستحقاقات',c.schedules],['reports','📈','التقارير',0],[ 'notifications','🔔','الإشعارات',c.notifications],['settings','🛠️','الإعدادات',0]
  ];
  return state.role==='trader'?trader:customer;
}
