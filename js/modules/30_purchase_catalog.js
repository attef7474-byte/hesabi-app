function renderHomeQuickGrid(){
  return `<div class="quick-home-grid">${homeQuickItems().map(([page,icon,label,count])=>`<button class="quick-home-btn" data-home-page="${page}" aria-label="${esc(label)}"><span class="qicon">${icon}</span><span class="qlabel">${esc(label)}</span>${badgeHtml(count)}</button>`).join('')}</div>`;
}
function bindHomeQuickGrid(){
  document.querySelectorAll('[data-home-page]').forEach(b=>b.onclick=()=>show(b.getAttribute('data-home-page')||'home'));
}

function renderHome(){
  $('page_home').innerHTML=`<div class="card"><h2>الرئيسية</h2><p class="muted">اختر الصفحة المطلوبة من الأيقونات. الصفحة الرئيسية الآن مختصرة للأيقونات فقط حتى تكون أسرع وأسهل على الهاتف.</p>${renderHomeQuickGrid()}</div>`;
  bindHomeQuickGrid();
}
function renderCustomerLimitBox(){const d=customerDebtInfo(); return `<div class="notice"><b>سقف الدين:</b> ${money(d.limit)}<br><b>الدين الحالي:</b> ${money(d.balance)}<br><b>المتاح للشراء الآجل:</b> ${money(d.remaining)}</div>`}

function itemCategory(i){
  const helpers=window.hesabiItemsHelpers||{};
  if(typeof helpers.itemCategory==='function') return helpers.itemCategory(i);
  return String(i.category||i.group||i.type||'عام').trim()||'عام';
}


/* phase9: removed older duplicate shopPolicyBool; final implementation appears later. */

function customerCanSeeItem(i){
  const helpers=window.hesabiCatalogHelpers||{};
  if(typeof helpers.customerCanSeeItem==='function') return helpers.customerCanSeeItem(i);
  return i && i.isActive!==false && i.customerVisible!==false;
}
function shopIsOpenNow(){
  const helpers=window.hesabiCatalogHelpers||{};
  if(typeof helpers.shopIsOpenNow==='function') return helpers.shopIsOpenNow(cache.shop||{});
  const sh=cache.shop||{};
  if(!sh.workingHoursEnabled) return true;
  const open=String(sh.workingOpenTime||'08:00');
  const close=String(sh.workingCloseTime||'22:00');
  const now=new Date();
  const cur=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  if(open===close) return true;
  return open<close ? (cur>=open && cur<=close) : (cur>=open || cur<=close);
}

function catalogState(){
  const helpers=window.hesabiCatalogHelpers||{};
  if(typeof helpers.catalogState==='function') return helpers.catalogState(state,state.shopId);
  if(!state.catalog) state.catalog={};
  const sid=state.shopId||'default';
  if(!state.catalog[sid]) state.catalog[sid]={q:'',category:'الكل',availableOnly:true,sort:'popular',limit:30,favorites:{},cart:{}};
  return state.catalog[sid];
}
function saveCatalog(){save()}
function catalogCartLines(){
  const cs=catalogState();
  const helpers=window.hesabiCatalogHelpers||{};
  if(typeof helpers.cartLines==='function'){
    const lines=helpers.cartLines({catalogState:cs,itemById,allowOutOfStock:shopPolicyBool('allowOutOfStockOrders', false)});
    saveCatalog();
    return lines;
  }
  const lines=[];
  for(const [itemId,qtyRaw] of Object.entries(cs.cart||{})){
    const qty=Number(qtyRaw||0); if(qty<=0) continue;
    const i=itemById(itemId); if(!i || i.isActive===false) continue;
    const stock=Number(i.stock||0);
    const allowOut=shopPolicyBool('allowOutOfStockOrders', false);
    if(stock<=0 && !allowOut) continue;
    const safeQty=allowOut?qty:Math.min(qty,stock);
    if(safeQty!==qty) cs.cart[itemId]=safeQty;
    const price=Number(i.price||i.creditPrice||i.cashPrice||0);
    lines.push({itemId,name:i.name,unit:i.unit||'حبة',price,qty:safeQty,total:price*safeQty});
  }
  saveCatalog();
  return lines;
}
function catalogCartTotal(){const lines=catalogCartLines(); const helpers=window.hesabiCatalogHelpers||{}; return typeof helpers.cartTotal==='function'?helpers.cartTotal(lines):{lines,count:lines.reduce((a,l)=>a+l.qty,0),items:lines.length,total:lines.reduce((a,l)=>a+l.total,0)}}
function setCartQty(itemId,qty){
  const cs=catalogState(); const i=itemById(itemId); if(!i) return;
  const stock=Number(i.stock||0);
  let q=Math.max(0,Number(qty||0));
  const allowOut=shopPolicyBool('allowOutOfStockOrders', false);
  const helpers=window.hesabiCatalogHelpers||{};
  if(typeof helpers.safeCartQty==='function'){
    const result=helpers.safeCartQty({item:i,qty:q,allowOutOfStock:allowOut});
    if(!result.ok && result.reason==='out-of-stock'){q=0; msg('هذا الصنف غير متوفر حاليًا','error')}
    else if(result.reason==='limited-by-stock'){q=result.qty; msg(`الكمية المتاحة من ${i.name} هي ${stock} فقط`,'error')}
    else q=result.qty;
  }else{
    if(stock<=0 && !allowOut){q=0; msg('هذا الصنف غير متوفر حاليًا','error')}
    if(q>stock && !allowOut){q=stock; msg(`الكمية المتاحة من ${i.name} هي ${stock} فقط`,'error')}
  }
  if(q>0) cs.cart[itemId]=q; else delete cs.cart[itemId];
  saveCatalog(); refreshCatalogUi();
}
function changeCartQty(itemId,delta){const cs=catalogState(); setCartQty(itemId,Number(cs.cart?.[itemId]||0)+Number(delta||0))}
function toggleFavorite(itemId){const cs=catalogState(); cs.favorites[itemId]=!cs.favorites[itemId]; if(!cs.favorites[itemId]) delete cs.favorites[itemId]; saveCatalog(); refreshCatalogUi()}
function itemSoldQty(itemId){const helpers=window.hesabiCatalogHelpers||{}; return typeof helpers.itemSoldQty==='function'?helpers.itemSoldQty(cache.invoices,itemId):cache.invoices.reduce((a,inv)=>a+(inv.lines||inv.items||[]).filter(l=>l.itemId===itemId).reduce((x,l)=>x+Number(l.qty||0),0),0)}
function commonCustomerItems(){
  const helpers=window.hesabiCatalogHelpers||{};
  if(typeof helpers.commonCustomerItems==='function') return helpers.commonCustomerItems(cache.invoices,itemById);
  const counts={};
  for(const inv of cache.invoices||[]) for(const l of (inv.lines||inv.items||[])) if(l.itemId) counts[l.itemId]=(counts[l.itemId]||0)+Number(l.qty||1);
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id])=>itemById(id)).filter(Boolean);
}
function filteredCatalogItems(){
  const cs=catalogState();
  const helpers=window.hesabiCatalogHelpers||{};
  if(typeof helpers.filteredCatalogItems==='function') return helpers.filteredCatalogItems({catalogState:cs,items:cache.items,itemCategory,searchMatch,itemSoldQty});
  let items=cache.items.filter(i=>customerCanSeeItem(i));
  if(cs.availableOnly) items=items.filter(i=>Number(i.stock||0)>0);
  if(cs.category && cs.category!=='الكل' && cs.category!=='المفضلة' && cs.category!=='الأكثر طلبًا') items=items.filter(i=>itemCategory(i)===cs.category);
  if(cs.category==='المفضلة') items=items.filter(i=>cs.favorites?.[i.id]);
  if(cs.category==='الأكثر طلبًا') items=items.sort((a,b)=>itemSoldQty(b.id)-itemSoldQty(a.id));
  if(cs.q) items=items.filter(i=>searchMatch(`${i.name} ${itemCategory(i)} ${i.unit||''} ${i.code||''} ${i.id}`,cs.q));
  if(cs.sort==='price_asc') items=items.sort((a,b)=>Number(a.price||0)-Number(b.price||0));
  else if(cs.sort==='price_desc') items=items.sort((a,b)=>Number(b.price||0)-Number(a.price||0));
  else if(cs.sort==='stock_desc') items=items.sort((a,b)=>Number(b.stock||0)-Number(a.stock||0));
  else items=items.sort((a,b)=>(itemSoldQty(b.id)-itemSoldQty(a.id)) || String(a.name||'').localeCompare(String(b.name||'')));
  return items;
}
function renderCatalogItem(i){
  const cs=catalogState(); const qty=Number(cs.cart?.[i.id]||0); const stock=Number(i.stock||0);
  const allowOut=shopPolicyBool('allowOutOfStockOrders', false);
  const showStock=shopPolicyBool('showCustomerStock', true);
  const showPrices=shopPolicyBool('showCustomerPrices', true);
  const disabled=stock<=0 && !allowOut;
  const stockText=showStock?` | المتوفر: <b>${stock}</b>`:'';
  const priceHtml=showPrices?`<div class="catalog-price">${money(i.price||0)}</div>`:'<div class="muted">السعر يظهر بعد مراجعة التاجر</div>';
  return `<div class="item catalog-item"><div><div class="row"><h3>${esc(i.name)}</h3><button class="btn fav-btn" data-fav-item="${i.id}">${cs.favorites?.[i.id]?'⭐':'☆'}</button></div><div class="muted">${esc(itemCategory(i))} | ${esc(i.unit||'حبة')}${stockText}</div>${priceHtml}${stock<=0?(allowOut?'<div class="notice">يمكن طلب هذا الصنف وسيؤكده التاجر لاحقًا</div>':'<div class="notice error">غير متوفر حاليًا</div>'):''}</div><div class="qty-control"><button class="btn light" data-cart-dec="${i.id}" ${qty<=0?'disabled':''}>−</button><span class="qty-pill">${qty}</span><button class="btn secondary" data-cart-inc="${i.id}" ${disabled||(!allowOut&&qty>=stock)?'disabled':''}>+</button></div></div>`;
}

function catalogSearchMatches(q){
  const text=String(q||'').trim();
  if(!text) return [];
  const helpers=window.hesabiCatalogHelpers||{};
  if(typeof helpers.catalogSearchMatches==='function') return helpers.catalogSearchMatches({query:text,items:cache.items,itemCategory,searchMatch,normalizeSearchText,limit:80});
  const nq=normalizeSearchText(text);
  const score=i=>{
    const name=normalizeSearchText(i.name);
    const cat=normalizeSearchText(itemCategory(i));
    const unit=normalizeSearchText(i.unit);
    const code=normalizeSearchText(i.code||i.id);
    if(name===nq) return 0;
    if(name.startsWith(nq)) return 1;
    if(name.includes(nq)) return 2;
    if(cat.includes(nq)) return 3;
    if(code.includes(nq) || unit.includes(nq)) return 4;
    return 9;
  };
  return cache.items
    .filter(i=>customerCanSeeItem(i))
    .filter(i=>searchMatch(`${i.name} ${itemCategory(i)} ${i.unit||''} ${i.code||''} ${i.id}`, text))
    .sort((a,b)=>(score(a)-score(b)) || ((Number(b.stock||0)>0)-(Number(a.stock||0)>0)) || String(a.name||'').localeCompare(String(b.name||'')))
    .slice(0,80);
}
function renderCatalogSearchPopup(q){
  const box=$('catalogSearchPopup');
  if(!box) return;
  const text=String(q||'').trim();
  if(!text){ box.classList.add('hidden'); box.innerHTML=''; return; }
  const rows=catalogSearchMatches(text);
  const cs=catalogState();
  box.classList.remove('hidden');
  box.innerHTML=`<div class="catalog-search-head"><b>نتائج البحث: ${esc(text)} (${rows.length})</b><button class="btn light" id="closeCatalogSearchPopup">إغلاق</button></div>
  ${rows.length?`<div style="overflow:auto"><table class="purchase-search-table"><thead><tr><th>اسم الصنف</th><th>السعر</th><th>المتوفر</th><th>في الفاتورة</th><th>اختيار</th></tr></thead><tbody>${rows.map(i=>{
    const stock=Number(i.stock||0), qty=Number(cs.cart?.[i.id]||0), allowOut=shopPolicyBool('allowOutOfStockOrders', false), disabled=(stock<=0&&!allowOut)||(!allowOut&&qty>=stock);
    const priceCell=shopPolicyBool('showCustomerPrices', true)?money(i.price||0):'مخفي';
    const stockCell=shopPolicyBool('showCustomerStock', true)?stock:'مخفي';
    return `<tr><td><b>${esc(i.name)}</b><div class="muted">${esc(i.unit||'حبة')}</div></td><td class="price-cell">${priceCell}</td><td class="stock-cell">${stockCell}</td><td class="stock-cell"><span class="qty-pill">${qty}</span></td><td><button class="btn secondary small-btn" data-search-add="${i.id}" ${disabled?'disabled':''}>اختيار</button></td></tr>`;
  }).join('')}</tbody></table></div>`:`<div class="catalog-search-empty">لا توجد أصناف تحتوي على: ${esc(text)}</div>`}
  <div class="purchase-confirm-bar"><span class="muted">حدد الأصناف المطلوبة من الجدول، ثم اضغط تأكيد لإظهار الفاتورة.</span><button class="btn ok" id="confirmSearchSelection">تأكيد وإغلاق الجدول</button></div>`;
  const closePopup=()=>{
    const input=$('catalogSearch');
    const cs=catalogState(); cs.q=''; cs.limit=30; saveCatalog();
    if(input) input.value='';
    box.classList.add('hidden'); box.innerHTML='';
    renderCatalogDynamicSections();
    setTimeout(()=>{$('catalogSelectedOnly')?.scrollIntoView({behavior:'smooth',block:'start'});},50);
  };
  const close=$('closeCatalogSearchPopup'); if(close) close.onclick=closePopup;
  const confirm=$('confirmSearchSelection'); if(confirm) confirm.onclick=closePopup;
  document.querySelectorAll('[data-search-add]').forEach(b=>b.onclick=()=>{
    const input=$('catalogSearch');
    const currentText=input?.value||text;
    const cs=catalogState();
    const itemId=b.dataset.searchAdd;
    setCartQty(itemId, Number(cs.cart?.[itemId]||0)+1);
    setTimeout(()=>{const inp=$('catalogSearch'); if(inp){inp.value=currentText; inp.focus();} renderCatalogSearchPopup(currentText);},0);
  });
}

function refreshCatalogUi(){
  if($('catalogList')) renderCatalogDynamicSections();
  else renderItems();
}
function renderCatalogReviewContent(cart){
  return '';
}
function renderCatalogCartBar(cart){
  return '';
}

function visibleCustomerPurchaseItems(){
  const helpers=window.hesabiCatalogHelpers||{};
  if(typeof helpers.visibleCustomerPurchaseItems==='function') return helpers.visibleCustomerPurchaseItems(cache.items||[], shopPolicyBool('allowOutOfStockOrders', false));
  return (cache.items||[]).filter(customerCanSeeItem).filter(i=>Number(i.stock||0)>0 || shopPolicyBool('allowOutOfStockOrders', false));
}
function purchaseInlineMatches(q, limit=8){
  const text=String(q||'').trim();
  if(!text) return [];
  const helpers=window.hesabiCatalogHelpers||{};
  if(typeof helpers.purchaseInlineMatches==='function') return helpers.purchaseInlineMatches({query:text,items:visibleCustomerPurchaseItems(),itemCategory,searchMatch,normalizeSearchText,limit});
  const nq=normalizeSearchText(text);
  const score=i=>{
    const name=normalizeSearchText(i.name||'');
    const code=normalizeSearchText(i.code||i.barcode||i.id||'');
    const cat=normalizeSearchText(itemCategory(i));
    if(name===nq) return 0;
    if(name.startsWith(nq)) return 1;
    if(name.includes(nq)) return 2;
    if(code.includes(nq)) return 3;
    if(cat.includes(nq)) return 4;
    return 9;
  };
  return visibleCustomerPurchaseItems()
    .filter(i=>searchMatch(`${i.name||''} ${i.barcode||''} ${i.code||''} ${itemCategory(i)} ${i.unit||''}`, text))
    .sort((a,b)=>(score(a)-score(b)) || String(a.name||'').localeCompare(String(b.name||''),'ar'))
    .slice(0,limit);
}
function silentSetCartQty(itemId,qty){
  const cs=catalogState(); const i=itemById(itemId); if(!i) return false;
  const stock=Number(i.stock||0); const allowOut=shopPolicyBool('allowOutOfStockOrders', false);
  const helpers=window.hesabiCatalogHelpers||{};
  let q=Math.max(0,Number(qty||0));
  if(typeof helpers.safeCartQty==='function'){
    const result=helpers.safeCartQty({item:i,qty:q,allowOutOfStock:allowOut});
    if(!result.ok && result.reason==='out-of-stock'){msg('هذا الصنف غير متوفر حاليًا','error'); return false;}
    if(result.reason==='limited-by-stock'){q=result.qty; msg(`الكمية المتاحة من ${i.name} هي ${stock} فقط`,'error');}
    else q=result.qty;
  }else{
    if(stock<=0 && !allowOut){msg('هذا الصنف غير متوفر حاليًا','error'); return false;}
    if(q>stock && !allowOut){q=stock; msg(`الكمية المتاحة من ${i.name} هي ${stock} فقط`,'error');}
  }
  if(q>0) cs.cart[itemId]=q; else delete cs.cart[itemId];
  saveCatalog(); return true;
}
function silentChangeCartQty(itemId,delta){const cs=catalogState(); return silentSetCartQty(itemId,Number(cs.cart?.[itemId]||0)+Number(delta||0));}
function addItemToPurchaseInvoice(itemId,qty=1){const cs=catalogState(); return silentSetCartQty(itemId,Number(cs.cart?.[itemId]||0)+Number(qty||1));}

async function sendCustomerOrder(){
  try{
    if(state.role!=='customer'){msg('طلب الشراء متاح للعميل فقط','error');return}
    if(!state.shopId || !state.customerId){msg('لم يتم ربط العميل بمتجر. اختر المتجر أولًا ثم أرسل الطلب.','error');return}
    if(cache.shop?.allowCustomerOrders===false){msg('المتجر لا يستقبل طلبات جديدة حاليًا','error');return}
    if(!shopIsOpenNow()){msg(cache.shop?.closedMessage||'المتجر مغلق حاليًا حسب أوقات الدوام','error');return}
    await ensureCustomerPurchaseAccess();
    const cart=catalogCartTotal();
    if(!cart.lines.length){msg('أضف صنفًا واحدًا على الأقل قبل إرسال الطلب','error');return}
    const payType=$('payType')?.value||'credit';
    const note=String($('orderNote')?.value||'').trim();
    const now=Date.now();
    const customerId=state.customerId;
    const customerName=state.customerName||cache.customers?.[0]?.name||'عميل';
    const customerPhone=state.customerPhone||cache.customers?.[0]?.phone||'';
    const lines=cart.lines.map(l=>({
      itemId:l.itemId,
      name:l.name||'',
      unit:l.unit||'حبة',
      qty:Number(l.qty||0),
      price:Number(l.price||0),
      total:Number(l.total||0)
    })).filter(l=>l.itemId && l.qty>0);
    const payload={
      shopId:state.shopId,
      customerId,
      customerUid:uid(),
      customerName,
      customerPhone,
      items:lines,
      lines,
      total:Number(cart.total||0),
      paymentType:payType,
      note,
      status:'pending_trader',
      source:'customer_purchase_invoice',
      createdBy:uid(),
      createdAt:serverTimestamp(),
      createdMs:now,
      updatedAt:serverTimestamp(),
      updatedMs:now
    };
    const editingId=catalogState().editingOrderId;
    if(editingId){
      await updateDoc(doc(db,'shops',state.shopId,'purchaseRequests',editingId),{...payload,editedBy:uid(),editedAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedMs:now,editCount:increment(1)});
      clearOrderEditing();
      msg('تم حفظ تعديل طلب الشراء','success');
    }else{
      await addDoc(collection(db,'shops',state.shopId,'purchaseRequests'),payload);
      msg('تم إرسال طلب الشراء للتاجر بنجاح','success');
    }
    const cs=catalogState(); cs.cart={}; cs.inlineQ=''; cs.purchaseMode='invoice'; saveCatalog();
    active='orders'; render();
  }catch(e){
    console.error('sendCustomerOrder failed',e);
    if(e?.code==='permission-denied' || /permission/i.test(String(e?.message||''))){showPermissionDeniedLogoutDialog('طلبات الشراء', e);return}
    msg('تعذر إرسال طلب الشراء: '+friendlyFirestoreError(e),'error');
  }
}

function renderPurchaseInlineSuggest(q){
  const rows=purchaseInlineMatches(q,8);
  if(!String(q||'').trim()) return '<div class="purchase-suggest hidden" id="purchaseInlineSuggest"></div>';
  return `<div class="purchase-suggest" id="purchaseInlineSuggest">${rows.length?rows.map(i=>{
    const price=shopPolicyBool('showCustomerPrices', true)?money(effectiveItemPrice(i,'credit')):'السعر مخفي';
    const stock=shopPolicyBool('showCustomerStock', true)?`المتوفر: ${Number(i.stock||0)}`:'الكمية مخفية';
    return `<div class="purchase-suggest-row"><div><b>${esc(i.name||'صنف')}</b><small>${esc(itemCategory(i))} | ${esc(i.unit||'حبة')} | ${price} | ${stock}</small></div><button class="btn secondary" data-inline-pick="${i.id}">اختيار</button></div>`;
  }).join(''):`<div class="muted" style="padding:10px;text-align:center">لا توجد أصناف مطابقة</div>`}</div>`;
}
function renderSelectedCartTable(cart){
  const showPrices=shopPolicyBool('showCustomerPrices', true);
  const rows=(cart.lines||[]).map((l,idx)=>`
    <tr>
      <td>${idx+1}</td>
      <td class="purchase-inline-name"><b>${esc(l.name)}</b><div class="muted">${esc(l.unit||'حبة')}</div></td>
      <td class="purchase-inline-qty"><input type="number" min="0" step="1" value="${Number(l.qty||1)}" data-invoice-qty="${l.itemId}"></td>
      <td>${showPrices?money(l.price):'مخفي'}</td>
      <td>${showPrices?money(l.total):'مخفي'}</td>
      <td><button class="btn danger" data-cart-remove="${l.itemId}">حذف</button></td>
    </tr>`).join('');
  const inlineQ=esc(catalogState().inlineQ||'');
  const emptyRow=`<tr class="invoice-entry-row">
      <td>${(cart.lines||[]).length+1}</td>
      <td class="purchase-inline-name"><div class="inline-input-with-scan"><input id="purchaseInlineItemInput" value="${inlineQ}" autocomplete="off" placeholder="اكتب اسم الصنف هنا"><button type="button" class="icon-mini-btn" id="purchaseInlineScanBtn" title="مسح باركود">📷</button></div>${renderPurchaseInlineSuggest(catalogState().inlineQ||'')}</td>
      <td class="purchase-inline-qty"><input id="purchaseInlineQty" type="number" min="1" step="1" value="1"></td>
      <td class="muted">${showPrices?'—':'مخفي'}</td><td class="muted">${showPrices?'—':'مخفي'}</td><td class="muted">اختر الصنف</td>
    </tr>`;
  return `<div class="card selected-invoice-card" id="purchaseInvoiceCard">
    <div class="purchase-invoice-head">
      <h2>🧾 نموذج طلب الشراء</h2>
      <div class="purchase-invoice-actions"><button class="btn secondary" id="openPurchaseAddItems">➕ إضافة أصناف</button><button class="btn light" id="clearCart" ${cart.lines.length?'':'disabled'}>تفريغ</button></div>
    </div>
    <div class="purchase-invoice-table-wrap"><table class="purchase-invoice-table"><thead><tr><th>#</th><th>اسم الصنف</th><th>العدد</th><th>السعر</th><th>الإجمالي</th><th>إجراء</th></tr></thead><tbody>${rows}${emptyRow}</tbody></table></div>
    <div class="invoice-summary">
      <div class="summary-grid">
        <div class="summary-box"><b>${showPrices?money(cart.total).replace(' ريال',''):'مخفي'}</b><span>صافي الطلب</span><b>${cart.items}</b><span>عدد الأصناف</span><b>${cart.count}</b><span>إجمالي الكميات</span></div>
        <div><div class="summary-count">الأصناف <b>${cart.items}</b></div><p class="muted" style="text-align:center">أدخل الصنف مباشرة في الصف الفارغ أو استخدم زر إضافة أصناف.</p></div>
      </div>
    </div>
    <div class="invoice-order-controls">
      <div class="field"><label>نوع الدفع</label><select id="payType"><option value="credit" selected>آجل</option><option value="cash">كاش</option></select></div>
      <div class="field"><label>ملاحظات الطلب</label><textarea id="orderNote" placeholder="ملاحظة اختيارية للتاجر"></textarea></div>
      <div class="invoice-mini-actions"><button class="btn send-mini" id="sendOrder" ${(cart.lines.length&&cache.shop?.allowCustomerOrders!==false)?'':'disabled'}>${catalogState().editingOrderId?'حفظ التعديل':'إرسال طلب الشراء'}</button>${catalogState().editingOrderId?`<button class="btn warn" id="cancelEditOrder">إلغاء التعديل</button>`:''}</div>
    </div>
  </div>`;
}

function customerPurchaseRows(){
  const cs=catalogState();
  const helpers=window.hesabiCatalogHelpers||{};
  if(typeof helpers.customerPurchaseRows==='function') return helpers.customerPurchaseRows({catalogState:cs,items:visibleCustomerPurchaseItems(),itemCategory,searchMatch,effectiveItemPrice,itemSoldQty,pageSize:10});
  const pageSize=10;
  cs.page=Math.max(1,Number(cs.page||1));
  let data=visibleCustomerPurchaseItems();
  if(cs.category && cs.category!=='الكل') data=data.filter(i=>String(itemCategory(i)||'عام')===String(cs.category));
  const q=String(cs.q||'').trim();
  if(q) data=data.filter(i=>searchMatch(`${i.name||''} ${i.barcode||''} ${i.code||''} ${itemCategory(i)} ${i.unit||''}`, q));
  if(cs.sort==='price_asc') data=data.sort((a,b)=>Number(effectiveItemPrice(a,'credit')||0)-Number(effectiveItemPrice(b,'credit')||0));
  else if(cs.sort==='price_desc') data=data.sort((a,b)=>Number(effectiveItemPrice(b,'credit')||0)-Number(effectiveItemPrice(a,'credit')||0));
  else if(cs.sort==='stock_desc') data=data.sort((a,b)=>Number(b.stock||0)-Number(a.stock||0));
  else data=data.sort((a,b)=>(itemSoldQty(b.id)-itemSoldQty(a.id)) || String(a.name||'').localeCompare(String(b.name||''),'ar'));
  const total=data.length;
  const pages=Math.max(1,Math.ceil(total/pageSize));
  if(cs.page>pages) cs.page=pages;
  const start=(cs.page-1)*pageSize;
  return {all:data,visible:data.slice(start,start+pageSize),total,pages,page:cs.page,pageSize,start};
}
function renderPurchaseInvoiceOnly(){
  const target=$('catalogSelectedOnly');
  if(target) target.innerHTML=renderSelectedCartTable(catalogCartTotal());
  bindPurchaseInvoiceActions();
}
function renderCustomerItemsReadonly(){
  const cs=catalogState();
  if(!cs.purchaseMode) cs.purchaseMode='invoice';
  if(cs.purchaseMode==='browse'){ renderCustomerAddItemsPage(); return; }
  $('page_items').innerHTML=`<div id="catalogSelectedOnly">${renderSelectedCartTable(catalogCartTotal())}</div>`;
  setTimeout(bindPurchaseInvoiceActions,30);
}
function renderCustomerAddItemsPage(){
  const cs=catalogState();
  if(!cs.category) cs.category='الكل';
  if(!cs.sort) cs.sort='popular';
  const meta=customerPurchaseRows();
  const showPrices=shopPolicyBool('showCustomerPrices', true);
  const showStock=shopPolicyBool('showCustomerStock', true);
  const rows=meta.visible.map(i=>{
    const inCart=Number(cs.cart?.[i.id]||0);
    const stock=Number(i.stock||0), allowOut=shopPolicyBool('allowOutOfStockOrders', false);
    const disabled=(stock<=0&&!allowOut)||(!allowOut&&inCart>=stock);
    return `<tr><td class="name"><b>${esc(i.name||'صنف')}</b><div class="muted">${esc(itemCategory(i))} | ${esc(i.unit||'حبة')} ${i.barcode?`| ${esc(i.barcode)}`:''}</div></td><td>${showPrices?money(effectiveItemPrice(i,'credit')):'مخفي'}</td><td>${showStock?stock:'مخفي'}</td><td><span class="qty-pill">${inCart}</span></td><td><button class="btn secondary" data-browse-add="${i.id}" ${disabled?'disabled':''}>اختيار</button></td></tr>`;
  }).join('') || `<tr><td colspan="5" class="empty-selected">لا توجد أصناف مطابقة</td></tr>`;
  $('page_items').innerHTML=`<div class="card purchase-page-card">
    <div class="purchase-invoice-head"><h2>➕ إضافة أصناف للطلب</h2><div class="purchase-invoice-actions"><button class="btn ok" id="saveBrowseItems">حفظ والعودة للطلب</button><button class="btn light" id="backToInvoice">رجوع</button></div></div>
    <div class="purchase-add-page-toolbar">
      <div class="field"><label>بحث</label><div class="inline-input-with-scan"><input id="browsePurchaseSearch" value="${esc(cs.q||'')}" placeholder="اكتب اسم الصنف أو الباركود"><button type="button" class="icon-mini-btn" id="browsePurchaseScanBtn" title="مسح باركود">📷</button></div></div>
      <div class="field"><label>التصنيف</label><select id="browsePurchaseCategory">${itemCategoryOptions(cs.category||'الكل')}</select></div>
    </div>
    <div class="muted" style="margin:8px 0">${cs.q?'نتائج البحث المطابقة':'يعرض افتراضيًا 10 أصناف من الأكثر طلبًا أو الأكثر استخدامًا'}</div>
    <div style="overflow:auto"><table class="purchase-add-page-table"><thead><tr><th>الصنف</th><th>السعر</th><th>المتوفر</th><th>في الطلب</th><th>اختيار</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="purchase-page-nav"><button class="btn light" id="browsePrev" ${meta.page<=1?'disabled':''}>السابق</button><span class="status pending">صفحة ${meta.page} من ${meta.pages} / ${meta.total} صنف</span><button class="btn light" id="browseNext" ${meta.page>=meta.pages?'disabled':''}>التالي</button></div>
    <div class="purchase-add-page-actions"><button class="btn ok" id="saveBrowseItems2">حفظ والعودة للطلب</button></div>
  </div>`;
  setTimeout(bindCustomerBrowsePage,30);
}
function bindPurchaseInvoiceActions(){
  const cs=catalogState();
  const open=$('openPurchaseAddItems'); if(open) open.onclick=()=>{cs.purchaseMode='browse'; cs.q=''; cs.page=1; saveCatalog(); renderCustomerItemsReadonly();};
  const clear=$('clearCart'); if(clear) clear.onclick=()=>{if(confirm('مسح كل الأصناف من الطلب؟')){cs.cart={}; cs.inlineQ=''; saveCatalog(); renderPurchaseInvoiceOnly();}};
  const send=$('sendOrder'); if(send) send.onclick=sendCustomerOrder;
  const cancelEdit=$('cancelEditOrder'); if(cancelEdit) cancelEdit.onclick=()=>{clearOrderEditing(); renderPurchaseInvoiceOnly(); msg('تم إلغاء وضع تعديل الطلب','notice')};
  document.querySelectorAll('[data-cart-remove]').forEach(b=>b.onclick=()=>{silentSetCartQty(b.dataset.cartRemove,0); renderPurchaseInvoiceOnly();});
  document.querySelectorAll('[data-invoice-qty]').forEach(inp=>{
    inp.onchange=()=>{silentSetCartQty(inp.dataset.invoiceQty, Number(inp.value||0)); renderPurchaseInvoiceOnly();};
    inp.onblur=inp.onchange;
  });
  const input=$('purchaseInlineItemInput');
  if(input){
    input.oninput=()=>{cs.inlineQ=input.value; saveCatalog(); const box=$('purchaseInlineSuggest'); if(box){box.outerHTML=renderPurchaseInlineSuggest(cs.inlineQ);} bindInlineSuggestButtons(); setTimeout(()=>{const inp=$('purchaseInlineItemInput'); if(inp){inp.focus(); try{inp.setSelectionRange(inp.value.length,inp.value.length)}catch{}}},0);};
    input.onfocus=()=>{const box=$('purchaseInlineSuggest'); if(box && String(input.value||'').trim()) box.classList.remove('hidden');};
  }
  const scan=$('purchaseInlineScanBtn');
  if(scan) scan.onclick=()=>{if(typeof hesabiItemsHelpers !== 'undefined' && typeof hesabiItemsHelpers.startUniversalScan === 'function') hesabiItemsHelpers.startUniversalScan();};
  bindInlineSuggestButtons();
}
function bindInlineSuggestButtons(){
  document.querySelectorAll('[data-inline-pick]').forEach(b=>b.onclick=()=>{
    const qty=Math.max(1,Number($('purchaseInlineQty')?.value||1));
    if(addItemToPurchaseInvoice(b.dataset.inlinePick,qty)){catalogState().inlineQ=''; saveCatalog(); renderPurchaseInvoiceOnly(); setTimeout(()=>{$('purchaseInlineItemInput')?.focus();},40);}
  });
}
function bindCustomerBrowsePage(){
  const cs=catalogState();
  let t=null;
  const back=()=>{cs.purchaseMode='invoice'; cs.q=''; cs.page=1; saveCatalog(); renderCustomerItemsReadonly();};
  const b1=$('backToInvoice'); if(b1) b1.onclick=back;
  const s1=$('saveBrowseItems'); if(s1) s1.onclick=back;
  const s2=$('saveBrowseItems2'); if(s2) s2.onclick=back;
  const q=$('browsePurchaseSearch'); if(q) q.oninput=e=>{cs.q=e.target.value; cs.page=1; saveCatalog(); clearTimeout(t); t=setTimeout(()=>{renderCustomerAddItemsPage(); const inp=$('browsePurchaseSearch'); if(inp){inp.focus(); try{inp.setSelectionRange(inp.value.length,inp.value.length)}catch{}}},180);};
  const cat=$('browsePurchaseCategory'); if(cat) cat.onchange=e=>{cs.category=e.target.value; cs.page=1; saveCatalog(); renderCustomerAddItemsPage();};
  const prev=$('browsePrev'); if(prev) prev.onclick=()=>{cs.page=Math.max(1,Number(cs.page||1)-1); saveCatalog(); renderCustomerAddItemsPage();};
  const next=$('browseNext'); if(next) next.onclick=()=>{cs.page=Number(cs.page||1)+1; saveCatalog(); renderCustomerAddItemsPage();};
  const scan=$('browsePurchaseScanBtn');
  if(scan) scan.onclick=()=>{if(typeof hesabiItemsHelpers !== 'undefined' && typeof hesabiItemsHelpers.startUniversalScan === 'function') hesabiItemsHelpers.startUniversalScan();};
  document.querySelectorAll('[data-browse-add]').forEach(b=>b.onclick=()=>{if(addItemToPurchaseInvoice(b.dataset.browseAdd,1)){msg('تمت إضافة الصنف للطلب','success'); renderCustomerAddItemsPage();}});
}

