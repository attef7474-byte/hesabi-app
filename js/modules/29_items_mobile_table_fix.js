/* Hesabi 1.0.91 - Items mobile table/search stabilization.
   Scope: UI only for trader items page. No Firestore writes, no payments/orders changes. */
(function(){
  "use strict";

  const ITEM_TABLE_KEYS = {
    itemsList: true,
    itemsEditList: true,
    itemsPriceList: true
  };
  const ITEM_PAGE_SIZE = 10;

  function isItemKey(key){ return !!ITEM_TABLE_KEYS[String(key||"")]; }
  function safeHtml(value){
    try { return typeof esc === "function" ? esc(value) : String(value ?? "").replace(/[&<>\"]/g, function(c){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]); }); }
    catch(_) { return String(value ?? ""); }
  }
  function safeMoney(value){
    try { return typeof money === "function" ? money(value) : String(value ?? 0); }
    catch(_) { return String(value ?? 0); }
  }
  function applyItemPageSize(key){
    if(!isItemKey(key) || !window.state) return;
    if(Number(state[key + "PageSize"] || 0) !== ITEM_PAGE_SIZE){
      state[key + "PageSize"] = ITEM_PAGE_SIZE;
      try { if(typeof save === "function") save(); } catch(_) {}
    }
  }

  const baseGetItemsTab = typeof getItemsTab === "function" ? getItemsTab : null;
  window.__hesabiBaseGetItemsTabBefore1091 = baseGetItemsTab;
  getItemsTab = function(){
    const allowed = ["list","add","edit","prices","excel"];
    let tab = String((window.state && state.itemsTab) || "list");
    if(tab === "import") tab = "excel";
    if(!allowed.includes(tab)) tab = "list";
    if(window.state && state.itemsTab !== tab){
      state.itemsTab = tab;
      try { if(typeof save === "function") save(); } catch(_) {}
    }
    return tab;
  };

  itemsTabsBar = function(){
    const tabs = [
      ["list","📦","الأصناف"],
      ["add","➕","إضافة"],
      ["edit","✏️","تعديل"],
      ["prices","💵","الأسعار"],
      ["excel","⬆️","استيراد"]
    ];
    const active = getItemsTab();
    return `<div class="settings-tabs-bar icon-mode items-top-tabs-v2" role="tablist" aria-label="تبويبات الأصناف">${tabs.map(function(t){
      return `<button type="button" class="settings-top-tab ${active===t[0]?"active":""}" data-items-tab="${safeHtml(t[0])}"><span class="settings-tab-icon">${safeHtml(t[1])}</span><span class="settings-tab-text">${safeHtml(t[2])}</span></button>`;
    }).join("")}</div>`;
  };

  const baseDemandFilter = typeof demandFilter === "function" ? demandFilter : null;
  if(baseDemandFilter){
    demandFilter = function(key, data, textFn){
      applyItemPageSize(key);
      return baseDemandFilter(key, data, textFn);
    };
  }

  const baseDemandTableCard = typeof demandTableCard === "function" ? demandTableCard : null;
  if(baseDemandTableCard){
    demandTableCard = function(key, title, headers, rows, meta, emptyText, extraControls){
      if(!isItemKey(key)) return baseDemandTableCard(key, title, headers, rows, meta, emptyText, extraControls || "");
      meta = meta || { key:key, page:1, pages:1, filteredCount:0, total:0, visible:[] };
      const safeKey = safeHtml(key);
      const q = (window.state && state[key + "Q"]) || "";
      const colspan = Math.max(1, (headers || []).length);
      const body = (rows && rows.length) ? rows.join("") : `<tr><td colspan="${colspan}" class="muted">${safeHtml(emptyText || "لا توجد بيانات")}</td></tr>`;
      return `<div class="card demand-card items-demand-card" data-demand-card="${safeKey}">
        <div class="row items-card-head"><h2>${safeHtml(title || "الأصناف")}</h2><span class="badge">${safeMoney(meta.filteredCount || 0)} / ${safeMoney(meta.total || 0)}</span></div>
        <div class="items-demand-toolbar">
          <div class="field items-search-field"><label>بحث سريع</label><input id="${safeKey}Search" value="${safeHtml(q)}" placeholder="اكتب ثم اضغط بحث" autocomplete="off" inputmode="search"></div>
          <button type="button" class="btn secondary items-search-apply" id="${safeKey}ApplySearch">بحث</button>
          <div class="items-extra-controls">${extraControls || ""}</div>
        </div>
        <div class="items-pager-top" aria-label="تنقل صفحات الأصناف">
          <button type="button" class="btn secondary mini" id="${safeKey}Prev" ${meta.page<=1?"disabled":""}>السابق</button>
          <span class="page-indicator">صفحة ${safeMoney(meta.page)} من ${safeMoney(meta.pages)}</span>
          <button type="button" class="btn secondary mini" id="${safeKey}Next" ${meta.page>=meta.pages?"disabled":""}>التالي</button>
        </div>
        <div class="tablewrap items-table-wrap"><table class="items-real-table"><thead><tr>${(headers||[]).map(function(h){return `<th>${safeHtml(h)}</th>`;}).join("")}</tr></thead><tbody>${body}</tbody></table></div>
      </div>`;
    };
  }

  const baseBindDemandTable = typeof bindDemandTable === "function" ? bindDemandTable : null;
  if(baseBindDemandTable){
    bindDemandTable = function(key, rerender){
      if(!isItemKey(key)) return baseBindDemandTable(key, rerender);
      applyItemPageSize(key);
      const input = typeof $ === "function" ? $(key + "Search") : document.getElementById(key + "Search");
      const apply = typeof $ === "function" ? $(key + "ApplySearch") : document.getElementById(key + "ApplySearch");
      const runSearch = function(){
        if(input && window.state){ state[key + "Q"] = input.value || ""; state[key + "Page"] = 1; }
        try { if(typeof save === "function") save(); } catch(_) {}
        if(typeof rerender === "function") rerender();
      };
      if(input){
        input.oninput = function(){
          if(window.state){ state[key + "Q"] = input.value || ""; state[key + "Page"] = 1; }
          input.classList.add("items-search-dirty");
          try { if(typeof save === "function") save(); } catch(_) {}
        };
        input.onkeydown = function(ev){
          if(ev && ev.key === "Enter"){
            ev.preventDefault();
            runSearch();
          }
        };
      }
      if(apply) apply.onclick = runSearch;
      const prev = typeof $ === "function" ? $(key + "Prev") : document.getElementById(key + "Prev");
      const next = typeof $ === "function" ? $(key + "Next") : document.getElementById(key + "Next");
      if(prev) prev.onclick = function(){ state[key + "Page"] = Math.max(1, Number(state[key + "Page"] || 1) - 1); try { if(typeof save === "function") save(); } catch(_) {} if(typeof rerender === "function") rerender(); };
      if(next) next.onclick = function(){ state[key + "Page"] = Number(state[key + "Page"] || 1) + 1; try { if(typeof save === "function") save(); } catch(_) {} if(typeof rerender === "function") rerender(); };
    };
  }

  const baseBindItemsTabs = typeof bindItemsTabs === "function" ? bindItemsTabs : null;
  bindItemsTabs = function(){
    document.querySelectorAll("[data-items-tab]").forEach(function(btn){
      btn.onclick = function(){
        if(!window.state) return;
        state.itemsTab = btn.dataset.itemsTab === "import" ? "excel" : btn.dataset.itemsTab;
        try { if(typeof save === "function") save(); } catch(_) {}
        if(typeof renderItems === "function") renderItems();
      };
    });
  };

  window.hesabiItemsMobileTableFixSelfCheck = function(){
    const result = {
      ok: true,
      version: "1.0.91",
      pageSize: ITEM_PAGE_SIZE,
      hasItemsTabsBar: typeof itemsTabsBar === "function",
      hasDemandFilter: typeof demandFilter === "function",
      hasDemandTableCard: typeof demandTableCard === "function",
      hasBindDemandTable: typeof bindDemandTable === "function",
      itemKeys: Object.keys(ITEM_TABLE_KEYS)
    };
    result.ok = result.hasItemsTabsBar && result.hasDemandFilter && result.hasDemandTableCard && result.hasBindDemandTable;
    return result;
  };
})();
