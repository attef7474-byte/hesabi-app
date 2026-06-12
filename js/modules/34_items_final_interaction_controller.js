/* Hesabi 1.0.95 - Items final interaction controller.
   Scope: trader items page UI only.
   Fixes item tab navigation, search/pagination state, and table action buttons by bridging
   module-scoped state/cache to older delegated handlers and rebinding direct handlers.
   No Firestore rules, order, payment, invoice, or data mutation logic is changed here. */
(function(){
  "use strict";
  const VERSION = "1.0.95";
  const BUILD = 95;
  const ITEM_KEYS = ["itemsList","itemsEditList","itemsPriceList"];
  const ITEM_PAGE_SIZE = 10;

  function exists(v){ return typeof v !== "undefined" && v !== null; }
  function hasState(){ try { return typeof state !== "undefined" && !!state; } catch(_) { return false; } }
  function hasCache(){ try { return typeof cache !== "undefined" && !!cache; } catch(_) { return false; } }
  function byId(id){ try { return typeof $ === "function" ? $(id) : document.getElementById(id); } catch(_) { return document.getElementById(id); } }
  function saveSafe(){ try { if(typeof save === "function") save(); } catch(e){ console.warn("items final save failed", e); } }
  function renderSafe(){ try { if(typeof renderItems === "function") renderItems(); } catch(e){ console.warn("items final render failed", e); } }
  function itemByIdSafe(id){
    try { if(typeof safeItemById === "function") return safeItemById(id); } catch(_) {}
    try { return (cache.items || []).find(i => String(i.id||"") === String(id||"")) || null; } catch(_) { return null; }
  }
  function getItemTabValue(raw){
    const allowed = ["list","add","edit","prices","excel","import"];
    let tab = String(raw || (hasState() ? state.itemsTab : "") || "list");
    if(tab === "import") tab = "excel";
    if(!allowed.includes(tab)) tab = "list";
    return tab;
  }
  function exposeRuntimeState(){
    try {
      if(hasState()){
        Object.defineProperty(window, "state", {
          configurable: true,
          get: function(){ return state; },
          set: function(v){ if(v && typeof v === "object") state = v; }
        });
      }
    } catch(e) {
      try { if(hasState()) window.state = state; } catch(_) {}
    }
    try {
      if(hasCache()){
        Object.defineProperty(window, "cache", {
          configurable: true,
          get: function(){ return cache; },
          set: function(v){ if(v && typeof v === "object") cache = v; }
        });
      }
    } catch(e) {
      try { if(hasCache()) window.cache = cache; } catch(_) {}
    }
  }

  exposeRuntimeState();

  const baseGetItemsTab = typeof getItemsTab === "function" ? getItemsTab : null;
  getItemsTab = function(){
    exposeRuntimeState();
    const tab = getItemTabValue(hasState() ? state.itemsTab : (baseGetItemsTab ? baseGetItemsTab() : "list"));
    if(hasState() && state.itemsTab !== tab){ state.itemsTab = tab; saveSafe(); }
    return tab;
  };

  function setItemsTab(tab){
    exposeRuntimeState();
    if(!hasState()) return;
    state.itemsTab = getItemTabValue(tab);
    saveSafe();
    renderSafe();
  }
  function setSearchAndRender(key){
    exposeRuntimeState();
    if(!hasState() || !ITEM_KEYS.includes(key)) return;
    const input = byId(key + "Search");
    state[key + "Q"] = input ? String(input.value || "") : String(state[key + "Q"] || "");
    state[key + "Page"] = 1;
    state[key + "PageSize"] = ITEM_PAGE_SIZE;
    saveSafe();
    renderSafe();
  }
  function clearSearchAndRender(key){
    exposeRuntimeState();
    if(!hasState() || !ITEM_KEYS.includes(key)) return;
    const input = byId(key + "Search");
    if(input) input.value = "";
    state[key + "Q"] = "";
    state[key + "Page"] = 1;
    state[key + "PageSize"] = ITEM_PAGE_SIZE;
    saveSafe();
    renderSafe();
  }
  function moveItemPage(key, dir){
    exposeRuntimeState();
    if(!hasState() || !ITEM_KEYS.includes(key)) return;
    state[key + "Page"] = Math.max(1, Number(state[key + "Page"] || 1) + Number(dir || 0));
    state[key + "PageSize"] = ITEM_PAGE_SIZE;
    saveSafe();
    renderSafe();
  }
  function setItemCategory(key, value){
    exposeRuntimeState();
    if(!hasState() || !ITEM_KEYS.includes(key)) return;
    state[key + "Category"] = value || "الكل";
    state[key + "Page"] = 1;
    saveSafe();
    renderSafe();
  }
  function selectForEdit(id){
    exposeRuntimeState();
    if(!id) return;
    try { if(typeof selectItemForEdit === "function"){ selectItemForEdit(id); return; } } catch(e){ console.warn("selectItemForEdit failed", e); }
    if(hasState()){
      state.editItemId = id;
      state.itemsTab = "edit";
      saveSafe();
      renderSafe();
    }
  }
  function openPriceEditor(id){
    exposeRuntimeState();
    if(!hasState() || !id) return;
    const item = itemByIdSafe(id);
    state.itemsTab = "prices";
    state.itemsPriceListQ = (item && (item.name || item.barcode || item.code)) || "";
    state.itemsPriceListPage = 1;
    saveSafe();
    renderSafe();
  }
  function savePrice(id){ try { if(id && typeof saveItemPriceQuick === "function") saveItemPriceQuick(id); } catch(e){ console.warn("saveItemPriceQuick failed", e); } }
  function toggleVisible(id){ try { if(id && typeof toggleItemCustomerVisible === "function") toggleItemCustomerVisible(id); } catch(e){ console.warn("toggleItemCustomerVisible failed", e); } }
  function deleteItem(id){ try { if(id && typeof deleteSingleItem === "function") deleteSingleItem(id); } catch(e){ console.warn("deleteSingleItem failed", e); } }
  function updateSelectedItem(id, checked){
    exposeRuntimeState();
    if(!hasState() || !id) return;
    if(!state.selectedItemIds || typeof state.selectedItemIds !== "object") state.selectedItemIds = {};
    if(checked) state.selectedItemIds[id] = true;
    else delete state.selectedItemIds[id];
    saveSafe();
  }

  const previousBindItemsTabs = typeof bindItemsTabs === "function" ? bindItemsTabs : null;
  bindItemsTabs = function(){
    exposeRuntimeState();
    try { if(previousBindItemsTabs) previousBindItemsTabs(); } catch(_) {}
    document.querySelectorAll("[data-items-tab]").forEach(function(btn){
      btn.onclick = function(ev){ if(ev) ev.preventDefault(); setItemsTab(btn.dataset.itemsTab); };
      btn.style.pointerEvents = "auto";
    });
  };

  const previousBindDemandTable = typeof bindDemandTable === "function" ? bindDemandTable : null;
  bindDemandTable = function(key, rerender){
    exposeRuntimeState();
    if(!ITEM_KEYS.includes(String(key||""))){
      return previousBindDemandTable ? previousBindDemandTable(key, rerender) : undefined;
    }
    if(hasState()){
      state[key + "PageSize"] = ITEM_PAGE_SIZE;
      if(!Number(state[key + "Page"] || 0)) state[key + "Page"] = 1;
    }
    const input = byId(key + "Search");
    if(input){
      input.oninput = function(){
        exposeRuntimeState();
        if(hasState()){
          state[key + "Q"] = String(input.value || "");
          state[key + "Page"] = 1;
          saveSafe();
        }
        input.classList.add("items-search-dirty");
      };
      input.onkeydown = function(ev){ if(ev && ev.key === "Enter"){ ev.preventDefault(); setSearchAndRender(key); } };
    }
    const apply = byId(key + "ApplySearch"); if(apply) apply.onclick = function(ev){ if(ev) ev.preventDefault(); setSearchAndRender(key); };
    const clear = byId(key + "ClearSearch"); if(clear) clear.onclick = function(ev){ if(ev) ev.preventDefault(); clearSearchAndRender(key); };
    const scan = byId(key + "ScanBarcode"); if(scan) scan.onclick = function(ev){
      if(ev) ev.preventDefault();
      if(typeof hesabiItemsHelpers !== "undefined" && typeof hesabiItemsHelpers.startUniversalScan === "function"){
        hesabiItemsHelpers.startUniversalScan();
      } else if(window.hesabiNativeScanItemBarcodeEmbedded){
        window.hesabiNativeScanItemBarcodeEmbedded();
      }
    };
    const prev = byId(key + "Prev"); if(prev) prev.onclick = function(ev){ if(ev) ev.preventDefault(); moveItemPage(key, -1); };
    const next = byId(key + "Next"); if(next) next.onclick = function(ev){ if(ev) ev.preventDefault(); moveItemPage(key, 1); };
  };

  function bindFinalItemButtons(){
    exposeRuntimeState();
    try { bindItemsTabs(); } catch(_) {}
    ITEM_KEYS.forEach(function(key){ try { bindDemandTable(key, renderItems); } catch(_) {} });
    ITEM_KEYS.forEach(function(key){
      const cat = byId(key + "Category");
      if(cat) cat.onchange = function(){ setItemCategory(key, cat.value); };
    });
    document.querySelectorAll("[data-edit-item]").forEach(function(btn){ btn.onclick = function(ev){ if(ev) ev.preventDefault(); selectForEdit(btn.dataset.editItem); }; });
    document.querySelectorAll("[data-price-item]").forEach(function(btn){ btn.onclick = function(ev){ if(ev) ev.preventDefault(); openPriceEditor(btn.dataset.priceItem); }; });
    document.querySelectorAll("[data-save-price],[data-save-price-item]").forEach(function(btn){ btn.onclick = function(ev){ if(ev) ev.preventDefault(); savePrice(btn.dataset.savePrice || btn.dataset.savePriceItem); }; });
    document.querySelectorAll("[data-toggle-visible],[data-toggle-customer-visible]").forEach(function(btn){ btn.onclick = function(ev){ if(ev) ev.preventDefault(); toggleVisible(btn.dataset.toggleVisible || btn.dataset.toggleCustomerVisible); }; });
    document.querySelectorAll("[data-delete-item]").forEach(function(btn){ btn.onclick = function(ev){ if(ev) ev.preventDefault(); deleteItem(btn.dataset.deleteItem); }; });
    document.querySelectorAll("[data-item-select],[data-select-item]").forEach(function(ch){ ch.onchange = function(){ updateSelectedItem(ch.dataset.itemSelect || ch.dataset.selectItem, !!ch.checked); }; });
    const selectVisible = byId("selectVisibleItemsBtn");
    if(selectVisible) selectVisible.onclick = function(ev){
      if(ev) ev.preventDefault(); exposeRuntimeState();
      if(!hasState()) return;
      if(!state.selectedItemIds || typeof state.selectedItemIds !== "object") state.selectedItemIds = {};
      document.querySelectorAll("[data-item-select],[data-select-item]").forEach(function(ch){ const id=ch.dataset.itemSelect || ch.dataset.selectItem; if(id){ state.selectedItemIds[id]=true; ch.checked=true; } });
      saveSafe();
      try { if(typeof msg === "function") msg("تم تحديد الأصناف المعروضة", "success"); } catch(_) {}
    };
    const clearSelected = byId("clearSelectedItemsBtn");
    if(clearSelected) clearSelected.onclick = function(ev){ if(ev) ev.preventDefault(); try { if(typeof clearSelectedItems === "function") clearSelectedItems(); } catch(_) {} renderSafe(); };
    const deleteSelected = byId("deleteSelectedItemsBtn");
    if(deleteSelected) deleteSelected.onclick = function(ev){
      if(ev) ev.preventDefault();
      try {
        const ids = hasState() ? Object.keys(state.selectedItemIds || {}) : [];
        if(typeof deleteItemsByIds === "function") deleteItemsByIds(ids);
      } catch(e){ console.warn("delete selected items failed", e); }
    };
  }

  const previousRenderItems = typeof renderItems === "function" ? renderItems : null;
  renderItems = function(){
    exposeRuntimeState();
    if(hasState()){
      state.itemsTab = getItemTabValue(state.itemsTab || "list");
      ITEM_KEYS.forEach(function(key){
        state[key + "PageSize"] = ITEM_PAGE_SIZE;
        if(!Number(state[key + "Page"] || 0)) state[key + "Page"] = 1;
      });
    }
    if(previousRenderItems) previousRenderItems();
    setTimeout(bindFinalItemButtons, 0);
  };

  // A capture listener registered before this phase used window.state as a guard.
  // Keeping window.state bridged makes that old listener execute its intended actions instead of only stopping events.
  if(!window.__hesabiItemsFinalInteractionControllerInstalled){
    window.__hesabiItemsFinalInteractionControllerInstalled = true;
    document.addEventListener("click", function(){ exposeRuntimeState(); }, true);
    document.addEventListener("keydown", function(){ exposeRuntimeState(); }, true);
    document.addEventListener("input", function(){ exposeRuntimeState(); }, true);
    document.addEventListener("change", function(){ exposeRuntimeState(); }, true);
  }

  window.hesabiItemsFinalInteractionController = {
    version: VERSION,
    buildCode: BUILD,
    exposeRuntimeState,
    bindFinalItemButtons,
    setItemsTab,
    setSearchAndRender,
    moveItemPage
  };
  window.hesabiItemsFinalInteractionControllerSelfCheck = function(){
    exposeRuntimeState();
    return {
      ok: hasState() && !!window.state && typeof renderItems === "function" && typeof bindItemsTabs === "function" && typeof bindDemandTable === "function",
      version: VERSION,
      buildCode: BUILD,
      hasWindowState: !!window.state,
      hasWindowCache: !!window.cache,
      activeTab: hasState() ? state.itemsTab : "",
      itemKeys: ITEM_KEYS.slice(),
      pageSize: ITEM_PAGE_SIZE,
      installed: !!window.__hesabiItemsFinalInteractionControllerInstalled
    };
  };
  exposeRuntimeState();
  setTimeout(bindFinalItemButtons, 0);
})();
