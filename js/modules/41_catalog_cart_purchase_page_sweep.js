/* === 1.0.101 Catalog / Cart / Customer Purchase Page Sweep ===
   Focus: customer catalog, cart and purchase page interactions only.
   No Firestore writes are changed; existing sendCustomerOrder/addItem logic remains the source of truth. */
(function(){
  'use strict';
  const PHASE='1.0.101';

  function safeCall(fn, fallback){
    try{ return typeof fn==='function' ? fn() : fallback; }catch(e){ console.warn('catalog purchase sweep safeCall failed', e); return fallback; }
  }
  function getCatalogState(){
    try{ return typeof catalogState==='function' ? catalogState() : {}; }catch(e){ return {}; }
  }
  function saveCatalogSafe(){ try{ if(typeof saveCatalog==='function') saveCatalog(); else if(typeof save==='function') save(); }catch(e){} }
  function renderAddPageSafe(){ try{ if(typeof renderCustomerAddItemsPage==='function') renderCustomerAddItemsPage(); }catch(e){ console.warn('renderCustomerAddItemsPage failed', e); } }
  function renderReadonlySafe(){ try{ if(typeof renderCustomerItemsReadonly==='function') renderCustomerItemsReadonly(); }catch(e){ console.warn('renderCustomerItemsReadonly failed', e); } }
  function setSearchAndRender(value){
    const cs=getCatalogState();
    cs.q=String(value||'').trim();
    cs.page=1;
    saveCatalogSafe();
    renderAddPageSafe();
  }
  function ensureCatalogMobileCss(){
    if(document.getElementById('hesabiCatalogPurchaseSweepCss')) return;
    const st=document.createElement('style');
    st.id='hesabiCatalogPurchaseSweepCss';
    st.textContent=`
      #page_items .purchase-page-card, #page_items #catalogSelectedOnly{max-width:100%;overflow-x:hidden;}
      #page_items .purchase-invoice-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}
      #page_items .purchase-invoice-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
      #page_items .purchase-add-page-toolbar{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;align-items:end;}
      #page_items .catalog-sweep-search-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px;}
      #page_items .purchase-invoice-table-wrap,
      #page_items .purchase-add-table-wrap{width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:14px;}
      #page_items .purchase-add-page-table,
      #page_items .purchase-invoice-table{min-width:680px;width:100%;border-collapse:collapse;}
      #page_items .purchase-page-nav{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;margin:10px 0;}
      #page_items .purchase-page-nav .status{white-space:normal;text-align:center;}
      #page_items .purchase-inline-name input,
      #page_items #browsePurchaseSearch{font-size:16px;}
      @media (max-width:520px){
        #page_items .purchase-invoice-head h2{font-size:18px;margin:0;}
        #page_items .purchase-invoice-actions .btn,
        #page_items .catalog-sweep-search-actions .btn,
        #page_items .purchase-page-nav .btn{min-height:40px;padding:8px 12px;}
        #page_items .purchase-add-page-table,
        #page_items .purchase-invoice-table{min-width:620px;}
      }
    `;
    document.head.appendChild(st);
  }

  function wrapAddItemsTableContainer(){
    try{
      const table=document.querySelector('#page_items .purchase-add-page-table');
      if(table && !table.parentElement.classList.contains('purchase-add-table-wrap')){
        const wrap=document.createElement('div');
        wrap.className='purchase-add-table-wrap';
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
      }
    }catch(e){}
  }
  function ensureSearchButtons(){
    const input=document.getElementById('browsePurchaseSearch');
    if(!input || document.getElementById('browsePurchaseSearchBtn')) return;
    const box=document.createElement('div');
    box.className='catalog-sweep-search-actions';
    box.innerHTML='<button class="btn secondary" id="browsePurchaseSearchBtn" type="button">بحث</button><button class="btn light" id="browsePurchaseClearBtn" type="button">مسح</button>';
    const field=input.closest('.field') || input.parentElement;
    if(field) field.appendChild(box);
  }
  function bindCustomerBrowsePageStable(){
    const cs=getCatalogState();
    ensureCatalogMobileCss();
    wrapAddItemsTableContainer();
    ensureSearchButtons();

    const back=()=>{cs.purchaseMode='invoice'; cs.q=''; cs.page=1; saveCatalogSafe(); renderReadonlySafe();};
    const b1=document.getElementById('backToInvoice'); if(b1) b1.onclick=back;
    const s1=document.getElementById('saveBrowseItems'); if(s1) s1.onclick=back;
    const s2=document.getElementById('saveBrowseItems2'); if(s2) s2.onclick=back;

    const q=document.getElementById('browsePurchaseSearch');
    if(q){
      q.oninput=e=>{ q.dataset.pendingValue=e.target.value; };
      q.onkeydown=e=>{
        if(e.key==='Enter'){
          e.preventDefault();
          setSearchAndRender(q.value);
        }
      };
    }
    const searchBtn=document.getElementById('browsePurchaseSearchBtn');
    if(searchBtn) searchBtn.onclick=()=>setSearchAndRender(q?q.value:'');
    const clearBtn=document.getElementById('browsePurchaseClearBtn');
    if(clearBtn) clearBtn.onclick=()=>{ if(q) q.value=''; setSearchAndRender(''); };

    const cat=document.getElementById('browsePurchaseCategory');
    if(cat) cat.onchange=e=>{cs.category=e.target.value; cs.page=1; saveCatalogSafe(); renderAddPageSafe();};
    const prev=document.getElementById('browsePrev');
    if(prev) prev.onclick=()=>{cs.page=Math.max(1,Number(cs.page||1)-1); saveCatalogSafe(); renderAddPageSafe();};
    const next=document.getElementById('browseNext');
    if(next) next.onclick=()=>{cs.page=Number(cs.page||1)+1; saveCatalogSafe(); renderAddPageSafe();};
    document.querySelectorAll('[data-browse-add]').forEach(b=>{
      b.onclick=()=>{
        try{
          if(typeof addItemToPurchaseInvoice==='function' && addItemToPurchaseInvoice(b.dataset.browseAdd,1)){
            if(typeof msg==='function') msg('تمت إضافة الصنف للطلب','success');
            renderAddPageSafe();
          }
        }catch(e){ console.warn('browse add failed', e); if(typeof msg==='function') msg('تعذر إضافة الصنف','error'); }
      };
    });
  }

  const previousBindCustomerBrowsePage = typeof bindCustomerBrowsePage === 'function' ? bindCustomerBrowsePage : null;
  bindCustomerBrowsePage = function(){
    try{ bindCustomerBrowsePageStable(); }
    catch(e){
      console.warn('catalog purchase sweep bind failed, fallback to previous bind', e);
      if(previousBindCustomerBrowsePage) previousBindCustomerBrowsePage();
    }
  };

  const previousRenderCustomerAddItemsPage = typeof renderCustomerAddItemsPage === 'function' ? renderCustomerAddItemsPage : null;
  if(previousRenderCustomerAddItemsPage){
    renderCustomerAddItemsPage = function(){
      previousRenderCustomerAddItemsPage();
      setTimeout(()=>{ ensureCatalogMobileCss(); wrapAddItemsTableContainer(); ensureSearchButtons(); bindCustomerBrowsePageStable(); },45);
    };
  }

  const previousRenderCustomerItemsReadonly = typeof renderCustomerItemsReadonly === 'function' ? renderCustomerItemsReadonly : null;
  if(previousRenderCustomerItemsReadonly){
    renderCustomerItemsReadonly = function(){
      previousRenderCustomerItemsReadonly();
      setTimeout(()=>{ ensureCatalogMobileCss(); try{ if(typeof bindPurchaseInvoiceActions==='function') bindPurchaseInvoiceActions(); }catch(e){} },45);
    };
  }

  function selfCheck(){
    const probes=[];
    probes.push({name:'bindCustomerBrowsePage', ok: typeof bindCustomerBrowsePage==='function'});
    probes.push({name:'renderCustomerAddItemsPage', ok: typeof renderCustomerAddItemsPage==='function'});
    probes.push({name:'renderCustomerItemsReadonly', ok: typeof renderCustomerItemsReadonly==='function'});
    probes.push({name:'addItemToPurchaseInvoice', ok: typeof addItemToPurchaseInvoice==='function'});
    probes.push({name:'sendCustomerOrder', ok: typeof sendCustomerOrder==='function'});
    probes.push({name:'catalogState', ok: typeof catalogState==='function'});
    const ok=probes.every(x=>x.ok);
    return {ok, module:'catalog_cart_purchase_page_sweep', version:PHASE, probes};
  }

  window.hesabiCatalogCartPurchasePageSweep={version:PHASE,selfCheck,bindCustomerBrowsePageStable,ensureCatalogMobileCss};
  window.hesabiCatalogCartPurchasePageSweepSelfCheck=selfCheck;
})();
