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
function phase5PaymentStatusText(s){ return ({pending:'معلّق',approved:'مقبول',rejected:'مرفوض',cancelled:'ملغي'}[s]||statusText(s)); }
function phase5PaymentById(id){ return (cache.payments||[]).find(p=>String(p.id)===String(id)); }
function phase5CustomerById(customerId){ return (cache.customers||[]).find(c=>String(c.customerId||'')===String(customerId||'')) || {}; }
function phase5CustomerDebtFromCache(customerId=state.customerId){
  const c=phase5CustomerById(customerId);
  if(c && (c.balance!==undefined && c.balance!==null)) return Number(c.balance||0);
  return (cache.customerLedger||[]).filter(l=>!customerId || String(l.customerId||'')===String(customerId)).reduce((sum,l)=>{
    const amount=Number(l.amount||0);
    const dir=String(l.direction||'');
    const type=String(l.type||'');
    if(dir==='credit' || type==='payment_approved' || type==='payment') return sum-amount;
    if(dir==='neutral') return sum;
    return sum+amount;
  },0);
}
function phase5PaymentReferenceExists(ref, excludeId=''){
  const r=String(ref||'').trim().toLowerCase();
  if(!r) return false;
  return (cache.payments||[]).some(p=>String(p.id)!==String(excludeId) && String(p.referenceNo||'').trim().toLowerCase()===r && String(p.status||'pending')!=='rejected');
}
function phase5BuildInvoiceText(inv){
  if(!inv) return 'لم يتم العثور على الفاتورة.';
  const lines=Array.isArray(inv.items)?inv.items:(Array.isArray(inv.lines)?inv.lines:[]);
  const rows=lines.map((l,i)=>`${i+1}. ${l.name||l.itemName||'صنف'} × ${Number(l.qty||l.quantity||0)} = ${money(l.total||Number(l.qty||0)*Number(l.price||0))}`).join('\n');
  return `فاتورة ${inv.invoiceNo||inv.id}\nالعميل: ${inv.customerName||''}\nنوع الدفع: ${payTypeText(inv.paymentType||'cash')}\nالتاريخ: ${dt(inv.createdMs)}\n----------------------\n${rows||'لا توجد أصناف'}\n----------------------\nالإجمالي: ${money(inv.total||0)}`;
}
async function confirmDialog(title, body, okText='موافق'){
  const dialogs=window.hesabiDialogsToasts;
  if(dialogs&&typeof dialogs.confirmDialog==='function') return dialogs.confirmDialog(title, body, okText);
  return new Promise(resolve=>{
    showAppDialog(title, body, 'warn', [
      {text:okText, cls:'ok', fn:()=>resolve(true)},
      {text:'إلغاء', cls:'light', fn:()=>resolve(false)}
    ]);
  });
}
async function shareInvoiceText(invoiceId){
  try{
    const inv=(cache.invoices||[]).find(i=>String(i.id)===String(invoiceId));
    const text=phase5BuildInvoiceText(inv);
    if(navigator.share){ await navigator.share({title:'فاتورة حسابي التجاري', text}); }
    else if(navigator.clipboard){ await navigator.clipboard.writeText(text); msg('تم نسخ الفاتورة للحافظة.','success'); }
    else { showAppDialog('مشاركة الفاتورة', text, 'notice'); }
  }catch(e){ msg('تعذر مشاركة الفاتورة: '+friendlyFirestoreError(e),'error'); }
}
function openReceipt(paymentId){
  const p=phase5PaymentById(paymentId) || (cache.payments||[]).find(x=>x.id===paymentId);
  const data=p?.receiptData?.dataUrl || p?.receiptData || p?.receiptUrl || '';
  if(!data){ msg('لا يوجد إيصال مرفق لهذا السداد.','notice'); return; }
  try{
    const w=window.open('','_blank');
    if(w){ w.document.write(`<html dir="rtl"><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${String(data).replace(/"/g,'&quot;')}" style="max-width:100%;height:auto"></body></html>`); return; }
  }catch{}
  showAppDialog('إيصال السداد','تعذر فتح الصورة في نافذة مستقلة. جرّب من المتصفح أو أعد رفع صورة أصغر.','notice');
}
async function sendPayment(){
  try{
    if(state.role!=='customer'){ msg('إرسال السداد خاص بالعميل.','error'); return; }
    if(!db||!state.shopId||!state.customerId){ msg('لا يوجد متجر أو عميل مرتبط لإرسال السداد. أعد تسجيل الدخول والربط.','error'); return; }
    const amount=Number($('payAmount')?.value||0);
    const method=String($('payMethod')?.value||'').trim() || 'غير محدد';
    const referenceNo=String($('payRef')?.value||'').trim();
    const note=String($('payNote')?.value||'').trim();
    if(!amount || amount<=0){ msg('أدخل مبلغ سداد صحيح.','error'); return; }
    const debt=phase5CustomerDebtFromCache(state.customerId);
    if(debt>0 && amount>debt){
      const ok=await confirmDialog('المبلغ أكبر من الدين',`الدين الحالي ${money(debt)} والمبلغ المدخل ${money(amount)}. هل تريد إرسال السداد للمراجعة؟`,'إرسال');
      if(!ok) return;
    }
    if(referenceNo && phase5PaymentReferenceExists(referenceNo)){ msg('رقم المرجع مستخدم في طلب سداد سابق. لا يمكن تكرار نفس المرجع.','error'); return; }
    const file=$('payReceipt')?.files?.[0]||null;
    const receiptData=await fileToDataUrl(file, 700000);
    const now=Date.now();
    const payload={
      shopId:state.shopId,
      customerId:state.customerId,
      customerUid:uid(),
      customerName:state.customerName||'عميل',
      customerPhone:state.customerPhone||'',
      amount, method, referenceNo, note,
      receiptData: receiptData||null,
      status:'pending',
      createdBy:uid(),
      createdByRole:'customer',
      createdAt:serverTimestamp(),
      createdMs:now,
      updatedAt:serverTimestamp(),
      updatedMs:now
    };
    await addDoc(collection(db,'shops',state.shopId,'paymentRequests'), payload);
    showAppDialog('تم إرسال السداد','تم إرسال طلب السداد للتاجر للمراجعة. ستظهر النتيجة في صفحة السداد وكشف الحساب بعد الاعتماد.','success',[{text:'سداداتي',cls:'ok',fn:()=>show('payments')},{text:'كشف الحساب',cls:'secondary',fn:()=>show('statement')}]);
    ['payAmount','payMethod','payRef','payNote'].forEach(id=>{const el=$(id); if(el) el.value='';});
    const f=$('payReceipt'); if(f) f.value='';
  }catch(e){
    console.error('sendPayment failed',e);
    if(e?.code==='permission-denied'||/permission|insufficient/i.test(String(e?.message||''))){ showPermissionDeniedLogoutDialog('إرسال السداد',e); return; }
    msg('تعذر إرسال السداد: '+friendlyFirestoreError(e),'error');
  }
}
async function approvePayment(paymentId){
  try{
    if(state.role!=='trader'){ msg('اعتماد السداد خاص بالتاجر.','error'); return; }
    const pay=phase5PaymentById(paymentId);
    if(!pay){ msg('لم يتم العثور على طلب السداد.','error'); return; }
    if(String(pay.status||'pending')!=='pending'){ msg('طلب السداد تمت مراجعته مسبقًا.','error'); return; }
    const ok=await confirmDialog('اعتماد السداد',`سيتم اعتماد مبلغ ${money(pay.amount)} وتحديث رصيد العميل وكشف الحساب. هل تريد المتابعة؟`,'اعتماد');
    if(!ok) return;
    const now=Date.now();
    const payRef=doc(db,'shops',state.shopId,'paymentRequests',paymentId);
    await runTransaction(db, async(tx)=>{
      const snap=await tx.get(payRef);
      if(!snap.exists()) throw new Error('لم يتم العثور على السداد في قاعدة البيانات.');
      const fresh={id:paymentId,...snap.data()};
      if(String(fresh.status||'pending')!=='pending') throw new Error('طلب السداد تمت مراجعته مسبقًا.');
      const amount=Number(fresh.amount||0);
      if(!amount || amount<=0) throw new Error('مبلغ السداد غير صحيح.');
      const customerId=fresh.customerId||'';
      const customerUid=fresh.customerUid||'';
      const customerName=fresh.customerName||phase5CustomerById(customerId).name||'عميل';
      const customerRef=customerId?doc(db,'shops',state.shopId,'customers',customerId):null;
      tx.update(payRef,{status:'approved',approvedBy:uid(),approvedByName:actorName(),approvedAt:serverTimestamp(),approvedMs:now,updatedAt:serverTimestamp(),updatedMs:now});
      if(customerRef){ tx.update(customerRef,{balance: increment(-amount), updatedAt:serverTimestamp(), updatedMs:now}); }
      if(fresh.scheduleId){ tx.update(doc(db,'shops',state.shopId,'paymentSchedules',fresh.scheduleId),{status:'paid',paymentId,paidAt:serverTimestamp(),paidMs:now,updatedAt:serverTimestamp(),updatedMs:now}); }
      const ledRef=doc(collection(db,'shops',state.shopId,'customerLedger'));
      tx.set(ledRef,{shopId:state.shopId,customerId,customerUid,customerName,type:'payment_approved',direction:'credit',amount,paymentId,method:fresh.method||'',referenceNo:fresh.referenceNo||'',note:'سداد معتمد من التاجر',createdBy:uid(),createdAt:serverTimestamp(),createdMs:now});
      const auditRef=doc(collection(db,'shops',state.shopId,'auditLogs'));
      tx.set(auditRef,{shopId:state.shopId,action:'approve_payment',actorRole:'trader',actorName:actorName(),details:{paymentId,customerId,amount,referenceNo:fresh.referenceNo||''},createdAt:serverTimestamp(),createdMs:now});
    });
    showAppDialog('تم اعتماد السداد','تم تحديث رصيد العميل وكشف الحساب بنجاح.','success',[{text:'السداد',cls:'ok',fn:()=>show('payments')},{text:'كشف الحساب',cls:'secondary',fn:()=>show('statement')}]);
  }catch(e){
    console.error('approvePayment failed',e);
    if(e?.code==='permission-denied'||/permission|insufficient/i.test(String(e?.message||''))){ showPermissionDeniedLogoutDialog('اعتماد السداد',e); return; }
    msg('تعذر اعتماد السداد: '+friendlyFirestoreError(e),'error');
  }
}
async function rejectPayment(paymentId){
  try{
    if(state.role!=='trader'){ msg('رفض السداد خاص بالتاجر.','error'); return; }
    const pay=phase5PaymentById(paymentId);
    if(!pay){ msg('لم يتم العثور على طلب السداد.','error'); return; }
    if(String(pay.status||'pending')!=='pending'){ msg('طلب السداد تمت مراجعته مسبقًا.','error'); return; }
    const reason=prompt('سبب رفض السداد؟','');
    if(reason===null) return;
    await updateDoc(doc(db,'shops',state.shopId,'paymentRequests',paymentId),{status:'rejected',traderNote:String(reason||'').trim(),rejectedBy:uid(),rejectedByName:actorName(),rejectedAt:serverTimestamp(),rejectedMs:Date.now(),updatedAt:serverTimestamp(),updatedMs:Date.now()});
    await addAudit('reject_payment',{paymentId,reason:String(reason||'').trim(),amount:pay.amount||0});
    showAppDialog('تم رفض السداد','تم رفض طلب السداد وإرسال الحالة للعميل.','success',[{text:'موافق',cls:'ok',fn:()=>show('payments')}]);
  }catch(e){
    console.error('rejectPayment failed',e);
    if(e?.code==='permission-denied'||/permission|insufficient/i.test(String(e?.message||''))){ showPermissionDeniedLogoutDialog('رفض السداد',e); return; }
    msg('تعذر رفض السداد: '+friendlyFirestoreError(e),'error');
  }
}

// ===== Phase 6: returns, schedules, collections stability =====
function phase6InvoiceLines(inv){ return Array.isArray(inv?.lines)?inv.lines:(Array.isArray(inv?.items)?inv.items:[]); }
function phase6CustomerInvoices(){
  const list=(cache.invoices||[]).filter(inv=>state.role==='trader' || String(inv.customerId||'')===String(state.customerId||'') || String(inv.customerUid||'')===String(uid()));
  return list.sort((a,b)=>(b.createdMs||0)-(a.createdMs||0));
}
function phase6ReturnAlreadyQty(invoiceId,itemId){
  return (cache.returns||[]).filter(r=>String(r.invoiceId||'')===String(invoiceId||'') && String(r.itemId||'')===String(itemId||'') && !['rejected','cancelled'].includes(String(r.status||'pending'))).reduce((a,r)=>a+Number(r.qty||0),0);
}
function renderReturnLines(){
  const invoices=phase6CustomerInvoices();
  if(!invoices.length) return '<div class="safe-placeholder">لا توجد فواتير متاحة لطلب مرتجع. عند اعتماد طلب شراء ستظهر الفاتورة هنا.</div>';
  const selected=state.returnInvoiceId && invoices.some(i=>String(i.id)===String(state.returnInvoiceId)) ? state.returnInvoiceId : invoices[0].id;
  state.returnInvoiceId=selected; save();
  const inv=invoices.find(i=>String(i.id)===String(selected))||invoices[0];
  const lines=phase6InvoiceLines(inv).filter(l=>Number(l.qty||0)>phase6ReturnAlreadyQty(inv.id,l.itemId||l.id||l.name));
  const invOpts=invoices.map(i=>`<option value="${esc(i.id)}" ${String(i.id)===String(inv.id)?'selected':''}>${esc(i.invoiceNo||i.id)} - ${money(i.total||0)} - ${dt(i.createdMs)}</option>`).join('');
  const lineOpts=lines.map(l=>{const itemId=l.itemId||l.id||l.name; const remain=Math.max(0,Number(l.qty||0)-phase6ReturnAlreadyQty(inv.id,itemId)); return `<option value="${esc(itemId)}" data-name="${esc(l.name||l.itemName||'')}" data-price="${Number(l.price||l.unitPrice||0)}" data-max="${remain}">${esc(l.name||l.itemName||'صنف')} - المتاح للمرتجع ${remain}</option>`;}).join('');
  if(!lines.length) return `<div class="grid compact-form"><div class="field"><label>الفاتورة</label><select id="returnInvoice">${invOpts}</select></div></div><div class="safe-placeholder">كل أصناف هذه الفاتورة لديها طلبات مرتجع معلقة أو معتمدة.</div>`;
  return `<div class="grid compact-form"><div class="field"><label>الفاتورة</label><select id="returnInvoice">${invOpts}</select></div><div class="field"><label>الصنف</label><select id="returnItem">${lineOpts}</select></div><div class="field"><label>الكمية</label><input id="returnQty" type="number" min="1" value="1"></div></div>`;
}
function phase6BindReturnForm(){
  if($('returnInvoice')) $('returnInvoice').onchange=e=>{state.returnInvoiceId=e.target.value; save(); renderReturns();};
  if($('returnItem')) $('returnItem').onchange=()=>{ const opt=$('returnItem').selectedOptions?.[0]; const max=Number(opt?.dataset?.max||1); if($('returnQty')) $('returnQty').value=Math.max(1,Math.min(Number($('returnQty').value||1),max)); };
}
async function sendReturnRequest(){
  try{
    if(state.role!=='customer'){ msg('طلب المرتجع خاص بالعميل.','error'); return; }
    if(!db||!state.shopId||!state.customerId){ showPermissionDeniedLogoutDialog('طلب المرتجع',{message:'لا يوجد ربط عميل صالح.'}); return; }
    const invId=$('returnInvoice')?.value||state.returnInvoiceId||'';
    const itemId=$('returnItem')?.value||'';
    const qty=Number($('returnQty')?.value||0);
    const reason=String($('returnReason')?.value||'').trim();
    if(!invId||!itemId){ msg('اختر الفاتورة والصنف أولًا.','error'); return; }
    const inv=(cache.invoices||[]).find(i=>String(i.id)===String(invId));
    if(!inv){ msg('الفاتورة غير موجودة أو غير مسموح بقراءتها.','error'); return; }
    const line=phase6InvoiceLines(inv).find(l=>String(l.itemId||l.id||l.name)===String(itemId));
    if(!line){ msg('الصنف غير موجود داخل الفاتورة.','error'); return; }
    const soldQty=Number(line.qty||0), already=phase6ReturnAlreadyQty(invId,itemId), max=Math.max(0,soldQty-already);
    if(!qty||qty<=0||qty>max){ msg(`الكمية غير صحيحة. الكمية المتاحة للمرتجع: ${max}`,'error'); return; }
    if(!reason){ msg('اكتب سبب المرتجع.','error'); return; }
    const unitPrice=Number(line.price||line.unitPrice||0);
    const total=qty*unitPrice;
    const payload={shopId:state.shopId, invoiceId:inv.id, invoiceNo:inv.invoiceNo||'', invoicePaymentType:inv.paymentType||'cash', customerId:state.customerId, customerUid:uid(), customerName:state.customerName||inv.customerName||'عميل', customerPhone:state.customerPhone||inv.customerPhone||'', itemId, itemName:line.name||line.itemName||'صنف', unitPrice, qty, total, amount:total, reason, status:'pending', createdBy:uid(), createdByRole:'customer', createdAt:serverTimestamp(), createdMs:Date.now(), updatedAt:serverTimestamp(), updatedMs:Date.now()};
    await addDoc(collection(db,'shops',state.shopId,'returnRequests'),payload);
    showAppDialog('تم إرسال طلب المرتجع','تم إرسال طلب المرتجع للتاجر للمراجعة. عند الاعتماد سيتم تحديث المخزون وكشف الحساب حسب نوع الفاتورة.','success',[{text:'مرتجعاتي',cls:'ok',fn:()=>{setPageTab('returns','list');show('returns')}}]);
  }catch(e){ console.error('sendReturnRequest failed',e); if(e?.code==='permission-denied'||/permission|insufficient/i.test(String(e?.message||''))){showPermissionDeniedLogoutDialog('طلب المرتجع',e);return;} msg('تعذر إرسال طلب المرتجع: '+friendlyFirestoreError(e),'error'); }
}
async function approveReturn(returnId){
  try{
    if(state.role!=='trader'){ msg('اعتماد المرتجع خاص بالتاجر.','error'); return; }
    const ret=(cache.returns||[]).find(r=>String(r.id)===String(returnId));
    if(!ret){ msg('طلب المرتجع غير موجود.','error'); return; }
    if(String(ret.status||'pending')!=='pending'){ msg('طلب المرتجع تمت مراجعته مسبقًا.','error'); return; }
    const ok=await confirmDialog('اعتماد المرتجع',`سيتم اعتماد مرتجع ${ret.itemName||'صنف'} بكمية ${Number(ret.qty||0)} ومبلغ ${money(ret.total||ret.amount||0)}. هل تريد المتابعة؟`,'اعتماد');
    if(!ok) return;
    const now=Date.now();
    const returnRef=doc(db,'shops',state.shopId,'returnRequests',returnId);
    await runTransaction(db,async(tx)=>{
      const snap=await tx.get(returnRef); if(!snap.exists()) throw new Error('طلب المرتجع غير موجود في قاعدة البيانات.');
      const fresh={id:returnId,...snap.data()}; if(String(fresh.status||'pending')!=='pending') throw new Error('طلب المرتجع تمت مراجعته مسبقًا.');
      const qty=Number(fresh.qty||0), amount=Number(fresh.total||fresh.amount||0), itemId=fresh.itemId||'', customerId=fresh.customerId||'', customerUid=fresh.customerUid||'';
      tx.update(returnRef,{status:'approved',approvedBy:uid(),approvedByName:actorName(),reviewedAt:serverTimestamp(),reviewedMs:now,updatedAt:serverTimestamp(),updatedMs:now});
      if(itemId){ tx.update(doc(db,'shops',state.shopId,'items',itemId),{stock:increment(qty),updatedAt:serverTimestamp(),updatedMs:now}); }
      tx.set(doc(collection(db,'shops',state.shopId,'stockLedger')),{shopId:state.shopId,itemId,itemName:fresh.itemName||'',type:'return_in',sourceType:'return',sourceId:returnId,qty,note:'مرتجع معتمد من التاجر',createdBy:uid(),createdAt:serverTimestamp(),createdMs:now});
      if(String(fresh.invoicePaymentType||'cash')==='credit' && amount>0 && customerId){
        tx.update(doc(db,'shops',state.shopId,'customers',customerId),{balance:increment(-amount),updatedAt:serverTimestamp(),updatedMs:now});
        tx.set(doc(collection(db,'shops',state.shopId,'customerLedger')),{shopId:state.shopId,customerId,customerUid,customerName:fresh.customerName||'',type:'return_credit',direction:'credit',amount,returnId,invoiceId:fresh.invoiceId||'',note:'مرتجع آجل معتمد - خصم من الدين',createdBy:uid(),createdAt:serverTimestamp(),createdMs:now});
      } else if(amount>0 && customerId){
        tx.set(doc(collection(db,'shops',state.shopId,'customerLedger')),{shopId:state.shopId,customerId,customerUid,customerName:fresh.customerName||'',type:'return_cash',direction:'info',amount,returnId,invoiceId:fresh.invoiceId||'',note:'مرتجع كاش معتمد - لا يغير الدين',createdBy:uid(),createdAt:serverTimestamp(),createdMs:now});
      }
      tx.set(doc(collection(db,'shops',state.shopId,'auditLogs')),{shopId:state.shopId,action:'approve_return',actorRole:'trader',actorName:actorName(),details:{returnId,customerId,itemId,qty,amount},createdAt:serverTimestamp(),createdMs:now});
    });
    showAppDialog('تم اعتماد المرتجع','تم تحديث حالة المرتجع والمخزون وكشف الحساب حسب نوع الفاتورة.','success',[{text:'المرتجعات',cls:'ok',fn:()=>show('returns')},{text:'كشف الحساب',cls:'secondary',fn:()=>show('statement')}]);
  }catch(e){ console.error('approveReturn failed',e); if(e?.code==='permission-denied'||/permission|insufficient/i.test(String(e?.message||''))){showPermissionDeniedLogoutDialog('اعتماد المرتجع',e);return;} msg('تعذر اعتماد المرتجع: '+friendlyFirestoreError(e),'error'); }
}
async function rejectReturn(returnId){
  try{
    if(state.role!=='trader'){ msg('رفض المرتجع خاص بالتاجر.','error'); return; }
    const ret=(cache.returns||[]).find(r=>String(r.id)===String(returnId)); if(!ret){ msg('طلب المرتجع غير موجود.','error'); return; }
    if(String(ret.status||'pending')!=='pending'){ msg('طلب المرتجع تمت مراجعته مسبقًا.','error'); return; }
    const reason=prompt('سبب رفض المرتجع؟',''); if(reason===null) return;
    await updateDoc(doc(db,'shops',state.shopId,'returnRequests',returnId),{status:'rejected',traderNote:String(reason||'').trim(),rejectedBy:uid(),rejectedByName:actorName(),reviewedAt:serverTimestamp(),reviewedMs:Date.now(),updatedAt:serverTimestamp(),updatedMs:Date.now()});
    await addAudit('reject_return',{returnId,reason:String(reason||'').trim()});
    showAppDialog('تم رفض المرتجع','تم رفض طلب المرتجع وإظهار الحالة للعميل.','success',[{text:'موافق',cls:'ok',fn:()=>show('returns')}]);
  }catch(e){ console.error('rejectReturn failed',e); if(e?.code==='permission-denied'||/permission|insufficient/i.test(String(e?.message||''))){showPermissionDeniedLogoutDialog('رفض المرتجع',e);return;} msg('تعذر رفض المرتجع: '+friendlyFirestoreError(e),'error'); }
}
function scheduleStatus(s){ const st=String(s?.status||'pending'); if(st==='paid'||st==='approved') return {text:'مدفوع',cls:'approved'}; if(st==='cancelled') return {text:'ملغي',cls:'rejected'}; if(st==='payment_pending') return {text:'سداد قيد المراجعة',cls:'pending'}; if(st==='pending' && String(s?.dueDate||'')<todayIso()) return {text:'متأخر',cls:'rejected'}; if(st==='pending' && String(s?.dueDate||'')===todayIso()) return {text:'مستحق اليوم',cls:'pending'}; return {text:statusText(st),cls:st}; }
function phase6ScheduleById(id){ return (cache.schedules||[]).find(s=>String(s.id)===String(id)); }
function fillScheduleFromInvoice(){ const invId=$('schedInvoice')?.value||''; if(!invId) return; const inv=(cache.invoices||[]).find(i=>String(i.id)===String(invId)); if(!inv) return; if($('schedCustomer')) $('schedCustomer').value=inv.customerId||''; if($('schedTotal')) $('schedTotal').value=Number(inv.balanceDue||inv.total||0); }
async function createSchedule(){
  try{
    if(state.role!=='trader'){ msg('إنشاء الجداول خاص بالتاجر.','error'); return; }
    const customerId=$('schedCustomer')?.value||''; const customer=(cache.customers||[]).find(c=>String(c.customerId)===String(customerId)); const invoiceId=$('schedInvoice')?.value||''; const invoice=(cache.invoices||[]).find(i=>String(i.id)===String(invoiceId));
    const total=Number($('schedTotal')?.value||0), count=Math.max(1,Number($('schedCount')?.value||1)), start=String($('schedStart')?.value||''), interval=Math.max(1,Number($('schedInterval')?.value||7)); const note=String($('schedNote')?.value||'').trim();
    if(!customer){ msg('اختر العميل.','error'); return; } if(!total||total<=0){ msg('أدخل إجمالي مبلغ صحيح.','error'); return; } if(!start){ msg('حدد تاريخ أول استحقاق.','error'); return; }
    const ok=await confirmDialog('إنشاء جدول سداد',`سيتم إنشاء ${count} دفعة بإجمالي ${money(total)} للعميل ${customer.name||''}. هل تريد المتابعة؟`,'إنشاء'); if(!ok) return;
    const batch=writeBatch(db); const now=Date.now(); let remaining=total;
    for(let n=1;n<=count;n++){ const due=new Date(start+'T00:00:00'); due.setDate(due.getDate()+((n-1)*interval)); const amount=n===count?Number(remaining.toFixed(2)):Number((total/count).toFixed(2)); remaining-=amount; const ref=doc(collection(db,'shops',state.shopId,'paymentSchedules')); batch.set(ref,{shopId:state.shopId,customerId,customerUid:customer.customerUid||'',customerName:customer.name||'',customerPhone:customer.phone||'',invoiceId:invoice?.id||'',invoiceNo:invoice?.invoiceNo||'',amount,totalAmount:total,installmentNo:n,installmentCount:count,dueDate:due.toISOString().slice(0,10),intervalDays:interval,status:'pending',note,createdBy:uid(),createdAt:serverTimestamp(),createdMs:now,updatedAt:serverTimestamp(),updatedMs:now}); }
    batch.set(doc(collection(db,'shops',state.shopId,'auditLogs')),{shopId:state.shopId,action:'create_payment_schedule',actorRole:'trader',actorName:actorName(),details:{customerId,total,count,invoiceId},createdAt:serverTimestamp(),createdMs:now});
    await batch.commit(); showAppDialog('تم إنشاء الجدولة','تم إنشاء جدول السداد بنجاح وسيظهر للعميل في الاستحقاقات.','success',[{text:'الاستحقاقات',cls:'ok',fn:()=>{setPageTab('schedules','due');show('schedules')}}]);
  }catch(e){ console.error('createSchedule failed',e); if(e?.code==='permission-denied'||/permission|insufficient/i.test(String(e?.message||''))){showPermissionDeniedLogoutDialog('إنشاء الجدولة',e);return;} msg('تعذر إنشاء الجدولة: '+friendlyFirestoreError(e),'error'); }
}
async function paySchedule(scheduleId){
  try{
    if(state.role!=='customer'){ msg('سداد القسط خاص بالعميل.','error'); return; } const sch=phase6ScheduleById(scheduleId); if(!sch){ msg('الاستحقاق غير موجود.','error'); return; } if(String(sch.status||'pending')!=='pending'){ msg('هذا الاستحقاق ليس متاحًا للسداد.','error'); return; }
    const ok=await confirmDialog('سداد استحقاق',`سيتم إرسال طلب سداد بمبلغ ${money(sch.amount)} للتاجر للمراجعة. هل تريد المتابعة؟`,'إرسال السداد'); if(!ok) return;
    await addDoc(collection(db,'shops',state.shopId,'paymentRequests'),{shopId:state.shopId,customerId:state.customerId,customerUid:uid(),customerName:state.customerName||sch.customerName||'عميل',customerPhone:state.customerPhone||sch.customerPhone||'',amount:Number(sch.amount||0),method:'سداد قسط',referenceNo:`SCH-${scheduleId}`,note:`سداد قسط رقم ${sch.installmentNo||1} من ${sch.installmentCount||1}`,scheduleId,invoiceId:sch.invoiceId||'',status:'pending',createdBy:uid(),createdByRole:'customer',createdAt:serverTimestamp(),createdMs:Date.now(),updatedAt:serverTimestamp(),updatedMs:Date.now()});
    showAppDialog('تم إرسال سداد القسط','تم إرسال طلب السداد للتاجر للمراجعة. عند اعتماد التاجر سيتم تحديث كشف الحساب وحالة القسط.','success',[{text:'السداد',cls:'ok',fn:()=>show('payments')}]);
  }catch(e){ console.error('paySchedule failed',e); if(e?.code==='permission-denied'||/permission|insufficient/i.test(String(e?.message||''))){showPermissionDeniedLogoutDialog('سداد القسط',e);return;} msg('تعذر إرسال سداد القسط: '+friendlyFirestoreError(e),'error'); }
}
async function cancelSchedule(scheduleId){
  try{ if(state.role!=='trader'){ msg('إلغاء الاستحقاق خاص بالتاجر.','error'); return; } const ok=await confirmDialog('إلغاء الاستحقاق','سيتم إلغاء هذا الاستحقاق ولن يظهر كقسط مستحق. هل تريد المتابعة؟','إلغاء الاستحقاق'); if(!ok) return; await updateDoc(doc(db,'shops',state.shopId,'paymentSchedules',scheduleId),{status:'cancelled',cancelledBy:uid(),cancelledByName:actorName(),updatedAt:serverTimestamp(),updatedMs:Date.now()}); await addAudit('cancel_schedule',{scheduleId}); msg('تم إلغاء الاستحقاق.','success'); }
  catch(e){ console.error('cancelSchedule failed',e); if(e?.code==='permission-denied'||/permission|insufficient/i.test(String(e?.message||''))){showPermissionDeniedLogoutDialog('إلغاء الاستحقاق',e);return;} msg('تعذر إلغاء الاستحقاق: '+friendlyFirestoreError(e),'error'); }
}
function shareCollectionReport(){ const selectedDate=state.collectionDate||todayIso(); const rows=(cache.payments||[]).filter(p=>String(p.createdMs?new Date(p.createdMs).toISOString().slice(0,10):'')===selectedDate || !state.collectionDate); const approved=rows.filter(p=>p.status==='approved').reduce((a,p)=>a+Number(p.amount||0),0); const pending=rows.filter(p=>p.status==='pending').reduce((a,p)=>a+Number(p.amount||0),0); const text=`تقرير التحصيل - حسابي التجاري\nالتاريخ: ${selectedDate}\nعدد العمليات: ${rows.length}\nالمقبول: ${money(approved)}\nالمعلق: ${money(pending)}\n\n`+rows.map(p=>`- ${p.customerName||''}: ${money(p.amount)} | ${p.method||''} | ${statusText(p.status)} | ${p.referenceNo||''}`).join('\n'); if(navigator.share) navigator.share({title:'تقرير التحصيل',text}).catch(()=>{}); else if(navigator.clipboard) navigator.clipboard.writeText(text).then(()=>msg('تم نسخ تقرير التحصيل.','success')); else showAppDialog('تقرير التحصيل',text,'notice'); }
function phase6ValidateReturnsSchedulesCollections(){ const missing=['renderReturnLines','sendReturnRequest','approveReturn','rejectReturn','scheduleStatus','createSchedule','paySchedule','cancelSchedule','fillScheduleFromInvoice','shareCollectionReport'].filter(n=>typeof window[n]!=='function' && typeof eval(n)!=='function'); return {ok:missing.length===0,missing}; }

function phase5ValidatePaymentInvoiceFlow(){
  return typeof sendPayment==='function' && typeof approvePayment==='function' && typeof rejectPayment==='function' && typeof openReceipt==='function' && typeof shareInvoiceText==='function' && typeof confirmDialog==='function';
}


/* Phase 8: policies, settings, permissions, owner console, subscriptions, messaging stability */
function phase8RawPolicy(key, def){
  const sh=cache.shop||{};
  const p=(sh.policies&&typeof sh.policies==='object')?sh.policies:{};
  const aliases={
    showPrices:['showCustomerPrices','showPrices'],
    showStock:['showCustomerStock','showStock','showQuantities'],
    showQuantities:['showCustomerStock','showStock','showQuantities'],
    allowOutOfStock:['allowOutOfStockOrders','allowOutOfStock'],
    allowOrders:['allowCustomerOrders','allowOrders'],
    allowReturns:['allowReturns'],
    messaging:['customerMessagingMode','messagingMode'],
    hoursEnabled:['workingHoursEnabled','hoursEnabled'],
    openTime:['workingOpenTime','openTime'],
    closeTime:['workingCloseTime','closeTime'],
    closedMessage:['workingClosedMessage','closedMessage'],
    invoicePrefix:['invoicePrefix'],
    defaultCreditLimit:['defaultCreditLimit'],
    defaultCustomerStatus:['defaultCustomerStatus'],
    requireCustomerApproval:['requireCustomerApproval']
  };
  const keys=[key].concat(aliases[key]||[]).filter((v,i,a)=>v&&a.indexOf(v)===i);
  for(const k of keys){ if(sh[k]!==undefined) return sh[k]; if(p[k]!==undefined) return p[k]; }
  return def;
}
function shopPolicyBool(key, def=true){
  const v=phase8RawPolicy(key, def);
  if(typeof v==='string') return !['false','0','no','off','مخفي','ممنوع','disabled'].includes(v.trim().toLowerCase());
  return v===undefined ? !!def : v!==false;
}
function phase8PolicyTextBool(v, yes='نعم', no='لا'){return v?yes:no;}
function phase8Select(id, val, opts){return `<select id="${id}">${opts.map(o=>`<option value="${esc(String(o[0]))}" ${String(val)===String(o[0])?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;}
function phase8Input(id, val, type='text', extra=''){return `<input id="${id}" type="${type}" value="${esc(String(val??''))}" ${extra}>`;}
function phase8GuardTrader(action='هذه العملية'){
  if(state.role!=='trader'){showAppDialog('صلاحية غير متاحة', action+' خاصة بالتاجر فقط.','error',[{text:'موافق',cls:'ok'}]); return false;}
  if(!state.shopId){msg('لا يوجد متجر نشط.','error'); return false;}
  return true;
}
async function saveShopPoliciesPhase8(){
  try{
    if(!phase8GuardTrader('تعديل السياسات')) return;
    const fields={
      allowCustomerOrders: $('polAllowOrders')?.value==='true',
      allowReturns: $('polAllowReturns')?.value==='true',
      allowOutOfStockOrders: $('polAllowOut')?.value==='true',
      showCustomerPrices: $('polShowPrices')?.value==='true',
      showCustomerStock: $('polShowStock')?.value==='true',
      customerMessagingMode: $('polMessaging')?.value||'linked_only',
      workingHoursEnabled: $('polHoursEnabled')?.value==='true',
      workingOpenTime: $('polOpenTime')?.value||'08:00',
      workingCloseTime: $('polCloseTime')?.value||'22:00',
      workingClosedMessage: ($('polClosedMsg')?.value||'المتجر مغلق حاليًا. سيتم استقبال طلبك عند وقت الدوام.').trim(),
      defaultCreditLimit: Math.max(0,Number($('polCreditLimit')?.value||0)),
      defaultCustomerStatus: $('polCustomerStatus')?.value||'active',
      requireCustomerApproval: $('polRequireCustomerApproval')?.value==='true',
      invoicePrefix: (($('polInvoicePrefix')?.value||'INV').trim()||'INV').slice(0,12),
      updatedAt: serverTimestamp(),
      updatedMs: Date.now()
    };
    fields.policies={
      allowCustomerOrders:fields.allowCustomerOrders,
      allowReturns:fields.allowReturns,
      allowOutOfStockOrders:fields.allowOutOfStockOrders,
      showCustomerPrices:fields.showCustomerPrices,
      showCustomerStock:fields.showCustomerStock,
      customerMessagingMode:fields.customerMessagingMode,
      workingHoursEnabled:fields.workingHoursEnabled,
      workingOpenTime:fields.workingOpenTime,
      workingCloseTime:fields.workingCloseTime,
      workingClosedMessage:fields.workingClosedMessage,
      defaultCreditLimit:fields.defaultCreditLimit,
      defaultCustomerStatus:fields.defaultCustomerStatus,
      requireCustomerApproval:fields.requireCustomerApproval,
      invoicePrefix:fields.invoicePrefix
    };
    await setDoc(doc(db,'shops',state.shopId),fields,{merge:true});
    cache.shop={...(cache.shop||{}),...fields};
    await addAudit('update_shop_policies',{fields:Object.keys(fields.policies)});
    showAppDialog('تم حفظ السياسات','تم حفظ إعدادات المتجر وتطبيقها على العملاء والطلبات والرسائل.','success',[{text:'موافق',cls:'ok',fn:()=>renderPolicies()}]);
  }catch(e){console.error('save policies failed',e); if(e?.code==='permission-denied'||/permission|insufficient/i.test(String(e?.message||''))){showPermissionDeniedLogoutDialog('حفظ السياسات',e);return;} msg('تعذر حفظ السياسات: '+friendlyFirestoreError(e),'error');}
}
function renderPolicies(){
  const tab=pageTabState('policies','orders');
  const sh=cache.shop||{};
  const p=(sh.policies&&typeof sh.policies==='object')?sh.policies:{};
  const canEdit=state.role==='trader';
  const readonlyNote=canEdit?'':'<div class="notice warn">هذه الصفحة للعرض فقط. تعديل السياسات خاص بالتاجر.</div>';
  const tabs=[['orders','🧾','الطلبات'],['visibility','👁️','الظهور'],['messages','💬','المراسلة'],['hours','🕒','الدوام'],['customers','👥','العملاء'],['summary','✅','ملخص']];
  const top=pageHead('السياسات','كل تاجر له إعدادات مستقلة تطبق على عملائه ومتجره فقط.')+pageTabsBar('policies',tab,tabs)+readonlyNote;
  const disabled=canEdit?'':'disabled';
  let content='';
  if(tab==='orders'){
    content=`<div class="card"><h2>البيع والطلبات</h2><div class="grid">
      <div class="field"><label>استقبال طلبات العملاء</label>${phase8Select('polAllowOrders', String(phase8RawPolicy('allowOrders', true)), [['true','مفعل'],['false','موقوف']])}</div>
      <div class="field"><label>المرتجعات</label>${phase8Select('polAllowReturns', String(phase8RawPolicy('allowReturns', true)), [['true','مسموحة'],['false','موقوفة']])}</div>
      <div class="field"><label>طلب كمية غير متوفرة</label>${phase8Select('polAllowOut', String(phase8RawPolicy('allowOutOfStockOrders', false)), [['false','ممنوع'],['true','مسموح للمراجعة']])}</div>
      <div class="field"><label>بادئة الفاتورة</label>${phase8Input('polInvoicePrefix', phase8RawPolicy('invoicePrefix','INV'))}</div>
      <div class="field"><label>طلب موافقة العميل قبل اعتماد تعديلات التاجر</label>${phase8Select('polRequireCustomerApproval', String(phase8RawPolicy('requireCustomerApproval', true)), [['true','نعم'],['false','لا']])}</div>
    </div></div>`;
  }else if(tab==='visibility'){
    content=`<div class="card"><h2>ظهور الأصناف والأسعار للعميل</h2><div class="grid">
      <div class="field"><label>إظهار الأسعار للعميل</label>${phase8Select('polShowPrices', String(phase8RawPolicy('showCustomerPrices', true)), [['true','إظهار الأسعار'],['false','إخفاء الأسعار']])}</div>
      <div class="field"><label>إظهار الكميات للعميل</label>${phase8Select('polShowStock', String(phase8RawPolicy('showCustomerStock', true)), [['true','إظهار الكمية'],['false','إخفاء الكمية']])}</div>
    </div><div class="notice">إخفاء صنف محدد يتم من صفحة الأصناف ← تعديل الأسعار/الظهور. الصنف المخفي لا يظهر للعميل في الشراء.</div></div>`;
  }else if(tab==='messages'){
    content=`<div class="card"><h2>المراسلة</h2><div class="field"><label>من يستطيع مراسلة المتجر؟</label>${phase8Select('polMessaging', phase8RawPolicy('messaging','linked_only'), [['linked_only','العملاء المرتبطون والتاجر'],['trader_only','التاجر فقط يرسل'],['disabled','إغلاق المراسلة مؤقتًا']])}</div><div class="notice">هذه السياسة تطبق على زر إرسال الرسالة، وليس فقط على الواجهة.</div></div>`;
  }else if(tab==='hours'){
    content=`<div class="card"><h2>أوقات الدوام والإغلاق</h2><div class="grid">
      <div class="field"><label>تفعيل وقت الدوام</label>${phase8Select('polHoursEnabled', String(phase8RawPolicy('hoursEnabled', false)), [['false','غير مفعل'],['true','مفعل']])}</div>
      <div class="field"><label>وقت الفتح</label>${phase8Input('polOpenTime', phase8RawPolicy('openTime','08:00'), 'time')}</div>
      <div class="field"><label>وقت الإغلاق</label>${phase8Input('polCloseTime', phase8RawPolicy('closeTime','22:00'), 'time')}</div>
      <div class="field"><label>رسالة الإغلاق</label><textarea id="polClosedMsg">${esc(phase8RawPolicy('closedMessage','المتجر مغلق حاليًا. سيتم استقبال طلبك عند وقت الدوام.'))}</textarea></div>
    </div></div>`;
  }else if(tab==='customers'){
    content=`<div class="card"><h2>العملاء والائتمان</h2><div class="grid">
      <div class="field"><label>سقف الدين الافتراضي للعميل الجديد</label>${phase8Input('polCreditLimit', phase8RawPolicy('defaultCreditLimit',0), 'number', 'min="0" step="1"')}</div>
      <div class="field"><label>حالة العميل الجديد</label>${phase8Select('polCustomerStatus', phase8RawPolicy('defaultCustomerStatus','active'), [['active','نشط'],['blocked','موقوف حتى مراجعة التاجر']])}</div>
    </div><div class="notice">يمكن تعديل سقف عميل محدد من صفحة العملاء.</div></div>`;
  }else{
    const rows=[
      ['استقبال الطلبات', phase8PolicyTextBool(shopPolicyBool('allowCustomerOrders',true),'مفعل','موقوف')],
      ['إظهار الأسعار', phase8PolicyTextBool(shopPolicyBool('showCustomerPrices',true),'ظاهر','مخفي')],
      ['إظهار الكميات', phase8PolicyTextBool(shopPolicyBool('showCustomerStock',true),'ظاهر','مخفي')],
      ['طلب غير المتوفر', phase8PolicyTextBool(shopPolicyBool('allowOutOfStockOrders',false),'مسموح','ممنوع')],
      ['المراسلة', String(phase8RawPolicy('messaging','linked_only'))],
      ['الدوام', shopIsOpenNow()?'مفتوح الآن':'مغلق الآن']
    ];
    content=`<div class="card"><h2>ملخص السياسات الحالية</h2><div class="table-wrap"><table class="compact-table"><thead><tr><th>السياسة</th><th>الحالة</th></tr></thead><tbody>${rows.map(r=>`<tr><td class="name">${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  const saveBar=canEdit&&tab!=='summary'?`<div class="card"><button class="btn ok" id="savePoliciesPhase8">حفظ السياسات</button></div>`:'';
  $('page_policies').innerHTML=top+content+saveBar;
  setTimeout(()=>{bindPageTabs('policies',renderPolicies); if($('savePoliciesPhase8')) $('savePoliciesPhase8').onclick=saveShopPoliciesPhase8; if(!canEdit){document.querySelectorAll('#page_policies input,#page_policies select,#page_policies textarea').forEach(x=>x.disabled=true);}});
}
function canSendMessageNow(){
  const mode=String(phase8RawPolicy('messaging','linked_only'));
  if(mode==='disabled') return {ok:false,msg:'المراسلة مغلقة مؤقتًا من سياسات المتجر.'};
  if(mode==='trader_only' && state.role==='customer') return {ok:false,msg:'سياسة المتجر تسمح للتاجر فقط بإرسال الرسائل حاليًا.'};
