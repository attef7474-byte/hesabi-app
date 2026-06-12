function renderItems(){
  if(!isTrader()){ renderCustomerItemsReadonly(); return; }
  const active=getItemsTab();
  const listCategory=state.itemsListCategory||'الكل';
  const editCategory=state.itemsEditListCategory||'الكل';
  const listData=filteredItemsByCategory(listCategory);
  const editData=filteredItemsByCategory(editCategory);
  const textFn=i=>`${i.name||''} ${i.barcode||''} ${i.model||''} ${i.brand||''} ${itemCategory(i)} ${i.unit||''} ${i.stock||''} ${i.minStock||''}`;
  const meta=demandFilter('itemsList', listData, textFn);
  const editMeta=demandFilter('itemsEditList', editData, textFn);
  const priceCategory=state.itemsPriceListCategory||'الكل';
  const priceData=filteredItemsByCategory(priceCategory);
  const priceMeta=demandFilter('itemsPriceList', priceData, textFn);
  const rows=buildItemRows(meta);
  const editRows=buildItemRows(editMeta);
  const priceRows=priceEditorRows(priceMeta);
  $('page_items').innerHTML=`${itemsTabsBar()}
    <section class="items-pane ${active==='list'?'active':''}" id="itemsPaneList">
      ${demandTableCard('itemsList','الأصناف والمخزون',['تحديد','الصنف','التصنيف','الوحدة','كاش/آجل','المخزون','الحالة','إجراء'],rows,meta,'لا توجد أصناف مطابقة',itemsCategoryFilterHtml('itemsList',listCategory)+itemsBulkActionsHtml())}
    </section>
    <section class="items-pane ${active==='add'?'active':''}" id="itemsPaneAdd">
      <div class="card"><div class="row"><h2>إضافة صنف للبيع</h2><span class="status approved">نموذج جديد</span></div><p class="muted">أدخل بيانات الصنف أو استخدم الماسح/OCR ثم احفظ.</p>
        <div class="hesabi-form-grid">
          <div class="form-section-title">بيانات الصنف</div>
          <div class="field"><label>اسم الصنف</label><input id="itemName" placeholder="مثال: زيت طبخ 1 لتر"></div>
          <div class="field"><label>التصنيف</label><input id="itemCategory" value="عام"></div>
          <div class="field"><label>الوحدة</label><input id="itemUnit" value="حبة"></div>
          <div class="field"><label>باركود / كود الصنف</label><input id="itemBarcode" placeholder="اختياري أو امسحه بالكاميرا"></div>
          <div class="field"><label>ملاحظات</label><textarea id="itemNotes" placeholder="اختياري"></textarea></div>
        </div>
        <div class="barcode-scan-box"><b>مسح كود الصنف بالكاميرا</b><div class="barcode-scan-line" id="itemBarcodeScanStatus">استخدم الماسح الداخلي أو OCR حسب الحاجة.</div><video id="itemBarcodeVideo" class="barcode-video" playsinline muted></video><div class="barcode-actions"><button class="btn ok" type="button" id="nativeItemBarcodeBtn">📷 الماسح الداخلي الدقيق</button><button class="btn secondary" type="button" id="externalItemBarcodeBtn">تطبيق خارجي متوافق</button><button class="btn light" type="button" id="itemOcrBtn">قراءة اسم الصنف OCR</button><button class="btn light" type="button" id="scanItemBarcodeBtn">كاميرا WebView</button><button class="btn light" type="button" id="snapItemBarcodeBtn">قراءة لقطة</button><button class="btn light" type="button" id="usePendingBarcodeBtn">اعتماد الرقم المقروء</button><button class="btn light" type="button" id="stopItemBarcodeScanBtn">إيقاف</button></div><div class="barcode-scan-line">إذا كان الكود محفوظًا سابقًا سيتم تعبئة اسم الصنف تلقائيًا، وإذا كان جديدًا أدخل الاسم مرة واحدة ثم احفظه.</div></div>
        <div class="hesabi-form-grid">
          <div class="form-section-title">الأسعار والمخزون</div>
          <div class="grid2"><div class="field"><label>سعر الكاش</label><input id="itemCashPrice" type="number" placeholder="0"></div><div class="field"><label>سعر الآجل</label><input id="itemCreditPrice" type="number" placeholder="0"></div></div>
          <div class="grid2"><div class="field"><label>الكمية الحالية</label><input id="itemStock" type="number" value="0"></div><div class="field"><label>حد التنبيه</label><input id="itemMinStock" type="number" value="0"></div></div>
          <button class="btn ok compact-main-btn" id="addItem">حفظ الصنف</button>
        </div>
      </div>
    </section>
    <section class="items-pane ${active==='edit'?'active':''}" id="itemsPaneEdit">${renderEditItemPane(editRows,editMeta,editCategory)}</section>
    <section class="items-pane ${active==='prices'?'active':''}" id="itemsPanePrices">
      <div class="card"><div class="row"><h2>تعديل الأسعار السريع</h2><span class="status approved">بحث سريع</span></div><p class="muted">ابحث عن الصنف بالاسم أو الباركود، عدّل سعر الكاش والآجل، ثم اضغط حفظ السعر. ويمكنك إخفاء أو إظهار الصنف عند العملاء المرتبطين.</p>${demandTableCard('itemsPriceList','أسعار الأصناف',['الصنف','سعر الكاش','سعر الآجل','ظهور العميل','إجراء'],priceRows,priceMeta,'لا توجد أصناف مطابقة',itemsCategoryFilterHtml('itemsPriceList',priceCategory))}</div>
    </section>
    <section class="items-pane ${active==='excel'?'active':''}" id="itemsPaneExcel">
      <div class="card"><div class="row"><h2>استيراد وتصدير Excel</h2><span class="status approved">ملف الأصناف</span></div><p class="muted">استورد ملف Excel أو صدّر الأصناف الحالية. يمكنك حذف الأصناف السابقة قبل استيراد ملف جديد.</p><div class="settings-compact-actions"><button class="btn secondary" id="importItemsExcelBtn">استيراد Excel</button><button class="btn light" id="exportItemsExcelBtn">تصدير Excel</button><button class="btn danger" id="deleteAllItemsBtn">حذف كل الأصناف السابقة</button><a class="btn light" href="./hesabi-items-1000-template.xlsx" target="_blank">تحميل نموذج 1000 صنف</a><input id="itemsExcelImportFile" type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" style="display:none"></div></div>
    </section>`;
  setTimeout(()=>{
    bindItemsTabs(); bindDemandTable('itemsList', renderItems); bindDemandTable('itemsEditList', renderItems); bindDemandTable('itemsPriceList', renderItems); bindItemsCategoryFilter('itemsList', renderItems); bindItemsCategoryFilter('itemsEditList', renderItems); bindItemsCategoryFilter('itemsPriceList', renderItems);
    if($('addItem')) $('addItem').onclick=addItem;
    if($('externalItemBarcodeBtn')) $('externalItemBarcodeBtn').onclick=startExternalItemBarcodeScanner;
    if($('nativeItemBarcodeBtn')) $('nativeItemBarcodeBtn').onclick=startEmbeddedItemBarcodeScanner;
    if($('itemOcrBtn')) $('itemOcrBtn').onclick=startItemOcrNative;
    if($('scanItemBarcodeBtn')) $('scanItemBarcodeBtn').onclick=startItemBarcodeScanner;
    if($('snapItemBarcodeBtn')) $('snapItemBarcodeBtn').onclick=scanItemBarcodeStillFrame;
    if($('usePendingBarcodeBtn')) $('usePendingBarcodeBtn').onclick=usePendingItemBarcodeCandidate;
    if($('stopItemBarcodeScanBtn')) $('stopItemBarcodeScanBtn').onclick=()=>stopItemBarcodeScanner();
    if($('importItemsExcelBtn')) $('importItemsExcelBtn').onclick=openItemsExcelImport;
    if($('exportItemsExcelBtn')) $('exportItemsExcelBtn').onclick=exportItemsToExcel;
    if($('deleteAllItemsBtn')) $('deleteAllItemsBtn').onclick=deleteAllItemsAndStock;
    if($('itemsExcelImportFile')) $('itemsExcelImportFile').onchange=e=>importItemsFromExcelFile(e.target.files&&e.target.files[0]);
    document.querySelectorAll('[data-edit-item]').forEach(b=>b.onclick=()=>selectItemForEdit(b.dataset.editItem));

    document.querySelectorAll('[data-select-item]').forEach(ch=>ch.onchange=()=>{if(ch.checked) selectedItemIdsForDelete.add(ch.dataset.selectItem); else selectedItemIdsForDelete.delete(ch.dataset.selectItem);});
    document.querySelectorAll('[data-delete-item]').forEach(b=>b.onclick=()=>deleteSingleItem(b.dataset.deleteItem));
    document.querySelectorAll('[data-select-visible-items]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-select-item]').forEach(ch=>{ch.checked=true; selectedItemIdsForDelete.add(ch.dataset.selectItem);}); msg('تم تحديد الأصناف المعروضة في هذه الصفحة','success');});
    document.querySelectorAll('[data-clear-selected-items]').forEach(b=>b.onclick=()=>{clearSelectedItems(); renderItems();});
    document.querySelectorAll('[data-delete-selected-items]').forEach(b=>b.onclick=()=>deleteItemsByIds(selectedItemsArray()));
    document.querySelectorAll('[data-save-price-item]').forEach(b=>b.onclick=()=>saveItemPriceQuick(b.dataset.savePriceItem));
    document.querySelectorAll('[data-toggle-customer-visible]').forEach(b=>b.onclick=()=>toggleItemCustomerVisible(b.dataset.toggleCustomerVisible));
    if($('saveEditItemBtn')) $('saveEditItemBtn').onclick=saveSelectedItemEdit;
    if($('cancelEditItemBtn')) $('cancelEditItemBtn').onclick=()=>{state.editItemId='';state.itemsTab='list';save();renderItems();};
    if(typeof bindItemButtons==='function') bindItemButtons();
  });
}

function renderCustomers(){
  if(state.role!=='trader'){show('home');return}
  const cm=demandFilter('customersList', cache.customers||[], c=>`${c.name||''} ${c.phone||''} ${c.customerId||''} ${c.status||''} ${c.balance||''}`);
  const rows=cm.visible.map(c=>{const balance=Number(c.balance||0), limit=Number(c.creditLimit||0), remain=Math.max(limit-balance,0), status=c.status||'active'; return `<tr><td class="name">${esc(c.name)}</td><td>${esc(c.phone||'-')}</td><td><b>${money(balance)}</b></td><td>${money(limit)}</td><td>${money(remain)}</td><td><span class="status ${customerStatusClass(status)}">${customerStatusLabel(status)}</span></td><td>${compactActionButtons(`<button class="btn secondary mini" data-set-limit="${c.customerId}">السقف</button><button class="btn ok mini" data-customer-status="${c.customerId}" data-status-value="active">نشط</button><button class="btn warn mini" data-customer-status="${c.customerId}" data-status-value="cash_only">كاش</button><button class="btn danger mini" data-customer-status="${c.customerId}" data-status-value="blocked">إيقاف</button>`)}</td></tr>`});
  const options=(cache.customers||[]).map(c=>`<option value="${c.customerId}">${esc(c.name)} - دينه ${money(c.balance||0)}</option>`).join('');
  const im=demandFilter('customerSaleItems', (cache.items||[]).filter(i=>i.isActive!==false), i=>`${i.name||''} ${i.barcode||''} ${itemCategory(i)} ${i.price||''}`);
  const itemRows=im.visible.map(i=>`<tr><td class="name">${esc(i.name)}</td><td>${money(effectiveItemPrice(i,$('salePayType')?.value||'credit'))}</td><td>${Number(i.stock||0)}</td><td><input class="qty-mini-input" data-item="${i.id}" data-name="${esc(i.name)}" data-price="${effectiveItemPrice(i,$('salePayType')?.value||'credit')}" data-stock="${Number(i.stock||0)}" type="number" min="0" max="${Number(i.stock||0)}" placeholder="0" ${Number(i.stock||0)>0?'':'disabled'}></td></tr>`);
  $('page_customers').innerHTML=`<div class="card advanced-form-card"><h2>إضافة عميل يدويًا</h2><div class="form compact-form"><div class="grid"><div class="field"><label>اسم العميل</label><input id="newCustomerName" placeholder="اسم العميل"></div><div class="field"><label>رقم الهاتف</label><input id="newCustomerPhone" inputmode="tel" placeholder="777123456"></div><div class="field"><label>سقف الدين</label><input id="newCustomerLimit" type="number" min="0" value="0"></div><div class="field"><label>رصيد افتتاحي</label><input id="newCustomerOpening" type="number" min="0" value="0"></div><div class="field"><label>حالة العميل</label><select id="newCustomerStatus"><option value="active">نشط</option><option value="cash_only">كاش فقط</option><option value="blocked">موقوف</option></select></div><div class="field"><label>ملاحظات</label><input id="newCustomerNote" placeholder="اختياري"></div></div><div class="form-hint">الإضافة اليدوية تفيد عندما تريد فتح حساب عميل قبل أن يربط نفسه بكود التاجر. عند ربطه لاحقًا سيستخدم نفس رقم الهاتف.</div><button class="btn compact-main-btn" id="addManualCustomerBtn">حفظ العميل</button></div></div>${demandTableCard('customersList','العملاء وسقوف الدين',['العميل','الهاتف','الدين','السقف','المتاح','الحالة','إجراء'],rows,cm,'لا يوجد عملاء مطابقون')}<div class="card"><h2>إنشاء طلب بيع للعميل</h2><div class="form compact-form"><div class="grid"><div class="field"><label>العميل</label><select id="saleCustomer">${options}</select></div><div class="field"><label>نوع الدفع</label><select id="salePayType"><option value="credit">آجل</option><option value="cash">كاش</option></select></div><div class="field"><label>تاريخ الاستحقاق</label><input id="saleDueDate" type="date"></div><div class="field"><label>الأولوية</label><select id="salePriority"><option value="normal">عادي</option><option value="urgent">مستعجل</option></select></div></div>${demandTableCard('customerSaleItems','أصناف البيع للعميل',['الصنف','السعر','المتوفر','الكمية'],itemRows,im,'اضغط عرض البيانات أو ابحث عن صنف للبيع')}<div class="field"><label>ملاحظة للعميل</label><textarea id="saleNote"></textarea></div><button class="btn compact-main-btn" id="sendTraderSale" ${cache.customers.length&&cache.items.length?'':'disabled'}>إرسال الطلب للعميل</button></div></div>`;
  setTimeout(()=>{bindDemandTable('customersList', renderCustomers); bindDemandTable('customerSaleItems', renderCustomers); document.querySelectorAll('[data-set-limit]').forEach(b=>b.onclick=()=>setCreditLimit(b.dataset.setLimit));document.querySelectorAll('[data-customer-status]').forEach(b=>b.onclick=()=>setCustomerStatus(b.dataset.customerStatus,b.dataset.statusValue)); if($('addManualCustomerBtn')) $('addManualCustomerBtn').onclick=addManualCustomer; if($('sendTraderSale')) $('sendTraderSale').onclick=sendTraderSale;});
}
function orderActions(o){const canTrader=state.role==='trader'&&(o.status==='pending'||o.status==='pending_trader'); const canCustomer=state.role==='customer'&&o.status==='pending_customer'; const canCustomerEdit=editableCustomerOrder(o); return compactActionButtons(`${canTrader?`<button class="btn ok mini" data-approve-order="${o.id}">موافقة</button><button class="btn danger mini" data-reject-order="${o.id}">رفض</button>`:''}${canCustomer?`<button class="btn ok mini" data-customer-approve="${o.id}">موافقة</button><button class="btn danger mini" data-customer-reject="${o.id}">رفض</button>`:''}${canCustomerEdit?`<button class="btn secondary mini" data-edit-customer-order="${o.id}">تعديل</button><button class="btn danger mini" data-cancel-customer-order="${o.id}">إلغاء</button>`:''}`)}
function renderOrders(){
  const meta=demandFilter('ordersList', cache.orders||[], o=>`${o.customerName||''} ${o.note||''} ${o.traderNote||''} ${o.status||''} ${o.paymentType||''} ${o.total||''} ${demandText(o.items||[])}`);
  const rows=meta.visible.map(o=>`<tr class="detail-row"><td class="name">${esc(o.customerName||'عميل')}<div class="subcell">${esc(o.note||o.traderNote||'')}</div></td><td>${payTypeText(o.paymentType)}</td><td><b>${money(o.total)}</b></td><td><span class="status ${o.status}">${statusText(o.status)}</span></td><td>${dt(o.createdMs)}</td><td>${orderActions(o)} ${compactActionButtons('<button class="btn secondary mini" data-toggle-row="1">تفاصيل</button>')}</td></tr><tr class="lines-row"><td colspan="6"><div class="demand-details">${compactLineRows(o.items||[])}</div></td></tr>`);
  $('page_orders').innerHTML=demandTableCard('ordersList',state.role==='trader'?'طلبات البيع والشراء':'طلباتي',['العميل','الدفع','الإجمالي','الحالة','التاريخ','إجراء'],rows,meta,'لا توجد طلبات مطابقة');
  setTimeout(()=>{bindDemandTable('ordersList', renderOrders); document.querySelectorAll('[data-approve-order]').forEach(b=>b.onclick=()=>approveOrder(b.dataset.approveOrder));document.querySelectorAll('[data-reject-order]').forEach(b=>b.onclick=()=>rejectOrder(b.dataset.rejectOrder));document.querySelectorAll('[data-customer-approve]').forEach(b=>b.onclick=()=>customerApproveOrder(b.dataset.customerApprove));document.querySelectorAll('[data-customer-reject]').forEach(b=>b.onclick=()=>customerRejectOrder(b.dataset.customerReject));document.querySelectorAll('[data-edit-customer-order]').forEach(b=>b.onclick=()=>loadOrderForEdit(b.dataset.editCustomerOrder));document.querySelectorAll('[data-cancel-customer-order]').forEach(b=>b.onclick=()=>cancelCustomerOrder(b.dataset.cancelCustomerOrder));});
}
function renderInvoices(){
  const helpers=window.hesabiInvoicesHelpers;
  if(helpers && typeof helpers.renderPage==='function'){
    try{
      const selectedCustomer=state.invFilterCustomer||'', selectedPay=state.invFilterPay||'';
      const result=helpers.renderPage({
        invoices:cache.invoices||[],
        customers:cache.customers||[],
        payments:cache.payments||[],
        role:state.role,
        state,
        selectedCustomer,
        selectedPay,
        customerId:state.customerId||'',
        shopName:cache.shop?.name||state.shopName||'',
        cache
      });
      $('page_invoices').innerHTML=result.html;
      setTimeout(()=>helpers.bindActions({
        state,
        save,
        renderInvoices,
        bindDemandTable,
        shareInvoiceText,
        invoices:cache.invoices||[],
        payments:cache.payments||[],
        shopName:cache.shop?.name||state.shopName||'',
        exportInvoicesCsv
      }));
      return;
    }catch(error){
      console.error('renderInvoices helpers failed', error);
      try{ msg('تم فتح الفواتير بالوضع الآمن بسبب خطأ في عرض الفواتير.','notice'); }catch(_){}
    }
  }
  const selectedCustomer=state.invFilterCustomer||'', selectedPay=state.invFilterPay||'';
  let data=[...(cache.invoices||[])]; if(state.role==='trader'&&selectedCustomer) data=data.filter(i=>i.customerId===selectedCustomer); if(selectedPay) data=data.filter(i=>(i.paymentType||'cash')===selectedPay);
  const meta=demandFilter('invoicesList', data, inv=>`${inv.invoiceNo||''} ${inv.id||''} ${inv.customerName||''} ${inv.paymentType||''} ${inv.total||''} ${demandText(inv.items||inv.lines||[])}`);
  const customerOptions=state.role==='trader'?cache.customers.map(c=>`<option value="${esc(c.customerId)}" ${selectedCustomer===c.customerId?'selected':''}>${esc(c.name)} - ${esc(c.phone||'')}</option>`).join(''):'';
  const rows=meta.visible.map(inv=>`<tr><td class="name">${esc(inv.invoiceNo||inv.id)}</td><td>${esc(inv.customerName||'')}</td><td>${payTypeText(inv.paymentType)}</td><td><b>${money(inv.total)}</b></td><td>${dt(inv.createdMs)}</td><td>${compactActionButtons(`<button class="btn light mini" data-print-invoice="${inv.id}">مشاركة</button><button class="btn secondary mini" data-toggle-row="1">تفاصيل</button>`)}</td></tr><tr class="lines-row"><td colspan="6"><div class="demand-details">${compactLineRows(inv.items||inv.lines||[])}</div></td></tr>`);
  $('page_invoices').innerHTML=`<div class="card"><div class="grid compact-filters">${state.role==='trader'?`<div class="field"><label>العميل</label><select id="invFilterCustomer"><option value="">كل العملاء</option>${customerOptions}</select></div>`:''}<div class="field"><label>نوع الدفع</label><select id="invFilterPay"><option value="" ${!selectedPay?'selected':''}>الكل</option><option value="cash" ${selectedPay==='cash'?'selected':''}>كاش</option><option value="credit" ${selectedPay==='credit'?'selected':''}>آجل</option></select></div></div><div class="actions"><button class="btn light mini" id="clearInvoiceFilters">مسح الفلاتر</button></div></div>${demandTableCard('invoicesList','الفواتير',['الفاتورة','العميل','الدفع','الإجمالي','التاريخ','إجراء'],rows,meta,'لا توجد فواتير مطابقة')}`;
  setTimeout(()=>{bindDemandTable('invoicesList', renderInvoices); if($('invFilterCustomer')) $('invFilterCustomer').onchange=e=>{state.invFilterCustomer=e.target.value;save();renderInvoices()}; if($('invFilterPay')) $('invFilterPay').onchange=e=>{state.invFilterPay=e.target.value;save();renderInvoices()}; if($('clearInvoiceFilters')) $('clearInvoiceFilters').onclick=()=>{state.invFilterCustomer='';state.invFilterPay='';save();renderInvoices()}; document.querySelectorAll('[data-print-invoice]').forEach(b=>b.onclick=()=>shareInvoiceText(b.dataset.printInvoice));});
}
function renderPayments(){
  const debt=state.role==='customer'?customerDebtInfo().balance:0;
  const payBox=state.role==='customer'?`<div class="card"><h2>إرسال طلب سداد</h2><div class="grid"><div class="metric"><span class="muted">الدين الحالي</span><b>${money(debt)}</b></div></div><div class="form compact-form"><div class="grid"><div class="field"><label>المبلغ</label><input id="payAmount" type="number" min="1"></div><div class="field"><label>طريقة السداد</label><input id="payMethod" placeholder="كاش / حوالة / كريمي / بنك"></div><div class="field"><label>رقم المرجع</label><input id="payRef"></div><div class="field"><label>صورة الإيصال</label><input id="payReceipt" type="file" accept="image/*"></div></div><div class="field"><label>ملاحظة</label><textarea id="payNote"></textarea></div><button class="btn compact-main-btn" id="sendPayment" ${debt>0?'':'disabled'}>إرسال السداد</button></div></div>`:'';
  const meta=demandFilter('paymentsList', cache.payments||[], p=>`${p.customerName||state.customerName||''} ${p.amount||''} ${p.method||''} ${p.referenceNo||''} ${p.status||''}`);
  const rows=meta.visible.map(p=>`<tr><td class="name">${esc(p.customerName||state.customerName||'')}</td><td><b>${money(p.amount)}</b></td><td>${esc(p.method||'-')}</td><td>${esc(p.referenceNo||'-')}</td><td><span class="status ${p.status}">${statusText(p.status)}</span></td><td>${dt(p.createdMs)}</td><td>${compactActionButtons(`${p.receiptData?`<button class="btn secondary mini" data-open-receipt="${p.id}">إيصال</button>`:''}${state.role==='trader'&&p.status==='pending'?`<button class="btn ok mini" data-approve-pay="${p.id}">قبول</button><button class="btn danger mini" data-reject-pay="${p.id}">رفض</button>`:''}`)}</td></tr>`);
  $('page_payments').innerHTML=`${payBox}${demandTableCard('paymentsList',state.role==='trader'?'طلبات السداد':'سداداتي',['العميل','المبلغ','الطريقة','المرجع','الحالة','التاريخ','إجراء'],rows,meta,'لا توجد طلبات سداد مطابقة')}`;
  setTimeout(()=>{bindDemandTable('paymentsList', renderPayments); if($('sendPayment')) $('sendPayment').onclick=sendPayment; document.querySelectorAll('[data-approve-pay]').forEach(b=>b.onclick=()=>approvePayment(b.dataset.approvePay));document.querySelectorAll('[data-reject-pay]').forEach(b=>b.onclick=()=>rejectPayment(b.dataset.rejectPay));document.querySelectorAll('[data-open-receipt]').forEach(b=>b.onclick=()=>openReceipt(b.dataset.openReceipt));});
}
function renderStatement(){
  const total=(cache.customerLedger||[]).reduce((a,l)=>a+Number(l.amount||0),0);
  const meta=demandFilter('statementList', cache.customerLedger||[], l=>`${l.customerName||state.customerName||''} ${ledgerTypeText(l.type)} ${l.amount||''} ${l.note||''}`);
  const rows=meta.visible.map(l=>`<tr><td>${dt(l.createdMs)}</td><td class="name">${esc(l.customerName||state.customerName||'')}</td><td>${ledgerTypeText(l.type)}</td><td><b>${money(l.amount)}</b></td><td>${esc(l.note||'')}</td></tr>`);
  $('page_statement').innerHTML=`<div class="card"><div class="row"><h2>إجمالي كشف الحساب</h2><span class="status approved">${money(total)}</span></div></div>${demandTableCard('statementList','كشف الحساب',['التاريخ','العميل','نوع الحركة','المبلغ','البيان'],rows,meta,'لا توجد حركات مطابقة')}`;
  setTimeout(()=>bindDemandTable('statementList', renderStatement));
}
function renderAudit(){
  if(state.role!=='trader'){show('home');return}
  const meta=demandFilter('auditList', cache.auditLogs||[], a=>`${a.action||''} ${a.actorRole||''} ${a.actorName||''} ${demandText(a.details||{})}`);
  const rows=meta.visible.map(a=>`<tr><td>${dt(a.createdMs)}</td><td class="name">${esc(a.action)}</td><td>${esc(a.actorRole||'')}</td><td>${esc(a.actorName||'')}</td><td class="subcell">${esc(JSON.stringify(a.details||{})).slice(0,150)}</td></tr>`);
  $('page_audit').innerHTML=demandTableCard('auditList','سجل العمليات',['التاريخ','العملية','الدور','المستخدم','التفاصيل'],rows,meta,'لا توجد عمليات مطابقة');
  setTimeout(()=>bindDemandTable('auditList', renderAudit));
}
function renderStock(){
  if(state.role!=='trader'){show('home');return}
  const im=demandFilter('stockItemsList', cache.items||[], i=>`${i.name||''} ${i.unit||''} ${i.stock||''} ${i.minStock||''} ${i.barcode||''}`);
  const itemRows=im.visible.map(i=>`<tr><td class="name">${esc(i.name)}</td><td>${esc(i.unit||'-')}</td><td>${Number(i.stock||0)}</td><td>${Number(i.minStock||0)}</td><td><span class="status ${Number(i.stock||0)<=0?'rejected':(Number(i.minStock||0)>0&&Number(i.stock||0)<=Number(i.minStock||0)?'pending':'approved')}">${Number(i.stock||0)<=0?'نافد':(Number(i.minStock||0)>0&&Number(i.stock||0)<=Number(i.minStock||0)?'منخفض':'جيد')}</span></td></tr>`);
  const lm=demandFilter('stockLedgerList', cache.stockLedger||[], s=>`${s.itemName||''} ${s.qty||''} ${s.type||''} ${s.note||s.sourceType||''}`);
  const ledgerRows=lm.visible.map(s=>`<tr><td>${dt(s.createdMs)}</td><td class="name">${esc(s.itemName||'')}</td><td>${Number(s.qty||0)}</td><td>${esc(s.type||'')}</td><td>${esc(s.note||s.sourceType||'')}</td></tr>`);
  $('page_stock').innerHTML=`${demandTableCard('stockItemsList','المخزون',['الصنف','الوحدة','الكمية','حد التنبيه','الحالة'],itemRows,im,'لا توجد أصناف مطابقة')}${demandTableCard('stockLedgerList','حركات المخزون',['التاريخ','الصنف','الكمية','النوع','البيان'],ledgerRows,lm,'لا توجد حركات مطابقة')}`;
  setTimeout(()=>{bindDemandTable('stockItemsList', renderStock); bindDemandTable('stockLedgerList', renderStock);});
}
function renderReturns(){
  const meta=demandFilter('returnsList', cache.returns||[], r=>`${r.customerName||state.customerName||''} ${r.itemName||''} ${r.qty||''} ${r.total||r.amount||''} ${r.status||''}`);
  const rows=meta.visible.map(r=>`<tr><td class="name">${esc(r.customerName||state.customerName||'')}</td><td>${esc(r.itemName||'')}</td><td>${Number(r.qty||0)}</td><td><b>${money(r.total||r.amount||0)}</b></td><td><span class="status ${r.status}">${statusText(r.status)}</span></td><td>${compactActionButtons(`${state.role==='trader'&&r.status==='pending'?`<button class="btn ok mini" data-approve-return="${r.id}">قبول</button><button class="btn danger mini" data-reject-return="${r.id}">رفض</button>`:''}`)}</td></tr>`);
  $('page_returns').innerHTML=demandTableCard('returnsList','المرتجعات',['العميل','الصنف','الكمية','المبلغ','الحالة','إجراء'],rows,meta,'لا توجد مرتجعات مطابقة');
  setTimeout(()=>{bindDemandTable('returnsList', renderReturns); document.querySelectorAll('[data-approve-return]').forEach(b=>b.onclick=()=>approveReturn(b.dataset.approveReturn));document.querySelectorAll('[data-reject-return]').forEach(b=>b.onclick=()=>rejectReturn(b.dataset.rejectReturn));});
}
function renderCollections(){
  if(state.role!=='trader'){show('home');return}
  const selectedDate=state.collectionDate||todayIso(), selectedStatus=state.collectionStatus||'all', selectedMethod=state.collectionMethod||'all';
  const methods=[...new Set((cache.payments||[]).map(p=>p.method||'غير محدد'))];
  let data=(cache.payments||[]).filter(p=>paymentDate(p)===selectedDate); if(selectedStatus!=='all') data=data.filter(p=>p.status===selectedStatus); if(selectedMethod!=='all') data=data.filter(p=>(p.method||'غير محدد')===selectedMethod);
  const approved=data.filter(p=>p.status==='approved').reduce((a,p)=>a+Number(p.amount||0),0), pending=data.filter(p=>p.status==='pending').reduce((a,p)=>a+Number(p.amount||0),0), rejected=data.filter(p=>p.status==='rejected').reduce((a,p)=>a+Number(p.amount||0),0);
  const meta=demandFilter('collectionsList', data, p=>`${p.customerName||''} ${p.amount||''} ${p.method||''} ${p.referenceNo||''} ${p.status||''}`);
  const rows=meta.visible.map(p=>`<tr><td class="name">${esc(p.customerName||'')}</td><td><b>${money(p.amount)}</b></td><td>${esc(p.method||'')}</td><td>${esc(p.referenceNo||'-')}</td><td><span class="status ${p.status}">${statusText(p.status)}</span></td><td>${compactActionButtons(`${p.receiptData?`<button class="btn secondary mini" data-open-receipt="${p.id}">إيصال</button>`:''}`)}</td></tr>`);
  $('page_collections').innerHTML=`<div class="card"><h2>التحصيل اليومي</h2><div class="grid compact-filters"><div class="field"><label>التاريخ</label><input id="collectionDate" type="date" value="${esc(selectedDate)}"></div><div class="field"><label>الحالة</label><select id="collectionStatus"><option value="all">الكل</option><option value="approved">مقبول</option><option value="pending">معلق</option><option value="rejected">مرفوض</option></select></div><div class="field"><label>طريقة الدفع</label><select id="collectionMethod"><option value="all">كل الطرق</option>${methods.map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join('')}</select></div></div><div class="grid"><div class="metric"><span class="muted">مقبول</span><b>${money(approved)}</b></div><div class="metric"><span class="muted">معلق</span><b>${money(pending)}</b></div><div class="metric"><span class="muted">مرفوض</span><b>${money(rejected)}</b></div><div class="metric"><span class="muted">عدد</span><b>${data.length}</b></div></div><div class="actions"><button class="btn secondary mini" id="shareCollection">مشاركة التقرير</button></div></div>${demandTableCard('collectionsList','قائمة التحصيلات',['العميل','المبلغ','الطريقة','المرجع','الحالة','إجراء'],rows,meta,'لا توجد سدادات مطابقة')}`;
  setTimeout(()=>{bindDemandTable('collectionsList', renderCollections); $('collectionStatus').value=selectedStatus; $('collectionMethod').value=selectedMethod; $('collectionDate').onchange=e=>{state.collectionDate=e.target.value;save();renderCollections()}; $('collectionStatus').onchange=e=>{state.collectionStatus=e.target.value;save();renderCollections()}; $('collectionMethod').onchange=e=>{state.collectionMethod=e.target.value;save();renderCollections()}; $('shareCollection').onclick=shareCollectionReport; document.querySelectorAll('[data-open-receipt]').forEach(b=>b.onclick=()=>openReceipt(b.dataset.openReceipt));});
}
function renderSchedules(){
  const data=(cache.schedules||[]).slice().sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||''))); const pending=data.filter(s=>s.status==='pending'), overdue=pending.filter(s=>String(s.dueDate||'')<new Date().toISOString().slice(0,10));
  const customerOptions=(cache.customers||[]).map(c=>`<option value="${esc(c.customerId)}">${esc(c.name)} - دينه: ${money(c.balance)}</option>`).join(''); const invoiceOptions=(cache.invoices||[]).filter(i=>i.paymentType==='credit').map(i=>`<option value="${esc(i.id)}">${esc(i.invoiceNo||i.id)} - ${esc(i.customerName||'')} - ${money(i.total)}</option>`).join('');
  const createBox=state.role==='trader'?`<div class="card"><h2>جدولة سداد / أقساط</h2><div class="form compact-form"><div class="grid"><div class="field"><label>العميل</label><select id="schedCustomer"><option value="">اختر العميل</option>${customerOptions}</select></div><div class="field"><label>فاتورة آجلة</label><select id="schedInvoice"><option value="">بدون</option>${invoiceOptions}</select></div><div class="field"><label>إجمالي المبلغ</label><input id="schedTotal" type="number" min="1"></div><div class="field"><label>عدد الدفعات</label><input id="schedCount" type="number" min="1" value="1"></div><div class="field"><label>تاريخ أول استحقاق</label><input id="schedStart" type="date"></div><div class="field"><label>الفاصل بالأيام</label><input id="schedInterval" type="number" min="1" value="7"></div></div><div class="field"><label>ملاحظة</label><textarea id="schedNote"></textarea></div><button class="btn compact-main-btn" id="createSchedule">إنشاء الجدولة</button></div></div>`:'';
  const meta=demandFilter('schedulesList', data, s=>`${s.customerName||state.customerName||''} ${s.amount||''} ${s.dueDate||''} ${s.status||''} ${s.installmentNo||''}`);
  const rows=meta.visible.map(s=>{const st=scheduleStatus(s); return `<tr><td class="name">${esc(s.customerName||state.customerName||'')}</td><td><b>${money(s.amount)}</b></td><td>${esc(s.dueDate||'-')}</td><td>${Number(s.installmentNo||1)} / ${Number(s.installmentCount||1)}</td><td><span class="status ${st.cls}">${st.text}</span></td><td>${compactActionButtons(`${state.role==='customer'&&s.status==='pending'?`<button class="btn ok mini" data-pay-schedule="${s.id}">سداد</button>`:''}${state.role==='trader'&&s.status==='pending'?`<button class="btn danger mini" data-cancel-schedule="${s.id}">إلغاء</button>`:''}`)}</td></tr>`});
  $('page_schedules').innerHTML=`${createBox}<div class="card"><div class="row"><h2>${state.role==='trader'?'ملخص الاستحقاقات':'ملخص استحقاقاتي'}</h2><span class="status ${overdue.length?'rejected':'approved'}">${overdue.length} متأخر</span></div></div>${demandTableCard('schedulesList',state.role==='trader'?'استحقاقات العملاء':'استحقاقاتي',['العميل','المبلغ','الاستحقاق','الدفعة','الحالة','إجراء'],rows,meta,'لا توجد استحقاقات مطابقة')}`;
  setTimeout(()=>{bindDemandTable('schedulesList', renderSchedules); if($('createSchedule')) $('createSchedule').onclick=createSchedule; document.querySelectorAll('[data-pay-schedule]').forEach(b=>b.onclick=()=>paySchedule(b.dataset.paySchedule)); document.querySelectorAll('[data-cancel-schedule]').forEach(b=>b.onclick=()=>cancelSchedule(b.dataset.cancelSchedule)); if($('schedInvoice')) $('schedInvoice').onchange=fillScheduleFromInvoice; });
}


/* ===== Hesabi 1.0.23 staged workspaces for all busy pages ===== */
function pageTabState(key, fallback){
  const v=state[key+'Tab']||fallback;
  return String(v||fallback);
}
function setPageTab(key, tab, rerender){
  state[key+'Tab']=tab; save(); if(typeof rerender==='function') rerender();
}
function pageTabsBar(key, active, tabs){
  const sideClass = tabs.length > 4 ? ' side-tabs' : '';
  return `<div class="page-tabs-card${sideClass}"><div class="page-tabs-bar">${tabs.map(t=>`<button class="page-tab-btn ${active===t[0]?'active':''}" data-page-tab-key="${esc(key)}" data-page-tab-value="${esc(t[0])}"><span class="ico">${t[1]}</span><span class="txt">${esc(t[2])}</span></button>`).join('')}</div></div>`;
}
function bindPageTabs(key, rerender){
  document.querySelectorAll(`[data-page-tab-key="${key}"]`).forEach(b=>b.onclick=()=>setPageTab(key,b.dataset.pageTabValue,rerender));
}
function pageHead(title, help){
  return `<div class="card page-workspace-head"><h2>${esc(title)}</h2>${help?`<div class="page-help">${esc(help)}</div>`:''}<div class="phase-note">نظام موحد: أيقونات أعلى الصفحة، جدول مختصر عند الطلب، بحث وفلاتر، والتفاصيل تظهر عند الحاجة فقط.</div></div>`;
}
function pageStats(items){
  return `<div class="card"><div class="mini-stat-grid">${items.map(x=>`<div class="mini-stat"><span>${esc(x[0])}</span><b>${esc(String(x[1]))}</b></div>`).join('')}</div></div>`;
}
function statusFilter(data, tab){
  if(!tab||tab==='all'||tab==='list'||tab==='summary') return data;
  if(tab==='pending') return data.filter(x=>String(x.status||'pending').includes('pending'));
  if(tab==='approved') return data.filter(x=>x.status==='approved');
  if(tab==='rejected') return data.filter(x=>x.status==='rejected'||x.status==='cancelled');
  if(tab==='done') return data.filter(x=>x.status==='approved'||x.status==='rejected'||x.status==='cancelled'||x.status==='paid');
  return data;
}
function bindOrderRows(){
  document.querySelectorAll('[data-approve-order]').forEach(b=>b.onclick=()=>approveOrder(b.dataset.approveOrder));
  document.querySelectorAll('[data-reject-order]').forEach(b=>b.onclick=()=>rejectOrder(b.dataset.rejectOrder));
  document.querySelectorAll('[data-customer-approve]').forEach(b=>b.onclick=()=>customerApproveOrder(b.dataset.customerApprove));
  document.querySelectorAll('[data-customer-reject]').forEach(b=>b.onclick=()=>customerRejectOrder(b.dataset.customerReject));
  document.querySelectorAll('[data-edit-customer-order]').forEach(b=>b.onclick=()=>loadOrderForEdit(b.dataset.editCustomerOrder));
  document.querySelectorAll('[data-cancel-customer-order]').forEach(b=>b.onclick=()=>cancelCustomerOrder(b.dataset.cancelCustomerOrder));
}
function bindPaymentRows(){
  document.querySelectorAll('[data-approve-pay]').forEach(b=>b.onclick=()=>approvePayment(b.dataset.approvePay));
  document.querySelectorAll('[data-reject-pay]').forEach(b=>b.onclick=()=>rejectPayment(b.dataset.rejectPay));
  document.querySelectorAll('[data-open-receipt]').forEach(b=>b.onclick=()=>openReceipt(b.dataset.openReceipt));
}

renderCustomers=function(){
  if(state.role!=='trader'){show('home');return}
  const tab=pageTabState('customers','list');
  const tabs=[['list','👥','العملاء'],['add','➕','إضافة'],['sale','🧾','بيع للعميل'],['limits','💳','السقوف'],['blocked','⛔','الموقوفين']];
  const list=(cache.customers||[]).filter(c=>tab==='blocked'?(c.status==='blocked'):(tab==='limits'?true:true));
  const cm=demandFilter('customersList23', list, c=>`${c.name||''} ${c.phone||''} ${c.customerId||''} ${c.status||''} ${c.balance||''}`);
  const rows=cm.visible.map(c=>{const balance=Number(c.balance||0), limit=Number(c.creditLimit||0), remain=Math.max(limit-balance,0), status=c.status||'active'; return `<tr><td class="name">${esc(c.name)}</td><td>${esc(c.phone||'-')}</td><td><b>${money(balance)}</b></td><td>${money(limit)}</td><td>${money(remain)}</td><td><span class="status ${customerStatusClass(status)}">${customerStatusLabel(status)}</span></td><td>${compactActionButtons(`<button class="btn secondary mini" data-set-limit="${c.customerId}">السقف</button><button class="btn ok mini" data-customer-status="${c.customerId}" data-status-value="active">نشط</button><button class="btn warn mini" data-customer-status="${c.customerId}" data-status-value="cash_only">كاش</button><button class="btn danger mini" data-customer-status="${c.customerId}" data-status-value="blocked">إيقاف</button>`)}</td></tr>`});
  const addBox=`<div class="card advanced-form-card"><h2>إضافة عميل يدويًا</h2><div class="form compact-form"><div class="grid"><div class="field"><label>اسم العميل</label><input id="newCustomerName" placeholder="اسم العميل"></div><div class="field"><label>رقم الهاتف</label><input id="newCustomerPhone" inputmode="tel" placeholder="777123456"></div><div class="field"><label>سقف الدين</label><input id="newCustomerLimit" type="number" min="0" value="0"></div><div class="field"><label>رصيد افتتاحي</label><input id="newCustomerOpening" type="number" min="0" value="0"></div><div class="field"><label>حالة العميل</label><select id="newCustomerStatus"><option value="active">نشط</option><option value="cash_only">كاش فقط</option><option value="blocked">موقوف</option></select></div><div class="field"><label>ملاحظات</label><input id="newCustomerNote" placeholder="اختياري"></div></div><button class="btn compact-main-btn" id="addManualCustomerBtn">حفظ العميل</button></div></div>`;
  const options=(cache.customers||[]).map(c=>`<option value="${esc(c.customerId)}">${esc(c.name)} - دينه ${money(c.balance||0)}</option>`).join('');
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
  const invoicesHelper=window.hesabiInvoicesHelpers;
  if(invoicesHelper && typeof invoicesHelper.renderPage==='function'){
    try{
      const tab=pageTabState('invoices','all');
      const selectedCustomer=state.invFilterCustomer||'';
      const selectedPay=(tab==='cash'||tab==='credit')?tab:(state.invFilterPay||'');
      const rendered=invoicesHelper.renderPage({
        invoices:cache.invoices||[],
        customers:cache.customers||[],
        payments:cache.payments||[],
        role:state.role,
        state,
        selectedCustomer,
        selectedPay,
        customerId:state.customerId||'',
        shopName:cache.shop?.name||state.shopName||'',
        cache
      });
      const tabs=[['all','🧾','كل الفواتير'],['cash','💵','كاش'],['credit','📒','آجل'],['export','📤','تصدير']];
      const exportBox=tab==='export'?`<div class="card"><h2>تصدير الفواتير</h2><div class="settings-compact-actions"><button class="btn secondary mini" id="exportInvoicesCsv">تصدير الفواتير CSV</button></div></div>`:'';
      $('page_invoices').innerHTML=pageHead('الفواتير','الفواتير مقسمة إلى كاش وآجل مع بحث وفلاتر وتصدير.')+pageTabsBar('invoices',tab,tabs)+rendered.html+exportBox;
      setTimeout(()=>{
        bindPageTabs('invoices',renderInvoices);
        invoicesHelper.bindActions({
          state,save,renderInvoices,bindDemandTable,shareInvoiceText,
          invoices:cache.invoices||[],
          payments:cache.payments||[],
          shopName:cache.shop?.name||state.shopName||'',
          exportInvoicesCsv
        });
        if($('exportInvoicesCsv')) $('exportInvoicesCsv').onclick=()=>{
          const h=window.hesabiInvoicesHelpers;
          if(h && typeof h.exportInvoicesCsv==='function') h.exportInvoicesCsv(cache.invoices||[],{role:state.role,state,selectedCustomer:state.invFilterCustomer||'',selectedPay:(tab==='cash'||tab==='credit')?tab:(state.invFilterPay||''),shopName:cache.shop?.name||state.shopName||'',payments:cache.payments||[]});
          else exportInvoicesCsv();
        };
      });
      return;
    }catch(e){
      console.warn('invoices helper render failed, fallback to legacy renderer',e);
    }
  }
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
  const paymentsHelper=window.hesabiPaymentsHelpers;
  if(paymentsHelper && typeof paymentsHelper.renderPage==='function'){
    try{
      const tab=pageTabState('payments',state.role==='customer'?'request':'pending');
      const debt=state.role==='customer'?customerDebtInfo().balance:0;
      const rendered=paymentsHelper.renderPage({payments:cache.payments||[],role:state.role,state,tab,debt});
      $('page_payments').innerHTML=rendered.html;
      setTimeout(()=>paymentsHelper.bindActions({
        tab,
        renderPayments,
        sendPayment,
        approvePayment,
        rejectPayment,
        openReceipt,
        bindPageTabs,
        bindDemandTable
      }));
      return;
    }catch(e){
      console.warn('payments helper render failed, fallback to legacy renderer',e);
    }
  }
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
  const returnsHelper=window.hesabiReturnsHelpers;
  if(returnsHelper && typeof returnsHelper.renderPage==='function'){
    try{
      const tab=pageTabState('returns',state.role==='customer'?'request':'pending');
      const rendered=returnsHelper.renderPage({
        returns:cache.returns||[],
        role:state.role,
        state,
        tab,
        customerId:state.customerId||''
      });
      $('page_returns').innerHTML=rendered.html;
      setTimeout(()=>returnsHelper.bindActions({
        renderReturns,
        sendReturnRequest,
        approveReturn,
        rejectReturn,
        phase6BindReturnForm,
        bindPageTabs,
        bindDemandTable
      }));
      return;
    }catch(e){
      console.warn('returns helper render failed, fallback to legacy renderer', e);
    }
  }
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
  const schedulesHelper=window.hesabiSchedulesHelpers;
  if(schedulesHelper && typeof schedulesHelper.renderPage==='function'){
    try{
      const tab=pageTabState('schedules',state.role==='trader'?'due':'list');
      const rendered=schedulesHelper.renderPage({schedules:cache.schedules||[],customers:cache.customers||[],invoices:cache.invoices||[],role:state.role,state,tab});
      $('page_schedules').innerHTML=rendered.html;
      setTimeout(()=>schedulesHelper.bindActions({renderSchedules,bindPageTabs,bindDemandTable,createSchedule,paySchedule,cancelSchedule,fillScheduleFromInvoice}));
      return;
    }catch(e){
      console.warn('schedules helper render failed, fallback to legacy renderer',e);
    }
  }
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
  const statementsHelper=window.hesabiStatementsHelpers;
  if(statementsHelper && typeof statementsHelper.renderPage==='function'){
    try{
      const tab=pageTabState('statement','ledger');
      const rendered=statementsHelper.renderPage({
        ledger:cache.customerLedger||[],
        customers:cache.customers||[],
        role:state.role,
        state,
        tab,
        selectedCustomer:state.statementCustomer||'',
        customerId:state.customerId||'',
        shopName:cache.shop?.name||state.shopName||'',
        cache
      });
      $('page_statement').innerHTML=rendered.html;
      setTimeout(()=>statementsHelper.bindActions({
        state,
        save,
        renderStatement,
        bindPageTabs,
        bindDemandTable,
        shareStatementText,
        ledger:cache.customerLedger||[],
        customers:cache.customers||[],
        shopName:cache.shop?.name||state.shopName||'',
        role:state.role
      }));
      return;
    }catch(e){
      console.warn('statements helper render failed, fallback to legacy renderer',e);
    }
  }
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
  if(state.role!=='trader'){show('home');return}
  const reportsHelper=window.hesabiReportsHelpers||{};
  const tab=typeof reportsHelper.safeReportTab==='function'?reportsHelper.safeReportTab(pageTabState('reports','summary')):pageTabState('reports','summary');
  const tabs=[['summary','📊','ملخص'],['sales','🧾','المبيعات'],['debts','💳','الديون'],['stock','📦','المخزون'],['export','📤','تصدير']];
  const snapshot=typeof reportsHelper.reportsSnapshot==='function'?reportsHelper.reportsSnapshot(cache):null;
  const invoices=snapshot?snapshot.invoices:(cache.invoices||[]), payments=snapshot?snapshot.payments:(cache.payments||[]), customers=snapshot?snapshot.customers:(cache.customers||[]), items=snapshot?snapshot.items:(cache.items||[]);
  const totals=snapshot?snapshot.totals:{salesTotal:invoices.reduce((a,i)=>a+Number(i.total||0),0),approvedPaymentsTotal:payments.filter(p=>p.status==='approved').reduce((a,p)=>a+Number(p.amount||0),0),debtsTotal:customers.reduce((a,c)=>a+Number(c.balance||0),0),lowStockCount:0};
  const low=snapshot?snapshot.lowStockItems:items.filter(i=>Number(i.stock||0)<=Number(i.minStock||0)&&Number(i.minStock||0)>0);
  const searchText=(type,row)=>typeof reportsHelper.searchText==='function'?reportsHelper.searchText(type,row):`${JSON.stringify(row||{})}`;
  let content='';
  if(tab==='sales'){
    const meta=demandFilter('reportSales23', invoices, i=>searchText('sales',i)); const rows=meta.visible.map(i=>`<tr><td class="name">${esc(i.invoiceNo||i.id)}</td><td>${esc(i.customerName||'')}</td><td>${payTypeText(i.paymentType)}</td><td><b>${money(i.total)}</b></td><td>${dt(i.createdMs)}</td></tr>`); content=demandTableCard('reportSales23','تقرير المبيعات',['الفاتورة','العميل','الدفع','الإجمالي','التاريخ'],rows,meta,'لا توجد فواتير'); setTimeout(()=>bindDemandTable('reportSales23',renderReports));
  }else if(tab==='debts'){
    const meta=demandFilter('reportDebts23', customers, c=>searchText('debts',c)); const rows=meta.visible.map(c=>`<tr><td class="name">${esc(c.name)}</td><td>${esc(c.phone||'-')}</td><td><b>${money(c.balance||0)}</b></td><td>${money(c.creditLimit||0)}</td><td><span class="status ${customerStatusClass(c.status||'active')}">${customerStatusLabel(c.status||'active')}</span></td></tr>`); content=demandTableCard('reportDebts23','ديون العملاء',['العميل','الهاتف','الدين','السقف','الحالة'],rows,meta,'لا يوجد عملاء'); setTimeout(()=>bindDemandTable('reportDebts23',renderReports));
  }else if(tab==='stock'){
    const meta=demandFilter('reportStock23', low, i=>searchText('stock',i)); const rows=meta.visible.map(i=>`<tr><td class="name">${esc(i.name)}</td><td>${Number(i.stock||0)}</td><td>${Number(i.minStock||0)}</td><td>${esc(itemCategory(i))}</td></tr>`); content=demandTableCard('reportStock23','الأصناف منخفضة المخزون',['الصنف','المخزون','الحد','التصنيف'],rows,meta,'لا توجد أصناف منخفضة'); setTimeout(()=>bindDemandTable('reportStock23',renderReports));
  }else if(tab==='export'){
    content=`<div class="card"><h2>تصدير التقارير</h2><div class="settings-compact-actions"><button class="btn secondary" id="shareBusinessReport">مشاركة التقرير</button><button class="btn light" id="exportInvoicesCsv">تصدير الفواتير CSV</button><button class="btn light" id="exportPaymentsCsv">تصدير السداد CSV</button>${state.role==='trader'?'<button class="btn light" id="exportCustomersCsv">تصدير العملاء CSV</button>':''}</div></div>`;
  }else{ content='<div class="safe-placeholder">اختر تبويب المبيعات أو الديون أو المخزون لرؤية الجداول التفصيلية. لا يتم تحميل الجداول حتى تطلبها.</div>'; }
  $('page_reports').innerHTML=pageHead('التقارير','التقارير أصبحت مقسمة إلى ملخصات وجداول وتصدير.')+pageTabsBar('reports',tab,tabs)+pageStats([['المبيعات',money(totals.salesTotal)],['التحصيل',money(totals.approvedPaymentsTotal)],['ديون العملاء',money(totals.debtsTotal)],['منخفض المخزون',low.length]])+content;
  setTimeout(()=>{bindPageTabs('reports',renderReports); if(typeof reportsHelper.bindReportsExportButtons==='function') reportsHelper.bindReportsExportButtons(); else { if($('shareBusinessReport')) $('shareBusinessReport').onclick=shareBusinessReport; if($('exportInvoicesCsv')) $('exportInvoicesCsv').onclick=exportInvoicesCsv; if($('exportPaymentsCsv')) $('exportPaymentsCsv').onclick=exportPaymentsCsv; if($('exportCustomersCsv')) $('exportCustomersCsv').onclick=exportCustomersCsv; }});
};


/* === PHASE 2 AUTH / LINKING STABILITY PATCH 1.0.44 ===
   هدف هذه الطبقة: استرجاع الحسابات بعد الدخول، منع بقاء المستخدم عالقًا،
   وتقليل أخطاء الصلاحيات في مسار إنشاء تاجر/عميل/ربط متجر.
*/
