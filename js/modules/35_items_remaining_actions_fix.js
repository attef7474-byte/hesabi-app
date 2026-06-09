/* Hesabi 1.0.96 - Items remaining actions fix.
   Scope: trader items page only.
   Fixes: clear selection, edit action button, and saving cash/credit prices from the current table markup.
   No order, payment, invoice, or Firestore rules logic is changed. */
(function(){
  "use strict";
  const VERSION = "1.0.96";
  const BUILD = 96;

  function hasState(){ try { return typeof state !== "undefined" && !!state; } catch(_) { return false; } }
  function hasCache(){ try { return typeof cache !== "undefined" && !!cache; } catch(_) { return false; } }
  function byId(id){ try { return typeof $ === "function" ? $(id) : document.getElementById(id); } catch(_) { return document.getElementById(id); } }
  function saveSafe(){ try { if(typeof save === "function") save(); } catch(e){ console.warn("items remaining save failed", e); } }
  function renderItemsSafe(){ try { if(typeof renderItems === "function") renderItems(); } catch(e){ console.warn("items remaining render failed", e); } }
  function msgSafe(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch(_) {} }
  function friendlyError(e){ try { return typeof friendlyFirestoreError === "function" ? friendlyFirestoreError(e) : (e && (e.message || e.code)) || String(e || "خطأ غير معروف"); } catch(_) { return (e && e.message) || String(e || "خطأ غير معروف"); } }
  function exposeRuntimeState(){
    try {
      if(hasState()){
        Object.defineProperty(window, "state", { configurable:true, get:function(){ return state; }, set:function(v){ if(v && typeof v === "object") state = v; } });
      }
    } catch(_) { try { if(hasState()) window.state = state; } catch(__) {} }
    try {
      if(hasCache()){
        Object.defineProperty(window, "cache", { configurable:true, get:function(){ return cache; }, set:function(v){ if(v && typeof v === "object") cache = v; } });
      }
    } catch(_) { try { if(hasCache()) window.cache = cache; } catch(__) {} }
  }
  function itemByIdLocal(itemId){
    try { if(typeof safeItemById === "function") return safeItemById(itemId); } catch(_) {}
    try { return (cache.items || []).find(i => String(i.id || "") === String(itemId || "")) || null; } catch(_) { return null; }
  }
  function itemDocLocal(itemId){
    try { if(typeof currentItemDoc === "function") return currentItemDoc(itemId); } catch(_) {}
    try { return doc(db, "shops", state.shopId, "items", itemId); } catch(e) { throw e; }
  }
  function canTrader(action){
    try { if(typeof ensureTraderOrStop === "function") return ensureTraderOrStop(action || "إدارة الأصناف"); } catch(_) {}
    try { if(typeof requireTraderAction === "function") return requireTraderAction(action || "إدارة الأصناف"); } catch(_) {}
    return true;
  }
  function numberFromAny(ids, fallback){
    for(const id of ids){
      const el = byId(id);
      if(el){
        const raw = String(el.value || "").replace(/,/g, "").trim();
        const n = Number(raw);
        if(Number.isFinite(n)) return n;
      }
    }
    return Number(fallback || 0);
  }

  const previousSelectItemForEdit = typeof selectItemForEdit === "function" ? selectItemForEdit : null;
  selectItemForEdit = function(itemId){
    exposeRuntimeState();
    if(!itemId) { msgSafe("لم يتم تحديد الصنف.", "error"); return; }
    if(!canTrader("تعديل صنف")) return;
    if(hasState()){
      const item = itemByIdLocal(itemId);
      state.editItemId = itemId;
      state.itemsTab = "edit";
      state.itemsEditListQ = item ? String(item.name || item.barcode || item.code || "") : String(state.itemsEditListQ || "");
      state.itemsEditListPage = 1;
      saveSafe();
      renderItemsSafe();
      setTimeout(function(){
        try { const el = byId("editItemName"); if(el && typeof el.focus === "function") el.focus(); } catch(_) {}
      }, 80);
      return;
    }
    try { if(previousSelectItemForEdit) previousSelectItemForEdit(itemId); } catch(e){ console.warn("legacy selectItemForEdit failed", e); }
  };

  const previousClearSelectedItems = typeof clearSelectedItems === "function" ? clearSelectedItems : null;
  clearSelectedItems = function(){
    exposeRuntimeState();
    try { if(previousClearSelectedItems) previousClearSelectedItems(); } catch(e){ console.warn("legacy clearSelectedItems failed", e); }
    try { if(typeof selectedItemIdsForDelete !== "undefined" && selectedItemIdsForDelete && typeof selectedItemIdsForDelete.clear === "function") selectedItemIdsForDelete.clear(); } catch(_) {}
    if(hasState()) state.selectedItemIds = {};
    try { document.querySelectorAll("[data-item-select],[data-select-item]").forEach(ch => { ch.checked = false; }); } catch(_) {}
    saveSafe();
    msgSafe("تم إلغاء تحديد الأصناف.", "success");
    renderItemsSafe();
    return true;
  };

  const previousSaveItemPriceQuick = typeof saveItemPriceQuick === "function" ? saveItemPriceQuick : null;
  saveItemPriceQuick = async function(itemId){
    exposeRuntimeState();
    try{
      if(!itemId){ msgSafe("لم يتم تحديد الصنف.", "error"); return; }
      if(!canTrader("تعديل سعر صنف")) return;
      if(!hasState() || !hasCache() || !state.shopId || !db){
        if(previousSaveItemPriceQuick) return previousSaveItemPriceQuick(itemId);
        msgSafe("لم يتم تجهيز الاتصال بقاعدة البيانات بعد.", "error");
        return;
      }
      const item = itemByIdLocal(itemId);
      if(!item){ msgSafe("الصنف غير موجود.", "error"); return; }
      // Current table markup uses cash_<id>/credit_<id>. Older code expected priceCash_<id>/priceCredit_<id>.
      const currentCash = Number(item.cashPrice ?? item.price ?? 0);
      const cashPrice = numberFromAny(["priceCash_" + itemId, "cash_" + itemId, "itemCash_" + itemId], currentCash);
      const creditPrice = numberFromAny(["priceCredit_" + itemId, "credit_" + itemId, "itemCredit_" + itemId], cashPrice);
      if(!Number.isFinite(cashPrice) || !Number.isFinite(creditPrice) || cashPrice < 0 || creditPrice < 0){
        msgSafe("السعر غير صحيح.", "error");
        return;
      }
      await updateDoc(itemDocLocal(itemId), {
        cashPrice,
        creditPrice,
        price: cashPrice,
        updatedAt: serverTimestamp(),
        updatedMs: Date.now(),
        updatedBy: typeof uid === "function" ? uid() : "",
        updatedByName: typeof actorName === "function" ? actorName() : ""
      });
      try { if(typeof addAudit === "function") await addAudit("quick_price_update", {itemId, itemName:item.name, cashPrice, creditPrice}); } catch(_) {}
      // Update the local cache immediately so the user sees the saved values without waiting for a listener refresh.
      try {
        const local = (cache.items || []).find(i => String(i.id || "") === String(itemId));
        if(local){ local.cashPrice = cashPrice; local.creditPrice = creditPrice; local.price = cashPrice; local.updatedMs = Date.now(); }
      } catch(_) {}
      msgSafe("تم حفظ سعر الصنف.", "success");
      renderItemsSafe();
    }catch(e){
      console.error("saveItemPriceQuick final failed", e);
      msgSafe("تعذر حفظ السعر: " + friendlyError(e), "error");
    }
  };

  function bindRemainingActions(){
    exposeRuntimeState();
    const clearBtn = byId("clearSelectedItemsBtn");
    if(clearBtn) clearBtn.onclick = function(ev){ if(ev) ev.preventDefault(); clearSelectedItems(); };
    document.querySelectorAll("[data-edit-item]").forEach(function(btn){ btn.onclick = function(ev){ if(ev) ev.preventDefault(); selectItemForEdit(btn.dataset.editItem); }; });
    document.querySelectorAll("[data-save-price],[data-save-price-item]").forEach(function(btn){ btn.onclick = function(ev){ if(ev) ev.preventDefault(); saveItemPriceQuick(btn.dataset.savePrice || btn.dataset.savePriceItem); }; });
  }

  const previousRenderItems = typeof renderItems === "function" ? renderItems : null;
  renderItems = function(){
    exposeRuntimeState();
    if(previousRenderItems) previousRenderItems();
    setTimeout(bindRemainingActions, 0);
  };

  if(!window.__hesabiItemsRemainingActionsFixInstalled){
    window.__hesabiItemsRemainingActionsFixInstalled = true;
    document.addEventListener("click", function(ev){
      const target = ev.target && ev.target.closest ? ev.target.closest("button,a,input") : ev.target;
      if(!target) return;
      const clearBtn = target.closest && target.closest("#clearSelectedItemsBtn,[data-clear-selected-items]");
      if(clearBtn){ ev.preventDefault(); ev.stopImmediatePropagation(); clearSelectedItems(); return; }
      const editBtn = target.closest && target.closest("[data-edit-item]");
      if(editBtn){ ev.preventDefault(); ev.stopImmediatePropagation(); selectItemForEdit(editBtn.dataset.editItem); return; }
      const saveBtn = target.closest && (target.closest("[data-save-price]") || target.closest("[data-save-price-item]"));
      if(saveBtn){ ev.preventDefault(); ev.stopImmediatePropagation(); saveItemPriceQuick(saveBtn.dataset.savePrice || saveBtn.dataset.savePriceItem); return; }
    }, true);
  }

  window.hesabiItemsRemainingActionsFix = {
    version: VERSION,
    buildCode: BUILD,
    bindRemainingActions,
    clearSelectedItems,
    selectItemForEdit,
    saveItemPriceQuick
  };
  window.hesabiItemsRemainingActionsFixSelfCheck = function(){
    exposeRuntimeState();
    return {
      ok: typeof renderItems === "function" && typeof selectItemForEdit === "function" && typeof saveItemPriceQuick === "function" && typeof clearSelectedItems === "function",
      version: VERSION,
      buildCode: BUILD,
      hasState: hasState(),
      hasCache: hasCache(),
      installed: !!window.__hesabiItemsRemainingActionsFixInstalled,
      priceInputPatterns: ["cash_<id>", "credit_<id>", "priceCash_<id>", "priceCredit_<id>"]
    };
  };
  exposeRuntimeState();
  setTimeout(bindRemainingActions, 0);
})();
