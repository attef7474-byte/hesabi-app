/* Hesabi 1.0.94 - Items actions/search/tab final fix.
   Scope: trader items UI only. Fixes tab navigation, item search filtering, and table action buttons.
   No Firestore rules, no order/payment/invoice logic changes. */
(function(){
  "use strict";

  const VERSION = "1.0.128";
  const ITEM_PAGE_SIZE = 10;
  const ITEM_TABLE_KEYS = { itemsList:true, itemsEditList:true, itemsPriceList:true };

  function isItemKey(key){ return !!ITEM_TABLE_KEYS[String(key||"")]; }
  function byId(id){ try { return typeof $ === "function" ? $(id) : document.getElementById(id); } catch(_) { return document.getElementById(id); } }
  function safeSave(){ try { if(typeof save === "function") save(); } catch(_) {} }
  function safeRenderItems(){ try { if(typeof renderItems === "function") renderItems(); } catch(e) { console.warn("renderItems failed after item UI action", e); } }
  function safeHtml(value){
    try { return typeof esc === "function" ? esc(value) : String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
    catch(_) { return String(value ?? ""); }
  }
  function safeMoney(value){ try { return typeof money === "function" ? money(value) : String(value ?? 0); } catch(_) { return String(value ?? 0); } }
  function normalizeArabic(value){
    return String(value ?? "")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)] || d)
      .replace(/[۰-۹]/g, d => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)] || d)
      .replace(/\s+/g, " ")
      .trim();
  }
  function itemCategorySafe(item){
    try { return typeof itemCategory === "function" ? itemCategory(item) : (item && (item.category || item.group || "")); } catch(_) { return item && (item.category || ""); }
  }
  function itemSearchText(item, textFn){
    let base = "";
    try { base = textFn ? String(textFn(item) || "") : JSON.stringify(item || {}); } catch(_) { base = ""; }
    try {
      base += " " + [
        item && item.name,
        item && item.itemName,
        item && item.barcode,
        item && item.code,
        item && item.serial,
        item && item.model,
        item && item.brand,
        itemCategorySafe(item),
        item && item.unit,
        item && item.cashPrice,
        item && item.creditPrice,
        item && item.price,
        item && item.stock,
        item && item.minStock
      ].filter(v => v !== undefined && v !== null).join(" ");
    } catch(_) {}
    return normalizeArabic(base);
  }
  function applyItemDefaults(key){
    if(!isItemKey(key) || !window.state) return;
    if(Number(state[key + "PageSize"] || 0) !== ITEM_PAGE_SIZE) state[key + "PageSize"] = ITEM_PAGE_SIZE;
    if(!Number(state[key + "Page"] || 0)) state[key + "Page"] = 1;
  }
  function pageMeta(key, data, textFn){
    applyItemDefaults(key);
    const all = Array.isArray(data) ? data : [];
    const qRaw = window.state ? String(state[key + "Q"] || "").trim() : "";
    const q = normalizeArabic(qRaw);
    const pageSize = ITEM_PAGE_SIZE;
    let page = Math.max(1, Number((window.state && state[key + "Page"]) || 1));
    const filtered = q ? all.filter(row => itemSearchText(row, textFn).includes(q)) : all.slice();
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if(page > pages) page = pages;
    if(window.state) state[key + "Page"] = page;
    const start = (page - 1) * pageSize;
    return { key, q:qRaw, page, pageSize, total:all.length, filteredCount:filtered.length, pages, filtered, visible:filtered.slice(start, start + pageSize) };
  }

  const prevGetItemsTab = typeof getItemsTab === "function" ? getItemsTab : null;
  window.__hesabiGetItemsTabBefore1093 = prevGetItemsTab;
  getItemsTab = function(){
    const allowed = ["list","add","edit","prices","excel","import"];
    let tab = String((window.state && state.itemsTab) || "list");
    if(tab === "import") tab = "excel";
    if(!allowed.includes(tab)) tab = "list";
    if(window.state && state.itemsTab !== tab){ state.itemsTab = tab; safeSave(); }
    return tab;
  };

  itemsTabsBar = function(){
    const tabs = [
      ["list","📦","الأصناف"],
      ["add","➕","إضافة"],
      ["edit","✏️","تعديل"],
      ["prices","💵","الأسعار"],
      ["excel","⬆️","استيراد/تصدير"]
    ];
    const active = getItemsTab();
    return `<div class="settings-tabs-bar icon-mode items-top-tabs-v2 items-top-tabs-1093" role="tablist" aria-label="تبويبات الأصناف">${tabs.map(t => `<button type="button" class="settings-top-tab ${active===t[0]?"active":""}" data-items-tab="${safeHtml(t[0])}" aria-selected="${active===t[0]?"true":"false"}"><span class="settings-tab-icon">${safeHtml(t[1])}</span><span class="settings-tab-text">${safeHtml(t[2])}</span></button>`).join("")}</div>`;
  };

  const prevDemandFilter = typeof demandFilter === "function" ? demandFilter : null;
  demandFilter = function(key, data, textFn){
    if(!isItemKey(key)) return prevDemandFilter ? prevDemandFilter(key, data, textFn) : pageMeta(key, data, textFn);
    return pageMeta(key, data, textFn);
  };

  const prevDemandTableCard = typeof demandTableCard === "function" ? demandTableCard : null;
  demandTableCard = function(key, title, headers, rows, meta, emptyText, extraControls){
    if(!isItemKey(key)) return prevDemandTableCard ? prevDemandTableCard(key, title, headers, rows, meta, emptyText, extraControls || "") : "";
    meta = meta || { key, page:1, pages:1, filteredCount:0, total:0 };
    const safeKey = safeHtml(key);
    const q = (window.state && state[key + "Q"]) || "";
    const colspan = Math.max(1, (headers || []).length);
    const body = (rows && rows.length) ? rows.join("") : `<tr><td colspan="${colspan}" class="muted">${safeHtml(emptyText || "لا توجد بيانات")}</td></tr>`;
    return `<div class="card demand-card items-demand-card" data-demand-card="${safeKey}">
      <div class="row items-card-head"><h2>${safeHtml(title || "الأصناف")}</h2><span class="badge">${safeMoney(meta.filteredCount || 0)} / ${safeMoney(meta.total || 0)}</span></div>
      <div class="items-demand-toolbar">
        <div class="field items-search-field"><label>بحث سريع</label><input id="${safeKey}Search" value="${safeHtml(q)}" placeholder="اكتب الاسم أو الباركود ثم اضغط بحث" autocomplete="off" inputmode="search"></div>
        <button type="button" class="btn secondary items-search-apply" id="${safeKey}ApplySearch">بحث</button>
        <button type="button" class="btn light mini" id="${safeKey}ClearSearch" ${q?"":"disabled"}>مسح</button>
        <button type="button" class="btn ok mini scan-btn-inline" id="${safeKey}ScanBarcode" title="مسح باركود">📷</button>
        <div class="items-extra-controls">${extraControls || ""}</div>
      </div>
      <div class="items-pager-top" aria-label="تنقل صفحات الأصناف">
        <button type="button" class="btn secondary mini" id="${safeKey}Prev" ${meta.page<=1?"disabled":""}>السابق</button>
        <span class="page-indicator">صفحة ${safeMoney(meta.page)} من ${safeMoney(meta.pages)}</span>
        <button type="button" class="btn secondary mini" id="${safeKey}Next" ${meta.page>=meta.pages?"disabled":""}>التالي</button>
      </div>
      <div class="tablewrap items-table-wrap"><table class="items-real-table"><thead><tr>${(headers||[]).map(h => `<th>${safeHtml(h)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>
    </div>`;
  };

  const prevBindDemandTable = typeof bindDemandTable === "function" ? bindDemandTable : null;
  bindDemandTable = function(key, rerender){
    if(!isItemKey(key)) return prevBindDemandTable ? prevBindDemandTable(key, rerender) : undefined;
    bindItemDemandTable(key, rerender || renderItems);
  };

  function runSearch(key, rerender){
    if(!window.state || !isItemKey(key)) return;
    const input = byId(key + "Search");
    state[key + "Q"] = input ? String(input.value || "") : String(state[key + "Q"] || "");
    state[key + "Page"] = 1;
    safeSave();
    if(typeof rerender === "function") rerender(); else safeRenderItems();
  }
  function clearSearch(key, rerender){
    if(!window.state || !isItemKey(key)) return;
    const input = byId(key + "Search");
    if(input) input.value = "";
    state[key + "Q"] = "";
    state[key + "Page"] = 1;
    safeSave();
    if(typeof rerender === "function") rerender(); else safeRenderItems();
  }
  function movePage(key, dir, rerender){
    if(!window.state || !isItemKey(key)) return;
    state[key + "Page"] = Math.max(1, Number(state[key + "Page"] || 1) + dir);
    safeSave();
    if(typeof rerender === "function") rerender(); else safeRenderItems();
  }
  function bindItemDemandTable(key, rerender){
    applyItemDefaults(key);
    const input = byId(key + "Search");
    if(input){
      input.oninput = function(){
        if(window.state){ state[key + "Q"] = input.value || ""; state[key + "Page"] = 1; safeSave(); }
        input.classList.add("items-search-dirty");
      };
      input.onkeydown = function(ev){ if(ev && ev.key === "Enter"){ ev.preventDefault(); runSearch(key, rerender); } };
    }
    const apply = byId(key + "ApplySearch");
    if(apply) apply.onclick = function(ev){ if(ev) ev.preventDefault(); runSearch(key, rerender); };
    const clear = byId(key + "ClearSearch");
    if(clear) clear.onclick = function(ev){ if(ev) ev.preventDefault(); clearSearch(key, rerender); };
    const scan = byId(key + "ScanBarcode");
    if(scan) scan.onclick = function(ev){
      if(ev) ev.preventDefault();
      if(typeof hesabiItemsHelpers !== "undefined" && typeof hesabiItemsHelpers.startUniversalScan === "function"){
        hesabiItemsHelpers.startUniversalScan();
      } else if(window.hesabiNativeScanItemBarcodeEmbedded){
        window.hesabiNativeScanItemBarcodeEmbedded();
      }
    };
    const prev = byId(key + "Prev"), next = byId(key + "Next");
    if(prev) prev.onclick = function(ev){ if(ev) ev.preventDefault(); movePage(key, -1, rerender); };
    if(next) next.onclick = function(ev){ if(ev) ev.preventDefault(); movePage(key, 1, rerender); };
  }

  bindItemsTabs = function(){ bindItemTabsNow(); };
  function bindItemTabsNow(){
    document.querySelectorAll("[data-items-tab]").forEach(btn => {
      btn.onclick = function(ev){
        if(ev) ev.preventDefault();
        if(!window.state) return;
        const tab = btn.dataset.itemsTab === "import" ? "excel" : btn.dataset.itemsTab;
        state.itemsTab = tab || "list";
        safeSave();
        safeRenderItems();
      };
    });
  }
  function goToEdit(id){
    if(!id) return;
    if(typeof selectItemForEdit === "function") selectItemForEdit(id);
    else { state.editItemId = id; state.itemsTab = "edit"; safeSave(); safeRenderItems(); }
  }
  function goToPrice(id){
    if(!window.state || !id) return;
    let item = null;
    try { item = typeof safeItemById === "function" ? safeItemById(id) : null; } catch(_) {}
    state.itemsTab = "prices";
    state.itemsPriceListQ = (item && (item.name || item.barcode || item.code)) || "";
    state.itemsPriceListPage = 1;
    safeSave();
    safeRenderItems();
  }
  function savePrice(id){ if(id && typeof saveItemPriceQuick === "function") saveItemPriceQuick(id); }
  function toggleVisible(id){ if(id && typeof toggleItemCustomerVisible === "function") toggleItemCustomerVisible(id); }
  function deleteItem(id){ if(id && typeof deleteSingleItem === "function") deleteSingleItem(id); }

  function findItemKeyFromId(id){
    const m = String(id || "").match(/^(itemsList|itemsEditList|itemsPriceList)(ApplySearch|ClearSearch|ScanBarcode|Prev|Next|Search)$/);
    return m ? m[1] : "";
  }
  if(!window.__hesabiItemsActionsFix1093Installed){
    window.__hesabiItemsActionsFix1093Installed = true;
    document.addEventListener("click", function(ev){
      const target = ev.target && ev.target.closest ? ev.target.closest("button,a,input,select") : ev.target;
      if(!target) return;
      const tabBtn = target.closest && target.closest("[data-items-tab]");
      if(tabBtn){ ev.preventDefault(); ev.stopImmediatePropagation(); if(window.state){ state.itemsTab = tabBtn.dataset.itemsTab === "import" ? "excel" : (tabBtn.dataset.itemsTab || "list"); safeSave(); safeRenderItems(); } return; }
      const editBtn = target.closest && target.closest("[data-edit-item]");
      if(editBtn){ ev.preventDefault(); ev.stopImmediatePropagation(); goToEdit(editBtn.dataset.editItem); return; }
      const priceBtn = target.closest && target.closest("[data-price-item]");
      if(priceBtn){ ev.preventDefault(); ev.stopImmediatePropagation(); goToPrice(priceBtn.dataset.priceItem); return; }
      const savePriceBtn = target.closest && (target.closest("[data-save-price]") || target.closest("[data-save-price-item]"));
      if(savePriceBtn){ ev.preventDefault(); ev.stopImmediatePropagation(); savePrice(savePriceBtn.dataset.savePrice || savePriceBtn.dataset.savePriceItem); return; }
      const toggleBtn = target.closest && (target.closest("[data-toggle-visible]") || target.closest("[data-toggle-customer-visible]"));
      if(toggleBtn){ ev.preventDefault(); ev.stopImmediatePropagation(); toggleVisible(toggleBtn.dataset.toggleVisible || toggleBtn.dataset.toggleCustomerVisible); return; }
      const deleteBtn = target.closest && target.closest("[data-delete-item]");
      if(deleteBtn){ ev.preventDefault(); ev.stopImmediatePropagation(); deleteItem(deleteBtn.dataset.deleteItem); return; }
      const id = target.id || "";
      const key = findItemKeyFromId(id);
      if(key){
        if(id.endsWith("ApplySearch")){ ev.preventDefault(); ev.stopImmediatePropagation(); runSearch(key, renderItems); return; }
        if(id.endsWith("ClearSearch")){ ev.preventDefault(); ev.stopImmediatePropagation(); clearSearch(key, renderItems); return; }
        if(id.endsWith("ScanBarcode")){
          ev.preventDefault(); ev.stopImmediatePropagation();
          if(typeof hesabiItemsHelpers !== "undefined" && typeof hesabiItemsHelpers.startUniversalScan === "function"){
            hesabiItemsHelpers.startUniversalScan();
          } else if(window.hesabiNativeScanItemBarcodeEmbedded){
            window.hesabiNativeScanItemBarcodeEmbedded();
          }
          return;
        }
        if(id.endsWith("Prev")){ ev.preventDefault(); ev.stopImmediatePropagation(); movePage(key, -1, renderItems); return; }
        if(id.endsWith("Next")){ ev.preventDefault(); ev.stopImmediatePropagation(); movePage(key, 1, renderItems); return; }
      }
    }, true);

    document.addEventListener("change", function(ev){
      const target = ev.target;
      if(!target) return;
      if(target.matches && target.matches("[data-item-select]")){
        if(!window.state) return;
        if(!state.selectedItemIds) state.selectedItemIds = {};
        if(target.checked) state.selectedItemIds[target.dataset.itemSelect] = true;
        else delete state.selectedItemIds[target.dataset.itemSelect];
        safeSave();
        return;
      }
      const cat = target.id && String(target.id).match(/^(itemsList|itemsEditList|itemsPriceList)Category$/);
      if(cat && window.state){
        const key = cat[1];
        state[key + "Category"] = target.value || "الكل";
        state[key + "Page"] = 1;
        safeSave();
        safeRenderItems();
      }
    }, true);
  }

  window.hesabiItemsActionsSearchFixSelfCheck = function(){
    return {
      ok: typeof renderItems === "function" && typeof demandFilter === "function" && typeof bindDemandTable === "function" && typeof bindItemsTabs === "function",
      version: VERSION,
      itemKeys: Object.keys(ITEM_TABLE_KEYS),
      pageSize: ITEM_PAGE_SIZE,
      delegated: !!window.__hesabiItemsActionsFix1093Installed,
      activeTab: (window.state && state.itemsTab) || ""
    };
  };
})();
