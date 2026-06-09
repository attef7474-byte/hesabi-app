/* Hesabi 1.0.109 - Home + Global Search + Navigation Page Sweep.
   Scope: home shortcuts, explicit global search, scoped bottom navigation binding and mobile guards only.
   No Firestore writes, no order/payment/item mutations. */
(function(){
  "use strict";
  const VERSION = "1.0.109";
  const BUILD_CODE = 109;

  function byId(id){ try { return document.getElementById(id); } catch (_) { return null; } }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch (_) { return []; } }
  function safeString(value){ try { return String(value == null ? "" : value); } catch (_) { return ""; } }
  function escSafe(value){
    try { return typeof esc === "function" ? esc(value == null ? "" : value) : safeString(value).replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch])); }
    catch (_) { return ""; }
  }
  function moneySafe(value){ try { return typeof money === "function" ? money(value) : new Intl.NumberFormat("ar-YE").format(Number(value || 0)); } catch (_) { return safeString(value || 0); } }
  function countSafe(list){ return Array.isArray(list) ? list.length : 0; }
  function roleSafe(){ try { return safeString(state && state.role); } catch (_) { return ""; } }
  function saveState(){ try { if(typeof save === "function") save(); } catch (_) {} }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch (_) {} }
  function badgeHtmlSafe(count){ try { return typeof badgeHtml === "function" ? badgeHtml(count) : (Number(count||0)>0 ? '<span class="qbadge">'+escSafe(count)+'</span>' : ''); } catch (_) { return ''; } }
  function unreadCountersSafe(){ try { return typeof unreadCounters === "function" ? unreadCounters() : {}; } catch (_) { return {}; } }
  function dailyTaskCountSafe(){ try { return typeof dailyTaskCount === "function" ? dailyTaskCount() : 0; } catch (_) { return 0; } }

  function ensureStyle(){
    if(byId("homeSearchNavigationSweepStyle")) return;
    const style = document.createElement("style");
    style.id = "homeSearchNavigationSweepStyle";
    style.textContent = `
      #page_home,#page_search,#nav,#navInner{max-width:100%;box-sizing:border-box;}
      #page_home,#page_search{overflow-x:hidden;}
      .home-sweep-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}
      .home-sweep-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:8px;margin:10px 0;}
      .home-sweep-stat{border:1px solid var(--border,#e5e7eb);border-radius:14px;padding:10px;background:rgba(255,255,255,.65);}
      .home-sweep-stat span{display:block;font-size:12px;opacity:.72;}
      .home-sweep-stat b{font-size:17px;}
      .home-sweep-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:8px;}
      .home-sweep-grid .quick-home-btn{min-width:0;}
      .global-search-sweep-card{overflow:hidden;}
      .global-search-sweep-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,180px);gap:8px;align-items:end;}
      .global-search-sweep-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;}
      .global-search-sweep-actions .btn{min-width:max-content;}
      .global-search-sweep-results{display:grid;gap:8px;}
      .global-search-sweep-result{border:1px solid var(--border,#e5e7eb);border-radius:14px;padding:10px;background:rgba(255,255,255,.72);}
      .global-search-sweep-result .actions{margin-top:8px;}
      .global-search-sweep-counts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}
      .global-search-sweep-counts span{border:1px solid var(--border,#e5e7eb);border-radius:999px;padding:4px 8px;font-size:12px;background:rgba(255,255,255,.72);}
      #nav{overflow:hidden;}
      #navInner{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-inline:6px;}
      #navInner::-webkit-scrollbar{display:none;}
      #navInner .tab{flex:0 0 auto;min-width:64px;max-width:86px;white-space:nowrap;}
      #navInner .nav-label{display:block;overflow:hidden;text-overflow:ellipsis;}
      @media(max-width:640px){
        .home-sweep-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;}
        .global-search-sweep-row{grid-template-columns:1fr;}
        .global-search-sweep-actions .btn{flex:1 1 auto;}
        #navInner .tab{min-width:58px;max-width:76px;}
      }
    `;
    try { document.head.appendChild(style); } catch (_) {}
  }

  function fallbackQuickItems(){
    const c = unreadCountersSafe();
    if(roleSafe() === "trader"){
      return [["tasks","✅","المهام",dailyTaskCountSafe()],["search","🔎","بحث",0],["items","📦","الأصناف",0],["customers","👥","العملاء",0],["orders","🧾","الطلبات",c.orders||0],["payments","💵","السداد",c.payments||0],["invoices","📄","الفواتير",0],["statement","📊","كشف الحساب",0],["stock","🏬","المخزون",0],["reports","📈","التقارير",0],["settings","🛠️","الإعدادات",0]];
    }
    return [["tasks","✅","المهام",dailyTaskCountSafe()],["search","🔎","بحث",0],["shops","🏪","متاجري",0],["items","🛒","شراء",0],["orders","🧾","طلباتي",c.orders||0],["payments","💵","السداد",c.payments||0],["invoices","📄","الفواتير",0],["statement","📊","كشف الحساب",0],["messages","💬","الرسائل",c.messages||0],["settings","🛠️","الإعدادات",0]];
  }
  function quickItems(){
    try {
      if(typeof homeQuickItems === "function"){
        const rows = homeQuickItems();
        if(Array.isArray(rows) && rows.length) return rows;
      }
    } catch (_) {}
    return fallbackQuickItems();
  }
  function homeStats(){
    const c = unreadCountersSafe();
    const cacheObj = (typeof cache !== "undefined" && cache) ? cache : {};
    if(roleSafe() === "trader"){
      return [
        ["الأصناف", countSafe(cacheObj.items)],
        ["العملاء", countSafe(cacheObj.customers)],
        ["طلبات معلقة", Number(c.orders || 0)],
        ["سدادات معلقة", Number(c.payments || 0)]
      ];
    }
    let links = 0;
    try { links = Array.isArray(state && state.customerLinks) ? state.customerLinks.length : 0; } catch (_) {}
    const balance = (()=>{ try { const row = (cacheObj.customers || [])[0] || {}; return Number(row.balance || 0); } catch (_) { return 0; } })();
    return [
      ["المتاجر", links],
      ["طلباتي", Number(c.orders || 0)],
      ["الفواتير", countSafe(cacheObj.invoices)],
      ["الرصيد", moneySafe(balance)]
    ];
  }
  function renderHomeQuickGridSweep(){
    return `<div class="home-sweep-grid quick-home-grid">${quickItems().map(function(row){
      const page = safeString(row[0] || "home"), icon = safeString(row[1] || "•"), label = safeString(row[2] || page), count = Number(row[3] || 0);
      return `<button type="button" class="quick-home-btn" data-home-page="${escSafe(page)}" aria-label="${escSafe(label)}"><span class="qicon">${escSafe(icon)}</span><span class="qlabel">${escSafe(label)}</span>${badgeHtmlSafe(count)}</button>`;
    }).join("")}</div>`;
  }
  function bindHomeQuickGridSweep(){
    qsa("#page_home [data-home-page]").forEach(function(btn){
      btn.onclick = function(){ try { show(btn.getAttribute("data-home-page") || "home"); } catch (_) {} };
    });
  }
  function renderHomeSweep(){
    ensureStyle();
    const root = byId("page_home");
    if(!root) return;
    const stats = homeStats();
    root.innerHTML = `<div class="card"><div class="home-sweep-head"><h2>الرئيسية</h2><button type="button" class="btn secondary mini" id="homeSweepOpenSearch">بحث</button></div><div class="home-sweep-stats">${stats.map(function(x){ return `<div class="home-sweep-stat"><span>${escSafe(x[0])}</span><b>${escSafe(x[1])}</b></div>`; }).join("")}</div>${renderHomeQuickGridSweep()}</div>`;
    bindHomeQuickGridSweep();
    const search = byId("homeSweepOpenSearch");
    if(search) search.onclick = function(){ try { show("search"); } catch (_) {} };
    window.__hesabiHomeSweepBound = { at:Date.now(), buttons:qsa("#page_home [data-home-page]").length, stats:stats.length };
  }

  function getSearchRows(){
    try { return typeof buildSearchRows === "function" ? buildSearchRows() : []; }
    catch (_) { return []; }
  }
  function searchMatchSafe(text, q){
    try { return typeof searchMatch === "function" ? searchMatch(text, q) : safeString(text).toLowerCase().indexOf(safeString(q).toLowerCase()) !== -1; }
    catch (_) { return true; }
  }
  function searchTypeOptionsSweep(type){
    try { if(typeof searchTypeOptions === "function") return searchTypeOptions(); } catch (_) {}
    const common = [["all","كل النتائج"],["items","الأصناف"],["orders","الطلبات"],["invoices","الفواتير"],["payments","السداد"],["messages","الرسائل"],["returns","المرتجعات"],["schedules","الاستحقاقات"],["statement","كشف الحساب"],["customers","العملاء"],["stock","المخزون"],["audit","السجل"],["shops","متاجري"]];
    return common.map(function(x){ return `<option value="${escSafe(x[0])}" ${type===x[0]?"selected":""}>${escSafe(x[1])}</option>`; }).join("");
  }
  function resultOpenPayload(row){
    try { return JSON.stringify({ page: row.page || "home", meta: row.meta || {} }); } catch (_) { return '{"page":"home","meta":{}}'; }
  }
  function renderSearchSweep(){
    ensureStyle();
    const root = byId("page_search");
    if(!root) return;
    try { if(!state.searchType) state.searchType = "all"; } catch (_) {}
    const q = (()=>{ try { return safeString(state.searchQuery || ""); } catch (_) { return ""; } })();
    const type = (()=>{ try { return safeString(state.searchType || "all"); } catch (_) { return "all"; } })();
    const allRows = getSearchRows();
    const rows = allRows.filter(function(r){ return (type === "all" || r.type === type || r.page === type) && searchMatchSafe(r.searchText, q); }).slice(0, 120);
    const counts = allRows.reduce(function(acc, r){ acc[r.type] = (acc[r.type] || 0) + 1; return acc; }, {});
    root.innerHTML = `<div class="card global-search-sweep-card"><h2>البحث العام</h2><div class="global-search-sweep-row"><div class="field"><label>كلمة البحث</label><input id="globalSearchInput" value="${escSafe(q)}" type="search" inputmode="search" autocomplete="off" placeholder="اسم، رقم، صنف، فاتورة، مبلغ، رسالة"></div><div class="field"><label>نوع البحث</label><select id="globalSearchType">${searchTypeOptionsSweep(type)}</select></div></div><div class="global-search-sweep-actions"><button type="button" class="btn secondary" id="applyGlobalSearch">بحث</button><button type="button" class="btn light" id="clearGlobalSearch">مسح</button><button type="button" class="btn light" id="refreshGlobalSearch">تحديث</button></div><div class="global-search-sweep-counts"><span>المعروض: ${rows.length}</span><span>الأصناف: ${counts.items||0}</span><span>الطلبات: ${counts.orders||0}</span><span>الفواتير: ${counts.invoices||0}</span><span>السداد: ${counts.payments||0}</span></div></div><div class="card"><h2>النتائج</h2><div class="global-search-sweep-results">${rows.map(function(r){ return `<div class="global-search-sweep-result"><div class="row"><h3>${escSafe(r.title)}</h3><span class="status approved">${escSafe(r.label)}</span></div><div class="muted">${escSafe(r.subtitle)}</div><div class="actions"><button type="button" class="btn secondary" data-open-result="${escSafe(resultOpenPayload(r))}">فتح المكان</button>${r.meta && r.meta.customerId ? `<button type="button" class="btn light" data-open-statement="${escSafe(r.meta.customerId)}">كشف الحساب</button>` : ""}</div></div>`; }).join("") || '<div class="empty">لا توجد نتائج مطابقة.</div>'}</div></div>`;
    bindSearchNow();
    window.__hesabiGlobalSearchSweepBound = { at:Date.now(), rows:rows.length, all:allRows.length, type:type };
  }
  function bindSearchNow(){
    const input = byId("globalSearchInput"), type = byId("globalSearchType");
    const apply = function(){
      try { state.searchQuery = input ? input.value : ""; state.searchType = type ? type.value : "all"; saveState(); } catch (_) {}
      renderSearchSweep();
      setTimeout(function(){ const next = byId("globalSearchInput"); if(next){ try { next.focus(); next.setSelectionRange(next.value.length, next.value.length); } catch (_) {} } }, 0);
    };
    if(input){
      input.oninput = function(){};
      input.onkeydown = function(ev){ if(ev && ev.key === "Enter"){ ev.preventDefault(); apply(); } };
    }
    if(type) type.onchange = apply;
    const applyBtn = byId("applyGlobalSearch"); if(applyBtn) applyBtn.onclick = apply;
    const clearBtn = byId("clearGlobalSearch"); if(clearBtn) clearBtn.onclick = function(){ try { state.searchQuery = ""; state.searchType = "all"; saveState(); } catch (_) {} renderSearchSweep(); };
    const refreshBtn = byId("refreshGlobalSearch"); if(refreshBtn) refreshBtn.onclick = function(){ renderSearchSweep(); };
    qsa("#page_search [data-open-result]").forEach(function(btn){
      btn.onclick = function(){
        try {
          const r = JSON.parse(btn.getAttribute("data-open-result") || "{}");
          if(r.meta && r.meta.customerId){ try { state.statementCustomer = r.meta.customerId; state.messageCustomer = r.meta.customerId; } catch (_) {} }
          if(r.meta && r.meta.itemId){ try { state.stockFilterItem = r.meta.itemId; } catch (_) {} }
          saveState();
          show(r.page || "home");
        } catch (_) { try { show("home"); } catch (__) {} }
      };
    });
    qsa("#page_search [data-open-statement]").forEach(function(btn){ btn.onclick = function(){ try { state.statementCustomer = btn.getAttribute("data-open-statement"); saveState(); show("statement"); } catch (_) {} }; });
  }

  function navItems(){
    const c = unreadCountersSafe();
    const items = [
      {page:"home", icon:"🏠", label:"الرئيسية", count:0},
      {page:"search", icon:"🔎", label:"بحث", count:0},
      {page:"back", icon:"↩️", label:"رجوع", count:0, back:true},
      {page:"settings", icon:"⚙️", label:"الإعدادات", count:0}
    ];
    try { if(typeof isAppOwner === "function" && isAppOwner()) items.push({page:"owner", icon:"👑", label:"المالك", count:0}); } catch (_) {}
    items.push({page:"notifications", icon:"🔔", label:"الإشعارات", count:c.notifications || 0});
    items.push({page:"messages", icon:"💬", label:"الرسائل", count:c.messages || 0});
    return items;
  }
  function renderNavSweep(){
    ensureStyle();
    const nav = byId("navInner");
    if(!nav) return;
    const current = (()=>{ try { return safeString(active || "home"); } catch (_) { return "home"; } })();
    nav.innerHTML = navItems().map(function(it){
      const attrs = it.back ? 'data-back="1"' : `data-tab="${escSafe(it.page)}"`;
      const count = Number(it.count || 0);
      const badge = count > 0 ? `<span class="nav-badge">${count > 99 ? "99+" : escSafe(count)}</span>` : "";
      return `<button type="button" class="tab ${current === it.page ? "active" : ""}" ${attrs} aria-label="${escSafe(it.label)}"><span class="nav-ico">${escSafe(it.icon)}</span><span class="nav-label">${escSafe(it.label)}</span>${badge}</button>`;
    }).join("");
    qsa("#navInner [data-tab]").forEach(function(btn){ btn.onclick = function(){ try { show(btn.getAttribute("data-tab") || "home"); } catch (_) {} }; });
    qsa("#navInner [data-back]").forEach(function(btn){ btn.onclick = function(){ try { if(typeof goBack === "function") goBack(); else show("home"); } catch (_) {} }; });
    window.__hesabiNavigationSweepBound = { at:Date.now(), buttons:qsa("#navInner .tab").length, scoped:true };
  }

  function activate(){
    ensureStyle();
    let home = false, search = false, nav = false;
    try { renderHome = renderHomeSweep; home = true; } catch (_) {}
    try { window.renderHome = renderHomeSweep; } catch (_) {}
    try { renderSearch = renderSearchSweep; search = true; } catch (_) {}
    try { window.renderSearch = renderSearchSweep; } catch (_) {}
    try { renderNav = renderNavSweep; nav = true; } catch (_) {}
    try { window.renderNav = renderNavSweep; } catch (_) {}
    try { if(globalThis.__hesabiRenderers){ globalThis.__hesabiRenderers.home = renderHomeSweep; globalThis.__hesabiRenderers.search = renderSearchSweep; } } catch (_) {}
    try { renderNavSweep(); } catch (_) {}
    try { if(typeof active !== "undefined" && active === "home") renderHomeSweep(); } catch (_) {}
    try { if(typeof active !== "undefined" && active === "search") renderSearchSweep(); } catch (_) {}
    window.__hesabiHomeSearchNavigationSweepInstalled = { at:Date.now(), home, search, nav };
    return window.__hesabiHomeSearchNavigationSweepInstalled;
  }
  function selfCheck(){
    const api = window.hesabiHomeSearchNavigationSweep || {};
    const required = ["renderHomeSweep","renderSearchSweep","renderNavSweep","bindSearchNow","activate"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    let searchRowsOk = false, quickOk = false;
    try { searchRowsOk = Array.isArray(getSearchRows()); } catch (_) {}
    try { quickOk = Array.isArray(quickItems()) && quickItems().length > 0; } catch (_) {}
    return { ok: missing.length === 0 && searchRowsOk && quickOk, version:VERSION, build:BUILD_CODE, missing, searchRowsOk, quickOk, installed:!!window.__hesabiHomeSearchNavigationSweepInstalled, bindings:{ home:window.__hesabiHomeSweepBound || null, search:window.__hesabiGlobalSearchSweepBound || null, nav:window.__hesabiNavigationSweepBound || null } };
  }
  const api = { version:VERSION, build:BUILD_CODE, renderHomeSweep, renderSearchSweep, renderNavSweep, bindHomeQuickGridSweep, bindSearchNow, activate, selfCheck };
  window.hesabiHomeSearchNavigationSweep = api;
  window.hesabiHomeSearchNavigationSweepSelfCheck = selfCheck;
  activate();
})();
