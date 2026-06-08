  if(state.role==='customer' && !state.customerId) return {ok:false,msg:'يجب ربط حسابك بالمتجر قبل المراسلة.'};
  return {ok:true,msg:''};
}
async function sendMessage(){
  try{
    if(!state.shopId){msg('لا يوجد متجر نشط.','error'); return;}
    const chk=canSendMessageNow(); if(!chk.ok){showAppDialog('تعذر إرسال الرسالة',chk.msg,'error',[{text:'موافق',cls:'ok'}]); return;}
    const txt=String($('messageText')?.value||'').trim(); if(!txt){msg('اكتب نص الرسالة.','error'); return;}
    let customerId=state.customerId||'', customerName=state.customerName||'', customerUid=state.role==='customer'?uid():'';
    if(state.role==='trader'){
      customerId=$('messageCustomer')?.value||'';
      const c=(cache.customers||[]).find(x=>String(x.customerId||x.id)===String(customerId));
      if(!c){msg('اختر العميل لإرسال الرسالة.','error'); return;}
      customerName=c.name||'عميل'; customerUid=c.customerUid||'';
    }
    await addDoc(collection(db,'shops',state.shopId,'messages'),{shopId:state.shopId,customerId,customerUid,customerName,fromRole:state.role,fromUid:uid(),fromName:actorName(),text:txt,type:'chat',createdAt:serverTimestamp(),createdMs:Date.now(),readByTrader:state.role==='trader',readByCustomer:state.role==='customer',updatedAt:serverTimestamp()});
    if($('messageText')) $('messageText').value='';
    msg('تم إرسال الرسالة.','success');
  }catch(e){console.error('send message failed',e); if(e?.code==='permission-denied'||/permission|insufficient/i.test(String(e?.message||''))){showPermissionDeniedLogoutDialog('إرسال الرسالة',e);return;} msg('تعذر إرسال الرسالة: '+friendlyFirestoreError(e),'error');}
}
function renderMessages(){
  const helper = window.hesabiMessagesHelpers;
  const page = $('page_messages');
  if(!page) return;
  const chk = canSendMessageNow();
  try{
    if(helper && typeof helper.safeMarkRead === 'function') helper.safeMarkRead(markMessagesReadForActiveUser);
    else setTimeout(()=>markMessagesReadForActiveUser(), 150);
  }catch(e){ console.warn('message read marker scheduling failed', e); }
  try{
    if(helper && typeof helper.renderPage === 'function'){
      page.innerHTML = helper.renderPage({ messages: cache.messages || [], customers: cache.customers || [], role: state.role, check: chk });
      setTimeout(()=>{ if(helper && typeof helper.bindActions === 'function') helper.bindActions(sendMessage); else if($('sendMessageBtn')) $('sendMessageBtn').onclick=sendMessage; });
      return;
    }
  }catch(e){ console.warn('messages helper render failed', e); }
  const msgs=(cache.messages||[]).slice(-80).reverse();
  const customerOptions=state.role==='trader'?`<div class="field"><label>العميل</label><select id="messageCustomer"><option value="">اختر العميل</option>${(cache.customers||[]).map(c=>`<option value="${esc(c.customerId||c.id||'')}">${esc(c.name||'عميل')} - ${esc(c.phone||'')}</option>`).join('')}</select></div>`:'';
  const rows=msgs.map(m=>`<tr><td class="name"><b>${esc(m.fromName||m.senderName||'رسالة')}</b><div class="muted">${esc(m.fromRole==='trader'?'تاجر':m.fromRole==='customer'?'عميل':'النظام')}</div></td><td>${esc(m.text||m.body||m.message||'')}</td><td>${dt(m.createdMs)}</td></tr>`).join('');
  page.innerHTML=`<div class="card"><h2>الرسائل</h2>${chk.ok?'':`<div class="notice warn">${esc(chk.msg)}</div>`}${customerOptions}<div class="field"><label>نص الرسالة</label><textarea id="messageText" placeholder="اكتب رسالتك هنا"></textarea></div><button class="btn ok" id="sendMessageBtn" ${chk.ok?'':'disabled'}>إرسال</button></div><div class="table-wrap"><table class="compact-table"><thead><tr><th>المرسل</th><th>الرسالة</th><th>التاريخ</th></tr></thead><tbody>${rows||'<tr><td colspan="3">لا توجد رسائل</td></tr>'}</tbody></table></div>`;
  setTimeout(()=>{ if($('sendMessageBtn')) $('sendMessageBtn').onclick=sendMessage; });
}
function renderSettings(){
  const settingsHelper = window.hesabiSettingsHelpers;
  const rawTab = pageTabState('settings','security');
  const tab = settingsHelper && typeof settingsHelper.normalizeTab === 'function' ? settingsHelper.normalizeTab(rawTab) : rawTab;
  const tabs = settingsHelper && typeof settingsHelper.tabs === 'function' ? settingsHelper.tabs() : [['security','🔐','الأمان'],['appearance','🎨','الشكل'],['shop','🏪','المتجر'],['permissions','🛡️','الصلاحيات'],['update','⬆️','التحديث'],['backup','💾','النسخ'],['account','👤','الحساب'],['notifications','🔔','التنبيهات']];
  const page = $('page_settings');
  if(!page) return;
  let content='';
  try{
    if(settingsHelper && typeof settingsHelper.renderSection === 'function') content = settingsHelper.renderSection(tab);
  }catch(e){ console.warn('settings helper render failed', e); }
  if(!content){
    content = `<div class="card"><h2>الإعدادات</h2><div class="notice warn">تعذر تحميل مساعدات الإعدادات، لكن الصفحة لم تتوقف.</div><div class="settings-compact-actions"><button class="btn light" id="settingsGoHome">الرئيسية</button></div></div>`;
  }
  page.innerHTML = pageTabsBar('settings',tab,tabs)+content;
  setTimeout(()=>{
    if(settingsHelper && typeof settingsHelper.bindActions === 'function') settingsHelper.bindActions(renderSettings);
    else { bindPageTabs('settings',renderSettings); if($('settingsGoHome')) $('settingsGoHome').onclick=()=>show('home'); }
  });
}

async function loadOwnerConsoleDataPhase8(force=false){
  if(!isAppOwner()||!db) return;
  if(!force && cache.ownerLoadedAt && Date.now()-cache.ownerLoadedAt<60000) return;
  try{
    const [shopsSnap, usersSnap]=await Promise.all([getDocs(collection(db,'shops')), getDocs(collection(db,'users')).catch(()=>({docs:[]}))]);
    cache.ownerShops=shopsSnap.docs.map(d=>({id:d.id,shopId:d.id,...d.data()})).sort((a,b)=>(a.name||a.shopId||'').localeCompare(b.name||b.shopId||''));
    cache.ownerUsers=(usersSnap.docs||[]).map(d=>({id:d.id,...d.data()}));
    cache.ownerLoadedAt=Date.now();
  }catch(e){console.error('owner load failed',e); msg('تعذر تحميل بيانات المالك: '+friendlyFirestoreError(e),'error');}
}
function ownerShopStatusText(s){return ({active:'نشط',trial:'تجريبي',warning:'إنذار',suspended:'موقوف',expired:'منتهي'}[s]||s||'غير محدد');}
function renderOwnerConsole(){
  if(!isAppOwner()){show('home');return;}
  const tab=pageTabState('owner','metrics');
  const tabs=[['metrics','📊','المؤشرات'],['users','👤','المستخدمون'],['shops','🏪','المتاجر'],['message','💬','مراسلة'],['control','⛔','التحكم'],['subs','💳','الاشتراكات'],['logs','🗂️','السجل']];
  const shops=cache.ownerShops||[], users=cache.ownerUsers||[];
  const suspended=shops.filter(s=>s.subscriptionStatus==='suspended').length, warning=shops.filter(s=>s.subscriptionStatus==='warning'||s.ownerWarning).length;
  let content='';
  if(tab==='metrics') content=`<div class="card owner-console-head"><h2>لوحة مالك التطبيق</h2><p class="muted">الاشتراك على المتجر فقط، ولا يوجد اشتراك على العميل.</p></div><div class="grid"><div class="owner-metric"><span>المستخدمون</span><b>${users.length}</b></div><div class="owner-metric"><span>المتاجر</span><b>${shops.length}</b></div><div class="owner-metric owner-suspended"><span>موقوفة</span><b>${suspended}</b></div><div class="owner-metric owner-warn"><span>إنذارات</span><b>${warning}</b></div></div><div class="card"><button class="btn secondary" id="ownerReload">تحديث بيانات المالك</button></div>`;
  else if(tab==='users') content=`<div class="card"><h2>المستخدمون</h2><div class="table-wrap"><table class="compact-table"><thead><tr><th>الحساب</th><th>الدور</th><th>آخر دخول</th></tr></thead><tbody>${users.map(u=>`<tr><td class="name">${esc(u.email||u.phone||u.id)}</td><td>${esc(u.role||u.lastRole||'-')}</td><td>${dt(u.lastSeenMs||u.updatedMs||u.createdMs)}</td></tr>`).join('')||'<tr><td colspan="3">لا توجد بيانات</td></tr>'}</tbody></table></div></div>`;
  else if(tab==='shops') content=`<div class="card"><h2>المتاجر</h2><div class="table-wrap"><table class="compact-table"><thead><tr><th>المتجر</th><th>الهاتف</th><th>الاشتراك</th><th>الاستحقاق</th></tr></thead><tbody>${shops.map(s=>`<tr><td class="name">${esc(s.name||s.shopId||s.id)}</td><td>${esc(s.phone||'')}</td><td>${esc(ownerShopStatusText(s.subscriptionStatus))}</td><td>${esc(s.subscriptionDueDate||'')}</td></tr>`).join('')||'<tr><td colspan="4">اضغط تحديث بيانات المالك</td></tr>'}</tbody></table></div></div>`;
  else if(tab==='message') content=`<div class="card"><h2>مراسلة متجر</h2><div class="field"><label>المتجر</label><select id="ownerMsgShop"><option value="">اختر متجر</option>${shops.map(s=>`<option value="${esc(s.shopId||s.id)}">${esc(s.name||s.shopId||s.id)}</option>`).join('')}</select></div><div class="field"><label>نص الرسالة</label><textarea id="ownerMsgText" placeholder="اكتب رسالة للمتجر"></textarea></div><button class="btn ok" id="ownerSendMsg">إرسال</button></div>`;
  else if(tab==='control') content=`<div class="card"><h2>التحكم بالمتاجر</h2><div class="field"><label>المتجر</label><select id="ownerCtrlShop"><option value="">اختر متجر</option>${shops.map(s=>`<option value="${esc(s.shopId||s.id)}">${esc(s.name||s.shopId||s.id)}</option>`).join('')}</select></div><div class="field"><label>سبب/رسالة</label><textarea id="ownerCtrlNote" placeholder="سبب الإنذار أو الإيقاف"></textarea></div><div class="owner-actions-grid"><button class="btn warn" id="ownerWarnShop">إنذار</button><button class="btn danger" id="ownerSuspendShop">إيقاف</button><button class="btn ok" id="ownerActivateShop">تفعيل</button><button class="btn secondary" id="ownerExpireShop">اشتراك منتهي</button></div></div>`;
  else if(tab==='subs') content=`<div class="card"><h2>الاشتراكات</h2><div class="field"><label>المتجر</label><select id="ownerSubShop"><option value="">اختر متجر</option>${shops.map(s=>`<option value="${esc(s.shopId||s.id)}">${esc(s.name||s.shopId||s.id)}</option>`).join('')}</select></div><div class="grid"><div class="field"><label>الخطة</label><input id="ownerSubPlan" value="monthly"></div><div class="field"><label>المبلغ</label><input id="ownerSubAmount" type="number" min="0" value="0"></div><div class="field"><label>تاريخ الاستحقاق</label><input id="ownerSubDue" type="date"></div><div class="field"><label>الحالة</label>${phase8Select('ownerSubStatus','active',[['active','نشط'],['trial','تجريبي'],['warning','إنذار'],['expired','منتهي'],['suspended','موقوف']])}</div></div><div class="field"><label>ملاحظات</label><textarea id="ownerSubNote"></textarea></div><button class="btn ok" id="ownerSaveSub">حفظ الاشتراك</button></div>`;
  else content=`<div class="card"><h2>سجل المالك</h2><p class="muted">يتم حفظ إجراءات المالك داخل ownerLogs لكل متجر عند تنفيذ التحكم أو الاشتراك.</p></div>`;
  $('page_owner').innerHTML=pageTabsBar('owner',tab,tabs)+content;
  setTimeout(()=>{bindPageTabs('owner',renderOwnerConsole); if($('ownerReload')) $('ownerReload').onclick=async()=>{await loadOwnerConsoleDataPhase8(true); renderOwnerConsole();}; if($('ownerSendMsg')) $('ownerSendMsg').onclick=ownerSendMessagePhase8; ['ownerWarnShop','ownerSuspendShop','ownerActivateShop','ownerExpireShop'].forEach(id=>{if($(id)) $(id).onclick=()=>ownerSetShopStatusPhase8(id)}); if($('ownerSaveSub')) $('ownerSaveSub').onclick=ownerSaveSubscriptionPhase8;});
  if(!cache.ownerLoadedAt) setTimeout(async()=>{await loadOwnerConsoleDataPhase8(); if((state.page||'')==='owner') renderOwnerConsole();},50);
}
async function ownerLogPhase8(shopId,action,details={}){try{await addDoc(collection(db,'shops',shopId,'ownerLogs'),{shopId,action,details,ownerUid:uid(),ownerEmail:currentUser?.email||'',createdAt:serverTimestamp(),createdMs:Date.now()});}catch(e){console.warn('owner log failed',e)}}
async function ownerSendMessagePhase8(){try{const shopId=$('ownerMsgShop')?.value||''; const text=String($('ownerMsgText')?.value||'').trim(); if(!shopId||!text){msg('اختر المتجر واكتب الرسالة.','error');return;} await addDoc(collection(db,'shops',shopId,'messages'),{shopId,customerId:'__app_owner__',customerUid:'__app_owner__',customerName:'مالك التطبيق',fromRole:'owner',fromUid:uid(),fromName:'مالك التطبيق',text,type:'owner_notice',createdAt:serverTimestamp(),createdMs:Date.now(),readByTrader:false,readByCustomer:true}); await ownerLogPhase8(shopId,'owner_message',{text}); msg('تم إرسال الرسالة للمتجر.','success'); if($('ownerMsgText')) $('ownerMsgText').value='';}catch(e){msg('تعذر إرسال رسالة المالك: '+friendlyFirestoreError(e),'error');}}
async function ownerSetShopStatusPhase8(btnId){try{const shopId=$('ownerCtrlShop')?.value||''; if(!shopId){msg('اختر المتجر.','error');return;} const note=String($('ownerCtrlNote')?.value||'').trim(); const map={ownerWarnShop:['warning','إنذار من مالك التطبيق'],ownerSuspendShop:['suspended','تم إيقاف المتجر مؤقتًا'],ownerActivateShop:['active','تم تفعيل المتجر'],ownerExpireShop:['expired','انتهى الاشتراك']}; const [status,msgTxt]=map[btnId]||['active','تحديث']; await setDoc(doc(db,'shops',shopId),{subscriptionStatus:status,ownerWarning:note,updatedAt:serverTimestamp(),updatedMs:Date.now()},{merge:true}); await ownerLogPhase8(shopId,'set_shop_status',{status,note}); await loadOwnerConsoleDataPhase8(true); showAppDialog('تم تحديث المتجر',msgTxt,'success',[{text:'موافق',cls:'ok',fn:()=>renderOwnerConsole()}]);}catch(e){msg('تعذر تحديث المتجر: '+friendlyFirestoreError(e),'error');}}
async function ownerSaveSubscriptionPhase8(){try{const shopId=$('ownerSubShop')?.value||''; if(!shopId){msg('اختر المتجر.','error');return;} const payload={subscriptionPlan:($('ownerSubPlan')?.value||'monthly').trim(),subscriptionAmount:Number($('ownerSubAmount')?.value||0),subscriptionDueDate:$('ownerSubDue')?.value||'',subscriptionStatus:$('ownerSubStatus')?.value||'active',subscriptionNote:($('ownerSubNote')?.value||'').trim(),updatedAt:serverTimestamp(),updatedMs:Date.now()}; await setDoc(doc(db,'shops',shopId),payload,{merge:true}); await ownerLogPhase8(shopId,'save_subscription',payload); await loadOwnerConsoleDataPhase8(true); showAppDialog('تم حفظ الاشتراك','تم تحديث بيانات اشتراك المتجر.','success',[{text:'موافق',cls:'ok',fn:()=>renderOwnerConsole()}]);}catch(e){msg('تعذر حفظ الاشتراك: '+friendlyFirestoreError(e),'error');}}
function phase8ValidatePoliciesSettingsOwner(){
  const missing=['renderPolicies','saveShopPoliciesPhase8','renderSettings','renderOwnerConsole','sendMessage','ownerSaveSubscriptionPhase8','shopPolicyBool'].filter(n=>typeof window[n]!=='function' && typeof eval(n)!=='function');
  return {ok:missing.length===0,missing,version:APP_VERSION,build:APP_BUILD_CODE};
}




/* 1.0.54 FULL PAGE + BUTTON AUDIT HOTFIX
   الهدف: لا يوجد زر داخل الصفحات يستدعي دالة غير موجودة، ولا تظهر صفحة "القسم غير جاهز" للصفحات المكتملة.
   هذه الدوال تعيد ربط ما فُقد أثناء تجميع المراحل السابقة وتمنع تخريب صفحة كانت تعمل سابقًا. */
let selectedItemIdsForDelete = globalThis.__selectedItemIdsForDelete || new Set();
globalThis.__selectedItemIdsForDelete = selectedItemIdsForDelete;
function fieldValue(id){return String($(id)?.value||'').trim();}
function numericValue(id, fallback=0){const n=Number($(id)?.value); return Number.isFinite(n)?n:Number(fallback||0);}
function normalizeItemKey(v){const h=window.hesabiItemsHelpers||{}; return typeof h.normalizeItemKey==='function'?h.normalizeItemKey(v):String(v||'').trim().toLowerCase().replace(/\s+/g,' ');}
function selectedItemsArray(){const h=window.hesabiItemsHelpers||{}; return typeof h.selectedItemsArray==='function'?h.selectedItemsArray(selectedItemIdsForDelete):[...selectedItemIdsForDelete].filter(Boolean);}
function clearSelectedItems(){const h=window.hesabiItemsHelpers||{}; if(typeof h.clearSelectedItems==='function') return h.clearSelectedItems(selectedItemIdsForDelete); selectedItemIdsForDelete.clear(); return true;}
function itemDuplicateExists(candidate={}){
  const h=window.hesabiItemsHelpers||{};
  if(typeof h.itemDuplicateExists==='function') return h.itemDuplicateExists(cache.items||[], candidate);
  const {name='',barcode='',excludeId=''}=candidate||{};
  const n=normalizeItemKey(name), b=normalizeItemKey(barcode);
  return (cache.items||[]).some(i=>i && i.id!==excludeId && i.isDeleted!==true && ((b && normalizeItemKey(i.barcode||i.code)===b) || (n && normalizeItemKey(i.name)===n)));
}
function currentItemDoc(itemId){const h=window.hesabiItemsHelpers||{}; return typeof h.currentItemDoc==='function'?h.currentItemDoc(itemId):doc(db,'shops',state.shopId,'items',itemId);}
function safeItemById(itemId){const h=window.hesabiItemsHelpers||{}; return typeof h.safeItemById==='function'?h.safeItemById(cache.items||[], itemId):(cache.items||[]).find(i=>i.id===itemId)||null;}
function ensureTraderOrStop(action){return requireTraderAction(action||'هذه العملية');}

async function addItem(){
  try{
    if(!ensureTraderOrStop('إضافة صنف')) return;
    const name=fieldValue('itemName');
    const category=fieldValue('itemCategory')||'عام';
    const unit=fieldValue('itemUnit')||'حبة';
    const barcode=fieldValue('itemBarcode');
    const notes=fieldValue('itemNotes');
    if(!name){msg('اكتب اسم الصنف قبل الحفظ.','error');return;}
    if(itemDuplicateExists({name,barcode})){msg('لا يمكن حفظ صنف مكرر بنفس الاسم أو نفس الباركود.','error');return;}
    const cashPrice=numericValue('itemCashPrice',0);
    const creditPrice=numericValue('itemCreditPrice',cashPrice);
    const stock=numericValue('itemStock',0);
    const minStock=numericValue('itemMinStock',0);
    const now=Date.now();
    const ref=doc(collection(db,'shops',state.shopId,'items'));
    await setDoc(ref,{id:ref.id,shopId:state.shopId,name,category,unit,barcode,code:barcode,notes,cashPrice,creditPrice,price:cashPrice,stock,minStock,isActive:true,customerVisible:true,createdAt:serverTimestamp(),createdMs:now,updatedAt:serverTimestamp(),updatedMs:now,createdBy:uid(),createdByName:actorName()});
    if(stock!==0){await addDoc(collection(db,'shops',state.shopId,'stockLedger'),{shopId:state.shopId,itemId:ref.id,itemName:name,type:'opening',qty:stock,qtyChange:stock,beforeQty:0,afterQty:stock,reason:'رصيد افتتاحي عند إضافة الصنف',createdAt:serverTimestamp(),createdMs:now,actorUid:uid(),actorName:actorName()});}
    await addAudit('add_item',{itemId:ref.id,name,stock,cashPrice,creditPrice});
    ['itemName','itemBarcode','itemNotes'].forEach(id=>{const el=$(id); if(el) el.value='';});
    if($('itemStock')) $('itemStock').value='0';
    state.itemsTab='list'; save(); msg('تم حفظ الصنف بنجاح.','success'); renderItems();
  }catch(e){console.error('addItem failed',e); msg('تعذر حفظ الصنف: '+friendlyFirestoreError(e),'error');}
}
function selectItemForEdit(itemId){
  if(!ensureTraderOrStop('تعديل صنف')) return;
  state.editItemId=itemId; state.itemsTab='edit'; save(); renderItems();
}
async function saveSelectedItemEdit(){
  try{
    if(!ensureTraderOrStop('تعديل صنف')) return;
    const itemId=state.editItemId; const old=safeItemById(itemId); if(!old){msg('اختر الصنف أولًا.','error');return;}
    const name=fieldValue('editItemName'); const barcode=fieldValue('editItemBarcode');
    if(!name){msg('اسم الصنف مطلوب.','error');return;}
    if(itemDuplicateExists({name,barcode,excludeId:itemId})){msg('لا يمكن تكرار الاسم أو الباركود مع صنف آخر.','error');return;}
    const beforeQty=Number(old.stock||0), afterQty=numericValue('editItemStock',beforeQty), diff=afterQty-beforeQty;
    const payload={name,category:fieldValue('editItemCategory')||'عام',unit:fieldValue('editItemUnit')||'حبة',barcode,code:barcode,notes:fieldValue('editItemNotes'),cashPrice:numericValue('editItemCashPrice',0),creditPrice:numericValue('editItemCreditPrice',numericValue('editItemCashPrice',0)),price:numericValue('editItemCashPrice',0),stock:afterQty,minStock:numericValue('editItemMinStock',0),customerVisible:String($('editItemCustomerVisible')?.value||'true')!=='false',updatedAt:serverTimestamp(),updatedMs:Date.now(),updatedBy:uid(),updatedByName:actorName()};
    await updateDoc(currentItemDoc(itemId),payload);
    if(diff!==0){await addDoc(collection(db,'shops',state.shopId,'stockLedger'),{shopId:state.shopId,itemId,itemName:name,type:diff>0?'adjustment_add':'adjustment_remove',qty:Math.abs(diff),qtyChange:diff,beforeQty,afterQty,reason:'تعديل كمية من نموذج الصنف',createdAt:serverTimestamp(),createdMs:Date.now(),actorUid:uid(),actorName:actorName()});}
    await addAudit('edit_item',{itemId,name,diff});
    state.editItemId=''; state.itemsTab='list'; save(); msg('تم حفظ تعديل الصنف.','success'); renderItems();
  }catch(e){console.error('saveSelectedItemEdit failed',e); msg('تعذر تعديل الصنف: '+friendlyFirestoreError(e),'error');}
}
async function saveItemPriceQuick(itemId){
  try{
    if(!ensureTraderOrStop('تعديل سعر صنف')) return;
    const item=safeItemById(itemId); if(!item){msg('الصنف غير موجود.','error');return;}
    const cashPrice=Number($('priceCash_'+itemId)?.value||0), creditPrice=Number($('priceCredit_'+itemId)?.value||cashPrice);
    if(cashPrice<0 || creditPrice<0 || !Number.isFinite(cashPrice) || !Number.isFinite(creditPrice)){msg('السعر غير صحيح.','error');return;}
    await updateDoc(currentItemDoc(itemId),{cashPrice,creditPrice,price:cashPrice,updatedAt:serverTimestamp(),updatedMs:Date.now(),updatedBy:uid(),updatedByName:actorName()});
    await addAudit('quick_price_update',{itemId,itemName:item.name,cashPrice,creditPrice});
    msg('تم حفظ السعر.','success');
  }catch(e){console.error('saveItemPriceQuick failed',e); msg('تعذر حفظ السعر: '+friendlyFirestoreError(e),'error');}
}
async function toggleItemCustomerVisible(itemId){
  try{
    if(!ensureTraderOrStop('إظهار أو إخفاء صنف')) return;
    const item=safeItemById(itemId); if(!item){msg('الصنف غير موجود.','error');return;}
    const customerVisible=item.customerVisible===false;
    await updateDoc(currentItemDoc(itemId),{customerVisible,updatedAt:serverTimestamp(),updatedMs:Date.now(),updatedBy:uid(),updatedByName:actorName()});
    await addAudit('toggle_item_customer_visible',{itemId,itemName:item.name,customerVisible});
    msg(customerVisible?'تم إظهار الصنف للعملاء.':'تم إخفاء الصنف عن العملاء.','success'); renderItems();
  }catch(e){console.error('toggleItemCustomerVisible failed',e); msg('تعذر تحديث ظهور الصنف: '+friendlyFirestoreError(e),'error');}
}
async function deleteSingleItem(itemId){
  try{
    if(!ensureTraderOrStop('حذف صنف')) return;
    const item=safeItemById(itemId); if(!item){msg('الصنف غير موجود.','error');return;}
    const ok=await confirmDialog('حذف صنف','سيتم حذف الصنف من قائمة الأصناف. هل تريد المتابعة؟','حذف'); if(!ok) return;
    await deleteDoc(currentItemDoc(itemId)); selectedItemIdsForDelete.delete(itemId); await addAudit('delete_item',{itemId,itemName:item.name}); msg('تم حذف الصنف.','success'); renderItems();
  }catch(e){console.error('deleteSingleItem failed',e); msg('تعذر حذف الصنف: '+friendlyFirestoreError(e),'error');}
}
async function deleteItemsByIds(ids){
  try{
    if(!ensureTraderOrStop('حذف عدة أصناف')) return;
    ids=(ids||[]).filter(Boolean); if(!ids.length){msg('حدد أصنافًا للحذف.','error');return;}
    const ok=await confirmDialog('حذف الأصناف المحددة','سيتم حذف '+ids.length+' صنف. هل تريد المتابعة؟','حذف المحدد'); if(!ok) return;
    const batch=writeBatch(db); ids.forEach(id=>batch.delete(currentItemDoc(id))); await batch.commit(); clearSelectedItems(); await addAudit('delete_items_bulk',{count:ids.length,ids}); msg('تم حذف الأصناف المحددة.','success'); renderItems();
  }catch(e){console.error('deleteItemsByIds failed',e); msg('تعذر حذف الأصناف: '+friendlyFirestoreError(e),'error');}
}
async function adjustStockItem(itemId,newQty,reason='تسوية مخزون'){
  try{
    if(!ensureTraderOrStop('تسوية المخزون')) return;
    const item=safeItemById(itemId); if(!item){msg('الصنف غير موجود.','error');return;}
    const beforeQty=Number(item.stock||0), afterQty=Number(newQty);
    if(!Number.isFinite(afterQty) || afterQty<0){msg('الكمية غير صحيحة.','error');return;}
    const diff=afterQty-beforeQty; if(diff===0){msg('لم تتغير الكمية.','notice');return;}
    await updateDoc(currentItemDoc(itemId),{stock:afterQty,updatedAt:serverTimestamp(),updatedMs:Date.now(),updatedBy:uid(),updatedByName:actorName()});
    await addDoc(collection(db,'shops',state.shopId,'stockLedger'),{shopId:state.shopId,itemId,itemName:item.name,type:'adjustment_set',qty:Math.abs(diff),qtyChange:diff,beforeQty,afterQty,reason,createdAt:serverTimestamp(),createdMs:Date.now(),actorUid:uid(),actorName:actorName()});
    await addAudit('stock_adjustment',{itemId,itemName:item.name,beforeQty,afterQty,diff,reason});
    msg('تمت تسوية المخزون.','success'); renderStock();
  }catch(e){console.error('adjustStockItem failed',e); msg('تعذر تسوية المخزون: '+friendlyFirestoreError(e),'error');}
}
function openStockAdjustmentDialog(itemId){
  const item=safeItemById(itemId); if(!item){msg('الصنف غير موجود.','error');return;}
  const v=prompt('الكمية الجديدة للصنف: '+item.name, Number(item.stock||0)); if(v===null) return;
  const r=prompt('سبب التسوية:', 'تسوية مخزون يدوية') || 'تسوية مخزون يدوية';
  adjustStockItem(itemId,Number(v),r);
}
function editStock(itemId){openStockAdjustmentDialog(itemId);}

function editableCustomerOrder(order){return state.role==='customer' && order && order.source==='customer' && order.customerId===state.customerId && (order.status==='pending'||order.status==='pending_trader');}
function clearOrderEditing(){const cs=catalogState(); delete cs.editingOrderId; delete cs.editingOrderNo; saveCatalog();}
function loadOrderForEdit(orderId){
  const o=(cache.orders||[]).find(x=>x.id===orderId); if(!editableCustomerOrder(o)){msg('لا يمكن تعديل هذا الطلب لأنه لم يعد بانتظار موافقة التاجر.','error');return;}
  const cs=catalogState(); cs.cart={};
  for(const l of (o.items||o.lines||[])){const item=safeItemById(l.itemId); const qty=Math.max(0,Number(l.qty||l.quantity||0)); if(item && qty>0) cs.cart[l.itemId]=qty;}
  cs.editingOrderId=orderId; cs.editingOrderNo=o.id; cs.purchaseMode='invoice'; saveCatalog(); show('items'); setTimeout(()=>{if($('payType')) $('payType').value=o.paymentType||'credit'; if($('orderNote')) $('orderNote').value=o.note||'';},80); msg('تم فتح الطلب للتعديل.','success');
}
async function cancelCustomerOrder(orderId){
  try{
    const o=(cache.orders||[]).find(x=>x.id===orderId); if(!editableCustomerOrder(o)){msg('لا يمكن إلغاء هذا الطلب.','error');return;}
    const ok=await confirmDialog('إلغاء الطلب','هل تريد إلغاء طلب الشراء قبل مراجعته من التاجر؟','إلغاء الطلب'); if(!ok)return;
    await updateDoc(doc(db,'shops',state.shopId,'purchaseRequests',orderId),{status:'cancelled',customerNote:'إلغاء من العميل',cancelledBy:uid(),cancelledAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedMs:Date.now()});
    await addAudit('cancel_customer_order',{orderId}); msg('تم إلغاء الطلب.','success'); renderOrders();
  }catch(e){console.error('cancelCustomerOrder failed',e); msg('تعذر إلغاء الطلب: '+friendlyFirestoreError(e),'error');}
}
async function addManualCustomer(){
  try{
    if(!ensureTraderOrStop('إضافة عميل')) return;
    const name=fieldValue('newCustomerName'), phoneRaw=fieldValue('newCustomerPhone'), phone=normalizePhone(phoneRaw);
    if(!name || !phone){msg('اسم العميل ورقم الهاتف مطلوبان.','error');return;}
    const exists=(cache.customers||[]).find(c=>normalizePhone(c.phone)===phone); if(exists){msg('هذا العميل موجود مسبقًا.','error');return;}
    const now=Date.now(); const ref=doc(collection(db,'shops',state.shopId,'customers'));
    const opening=numericValue('newCustomerOpening',0), limit=numericValue('newCustomerLimit',0), status=fieldValue('newCustomerStatus')||'active';
    await setDoc(ref,{id:ref.id,shopId:state.shopId,name,phone,phoneRaw,creditLimit:limit,balance:opening,status,note:fieldValue('newCustomerNote'),createdAt:serverTimestamp(),createdMs:now,updatedAt:serverTimestamp(),updatedMs:now,createdBy:uid()});
    if(opening){await addDoc(collection(db,'shops',state.shopId,'customerLedger'),{shopId:state.shopId,customerId:ref.id,customerName:name,type:'opening_balance',amount:opening,note:'رصيد افتتاحي',createdAt:serverTimestamp(),createdMs:now,actorUid:uid(),actorName:actorName()});}
    await addAudit('add_customer',{customerId:ref.id,name,phone,opening,limit,status}); msg('تم حفظ العميل.','success'); renderCustomers();
  }catch(e){console.error('addManualCustomer failed',e); msg('تعذر حفظ العميل: '+friendlyFirestoreError(e),'error');}
}
async function setCreditLimit(customerId){
  try{if(!ensureTraderOrStop('تعديل سقف العميل')) return; const c=(cache.customers||[]).find(x=>x.id===customerId); if(!c){msg('العميل غير موجود.','error');return;} const v=prompt('سقف الدين للعميل '+(c.name||''), Number(c.creditLimit||0)); if(v===null)return; const limit=Number(v); if(!Number.isFinite(limit)||limit<0){msg('السقف غير صحيح.','error');return;} await updateDoc(doc(db,'shops',state.shopId,'customers',customerId),{creditLimit:limit,updatedAt:serverTimestamp(),updatedMs:Date.now()}); await addAudit('set_credit_limit',{customerId,limit}); msg('تم تحديث سقف الدين.','success'); renderCustomers();}catch(e){msg('تعذر تحديث السقف: '+friendlyFirestoreError(e),'error');}
}
async function setCustomerStatus(customerId,status){
  try{if(!ensureTraderOrStop('تعديل حالة العميل')) return; await updateDoc(doc(db,'shops',state.shopId,'customers',customerId),{status,updatedAt:serverTimestamp(),updatedMs:Date.now()}); await addAudit('set_customer_status',{customerId,status}); msg('تم تحديث حالة العميل.','success'); renderCustomers();}catch(e){msg('تعذر تحديث حالة العميل: '+friendlyFirestoreError(e),'error');}
}
async function sendTraderSale(){
  try{
    if(!ensureTraderOrStop('إنشاء طلب بيع للعميل')) return;
    const customerId=$('saleCustomer')?.value; const c=(cache.customers||[]).find(x=>x.id===customerId); if(!c){msg('اختر العميل.','error');return;}
    const lines=[]; for(const inp of document.querySelectorAll('[data-sale-qty]')){const qty=Number(inp.value||0); if(qty>0){const item=safeItemById(inp.dataset.itemId); if(item){const price=effectiveItemPrice(item,$('salePayType')?.value||'credit'); lines.push({itemId:item.id,name:item.name,qty,price,total:qty*price,unit:item.unit||'حبة'});}}}
    if(!lines.length){msg('اختر صنفًا واحدًا على الأقل.','error');return;}
    const total=lines.reduce((a,l)=>a+Number(l.total||0),0); const now=Date.now();
    await addDoc(collection(db,'shops',state.shopId,'purchaseRequests'),{shopId:state.shopId,source:'trader',customerId:c.id,customerUid:c.customerUid||'',customerName:c.name,customerPhone:c.phone,items:lines,lines,total,paymentType:$('salePayType')?.value||'credit',dueDate:$('saleDueDate')?.value||'',priority:$('salePriority')?.value||'normal',note:fieldValue('saleNote'),status:'pending_customer',createdBy:uid(),createdByRole:'trader',createdAt:serverTimestamp(),createdMs:now,updatedAt:serverTimestamp(),updatedMs:now});
    await addAudit('send_trader_sale',{customerId:c.id,total,count:lines.length}); msg('تم إرسال الطلب للعميل.','success'); renderOrders(); show('orders');
  }catch(e){console.error('sendTraderSale failed',e); msg('تعذر إرسال الطلب للعميل: '+friendlyFirestoreError(e),'error');}
}
function ledgerRowsForCustomer(customerId){
  let rows=(cache.customerLedger||[]).filter(x=>x.customerId===customerId);
  if(rows.length) return rows.sort((a,b)=>(a.createdMs||0)-(b.createdMs||0));
  const invs=(cache.invoices||[]).filter(x=>x.customerId===customerId).map(x=>({type:x.paymentType==='credit'?'debit_invoice':'cash_invoice',amount:Number(x.total||0),note:'فاتورة '+(x.invoiceNo||x.id),createdMs:x.createdMs||0}));
  const pays=(cache.payments||[]).filter(x=>x.customerId===customerId&&x.status==='approved').map(x=>({type:'payment',amount:-Number(x.amount||0),note:'سداد مقبول '+(x.method||''),createdMs:x.createdMs||0}));
  return [...invs,...pays].sort((a,b)=>(a.createdMs||0)-(b.createdMs||0));
}
async function shareStatementText(customerId){
  try{const c=state.role==='customer'?customerDebtInfo().c:(cache.customers||[]).find(x=>x.id===customerId)||{}; const rows=ledgerRowsForCustomer(customerId||c.id||state.customerId); let running=0; const body=rows.map(r=>{running+=Number(r.amount||0); return `${new Date(Number(r.createdMs||Date.now())).toLocaleDateString('ar-YE')} | ${ledgerTypeText(r.type)} | ${Number(r.amount||0)>=0?'+':''}${money(r.amount)} | الرصيد: ${money(running)} | ${r.note||''}`;}).join('\n'); const text=`كشف حساب\nالمحل: ${cache.shop?.name||state.shopName||''}\nالعميل: ${c.name||state.customerName||''}\nالرصيد الحالي: ${money(Number(c.balance||0))}\n----------------\n${body||'لا توجد حركات.'}`; if(navigator.share) await navigator.share({title:'كشف حساب',text}); else {await navigator.clipboard?.writeText(text); msg('تم نسخ كشف الحساب.','success');}}catch(e){msg('تعذر مشاركة كشف الحساب: '+friendlyFirestoreError(e),'error');}
}


function extractItemNameFromOcrText(text){
  const h=window.hesabiItemsHelpers||{};
  if(typeof h.extractItemNameFromOcrText==='function') return h.extractItemNameFromOcrText(text);
  const raw=String(text||'').replace(/\r/g,'\n');
  const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  return lines.find(l=>/[A-Za-z\u0600-\u06FF]/.test(l) && l.length>=3 && l.length<=60)||'';
}
function normalizeItemCodeForLookup(code){const h=window.hesabiItemsHelpers||{}; return typeof h.normalizeItemCodeForLookup==='function'?h.normalizeItemCodeForLookup(code):String(code||'').trim().toUpperCase().replace(/\s+/g,'');}
function autoFillItemNameFromCode(code){
  try{
    const key=normalizeItemCodeForLookup(code); if(!key) return false;
    const h=window.hesabiItemsHelpers||{};
    const found=typeof h.findItemByCode==='function'?h.findItemByCode(cache.items||[], code):(cache.items||[]).find(i=>[i.barcode,i.code,i.sku,i.serial,i.imei,i.sn].map(normalizeItemCodeForLookup).includes(key));
    if(!found) return false;
    if($('itemName') && !$('itemName').value.trim()) $('itemName').value=found.name||'';
    if($('itemCategory')) $('itemCategory').value=itemCategory(found)||found.category||'عام';
    if($('itemUnit')) $('itemUnit').value=found.unit||'حبة';
    if($('itemCashPrice') && !Number($('itemCashPrice').value||0)) $('itemCashPrice').value=Number(found.cashPrice||found.price||0)||'';
    if($('itemCreditPrice') && !Number($('itemCreditPrice').value||0)) $('itemCreditPrice').value=Number(found.creditPrice||found.cashPrice||found.price||0)||'';
    return true;
  }catch(e){return false}
}
function stopItemBarcodeScanner(showMsg=true){try{const v=$('itemBarcodeVideo'); if(v && v.srcObject){v.srcObject.getTracks().forEach(t=>t.stop()); v.srcObject=null;} if(v) v.classList.remove('active'); if(showMsg) msg('تم إيقاف الماسح.','notice');}catch(e){}}
async function startItemBarcodeScanner(){return startEmbeddedItemBarcodeScanner()}
async function scanItemBarcodeStillFrame(){return startEmbeddedItemBarcodeScanner()}
async function startEmbeddedItemBarcodeScanner(){
  try{
    if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.scanItemBarcodeEmbedded==='function' && window.hesabiAndroidBridge.scanItemBarcodeEmbedded().ok){
      const st=$('itemBarcodeScanStatus'); if(st) st.textContent='تم فتح الماسح الداخلي. وجّه الكاميرا نحو الباركود.';
      return true;
    }
    msg('الماسح الداخلي غير متاح في هذه النسخة. استخدم إدخال الباركود يدويًا.','notice'); return false;
  }catch(e){msg('تعذر فتح الماسح الداخلي: '+(e.message||e),'error');return false}
}
async function startExternalItemBarcodeScanner(){
  try{
    if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.scanItemBarcodeExternal==='function' && window.hesabiAndroidBridge.scanItemBarcodeExternal().ok){
      const st=$('itemBarcodeScanStatus'); if(st) st.textContent='محاولة فتح ماسح خارجي، وإذا لم يتوفر سيُستخدم الماسح الداخلي.';
      return true;
    }
    return startEmbeddedItemBarcodeScanner();
  }catch(e){msg('تعذر فتح الماسح الخارجي: '+(e.message||e),'error');return false}
}
async function startItemOcrNative(){
  try{
    if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.scanItemOcrNative==='function' && window.hesabiAndroidBridge.scanItemOcrNative().ok){
      const st=$('itemBarcodeScanStatus'); if(st) st.textContent='صوّر ملصق الصنف بوضوح لاستخراج الاسم أو الموديل.';
      return true;
    }
    msg('OCR غير متاح على هذا الجهاز.','notice'); return false;
  }catch(e){msg('تعذر تشغيل OCR: '+(e.message||e),'error');return false}
}
function usePendingItemBarcodeCandidate(){const code=state.pendingItemBarcode||''; if(code && $('itemBarcode')){$('itemBarcode').value=code; msg('تم اعتماد الكود المقروء.','success');} else msg('لا يوجد كود مقروء لاعتماده.','notice');}
window.hesabiReceiveItemBarcode=function(code,message){
  try{
    const value=String(code||'').trim(); const input=$('itemBarcode'); const note=$('itemNotes'); const st=$('itemBarcodeScanStatus');
    if(value){
      if(/^\d{15}$/.test(value)){state.pendingItemBarcode=value; save(); if(note && !String(note.value||'').includes(value)) note.value=(note.value?note.value+' | ':'')+'IMEI: '+value; if(st) st.innerHTML='تمت قراءة رقم IMEI: <b dir="ltr">'+esc(value)+'</b>. إذا كان كود الصنف اضغط اعتماد، أو أعد المسح.'; msg('تمت قراءة IMEI؛ راجع هل هو كود الصنف المطلوب.','notice'); return;}
      if(input) input.value=value;
      const filled=autoFillItemNameFromCode(value);
      if(st) st.textContent=filled?'تم قراءة الكود وتعبئة بيانات الصنف':'تم قراءة كود الصنف: '+value;
      msg(filled?'تم قراءة الكود وتعبئة بيانات الصنف':'تم قراءة كود الصنف','success');
    }else{ if(st) st.textContent=message||'تم إلغاء مسح كود الصنف.'; if(message) msg(message,'notice'); }
  }catch(e){console.warn('hesabiReceiveItemBarcode failed',e)}
};
window.hesabiReceiveItemOcr=function(text,message){
  try{
    const raw=String(text||'').trim(); const st=$('itemBarcodeScanStatus');
    if(!raw){ if(st) st.textContent=message||'لم يتم العثور على نص واضح.'; msg(message||'لم يتم العثور على نص واضح','error'); return; }
    const name=extractItemNameFromOcrText(raw);
    if(name && $('itemName') && !$('itemName').value.trim()){ $('itemName').value=name; msg('تم استخراج اسم الصنف: '+name,'success'); }
    else if(name){ msg('تم قراءة نص، والاسم المقترح: '+name,'notice'); }
    else msg('تمت قراءة النص، لكن لم يتم تحديد اسم صنف واضح.','notice');
    const note=$('itemNotes'); if(note){ const shortText=raw.replace(/\s+/g,' ').slice(0,220); if(!String(note.value||'').includes(shortText)) note.value=(note.value?note.value+' | ':'')+'OCR: '+shortText; }
    if(st) st.textContent=name?'تم اقتراح اسم الصنف من OCR: '+name:'تمت قراءة النص وإضافته للملاحظات.';
  }catch(e){console.warn('hesabiReceiveItemOcr failed',e)}
};

function openItemsExcelImport(){const f=$('itemsExcelImportFile'); if(f) f.click(); else msg('حقل اختيار ملف Excel غير موجود في الصفحة.','error');}
function hesabiExcel(){return window.hesabiExcelImportExport||{}}
function exportItemsToExcel(){exportCsv('hesabi-items.csv',['name','barcode','category','unit','cashPrice','creditPrice','stock'],cache.items||[]);}
function exportInvoicesCsv(){exportCsv('hesabi-invoices.csv',['invoiceNo','customerName','paymentType','total','createdMs'],cache.invoices||[]);}
function exportPaymentsCsv(){exportCsv('hesabi-payments.csv',['customerName','amount','method','reference','status','createdMs'],cache.payments||[]);}
function exportCustomersCsv(){exportCsv('hesabi-customers.csv',['name','phone','balance','creditLimit','status'],cache.customers||[]);}
function exportCsv(filename, cols, rows){
  const excel=hesabiExcel();
  if(typeof excel.exportCsv==='function') return excel.exportCsv(filename,cols,rows);
  try{const escCsv=v=>'"'+String(v??'').replace(/"/g,'""')+'"'; const csv='\ufeff'+cols.join(',')+'\n'+(rows||[]).map(r=>cols.map(c=>escCsv(c==='createdMs'&&r[c]?new Date(Number(r[c])).toLocaleString('ar-YE'):r[c])).join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); msg('تم تجهيز ملف التصدير.','success');}catch(e){msg('تعذر التصدير: '+String(e.message||e),'error');}
}
async function deleteAllItemsAndStock(){try{if(!ensureTraderOrStop('حذف كل الأصناف')) return; const ok=await confirmDialog('حذف كل الأصناف','سيتم حذف كل الأصناف وحركات المخزون المرتبطة. تأكد أنك صدّرت نسخة احتياطية. هل تريد المتابعة؟','حذف الكل'); if(!ok)return; const batch=writeBatch(db); (cache.items||[]).forEach(i=>batch.delete(doc(db,'shops',state.shopId,'items',i.id))); (cache.stockLedger||[]).forEach(x=>batch.delete(doc(db,'shops',state.shopId,'stockLedger',x.id))); await batch.commit(); clearSelectedItems(); await addAudit('delete_all_items',{count:(cache.items||[]).length}); msg('تم حذف كل الأصناف.','success'); renderItems();}catch(e){msg('تعذر حذف كل الأصناف: '+friendlyFirestoreError(e),'error');}}
async function shareBusinessReport(){try{const h=window.hesabiReportsHelpers||{}; const text=typeof h.businessReportText==='function'?h.businessReportText(cache,state):`تقرير حسابي التجاري
المتجر: ${cache.shop?.name||state.shopName||''}
الفواتير: ${(cache.invoices||[]).length}
السداد: ${(cache.payments||[]).length}
العملاء: ${(cache.customers||[]).length}
الأصناف: ${(cache.items||[]).length}`; if(navigator.share) await navigator.share({title:'تقرير حسابي التجاري',text}); else {await navigator.clipboard?.writeText(text); msg('تم نسخ التقرير.','success');}}catch(e){msg('تعذر مشاركة التقرير.','error');}}

function fullPageButtonAudit(){
  const renderers=buildPageRendererRegistry();
  const pages=['home','search','tasks','items','orders','customers','shops','messages','payments','invoices','statement','audit','stock','returns','schedules','collections','reports','policies','notifications','shopcode','settings','owner'];
  const missingRenderers=pages.filter(p=>typeof renderers[p]!=='function');
  const must=['addItem','saveSelectedItemEdit','saveItemPriceQuick','toggleItemCustomerVisible','deleteSingleItem','deleteItemsByIds','adjustStockItem','editStock','loadOrderForEdit','cancelCustomerOrder','addManualCustomer','setCreditLimit','setCustomerStatus','sendTraderSale','shareStatementText','stopItemBarcodeScanner','startItemBarcodeScanner','scanItemBarcodeStillFrame','startEmbeddedItemBarcodeScanner','startExternalItemBarcodeScanner','startItemOcrNative','usePendingItemBarcodeCandidate','openItemsExcelImport','exportItemsToExcel','exportInvoicesCsv','exportPaymentsCsv','exportCustomersCsv','deleteAllItemsAndStock','shareBusinessReport'];
  const missingFunctions=must.filter(n=>{try{return typeof eval(n)!=='function'}catch(e){return true}});
  return {ok:!missingRenderers.length&&!missingFunctions.length,version:APP_VERSION,build:APP_BUILD_CODE,missingRenderers,missingFunctions};
}
window.hesabiPageButtonAudit=fullPageButtonAudit;


/* Phase 10 final audit: non-intrusive runtime self-check helpers. */
function phase10FinalSelfCheck(){
  const requiredFunctions=[
    'render','show','renderProfileSetup','ensureLiveDataListeners','renderCustomerItemsReadonly','renderCustomerAddItemsPage','addItemToPurchaseInvoice','sendCustomerOrder','approveOrder','rejectOrder','sendPayment','approvePayment','rejectPayment','sendReturnRequest','approveReturn','rejectReturn','createSchedule','paySchedule','renderItems','addItem','saveSelectedItemEdit','saveItemPriceQuick','toggleItemCustomerVisible','deleteSingleItem','deleteItemsByIds','adjustStockItem','editStock','loadOrderForEdit','cancelCustomerOrder','addManualCustomer','setCreditLimit','setCustomerStatus','sendTraderSale','shareStatementText','renderPolicies','saveShopPoliciesPhase8','renderSettings','renderMessages','renderNotifications','renderOwnerConsole','downloadApkUpdate','refreshWebUiNow','showPermissionDeniedLogoutDialog','safeFullLogout'
  ];
  const missing=[];
  for(const n of requiredFunctions){ try{ if(typeof eval(n)!=='function') missing.push(n); }catch(e){ missing.push(n); } }
  const requiredPages=['home','items','orders','customers','messages','payments','invoices','statement','stock','returns','schedules','collections','reports','policies','notifications','shopcode','settings','owner'];
  const missingPages=requiredPages.filter(p=>!document.getElementById('page_'+p));
  return {ok:missing.length===0 && missingPages.length===0, version:APP_VERSION, build:APP_BUILD_CODE, missingFunctions:missing, missingPages};
}
window.hesabiFinalSelfCheck=function(){ try{return phase10FinalSelfCheck();}catch(e){return {ok:false,error:String(e&&e.message||e),version:APP_VERSION,build:APP_BUILD_CODE};} };




/* 1.0.56: Full isolated page/form/button audit helpers.
   These helpers restore shared table/page functions that were referenced by pages
   after phased merges, so a missing helper cannot collapse finished pages into fallback screens. */
function dt(v){
  try{
    if(!v) return '-';
    const n=Number(v);
    const d=Number.isFinite(n)?new Date(n):(v&&v.toDate?v.toDate():new Date(v));
    if(String(d)==='Invalid Date') return '-';
    return d.toLocaleString('ar-YE');
  }catch(e){return '-'}
}
function paymentDate(p){
  try{
    const v=p?.createdMs||p?.paidMs||p?.reviewedMs||p?.dateMs||0;
    const d=v?new Date(Number(v)) : new Date();
    return d.toISOString().slice(0,10);
  }catch(e){return new Date().toISOString().slice(0,10)}
}
function demandText(lines){
  return (lines||[]).map(x=>`${x.name||x.itemName||''} ${x.qty||''} ${x.total||''}`).join(' ');
}
function compactActionButtons(html){
  return `<div class="compact-actions">${html||''}</div>`;
}
function compactLineRows(lines){
  const arr=Array.isArray(lines)?lines:[];
  if(!arr.length) return '<div class="muted">لا توجد تفاصيل.</div>';
  return `<div class="mini-lines">${arr.map(l=>`<div class="mini-line"><span>${esc(l.name||l.itemName||'صنف')}</span><b>${money(l.qty||0)}</b><small>${money(l.total||0)}</small></div>`).join('')}</div>`;
}
function customerStatusLabel(s){
  return ({active:'نشط',blocked:'موقوف',pending:'معلق',inactive:'غير نشط'}[s]||s||'نشط');
}
function customerStatusClass(s){
  return s==='blocked'?'bad':(s==='pending'?'warn':'ok');
}
function demandFilter(key, data, textFn){
  const all=Array.isArray(data)?data:[];
  const q=String(state[key+'Q']||'').trim().toLowerCase();
  const page=Math.max(1, Number(state[key+'Page']||1));
  const pageSize=Math.max(5, Number(state[key+'PageSize']||50));
  const filtered=q?all.filter(row=>String((textFn?textFn(row):JSON.stringify(row))||'').toLowerCase().includes(q)):all.slice();
  const pages=Math.max(1, Math.ceil(filtered.length/pageSize));
  const fixedPage=Math.min(page,pages);
  if(fixedPage!==page){ state[key+'Page']=fixedPage; try{save()}catch{} }
  const start=(fixedPage-1)*pageSize;
  return {key,q,page:fixedPage,pageSize,total:all.length,filteredCount:filtered.length,pages,filtered,visible:filtered.slice(start,start+pageSize)};
}
function demandTableCard(key,title,headers,rows,meta,emptyText,extraControls=''){
  meta=meta||{key,page:1,pages:1,filteredCount:0,total:0,visible:[]};
  return `<div class="card demand-card" data-demand-card="${esc(key)}">
    <div class="row"><h2>${esc(title||'بيانات')}</h2><span class="badge">${money(meta.filteredCount||0)} / ${money(meta.total||0)}</span></div>
    <div class="toolbar">
      <input id="${key}Search" value="${esc(state[key+'Q']||'')}" placeholder="بحث..." autocomplete="off">
      ${extraControls||''}
      <button class="btn secondary" id="${key}Prev" ${meta.page<=1?'disabled':''}>السابق</button>
      <span class="muted">صفحة ${money(meta.page)} من ${money(meta.pages)}</span>
      <button class="btn secondary" id="${key}Next" ${meta.page>=meta.pages?'disabled':''}>التالي</button>
    </div>
    <div class="tablewrap"><table><thead><tr>${(headers||[]).map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${(rows&&rows.length)?rows.join(''):`<tr><td colspan="${Math.max(1,(headers||[]).length)}" class="muted">${esc(emptyText||'لا توجد بيانات')}</td></tr>`}</tbody></table></div>
  </div>`;
}
function bindDemandTable(key, rerender){
  const input=$(key+'Search');
  if(input){
    input.oninput=()=>{state[key+'Q']=input.value||'';state[key+'Page']=1;save(); if(typeof rerender==='function') rerender();};
  }
  const prev=$(key+'Prev'), next=$(key+'Next');
  if(prev) prev.onclick=()=>{state[key+'Page']=Math.max(1,Number(state[key+'Page']||1)-1);save(); if(typeof rerender==='function') rerender();};
  if(next) next.onclick=()=>{state[key+'Page']=Number(state[key+'Page']||1)+1;save(); if(typeof rerender==='function') rerender();};
}
function getItemsTab(){
  const allowed=['list','add','edit','prices','import'];
  if(!allowed.includes(state.itemsTab)) state.itemsTab='list';
  return state.itemsTab;
}
function itemsTabsBar(){
  const tabs=[['list','📦','الأصناف'],['add','➕','إضافة'],['edit','✏️','تعديل'],['prices','💵','الأسعار'],['import','⬆️','استيراد/تصدير']];
  const active=getItemsTab();
  return `<div class="workspace-tabs items-top-tabs">${tabs.map(t=>`<button class="workspace-tab ${active===t[0]?'active':''}" data-items-tab="${t[0]}"><span>${t[1]}</span><b>${t[2]}</b></button>`).join('')}</div>`;
}
function itemCategoryOptions(selected='الكل'){
  const h=window.hesabiItemsHelpers||{};
  const cats=typeof h.itemCategoryList==='function'?h.itemCategoryList(cache.items||[]):['الكل',...Array.from(new Set((cache.items||[]).map(i=>itemCategory(i)).filter(Boolean))).sort((a,b)=>a.localeCompare(b))];
  return cats.map(c=>`<option value="${esc(c)}" ${c===selected?'selected':''}>${esc(c)}</option>`).join('');
}
function filteredItemsByCategory(category='الكل'){
  const h=window.hesabiItemsHelpers||{};
  if(typeof h.filteredItemsByCategory==='function') return h.filteredItemsByCategory(cache.items||[], category||'الكل');
  const cat=category||'الكل';
  const arr=cache.items||[];
  return cat==='الكل'?arr.slice():arr.filter(i=>itemCategory(i)===cat);
}
function itemsCategoryFilterHtml(key, selected){
  return `<select id="${key}Category">${itemCategoryOptions(selected||'الكل')}</select>`;
}
function itemsBulkActionsHtml(){
  return `<button class="btn light mini" id="selectVisibleItemsBtn">تحديد المعروض</button><button class="btn light mini" id="clearSelectedItemsBtn">إلغاء التحديد</button><button class="btn danger mini" id="deleteSelectedItemsBtn">حذف المحدد</button>`;
}
function buildItemRows(meta){
  const selected=state.selectedItemIds||{};
  return (meta.visible||[]).map(i=>`<tr>
    <td><input type="checkbox" data-item-select="${esc(i.id)}" ${selected[i.id]?'checked':''}></td>
    <td class="name"><b>${esc(i.name||'')}</b><div class="subcell">${esc(i.barcode||i.code||'')}</div></td>
    <td>${esc(itemCategory(i))}</td><td>${esc(i.unit||'حبة')}</td>
    <td>${money(i.cashPrice||i.price||0)} / ${money(i.creditPrice||i.cashPrice||i.price||0)}</td>
    <td>${money(i.stock||0)}<div class="subcell">حد ${money(i.minStock||0)}</div></td>
    <td><span class="status ${i.customerVisible===false?'warn':'ok'}">${i.customerVisible===false?'مخفي':'ظاهر'}</span></td>
    <td>${compactActionButtons(`<button class="btn secondary mini" data-edit-item="${esc(i.id)}">تعديل</button><button class="btn light mini" data-price-item="${esc(i.id)}">سعر</button><button class="btn light mini" data-toggle-visible="${esc(i.id)}">${i.customerVisible===false?'إظهار':'إخفاء'}</button><button class="btn danger mini" data-delete-item="${esc(i.id)}">حذف</button>`)}</td>
  </tr>`);
}
function priceEditorRows(meta){
  return (meta.visible||[]).map(i=>`<tr>
    <td class="name"><b>${esc(i.name||'')}</b><div class="subcell">${esc(i.barcode||'')}</div></td>
    <td><input id="cash_${i.id}" type="number" value="${Number(i.cashPrice||i.price||0)}"></td>
    <td><input id="credit_${i.id}" type="number" value="${Number(i.creditPrice||i.cashPrice||i.price||0)}"></td>
    <td><button class="btn ok mini" data-save-price="${esc(i.id)}">حفظ</button></td>
  </tr>`);
}
function renderEditItemPane(rows,meta,category){
  const it=state.editItemId?safeItemById(state.editItemId):null;
  return `<div class="grid2">
    ${demandTableCard('itemsEditList','اختيار صنف للتعديل',['تحديد','الصنف','التصنيف','الوحدة','كاش/آجل','المخزون','الحالة','إجراء'],rows,meta,'ابحث أو اختر صنفًا للتعديل',itemsCategoryFilterHtml('itemsEditList',category))}
    <div class="card"><h2>نموذج تعديل الصنف</h2>${it?`
      <div class="grid2">
        <div class="field"><label>اسم الصنف</label><input id="editItemName" value="${esc(it.name||'')}"></div>
        <div class="field"><label>الباركود</label><input id="editItemBarcode" value="${esc(it.barcode||it.code||'')}"></div>
        <div class="field"><label>التصنيف</label><input id="editItemCategory" value="${esc(itemCategory(it))}"></div>
        <div class="field"><label>الوحدة</label><input id="editItemUnit" value="${esc(it.unit||'حبة')}"></div>
        <div class="field"><label>سعر الكاش</label><input id="editItemCashPrice" type="number" value="${Number(it.cashPrice||it.price||0)}"></div>
        <div class="field"><label>سعر الآجل</label><input id="editItemCreditPrice" type="number" value="${Number(it.creditPrice||it.cashPrice||it.price||0)}"></div>
        <div class="field"><label>المخزون</label><input id="editItemStock" type="number" value="${Number(it.stock||0)}"></div>
        <div class="field"><label>حد التنبيه</label><input id="editItemMinStock" type="number" value="${Number(it.minStock||0)}"></div>
        <div class="field"><label>الظهور للعميل</label><select id="editItemCustomerVisible"><option value="true" ${it.customerVisible!==false?'selected':''}>ظاهر</option><option value="false" ${it.customerVisible===false?'selected':''}>مخفي</option></select></div>
        <div class="field"><label>ملاحظات</label><textarea id="editItemNotes">${esc(it.notes||'')}</textarea></div>
      </div>
      <div class="actions"><button class="btn ok" id="saveEditItemBtn">حفظ التعديل</button><button class="btn secondary" id="cancelEditItemBtn">إلغاء</button></div>
    `:'<p class="muted">اختر صنفًا من الجدول لعرض بياناته.</p>'}</div>
  </div>`;
}
function bindItemsTabs(){
  document.querySelectorAll('[data-items-tab]').forEach(b=>b.onclick=()=>{state.itemsTab=b.dataset.itemsTab;save();renderItems();});
}
function bindItemsCategoryFilter(key, rerender){
  const el=$(key+'Category');
  if(el) el.onchange=()=>{state[key+'Category']=el.value;state[key+'Page']=1;save(); if(typeof rerender==='function') rerender();};
}
function bindItemButtons(){
  document.querySelectorAll('[data-item-select]').forEach(ch=>ch.onchange=()=>{if(!state.selectedItemIds)state.selectedItemIds={}; if(ch.checked)state.selectedItemIds[ch.dataset.itemSelect]=true; else delete state.selectedItemIds[ch.dataset.itemSelect]; save();});
  document.querySelectorAll('[data-edit-item]').forEach(b=>b.onclick=()=>selectItemForEdit(b.dataset.editItem));
  document.querySelectorAll('[data-price-item]').forEach(b=>b.onclick=()=>{state.itemsTab='prices';state.itemsPriceListQ=safeItemById(b.dataset.priceItem)?.name||'';save();renderItems();});
  document.querySelectorAll('[data-toggle-visible]').forEach(b=>b.onclick=()=>toggleItemCustomerVisible(b.dataset.toggleVisible));
  document.querySelectorAll('[data-delete-item]').forEach(b=>b.onclick=()=>deleteSingleItem(b.dataset.deleteItem));
  document.querySelectorAll('[data-save-price]').forEach(b=>b.onclick=()=>saveItemPriceQuick(b.dataset.savePrice));
  if($('selectVisibleItemsBtn')) $('selectVisibleItemsBtn').onclick=()=>{if(!state.selectedItemIds)state.selectedItemIds={}; document.querySelectorAll('[data-item-select]').forEach(ch=>{state.selectedItemIds[ch.dataset.itemSelect]=true; ch.checked=true;}); save();};
  if($('clearSelectedItemsBtn')) $('clearSelectedItemsBtn').onclick=()=>clearSelectedItems();
  if($('deleteSelectedItemsBtn')) $('deleteSelectedItemsBtn').onclick=()=>deleteItemsByIds(Object.keys(state.selectedItemIds||{}));
}
async function importItemsFromExcelFile(file){
  try{
    if(!file){msg('اختر ملفًا أولًا.','error');return}
    const text=await file.text();
    const excel=hesabiExcel();
    const parsed=typeof excel.parseDelimitedText==='function'?excel.parseDelimitedText(text):null;
    const headers=parsed?parsed.headers:[];
    const rows=parsed?parsed.rows:[];
    if(!rows.length&&!headers.length){msg('الملف فارغ أو غير مدعوم. استخدم CSV أو الاستيراد من القالب بعد تحويله إلى CSV.','error');return}
    const idxOf=(names)=>typeof excel.indexOfHeader==='function'?excel.indexOfHeader(headers,names):headers.findIndex(h=>names.includes(h)||names.includes(h.toLowerCase()));
    const nameI=idxOf(['name','اسم الصنف','الصنف']); const barcodeI=idxOf(['barcode','الباركود','code','الكود']); const catI=idxOf(['category','التصنيف']); const unitI=idxOf(['unit','الوحدة']); const cashI=idxOf(['cashPrice','سعر الكاش','cash']); const creditI=idxOf(['creditPrice','سعر الآجل','credit']); const stockI=idxOf(['stock','المخزون','quantity','الكمية']);
    if(nameI<0){msg('لم أجد عمود اسم الصنف في الملف.','error');return}
    let count=0; const batch=writeBatch(db);
    for(const cols of rows){
      const name=cols[nameI]||''; if(!name) continue;
      const barcode=barcodeI>=0?cols[barcodeI]:'';
      if(itemDuplicateExists({name,barcode})) continue;
      const ref=doc(collection(db,'shops',state.shopId,'items'));
      batch.set(ref,{shopId:state.shopId,name,barcode,code:barcode,category:catI>=0?cols[catI]:'عام',unit:unitI>=0?cols[unitI]:'حبة',cashPrice:cashI>=0?Number(cols[cashI]||0):0,creditPrice:creditI>=0?Number(cols[creditI]||0):(cashI>=0?Number(cols[cashI]||0):0),price:cashI>=0?Number(cols[cashI]||0):0,stock:stockI>=0?Number(cols[stockI]||0):0,customerVisible:true,createdAt:serverTimestamp(),createdMs:Date.now(),createdBy:uid()});
      count++;
      if(count>=450) break;
    }
    await batch.commit();
    await addAudit('import_items_csv',{count});
    msg('تم استيراد '+count+' صنف.','success'); renderItems();
  }catch(e){console.error(e); msg('تعذر الاستيراد: '+String(e.message||e),'error')}
}
function renderCatalogDynamicSections(){
  try{
    if(active==='items' && state.role==='customer') renderCustomerItemsReadonly();
    else {
      const bar=$('catalogCartBar'); if(bar) bar.outerHTML=renderCatalogCartBar();
      const tbl=$('selectedCartTable'); if(tbl) tbl.innerHTML=renderSelectedCartTable();
    }
  }catch(e){console.warn('renderCatalogDynamicSections failed',e)}
}
function go(id,page){
  const el=$(id);
  if(el) el.onclick=()=>show(page);
}

/* 1.0.56: removed duplicate renderReports function; existing renderReports assignment above is kept. */





/* 1.0.60: expose critical runtime functions for inline HTML handlers and module loader self-check. */
function exposeHesabiRuntimeGlobals(){
  const names=[
    'render','show','goBack','renderProfileSetup','ensureLiveDataListeners',
    'renderCustomerItemsReadonly','renderCustomerAddItemsPage','addItemToPurchaseInvoice','sendCustomerOrder',
    'approveOrder','rejectOrder','customerApproveOrder','customerRejectOrder','loadOrderForEdit','cancelCustomerOrder',
    'sendPayment','approvePayment','rejectPayment','openReceipt','shareInvoiceText',
    'sendReturnRequest','approveReturn','rejectReturn','renderReturnLines',
    'createSchedule','paySchedule','cancelSchedule','fillScheduleFromInvoice',
    'renderItems','addItem','saveSelectedItemEdit','saveItemPriceQuick','toggleItemCustomerVisible',
    'deleteSingleItem','deleteItemsByIds','deleteAllItemsAndStock','adjustStockItem','openStockAdjustmentDialog','editStock',
    'addManualCustomer','setCreditLimit','setCustomerStatus','sendTraderSale','shareStatementText',
    'renderPolicies','saveShopPoliciesPhase8','renderSettings','renderMessages','sendMessage','renderNotifications','renderOwnerConsole','renderReports',
    'downloadApkUpdate','refreshWebUiNow','checkApkUpdateOnly','showPermissionDeniedLogoutDialog','safeFullLogout','exportCsv','importItemsFromExcelFile',
    'requestNotificationPermission','clearAllNotificationCounters',
    'startEmbeddedItemBarcodeScanner','startExternalItemBarcodeScanner','startItemOcrNative','startItemBarcodeScanner','scanItemBarcodeStillFrame','usePendingItemBarcode',
    'buildPageRendererRegistry','fullPageButtonAudit','phase10FinalSelfCheck'
  ];
  const exposed=[]; const missing=[];
  for(const name of names){
    try{
      const value=(0,eval)(name);
      if(typeof value==='function'){
        window[name]=value;
        exposed.push(name);
      }else missing.push(name);
    }catch(e){
      try{
        const value=eval(name);
        if(typeof value==='function'){
          window[name]=value;
          exposed.push(name);
        }else missing.push(name);
      }catch(_){ missing.push(name); }
    }
  }
  window.__hesabiExposedFunctions={exposed,missing,version:APP_VERSION,build:APP_BUILD_CODE,at:Date.now()};
  return window.__hesabiExposedFunctions;
}
function hesabiRuntimeSelfCheck(){
  const renderers=(()=>{try{return buildPageRendererRegistry()}catch(e){return {}}})();
  const expectedPages=['home','search','tasks','items','customers','orders','shops','messages','payments','invoices','statement','audit','stock','returns','schedules','collections','reports','policies','notifications','shopcode','settings','owner'];
  const missingPages=expectedPages.filter(p=>typeof renderers[p]!=='function');
  const exposed=window.__hesabiExposedFunctions||exposeHesabiRuntimeGlobals();
  const required=['show','render','renderItems','renderCustomerItemsReadonly','sendCustomerOrder','approveOrder','sendPayment','renderSettings','renderMessages','renderReports','downloadApkUpdate','refreshWebUiNow'];
  const missingRequired=required.filter(name=>typeof window[name]!=='function');
  const inlineRequired=['editStock','shareStatementText'];
  const missingInline=inlineRequired.filter(name=>typeof window[name]!=='function');
  return {
    ok: missingPages.length===0 && missingRequired.length===0 && missingInline.length===0,
    version:APP_VERSION,
    build:APP_BUILD_CODE,
    pages:expectedPages.length,
    missingPages,
    missingRequired,
    missingInline,
    exposedCount:(exposed.exposed||[]).length,
    exposedMissing:exposed.missing||[]
  };
}
window.hesabiRuntimeSelfCheck=hesabiRuntimeSelfCheck;
exposeHesabiRuntimeGlobals();


/* 1.0.54: بناء سجل عرض الصفحات بعد تحميل كل الدوال حتى لا تظهر كل الصفحات كأقسام غير جاهزة. */
buildPageRendererRegistry();



(async function boot(){
  try{
    render();
    await initFirebase();
    render();
    await waitForAuth();
    if(uid()) await afterSuccessfulAuthLogin();
    if(state.profileDone && uid()) { ensureLiveDataListeners(); notifyAndroidSession(); }
    render();
    if(state.profileDone && state.role==='customer' && state.pendingJoinShopId && !(state.customerLinks||[]).some(x=>x.shopId===state.pendingJoinShopId)){ show('shopcode'); }
  }catch(e){
    console.error(e);
    try{showStartupRecoveryDialog(e.message||e); render();}catch{}
  }
})();
