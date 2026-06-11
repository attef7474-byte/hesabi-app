function phase2VerifiedPhoneKey(){
  return normalizePhone(currentUser?.phoneNumber || state.authPhoneNumber || state.authPhoneKey || '');
}
async function phase2LoadCustomerLinksByPhone(phoneKey){
  const links=[];
  if(!db || !uid() || !phoneKey) return links;
  try{
    const snap=await getDocs(collection(db,'customerPhoneLinks',phoneKey,'shops'));
    snap.docs.forEach(d=>{
      const x=d.data()||{};
      if(x.shopId && x.customerId){
        links.push({
          shopId:x.shopId,
          customerId:x.customerId,
          customerName:x.name || x.customerName || 'عميل',
          customerPhone:x.phone || phoneKeyToInternational(phoneKey),
          phoneKey,
          shopName:x.shopName || x.shopId
        });
      }
    });
  }catch(e){ console.warn('phase2 load customer phone links failed', e); }
  return links;
}
async function phase2RepairCustomerUidLinks(links){
  if(!db || !uid() || !Array.isArray(links)) return;
  for(const l of links){
    try{
      if(!l.shopId || !l.customerId) continue;
      await setDoc(doc(db,'shops',l.shopId,'customerUidLinks',uid()),{
        customerId:l.customerId,
        shopId:l.shopId,
        phoneKey:l.phoneKey || phase2VerifiedPhoneKey(),
        linkedAt:serverTimestamp(),
        repairedAt:serverTimestamp()
      },{merge:true});
      await setDoc(doc(db,'shops',l.shopId,'customers',l.customerId),{
        customerUid:uid(),
        updatedAt:serverTimestamp()
      },{merge:true});
    }catch(e){ console.warn('phase2 repair link failed', l.shopId, e); }
  }
}
async function phase2TryRestoreTraderByPhone(phoneKey){
  if(!db || !uid() || !phoneKey) return false;
  try{
    const sp=await getDoc(doc(db,'shopPhones',phoneKey));
    if(!sp.exists()) return false;
    const d=sp.data()||{};
    if(!d.shopId) return false;
    const shopSnap=await getDoc(doc(db,'shops',d.shopId));
    if(!shopSnap.exists()) return false;
    const shop=shopSnap.data()||{};
    // لا نستولي على متجر مملوك لحساب آخر. فقط نسترجع إذا كان ownerUid مطابقًا أو لم يكن موجودًا في نسخ قديمة.
    if(shop.ownerUid && shop.ownerUid!==uid()) return false;
    state.role='trader';
    state.profileDone=true;
    state.shopId=d.shopId;
    state.shopName=shop.name || d.name || d.shopId;
    state.traderPin=shop.pin || state.traderPin || '';
    save();
    await saveUserAccountProfile({role:'trader',profileDone:true,shopId:state.shopId,shopName:state.shopName,traderShopId:state.shopId});
    return true;
  }catch(e){ console.warn('phase2 restore trader failed', e); return false; }
}
async function phase2TryRestoreCustomerByPhone(phoneKey){
  if(!db || !uid() || !phoneKey) return false;
  try{
    const links=await phase2LoadCustomerLinksByPhone(phoneKey);
    if(!links.length) return false;
    await phase2RepairCustomerUidLinks(links);
    state.role='customer';
    state.profileDone=true;
    state.customerLinks=links;
    state.activeShopId=state.activeShopId && links.some(x=>x.shopId===state.activeShopId) ? state.activeShopId : links[0].shopId;
    const l=links.find(x=>x.shopId===state.activeShopId) || links[0];
    state.shopId=l.shopId;
    state.customerId=l.customerId;
    state.customerName=l.customerName || 'عميل';
    state.customerPhone=l.customerPhone || phoneKeyToInternational(phoneKey);
    state.shopName=l.shopName || l.shopId;
    save();
    await saveUserAccountProfile({role:'customer',profileDone:true,customerLinks:links,shopId:state.shopId,activeShopId:state.activeShopId,customerId:state.customerId,customerName:state.customerName,customerPhone:state.customerPhone,shopName:state.shopName});
    return true;
  }catch(e){ console.warn('phase2 restore customer failed', e); return false; }
}
async function phase2AfterLoginBootstrap(){
  const phoneKey=phase2VerifiedPhoneKey();
  if(!phoneKey || state.profileDone) return false;
  // نبدأ باسترجاع التاجر إن كان نفس الحساب مالكًا لمتجر، ثم العميل إن كان له روابط.
  const traderRestored=await phase2TryRestoreTraderByPhone(phoneKey);
  if(traderRestored) return true;
  const customerRestored=await phase2TryRestoreCustomerByPhone(phoneKey);
  return customerRestored;
}
const __hesabiAfterSuccessfulAuthLoginBase = afterSuccessfulAuthLogin;
afterSuccessfulAuthLogin = async function(){
  try{
    await __hesabiAfterSuccessfulAuthLoginBase();
    const restored=await phase2AfterLoginBootstrap();
    if(restored){
      normalizeCustomerLinks();
      resetCacheForLiveData();
      listenersStartedKey='';
      ensureLiveDataListeners();
    }
  }catch(e){ console.warn('phase2 after login bootstrap failed', e); }
};
const __hesabiBackToRoleChoiceBase = backToRoleChoice;
backToRoleChoice = function(){
  try{
    state.role='';
    state.profileDone=false;
    delete state.shopId; delete state.shopName;
    delete state.customerId; delete state.customerName; delete state.customerPhone;
    delete state.activeShopId;
    save();
    if($('profileSetup')) $('profileSetup').innerHTML='';
    render();
  }catch(e){ console.warn('phase2 back role failed',e); try{__hesabiBackToRoleChoiceBase()}catch{} }
};
function phase2AuthStatusCard(){
  const phone=verifiedPhoneDisplay() || phoneKeyToInternational(phase2VerifiedPhoneKey()||'') || '-';
  return `<div class="notice">حالة الدخول: <b>موثق</b> | الرقم: <b dir="ltr">${esc(phone)}</b></div>`;
}
const __hesabiRenderProfileSetupBase = renderProfileSetup;
renderProfileSetup = function(){
  __hesabiRenderProfileSetupBase();
  try{
    const box=$('profileSetup');
    if(box && !box.querySelector('.phase2-auth-status')){
      box.insertAdjacentHTML('afterbegin', `<div class="phase2-auth-status">${phase2AuthStatusCard()}</div>`);
    }
  }catch(e){}
};
function phase2SafeCanCreateCustomerOrder(){
  if(state.role!=='customer') return {ok:false,msg:'طلب الشراء متاح للعميل فقط'};
  if(!uid()) return {ok:false,msg:'يجب تسجيل الدخول أولًا'};
  if(!state.shopId || !state.customerId) return {ok:false,msg:'لم يتم ربط حساب العميل بمتجر'};
  return {ok:true};
}
const __hesabiSendCustomerOrderBase = sendCustomerOrder;
sendCustomerOrder = async function(){
  const chk=phase2SafeCanCreateCustomerOrder();
  if(!chk.ok){ msg(chk.msg,'error'); return; }
  await ensureCustomerPurchaseAccess();
  return __hesabiSendCustomerOrderBase();
};



/* === PHASE 3 CUSTOMER PURCHASE ORDER FINAL STABILITY PATCH 1.0.46 ===
   Scope: customer purchase invoice, item selection, cart validation, Firestore-safe order creation.
*/
function phase3PurchaseReadyCheck(){
  if(state.role!=='customer') return {ok:false,msg:'طلب الشراء متاح للعميل فقط.'};
  if(!uid()) return {ok:false,msg:'يجب تسجيل الدخول أولًا.'};
  if(!state.shopId) return {ok:false,msg:'لم يتم اختيار متجر.'};
  if(!state.customerId) return {ok:false,msg:'لم يتم ربط حساب العميل بهذا المتجر.'};
  if(cache.shop?.subscriptionStatus==='suspended') return {ok:false,msg:'هذا المتجر موقوف مؤقتًا.'};
  if(cache.shop?.allowCustomerOrders===false) return {ok:false,msg:'المتجر لا يستقبل طلبات جديدة حاليًا.'};
  if(!shopIsOpenNow()) return {ok:false,msg:cache.shop?.workingClosedMessage||cache.shop?.closedMessage||'المتجر مغلق حاليًا حسب أوقات الدوام.'};
  return {ok:true};
}
async function phase3EnsureCustomerOrderLink(){
  await ensureCustomerPurchaseAccess();
  try{
    const snap=await getDoc(doc(db,'shops',state.shopId,'customerUidLinks',uid()));
    if(!snap.exists() || snap.data().customerId!==state.customerId){
      throw new Error('لم يتم تثبيت رابط العميل بالمتجر. سجّل خروج ثم ادخل من جديد.');
    }
  }catch(e){
    console.warn('phase3 customer link check failed',e);
    throw e;
  }
}
function phase3BuildOrderLines(){
  const cart=catalogCartTotal();
  const allowOut=shopPolicyBool('allowOutOfStockOrders', false);
  const lines=[];
  for(const l of cart.lines||[]){
    const item=itemById(l.itemId);
    if(!item || !customerCanSeeItem(item)) continue;
    const stock=Number(item.stock||0);
    const qty=Number(l.qty||0);
    if(qty<=0) continue;
    if(!allowOut && qty>stock){ throw new Error(`الكمية المتاحة من ${item.name||'الصنف'} هي ${stock} فقط.`); }
    const price=Number(effectiveItemPrice(item, $('payType')?.value||'credit')||0);
    lines.push({
      itemId:l.itemId,
      name:item.name||l.name||'',
      unit:item.unit||l.unit||'حبة',
      category:itemCategory(item),
      barcode:item.barcode||item.code||'',
      qty,
      price,
      total:price*qty
    });
  }
  return {lines,count:lines.reduce((a,x)=>a+x.qty,0),items:lines.length,total:lines.reduce((a,x)=>a+Number(x.total||0),0)};
}
function phase3CheckCreditLimit(orderTotal, editingId=''){
  const payType=$('payType')?.value||'credit';
  if(payType!=='credit') return {ok:true};
  const d=customerDebtInfo();
  const limit=Number(d.limit||0);
  if(!limit) return {ok:true};
  const pending=pendingCreditForCustomer(state.customerId, editingId);
  const after=Number(d.balance||0)+pending+Number(orderTotal||0);
  if(after>limit) return {ok:false,msg:`تجاوز الطلب سقف الآجل. السقف ${money(limit)}، الدين الحالي ${money(d.balance)}، المعلق ${money(pending)}.`};
  return {ok:true};
}
async function phase3SendCustomerOrderFinal(){
  try{
    const ready=phase3PurchaseReadyCheck();
    if(!ready.ok){ msg(ready.msg,'error'); return; }
    if(!db){ msg('لم يتم الاتصال بقاعدة البيانات بعد. أعد المحاولة.','error'); return; }
    await phase3EnsureCustomerOrderLink();
    const built=phase3BuildOrderLines();
    if(!built.lines.length){ msg('أضف صنفًا واحدًا على الأقل قبل إرسال الطلب.','error'); return; }
    const editingId=catalogState().editingOrderId||'';
    const credit=phase3CheckCreditLimit(built.total, editingId);
    if(!credit.ok){ msg(credit.msg,'error'); return; }
    const payType=$('payType')?.value||'credit';
    const note=String($('orderNote')?.value||'').trim();
    const now=Date.now();
    const customerDoc=cache.customers?.[0]||{};
    const payload={
      shopId:state.shopId,
      shopName:cache.shop?.name||state.shopName||'',
      customerId:state.customerId,
      customerUid:uid(),
      customerName:state.customerName||customerDoc.name||'عميل',
      customerPhone:state.customerPhone||customerDoc.phone||'',
      items:built.lines,
      lines:built.lines,
      itemCount:built.items,
      qtyCount:built.count,
      total:Number(built.total||0),
      paymentType:payType,
      note,
      status:'pending_trader',
      source:'customer_purchase_invoice_v3',
      createdBy:uid(),
      createdByRole:'customer',
      updatedAt:serverTimestamp(),
      updatedMs:now
    };
    if(editingId){
      await updateDoc(doc(db,'shops',state.shopId,'purchaseRequests',editingId),{
        ...payload,
        editedBy:uid(),
        editedAt:serverTimestamp(),
        editCount:increment(1)
      });
      clearOrderEditing();
      showAppDialog('تم حفظ الطلب','تم حفظ تعديل طلب الشراء وإرساله للتاجر للمراجعة.','success',[{text:'عرض طلباتي',cls:'ok',fn:()=>show('orders')}]);
    }else{
      await addDoc(collection(db,'shops',state.shopId,'purchaseRequests'),{
        ...payload,
        createdAt:serverTimestamp(),
        createdMs:now
      });
      showAppDialog('تم إرسال الطلب','تم إرسال طلب الشراء للتاجر بنجاح. يمكنك متابعته من صفحة طلباتي.','success',[{text:'عرض طلباتي',cls:'ok',fn:()=>show('orders')},{text:'طلب جديد',cls:'secondary',fn:()=>show('items')}]);
    }
    const cs=catalogState(); cs.cart={}; cs.inlineQ=''; cs.purchaseMode='invoice'; saveCatalog();
    try{ renderPurchaseInvoiceOnly(); }catch{}
    checkNotifications(); updateAndroidLauncherBadge();
  }catch(e){
    console.error('phase3 send customer order failed', e);
    if(e?.code==='permission-denied' || /permission|insufficient/i.test(String(e?.message||''))){showPermissionDeniedLogoutDialog('إرسال طلب الشراء', e); return;}
    msg('تعذر إرسال طلب الشراء: '+friendlyFirestoreError(e),'error');
  }
}
sendCustomerOrder = phase3SendCustomerOrderFinal;
function phase3ValidatePurchaseUiHooks(){
  return typeof renderCustomerItemsReadonly==='function' && typeof renderCustomerAddItemsPage==='function' && typeof addItemToPurchaseInvoice==='function' && typeof sendCustomerOrder==='function';
}


/* Phase 4: trader order review, invoices, stock, and ledger stability */
function orderLineName(line){ return line?.name || line?.itemName || line?.title || 'صنف'; }
function orderLineQty(line){ return Math.max(0, Number(line?.qty ?? line?.quantity ?? line?.count ?? 0)); }
function orderPaymentType(order){ return order?.paymentType || order?.payType || 'credit'; }
function phase4CanApproveOrder(order){
  if(!order) return {ok:false,msg:'لم يتم العثور على الطلب.'};
  if(state.role!=='trader') return {ok:false,msg:'الموافقة على الطلبات خاصة بالتاجر فقط.'};
  if(!state.shopId) return {ok:false,msg:'لا يوجد متجر محدد.'};
  if(!['pending','pending_trader'].includes(String(order.status||'pending'))) return {ok:false,msg:'هذا الطلب تمت مراجعته مسبقًا ولا يمكن اعتماده مرة أخرى.'};
  const lines = Array.isArray(order.items) ? order.items : (Array.isArray(order.lines)?order.lines:[]);
  if(!lines.length) return {ok:false,msg:'الطلب لا يحتوي على أصناف.'};
  return {ok:true};
}
function phase4BuildApprovalLines(order, itemDocs){
  const payType=orderPaymentType(order);
  const raw=Array.isArray(order.items)?order.items:(Array.isArray(order.lines)?order.lines:[]);
  const allowOut=shopPolicyBool('allowOutOfStockOrders', false);
  const built=[]; let total=0; let qtyCount=0;
  for(const line of raw){
    const itemId=String(line.itemId||line.id||'').trim();
    const qty=orderLineQty(line);
    if(!itemId || qty<=0) continue;
    const snap=itemDocs[itemId];
    const item=snap?.exists()?{id:itemId,...snap.data()}:(itemById(itemId)||{});
    if(!item || !item.name) throw new Error(`الصنف ${orderLineName(line)} غير موجود في المخزون.`);
    if(item.isActive===false) throw new Error(`الصنف ${item.name} غير نشط ولا يمكن اعتماده.`);
    const stock=Number(item.stock||0);
    if(!allowOut && qty>stock) throw new Error(`الكمية المتاحة من ${item.name} هي ${stock} فقط، والطلب يحتوي ${qty}.`);
    const price=Number(line.price||line.unitPrice||effectiveItemPrice(item,payType)||0);
    const row={
      itemId,
      name:item.name||orderLineName(line),
      unit:item.unit||line.unit||'حبة',
      category:itemCategory(item),
      barcode:item.barcode||item.code||line.barcode||'',
      qty,
      price,
      total:price*qty
    };
    built.push(row); total+=row.total; qtyCount+=qty;
  }
  if(!built.length) throw new Error('لا توجد أصناف صالحة داخل الطلب.');
  return {lines:built,total,qtyCount,itemCount:built.length};
}
function phase4CustomerForOrder(order){
  return (cache.customers||[]).find(c=>String(c.customerId||'')===String(order.customerId||'')) || {};
}
async function approveOrder(orderId){
  try{
    const order=(cache.orders||[]).find(o=>o.id===orderId);
    const chk=phase4CanApproveOrder(order);
    if(!chk.ok){ msg(chk.msg,'error'); return; }
    const ok=await confirmDialog('اعتماد الطلب','سيتم إنشاء فاتورة، وتحديث المخزون، وتسجيل كشف الحساب. هل تريد المتابعة؟','اعتماد');
    if(!ok) return;
    const orderRef=doc(db,'shops',state.shopId,'purchaseRequests',orderId);
    const invoiceRef=doc(collection(db,'shops',state.shopId,'invoices'));
    const now=Date.now();
    let finalTotal=0, invoiceNo='';
    await runTransaction(db, async(tx)=>{
      const orderSnap=await tx.get(orderRef);
      if(!orderSnap.exists()) throw new Error('لم يتم العثور على الطلب في قاعدة البيانات.');
      const fresh={id:orderId,...orderSnap.data()};
      const chk2=phase4CanApproveOrder(fresh);
      if(!chk2.ok) throw new Error(chk2.msg);
      const raw=Array.isArray(fresh.items)?fresh.items:(Array.isArray(fresh.lines)?fresh.lines:[]);
      const itemRefs={}; for(const l of raw){ const id=String(l.itemId||l.id||'').trim(); if(id) itemRefs[id]=doc(db,'shops',state.shopId,'items',id); }
      const itemDocs={}; for(const [id,ref] of Object.entries(itemRefs)){ itemDocs[id]=await tx.get(ref); }
      const built=phase4BuildApprovalLines(fresh,itemDocs);
      finalTotal=Number(built.total||0);
      invoiceNo=invoiceNumber();
      const customerId=fresh.customerId||'';
      const customerUid=fresh.customerUid||'';
      const customerRef=customerId?doc(db,'shops',state.shopId,'customers',customerId):null;
      const payType=orderPaymentType(fresh);
      const invoicePayload={
        shopId:state.shopId,
        invoiceNo,
        sourceOrderId:orderId,
        customerId,
        customerUid,
        customerName:fresh.customerName||phase4CustomerForOrder(fresh).name||'عميل',
        customerPhone:fresh.customerPhone||phase4CustomerForOrder(fresh).phone||'',
        paymentType:payType,
        status: payType==='cash'?'paid':'unpaid',
        items:built.lines,
        lines:built.lines,
        itemCount:built.itemCount,
        qtyCount:built.qtyCount,
        subtotal:finalTotal,
        discount:0,
        total:finalTotal,
        createdFrom:'purchase_request_approval',
        createdBy:uid(),
        createdAt:serverTimestamp(),
        createdMs:now
      };
      tx.set(invoiceRef, invoicePayload);
      tx.update(orderRef,{
        status:'approved',
        invoiceId:invoiceRef.id,
        invoiceNo,
        items:built.lines,
        lines:built.lines,
        itemCount:built.itemCount,
        qtyCount:built.qtyCount,
        total:finalTotal,
        reviewedBy:uid(),
        reviewedByName:cache.shop?.name||'التاجر',
        reviewedAt:serverTimestamp(),
        reviewedMs:now,
        updatedAt:serverTimestamp(),
        updatedMs:now
      });
      for(const line of built.lines){
        const ref=itemRefs[line.itemId];
        const snap=itemDocs[line.itemId];
        const before=Number(snap.data().stock||0);
        const after=before-Number(line.qty||0);
        tx.update(ref,{stock: after, updatedAt:serverTimestamp(), updatedMs:now});
        const ledgerRef=doc(collection(db,'shops',state.shopId,'stockLedger'));
        tx.set(ledgerRef,{shopId:state.shopId,itemId:line.itemId,itemName:line.name,type:'sale',sourceType:'order_approval',sourceOrderId:orderId,invoiceId:invoiceRef.id,invoiceNo,qty:Number(line.qty||0),qtyChange:-Number(line.qty||0),beforeQty:before,afterQty:after,reason:'اعتماد طلب شراء وإنشاء فاتورة',customerId,customerUid,customerName:invoicePayload.customerName,createdBy:uid(),createdAt:serverTimestamp(),createdMs:now});
      }
      if(payType==='credit'){
        if(customerRef){ tx.update(customerRef,{balance: increment(finalTotal), updatedAt:serverTimestamp(), updatedMs:now}); }
        const ledRef=doc(collection(db,'shops',state.shopId,'customerLedger'));
        tx.set(ledRef,{shopId:state.shopId,customerId,customerUid,customerName:invoicePayload.customerName,type:'invoice_credit',direction:'debit',amount:finalTotal,invoiceId:invoiceRef.id,invoiceNo,sourceOrderId:orderId,note:'فاتورة آجل من طلب شراء معتمد',createdBy:uid(),createdAt:serverTimestamp(),createdMs:now});
      }else{
        const ledRef=doc(collection(db,'shops',state.shopId,'customerLedger'));
        tx.set(ledRef,{shopId:state.shopId,customerId,customerUid,customerName:invoicePayload.customerName,type:'invoice_cash',direction:'neutral',amount:finalTotal,invoiceId:invoiceRef.id,invoiceNo,sourceOrderId:orderId,note:'فاتورة كاش من طلب شراء معتمد',createdBy:uid(),createdAt:serverTimestamp(),createdMs:now});
      }
      const auditRef=doc(collection(db,'shops',state.shopId,'auditLogs'));
      tx.set(auditRef,{shopId:state.shopId,action:'approve_order_create_invoice',actorRole:'trader',actorName:actorName(),details:{orderId,invoiceId:invoiceRef.id,invoiceNo,total:finalTotal},createdAt:serverTimestamp(),createdMs:now});
    });
    showAppDialog('تم اعتماد الطلب',`تم إنشاء الفاتورة ${invoiceNo} بإجمالي ${money(finalTotal)} وتحديث المخزون وكشف الحساب.`,'success',[{text:'الفواتير',cls:'ok',fn:()=>show('invoices')},{text:'الطلبات',cls:'secondary',fn:()=>show('orders')}]);
  }catch(e){
    console.error('approveOrder failed',e);
    if(e?.code==='permission-denied'||/permission|insufficient/i.test(String(e?.message||''))){ showPermissionDeniedLogoutDialog('اعتماد الطلب',e); return; }
    msg('تعذر اعتماد الطلب: '+friendlyFirestoreError(e),'error');
  }
}
async function rejectOrder(orderId){
  try{
    if(state.role!=='trader'){ msg('رفض الطلب خاص بالتاجر فقط.','error'); return; }
    const order=(cache.orders||[]).find(o=>o.id===orderId);
    if(!order){ msg('لم يتم العثور على الطلب.','error'); return; }
    if(!['pending','pending_trader'].includes(String(order.status||'pending'))){ msg('هذا الطلب تمت مراجعته مسبقًا.','error'); return; }
    const reason=prompt('سبب رفض الطلب للعميل؟','');
    if(reason===null) return;
    await updateDoc(doc(db,'shops',state.shopId,'purchaseRequests',orderId),{status:'rejected',traderNote:String(reason||'').trim(),reviewedBy:uid(),reviewedByName:cache.shop?.name||'التاجر',reviewedAt:serverTimestamp(),reviewedMs:Date.now(),updatedAt:serverTimestamp(),updatedMs:Date.now()});
    await addAudit('reject_order',{orderId,reason:String(reason||'').trim()});
    showAppDialog('تم رفض الطلب','تم رفض الطلب وإرسال الحالة للعميل.','success',[{text:'موافق',cls:'ok',fn:()=>show('orders')}]);
  }catch(e){
    console.error('rejectOrder failed',e);
    if(e?.code==='permission-denied'||/permission|insufficient/i.test(String(e?.message||''))){ showPermissionDeniedLogoutDialog('رفض الطلب',e); return; }
    msg('تعذر رفض الطلب: '+friendlyFirestoreError(e),'error');
  }
}
async function customerApproveOrder(orderId){
  try{
    if(state.role!=='customer'){ msg('هذه العملية خاصة بالعميل.','error'); return; }
    const order=(cache.orders||[]).find(o=>o.id===orderId);
    if(!order||order.status!=='pending_customer'){ msg('لا يوجد طلب بانتظار موافقتك.','error'); return; }
    await updateDoc(doc(db,'shops',state.shopId,'purchaseRequests',orderId),{status:'pending_trader',customerAck:true,customerAckAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedMs:Date.now()});
    msg('تم إرسال موافقتك للتاجر.','success');
  }catch(e){ msg('تعذر إرسال موافقتك: '+friendlyFirestoreError(e),'error'); }
}
async function customerRejectOrder(orderId){
  try{
    if(state.role!=='customer'){ msg('هذه العملية خاصة بالعميل.','error'); return; }
    const order=(cache.orders||[]).find(o=>o.id===orderId);
    if(!order||order.status!=='pending_customer'){ msg('لا يوجد طلب بانتظار ردك.','error'); return; }
    await updateDoc(doc(db,'shops',state.shopId,'purchaseRequests',orderId),{status:'cancelled',customerNote:'رفض العميل الطلب',customerRejectedAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedMs:Date.now()});
    msg('تم إلغاء الطلب.','success');
  }catch(e){ msg('تعذر إلغاء الطلب: '+friendlyFirestoreError(e),'error'); }
}
function phase4ValidateTraderOrderFlow(){
  return typeof approveOrder==='function' && typeof rejectOrder==='function' && typeof customerApproveOrder==='function' && typeof customerRejectOrder==='function' && typeof orderActions==='function' && typeof renderOrders==='function';
}


/* Phase 5: invoices, statement, payments, duplicate references, receipt, and debt stability */
