  const im=demandFilter('customerSaleItems23', (cache.items||[]).filter(i=>i.isActive!==false), i=>`${i.name||''} ${i.barcode||''} ${itemCategory(i)} ${i.price||''}`);
  const itemRows=im.visible.map(i=>`<tr><td class="name">${esc(i.name)}</td><td>${money(effectiveItemPrice(i,$('salePayType')?.value||'credit'))}</td><td>${Number(i.stock||0)}</td><td><input class="qty-mini-input" data-item="${i.id}" data-name="${esc(i.name)}" data-price="${effectiveItemPrice(i,$('salePayType')?.value||'credit')}" data-stock="${Number(i.stock||0)}" type="number" min="0" max="${Number(i.stock||0)}" placeholder="0" ${Number(i.stock||0)>0?'':'disabled'}></td></tr>`);
  const saleBox=`<div class="card"><h2>إنشاء طلب بيع للعميل</h2><div class="form compact-form"><div class="grid"><div class="field"><label>العميل</label><select id="saleCustomer">${options}</select></div><div class="field"><label>نوع الدفع</label><select id="salePayType"><option value="credit">آجل</option><option value="cash">كاش</option></select></div><div class="field"><label>تاريخ الاستحقاق</label><input id="saleDueDate" type="date"></div><div class="field"><label>الأولوية</label><select id="salePriority"><option value="normal">عادي</option><option value="urgent">مستعجل</option></select></div></div>${demandTableCard('customerSaleItems23','أصناف البيع للعميل',['الصنف','السعر','المتوفر','الكمية'],itemRows,im,'اضغط عرض البيانات أو ابحث عن صنف للبيع')}<div class="field"><label>ملاحظة للعميل</label><textarea id="saleNote"></textarea></div><button class="btn compact-main-btn" id="sendTraderSale" ${cache.customers.length&&cache.items.length?'':'disabled'}>إرسال الطلب للعميل</button></div></div>`;
  const listBox=demandTableCard('customersList23',tab==='blocked'?'العملاء الموقوفون':(tab==='limits'?'سقوف الدين':'العملاء'),['العميل','الهاتف','الدين','السقف','المتاح','الحالة','إجراء'],rows,cm,'لا يوجد عملاء مطابقون');
  $('page_customers').innerHTML=pageHead('العملاء','إدارة العملاء أصبحت مراحل: قائمة، إضافة، بيع مباشر، سقوف، وموقوفين.')+pageTabsBar('customers',tab,tabs)+pageStats([['عدد العملاء',cache.customers.length],['ديون العملاء',money((cache.customers||[]).reduce((a,c)=>a+Number(c.balance||0),0))],['موقوفين',(cache.customers||[]).filter(c=>c.status==='blocked').length],['كاش فقط',(cache.customers||[]).filter(c=>c.status==='cash_only').length]])+(tab==='add'?addBox:(tab==='sale'?saleBox:listBox));
  setTimeout(()=>{bindPageTabs('customers',renderCustomers); bindDemandTable('customersList23', renderCustomers); bindDemandTable('customerSaleItems23', renderCustomers); document.querySelectorAll('[data-set-limit]').forEach(b=>b.onclick=()=>setCreditLimit(b.dataset.setLimit));document.querySelectorAll('[data-customer-status]').forEach(b=>b.onclick=()=>setCustomerStatus(b.dataset.customerStatus,b.dataset.statusValue)); if($('addManualCustomerBtn')) $('addManualCustomerBtn').onclick=addManualCustomer; if($('sendTraderSale')) $('sendTraderSale').onclick=sendTraderSale;});
}

renderOrders=function(){
  const tab=pageTabState('orders','pending');
  const tabs=[['pending','⏳','المعلقة'],['approved','✅','المقبولة'],['rejected','❌','المرفوضة'],['all','📋','كل الطلبات']];
  const data=statusFilter(cache.orders||[],tab);
  const meta=demandFilter('ordersList23', data, o=>`${o.customerName||''} ${o.note||''} ${o.traderNote||''} ${o.status||''} ${o.paymentType||''} ${o.total||''} ${demandText(o.items||[])}`);
  const rows=meta.visible.map(o=>`<tr class="detail-row"><td class="name">${esc(o.customerName||'عميل')}<div class="subcell">${esc(o.note||o.traderNote||'')}</div></td><td>${payTypeText(o.paymentType)}</td><td><b>${money(o.total)}</b></td><td><span class="status ${o.status}">${statusText(o.status)}</span></td><td>${dt(o.createdMs)}</td><td>${orderActions(o)} ${compactActionButtons('<button class="btn secondary mini" data-toggle-row="1">تفاصيل</button>')}</td></tr><tr class="lines-row"><td colspan="6"><div class="demand-details">${compactLineRows(o.items||[])}</div></td></tr>`);
  $('page_orders').innerHTML=pageHead(state.role==='trader'?'طلبات البيع والشراء':'طلباتي','تم تقسيم الطلبات حسب الحالة لتجنب ازدحام القائمة.')+pageTabsBar('orders',tab,tabs)+pageStats([['إجمالي',cache.orders.length],['معلقة',(cache.orders||[]).filter(o=>String(o.status||'').includes('pending')).length],['مقبولة',(cache.orders||[]).filter(o=>o.status==='approved').length],['مرفوضة',(cache.orders||[]).filter(o=>o.status==='rejected'||o.status==='cancelled').length]])+demandTableCard('ordersList23','جدول الطلبات',['العميل','الدفع','الإجمالي','الحالة','التاريخ','إجراء'],rows,meta,'لا توجد طلبات مطابقة');
  setTimeout(()=>{bindPageTabs('orders',renderOrders); bindDemandTable('ordersList23', renderOrders); bindOrderRows();});
}

renderInvoices=function(){
  const tab=pageTabState('invoices','all');
  const tabs=[['all','🧾','كل الفواتير'],['cash','💵','كاش'],['credit','📒','آجل'],['export','📤','تصدير']];
  const selectedCustomer=state.invFilterCustomer||'';
  let data=[...(cache.invoices||[])]; if(state.role==='trader'&&selectedCustomer) data=data.filter(i=>i.customerId===selectedCustomer); if(tab==='cash'||tab==='credit') data=data.filter(i=>(i.paymentType||'cash')===tab);
  const meta=demandFilter('invoicesList23', data, inv=>`${inv.invoiceNo||''} ${inv.id||''} ${inv.customerName||''} ${inv.paymentType||''} ${inv.total||''} ${demandText(inv.items||inv.lines||[])}`);
  const customerOptions=state.role==='trader'?cache.customers.map(c=>`<option value="${esc(c.customerId)}" ${selectedCustomer===c.customerId?'selected':''}>${esc(c.name)} - ${esc(c.phone||'')}</option>`).join(''):'';
  const filterBox=`<div class="card"><div class="grid compact-filters">${state.role==='trader'?`<div class="field"><label>العميل</label><select id="invFilterCustomer"><option value="">كل العملاء</option>${customerOptions}</select></div>`:''}</div><div class="actions"><button class="btn light mini" id="clearInvoiceFilters">مسح الفلاتر</button>${tab==='export'?`<button class="btn secondary mini" id="exportInvoicesCsv">تصدير الفواتير CSV</button>`:''}</div></div>`;
  const rows=meta.visible.map(inv=>`<tr class="detail-row"><td class="name">${esc(inv.invoiceNo||inv.id)}</td><td>${esc(inv.customerName||'')}</td><td>${payTypeText(inv.paymentType)}</td><td><b>${money(inv.total)}</b></td><td>${dt(inv.createdMs)}</td><td>${compactActionButtons(`<button class="btn light mini" data-print-invoice="${inv.id}">مشاركة</button><button class="btn secondary mini" data-toggle-row="1">تفاصيل</button>`)}</td></tr><tr class="lines-row"><td colspan="6"><div class="demand-details">${compactLineRows(inv.items||inv.lines||[])}</div></td></tr>`);
  $('page_invoices').innerHTML=pageHead('الفواتير','الفواتير مقسمة إلى كاش وآجل مع بحث وفلاتر وتصدير.')+pageTabsBar('invoices',tab,tabs)+pageStats([['الفواتير',cache.invoices.length],['الكاش',(cache.invoices||[]).filter(i=>(i.paymentType||'cash')==='cash').length],['الآجل',(cache.invoices||[]).filter(i=>i.paymentType==='credit').length],['الإجمالي',money((cache.invoices||[]).reduce((a,i)=>a+Number(i.total||0),0))]])+filterBox+demandTableCard('invoicesList23','جدول الفواتير',['الفاتورة','العميل','الدفع','الإجمالي','التاريخ','إجراء'],rows,meta,'لا توجد فواتير مطابقة');
  setTimeout(()=>{bindPageTabs('invoices',renderInvoices); bindDemandTable('invoicesList23', renderInvoices); if($('invFilterCustomer')) $('invFilterCustomer').onchange=e=>{state.invFilterCustomer=e.target.value;save();renderInvoices()}; if($('clearInvoiceFilters')) $('clearInvoiceFilters').onclick=()=>{state.invFilterCustomer='';save();renderInvoices()}; if($('exportInvoicesCsv')) $('exportInvoicesCsv').onclick=exportInvoicesCsv; document.querySelectorAll('[data-print-invoice]').forEach(b=>b.onclick=()=>shareInvoiceText(b.dataset.printInvoice));});
}

renderPayments=function(){
  const tab=pageTabState('payments',state.role==='customer'?'request':'pending');
  const tabs=state.role==='customer'?[['request','💸','إرسال سداد'],['list','📋','سداداتي'],['pending','⏳','معلقة'],['approved','✅','مقبولة']]:[['pending','⏳','بانتظار الموافقة'],['approved','✅','مقبولة'],['rejected','❌','مرفوضة'],['all','📋','كل السداد']];
  const debt=state.role==='customer'?customerDebtInfo().balance:0;
  const payBox=state.role==='customer'?`<div class="card"><h2>إرسال طلب سداد</h2><div class="grid"><div class="metric"><span class="muted">الدين الحالي</span><b>${money(debt)}</b></div></div><div class="form compact-form"><div class="grid"><div class="field"><label>المبلغ</label><input id="payAmount" type="number" min="1"></div><div class="field"><label>طريقة السداد</label><input id="payMethod" placeholder="كاش / حوالة / كريمي / بنك"></div><div class="field"><label>رقم المرجع</label><input id="payRef"></div><div class="field"><label>صورة الإيصال</label><input id="payReceipt" type="file" accept="image/*"></div></div><div class="field"><label>ملاحظة</label><textarea id="payNote"></textarea></div><button class="btn compact-main-btn" id="sendPayment" ${debt>0?'':'disabled'}>إرسال السداد</button></div></div>`:'';
  let data=statusFilter(cache.payments||[],tab==='request'?'list':tab);
  const meta=demandFilter('paymentsList23', data, p=>`${p.customerName||state.customerName||''} ${p.amount||''} ${p.method||''} ${p.referenceNo||''} ${p.status||''}`);
  const rows=meta.visible.map(p=>`<tr><td class="name">${esc(p.customerName||state.customerName||'')}</td><td><b>${money(p.amount)}</b></td><td>${esc(p.method||'-')}</td><td>${esc(p.referenceNo||'-')}</td><td><span class="status ${p.status}">${statusText(p.status)}</span></td><td>${dt(p.createdMs)}</td><td>${compactActionButtons(`${p.receiptData?`<button class="btn secondary mini" data-open-receipt="${p.id}">إيصال</button>`:''}${state.role==='trader'&&p.status==='pending'?`<button class="btn ok mini" data-approve-pay="${p.id}">قبول</button><button class="btn danger mini" data-reject-pay="${p.id}">رفض</button>`:''}`)}</td></tr>`);
  $('page_payments').innerHTML=pageHead('السداد والتحويلات','السداد منظم حسب الإرسال والمراجعة والحالة.')+pageTabsBar('payments',tab,tabs)+pageStats([['كل السداد',cache.payments.length],['معلق',(cache.payments||[]).filter(p=>p.status==='pending').length],['مقبول',(cache.payments||[]).filter(p=>p.status==='approved').length],['الدين',money(debt)]])+(tab==='request'?payBox:demandTableCard('paymentsList23',state.role==='trader'?'طلبات السداد':'سداداتي',['العميل','المبلغ','الطريقة','المرجع','الحالة','التاريخ','إجراء'],rows,meta,'لا توجد طلبات سداد مطابقة'));
  setTimeout(()=>{bindPageTabs('payments',renderPayments); bindDemandTable('paymentsList23', renderPayments); if($('sendPayment')) $('sendPayment').onclick=sendPayment; bindPaymentRows();});
}

renderStock=function(){
  if(state.role!=='trader'){show('home');return}
  const tab=pageTabState('stock','balances');
  const tabs=[['balances','📦','الأرصدة'],['low','⚠️','منخفض'],['ledger','📜','الحركات'],['adjust','🛠️','تسوية']];
  let itemData=[...(cache.items||[])]; if(tab==='low') itemData=itemData.filter(i=>Number(i.stock||0)<=Number(i.minStock||0)&&Number(i.minStock||0)>0);
  const im=demandFilter('stockItemsList23', itemData, i=>`${i.name||''} ${i.unit||''} ${i.stock||''} ${i.minStock||''} ${i.barcode||''}`);
  const itemRows=im.visible.map(i=>`<tr><td class="name">${esc(i.name)}</td><td>${esc(i.unit||'-')}</td><td>${Number(i.stock||0)}</td><td>${Number(i.minStock||0)}</td><td><span class="status ${Number(i.stock||0)<=0?'rejected':(Number(i.minStock||0)>0&&Number(i.stock||0)<=Number(i.minStock||0)?'pending':'approved')}">${Number(i.stock||0)<=0?'نافد':(Number(i.minStock||0)>0&&Number(i.stock||0)<=Number(i.minStock||0)?'منخفض':'جيد')}</span></td><td>${compactActionButtons(`<button class="btn secondary mini" onclick="editStock('${i.id}')">تسوية</button>`)}</td></tr>`);
  const lm=demandFilter('stockLedgerList23', cache.stockLedger||[], s=>`${s.itemName||''} ${s.qty||''} ${s.type||''} ${s.note||s.sourceType||''}`);
  const ledgerRows=lm.visible.map(s=>`<tr><td>${dt(s.createdMs)}</td><td class="name">${esc(s.itemName||'')}</td><td>${Number(s.qty||0)}</td><td>${esc(s.type||'')}</td><td>${esc(s.note||s.sourceType||'')}</td></tr>`);
  const adjustBox=`<div class="card"><h2>تسوية مخزون سريعة</h2><p class="muted">ابحث في جدول الأرصدة، ثم اضغط تسوية للصنف المطلوب. سيتم تسجيل الحركة في سجل المخزون.</p><div class="safe-placeholder">هذه المرحلة تعتمد على زر التسوية لكل صنف لضمان عدم تعديل صنف بالخطأ.</div></div>`;
  $('page_stock').innerHTML=pageHead('المخزون','تم تقسيم المخزون إلى أرصدة، منخفض، حركات، وتسوية.')+pageTabsBar('stock',tab,tabs)+pageStats([['الأصناف',cache.items.length],['منخفض',itemData.filter(i=>Number(i.stock||0)<=Number(i.minStock||0)&&Number(i.minStock||0)>0).length],['حركات',cache.stockLedger.length],['نافد',(cache.items||[]).filter(i=>Number(i.stock||0)<=0).length]])+(tab==='ledger'?demandTableCard('stockLedgerList23','حركات المخزون',['التاريخ','الصنف','الكمية','النوع','البيان'],ledgerRows,lm,'لا توجد حركات مطابقة'):(tab==='adjust'?adjustBox+demandTableCard('stockItemsList23','اختر صنف للتسوية',['الصنف','الوحدة','الكمية','حد التنبيه','الحالة','إجراء'],itemRows,im,'لا توجد أصناف مطابقة'):demandTableCard('stockItemsList23',tab==='low'?'الأصناف منخفضة المخزون':'أرصدة المخزون',['الصنف','الوحدة','الكمية','حد التنبيه','الحالة','إجراء'],itemRows,im,'لا توجد أصناف مطابقة')));
  setTimeout(()=>{bindPageTabs('stock',renderStock); bindDemandTable('stockItemsList23', renderStock); bindDemandTable('stockLedgerList23', renderStock);});
}

renderReturns=function(){
  const tab=pageTabState('returns',state.role==='customer'?'request':'pending');
  const tabs=state.role==='customer'?[['request','↩️','طلب مرتجع'],['list','📋','مرتجعاتي'],['pending','⏳','معلقة'],['done','✅','منتهية']]:[['pending','⏳','معلقة'],['done','✅','منتهية'],['all','📋','كل المرتجعات']];
  const requestBox=state.role==='customer'?`<div class="card"><h2>طلب مرتجع</h2><p class="muted">اختر الفاتورة والصنف من بياناتك ثم أرسل الطلب للتاجر للمراجعة.</p>${renderReturnLines()}<div class="field"><label>سبب المرتجع</label><textarea id="returnReason"></textarea></div><button class="btn compact-main-btn" id="sendReturnRequest">إرسال طلب المرتجع</button></div>`:'';
  let data=statusFilter(cache.returns||[],tab==='request'?'list':tab);
  const meta=demandFilter('returnsList23', data, r=>`${r.customerName||state.customerName||''} ${r.itemName||''} ${r.qty||''} ${r.total||r.amount||''} ${r.status||''}`);
  const rows=meta.visible.map(r=>`<tr><td class="name">${esc(r.customerName||state.customerName||'')}</td><td>${esc(r.itemName||'')}</td><td>${Number(r.qty||0)}</td><td><b>${money(r.total||r.amount||0)}</b></td><td><span class="status ${r.status}">${statusText(r.status)}</span></td><td>${compactActionButtons(`${state.role==='trader'&&r.status==='pending'?`<button class="btn ok mini" data-approve-return="${r.id}">قبول</button><button class="btn danger mini" data-reject-return="${r.id}">رفض</button>`:''}`)}</td></tr>`);
  $('page_returns').innerHTML=pageHead('المرتجعات','المرتجعات منظمة بين طلب جديد، معلقة، ومنتهية.')+pageTabsBar('returns',tab,tabs)+(tab==='request'?requestBox:demandTableCard('returnsList23','جدول المرتجعات',['العميل','الصنف','الكمية','المبلغ','الحالة','إجراء'],rows,meta,'لا توجد مرتجعات مطابقة'));
  setTimeout(()=>{bindPageTabs('returns',renderReturns); bindDemandTable('returnsList23', renderReturns); phase6BindReturnForm(); if($('sendReturnRequest')) $('sendReturnRequest').onclick=sendReturnRequest; document.querySelectorAll('[data-approve-return]').forEach(b=>b.onclick=()=>approveReturn(b.dataset.approveReturn));document.querySelectorAll('[data-reject-return]').forEach(b=>b.onclick=()=>rejectReturn(b.dataset.rejectReturn));});
}

renderSchedules=function(){
  const tab=pageTabState('schedules',state.role==='trader'?'due':'list');
  const tabs=state.role==='trader'?[['create','➕','إنشاء'],['due','📅','المستحقة'],['overdue','⚠️','المتأخرة'],['all','📋','الكل']]:[['list','📅','استحقاقاتي'],['overdue','⚠️','المتأخرة'],['paid','✅','المدفوعة']];
  let data=(cache.schedules||[]).slice().sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||'')));
  if(tab==='due') data=data.filter(s=>s.status==='pending'); if(tab==='overdue') data=data.filter(s=>s.status==='pending' && String(s.dueDate||'')<todayIso()); if(tab==='paid') data=data.filter(s=>s.status==='paid'||s.status==='approved');
  const customerOptions=(cache.customers||[]).map(c=>`<option value="${esc(c.customerId)}">${esc(c.name)} - دينه: ${money(c.balance)}</option>`).join(''); const invoiceOptions=(cache.invoices||[]).filter(i=>i.paymentType==='credit').map(i=>`<option value="${esc(i.id)}">${esc(i.invoiceNo||i.id)} - ${esc(i.customerName||'')} - ${money(i.total)}</option>`).join('');
  const createBox=state.role==='trader'?`<div class="card"><h2>جدولة سداد / أقساط</h2><div class="form compact-form"><div class="grid"><div class="field"><label>العميل</label><select id="schedCustomer"><option value="">اختر العميل</option>${customerOptions}</select></div><div class="field"><label>فاتورة آجلة</label><select id="schedInvoice"><option value="">بدون</option>${invoiceOptions}</select></div><div class="field"><label>إجمالي المبلغ</label><input id="schedTotal" type="number" min="1"></div><div class="field"><label>عدد الدفعات</label><input id="schedCount" type="number" min="1" value="1"></div><div class="field"><label>تاريخ أول استحقاق</label><input id="schedStart" type="date"></div><div class="field"><label>الفاصل بالأيام</label><input id="schedInterval" type="number" min="1" value="7"></div></div><div class="field"><label>ملاحظة</label><textarea id="schedNote"></textarea></div><button class="btn compact-main-btn" id="createSchedule">إنشاء الجدولة</button></div></div>`:'';
  const meta=demandFilter('schedulesList23', data, s=>`${s.customerName||state.customerName||''} ${s.amount||''} ${s.dueDate||''} ${s.status||''} ${s.installmentNo||''}`);
  const rows=meta.visible.map(s=>{const st=scheduleStatus(s); return `<tr><td class="name">${esc(s.customerName||state.customerName||'')}</td><td><b>${money(s.amount)}</b></td><td>${esc(s.dueDate||'-')}</td><td>${Number(s.installmentNo||1)} / ${Number(s.installmentCount||1)}</td><td><span class="status ${st.cls}">${st.text}</span></td><td>${compactActionButtons(`${state.role==='customer'&&s.status==='pending'?`<button class="btn ok mini" data-pay-schedule="${s.id}">سداد</button>`:''}${state.role==='trader'&&s.status==='pending'?`<button class="btn danger mini" data-cancel-schedule="${s.id}">إلغاء</button>`:''}`)}</td></tr>`});
  $('page_schedules').innerHTML=pageHead('الجداول والأقساط','تم فصل إنشاء الجدولة عن قوائم الاستحقاقات حتى يكون الاستخدام أسهل.')+pageTabsBar('schedules',tab,tabs)+(tab==='create'?createBox:demandTableCard('schedulesList23',state.role==='trader'?'استحقاقات العملاء':'استحقاقاتي',['العميل','المبلغ','الاستحقاق','الدفعة','الحالة','إجراء'],rows,meta,'لا توجد استحقاقات مطابقة'));
  setTimeout(()=>{bindPageTabs('schedules',renderSchedules); bindDemandTable('schedulesList23', renderSchedules); if($('createSchedule')) $('createSchedule').onclick=createSchedule; document.querySelectorAll('[data-pay-schedule]').forEach(b=>b.onclick=()=>paySchedule(b.dataset.paySchedule)); document.querySelectorAll('[data-cancel-schedule]').forEach(b=>b.onclick=()=>cancelSchedule(b.dataset.cancelSchedule)); if($('schedInvoice')) $('schedInvoice').onchange=fillScheduleFromInvoice; });
}

renderStatement=function(){
  const tab=pageTabState('statement','ledger');
  const tabs=[['summary','📊','ملخص'],['ledger','📒','الحركات'],['debit','⬆️','مدين'],['credit','⬇️','دائن'],['share','📤','مشاركة']];
  let data=[...(cache.customerLedger||[])]; if(tab==='debit') data=data.filter(l=>Number(l.amount||0)>0 && !String(l.type||'').includes('payment')); if(tab==='credit') data=data.filter(l=>String(l.type||'').includes('payment'));
  const total=(cache.customerLedger||[]).reduce((a,l)=>a+Number(l.amount||0),0);
  const meta=demandFilter('statementList23', data, l=>`${l.customerName||state.customerName||''} ${ledgerTypeText(l.type)} ${l.amount||''} ${l.note||''}`);
  const rows=meta.visible.map(l=>`<tr><td>${dt(l.createdMs)}</td><td class="name">${esc(l.customerName||state.customerName||'')}</td><td>${ledgerTypeText(l.type)}</td><td><b>${money(l.amount)}</b></td><td>${esc(l.note||'')}</td></tr>`);
  const shareBox=`<div class="card"><h2>مشاركة كشف الحساب</h2><p class="muted">يمكن مشاركة كشف حساب العميل من نتائج البحث أو من بطاقة العميل. هذه الصفحة تجهز العرض المختصر والمنظم.</p><button class="btn secondary" onclick="shareStatementText(state.statementCustomer||'')">مشاركة كشف العميل المحدد</button></div>`;
  $('page_statement').innerHTML=pageHead('كشف الحساب','كشف الحساب مقسم إلى ملخص، حركات، مدين، دائن، ومشاركة.')+pageTabsBar('statement',tab,tabs)+pageStats([['إجمالي الحركات',cache.customerLedger.length],['إجمالي المبالغ',money(total)],['العميل',state.customerName||'كل العملاء'],['الوضع',state.role==='trader'?'تاجر':'عميل']])+(tab==='summary'?'<div class="safe-placeholder">افتح تبويب الحركات للعرض التفصيلي أو المشاركة لإرسال كشف مختصر.</div>':(tab==='share'?shareBox:demandTableCard('statementList23','حركات كشف الحساب',['التاريخ','العميل','نوع الحركة','المبلغ','البيان'],rows,meta,'لا توجد حركات مطابقة')));
  setTimeout(()=>{bindPageTabs('statement',renderStatement); bindDemandTable('statementList23', renderStatement);});
}

renderAudit=function(){
  if(state.role!=='trader'){show('home');return}
  const tab=pageTabState('audit','all');
  const tabs=[['all','📋','كل العمليات'],['orders','🧾','طلبات'],['payments','💸','سداد'],['items','📦','أصناف'],['security','🔐','أمان']];
  let data=[...(cache.auditLogs||[])]; if(tab!=='all') data=data.filter(a=>String(a.action||'').toLowerCase().includes(tab.slice(0,-1)) || String(JSON.stringify(a.details||{})).toLowerCase().includes(tab.slice(0,-1)));
  const meta=demandFilter('auditList23', data, a=>`${a.action||''} ${a.actorRole||''} ${a.actorName||''} ${demandText(a.details||{})}`);
  const rows=meta.visible.map(a=>`<tr><td>${dt(a.createdMs)}</td><td class="name">${esc(a.action)}</td><td>${esc(a.actorRole||'')}</td><td>${esc(a.actorName||'')}</td><td class="subcell">${esc(JSON.stringify(a.details||{})).slice(0,150)}</td></tr>`);
  $('page_audit').innerHTML=pageHead('سجل العمليات','السجل مقسم حسب نوع العملية لتسهيل المراجعة والتدقيق.')+pageTabsBar('audit',tab,tabs)+demandTableCard('auditList23','جدول سجل العمليات',['التاريخ','العملية','الدور','المستخدم','التفاصيل'],rows,meta,'لا توجد عمليات مطابقة');
  setTimeout(()=>{bindPageTabs('audit',renderAudit); bindDemandTable('auditList23', renderAudit);});
}

renderReports=function(){
  const tab=pageTabState('reports','summary');
  const tabs=[['summary','📊','ملخص'],['sales','🧾','المبيعات'],['debts','💳','الديون'],['stock','📦','المخزون'],['export','📤','تصدير']];
  const invoices=cache.invoices||[], payments=cache.payments||[], customers=cache.customers||[], items=cache.items||[];
  const salesTotal=invoices.reduce((a,i)=>a+Number(i.total||0),0), payTotal=payments.filter(p=>p.status==='approved').reduce((a,p)=>a+Number(p.amount||0),0), debts=customers.reduce((a,c)=>a+Number(c.balance||0),0), low=items.filter(i=>Number(i.stock||0)<=Number(i.minStock||0)&&Number(i.minStock||0)>0);
  let content='';
  if(tab==='sales'){
    const meta=demandFilter('reportSales23', invoices, i=>`${i.invoiceNo||''} ${i.customerName||''} ${i.total||''} ${i.paymentType||''}`); const rows=meta.visible.map(i=>`<tr><td class="name">${esc(i.invoiceNo||i.id)}</td><td>${esc(i.customerName||'')}</td><td>${payTypeText(i.paymentType)}</td><td><b>${money(i.total)}</b></td><td>${dt(i.createdMs)}</td></tr>`); content=demandTableCard('reportSales23','تقرير المبيعات',['الفاتورة','العميل','الدفع','الإجمالي','التاريخ'],rows,meta,'لا توجد فواتير'); setTimeout(()=>bindDemandTable('reportSales23',renderReports));
  }else if(tab==='debts'){
    const meta=demandFilter('reportDebts23', customers, c=>`${c.name||''} ${c.phone||''} ${c.balance||''}`); const rows=meta.visible.map(c=>`<tr><td class="name">${esc(c.name)}</td><td>${esc(c.phone||'-')}</td><td><b>${money(c.balance||0)}</b></td><td>${money(c.creditLimit||0)}</td><td><span class="status ${customerStatusClass(c.status||'active')}">${customerStatusLabel(c.status||'active')}</span></td></tr>`); content=demandTableCard('reportDebts23','ديون العملاء',['العميل','الهاتف','الدين','السقف','الحالة'],rows,meta,'لا يوجد عملاء'); setTimeout(()=>bindDemandTable('reportDebts23',renderReports));
  }else if(tab==='stock'){
    const meta=demandFilter('reportStock23', low, i=>`${i.name||''} ${i.stock||''} ${i.minStock||''}`); const rows=meta.visible.map(i=>`<tr><td class="name">${esc(i.name)}</td><td>${Number(i.stock||0)}</td><td>${Number(i.minStock||0)}</td><td>${esc(itemCategory(i))}</td></tr>`); content=demandTableCard('reportStock23','الأصناف منخفضة المخزون',['الصنف','المخزون','الحد','التصنيف'],rows,meta,'لا توجد أصناف منخفضة'); setTimeout(()=>bindDemandTable('reportStock23',renderReports));
  }else if(tab==='export'){
    content=`<div class="card"><h2>تصدير التقارير</h2><div class="settings-compact-actions"><button class="btn secondary" id="shareBusinessReport">مشاركة التقرير</button><button class="btn light" id="exportInvoicesCsv">تصدير الفواتير CSV</button><button class="btn light" id="exportPaymentsCsv">تصدير السداد CSV</button>${state.role==='trader'?'<button class="btn light" id="exportCustomersCsv">تصدير العملاء CSV</button>':''}</div></div>`;
  }else{ content='<div class="safe-placeholder">اختر تبويب المبيعات أو الديون أو المخزون لرؤية الجداول التفصيلية. لا يتم تحميل الجداول حتى تطلبها.</div>'; }
  $('page_reports').innerHTML=pageHead('التقارير','التقارير أصبحت مقسمة إلى ملخصات وجداول وتصدير.')+pageTabsBar('reports',tab,tabs)+pageStats([['المبيعات',money(salesTotal)],['التحصيل',money(payTotal)],['ديون العملاء',money(debts)],['منخفض المخزون',low.length]])+content;
  setTimeout(()=>{bindPageTabs('reports',renderReports); if($('shareBusinessReport')) $('shareBusinessReport').onclick=shareBusinessReport; if($('exportInvoicesCsv')) $('exportInvoicesCsv').onclick=exportInvoicesCsv; if($('exportPaymentsCsv')) $('exportPaymentsCsv').onclick=exportPaymentsCsv; if($('exportCustomersCsv')) $('exportCustomersCsv').onclick=exportCustomersCsv;});
};


/* === PHASE 2 AUTH / LINKING STABILITY PATCH 1.0.44 ===
   هدف هذه الطبقة: استرجاع الحسابات بعد الدخول، منع بقاء المستخدم عالقًا،
   وتقليل أخطاء الصلاحيات في مسار إنشاء تاجر/عميل/ربط متجر.
*/
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
