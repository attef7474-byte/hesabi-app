/* Hesabi 1.0.107 - Stock + Daily Collections Page Sweep.
   Scope: UI rendering, tabs, local search, pagination, stock adjustment buttons,
   collection approve/reject/receipt buttons, CSV/share and mobile table guards only.
   No Firestore write logic is changed; existing functions are called as-is. */
(function(){
  "use strict";
  const VERSION = "1.0.107";
  const BUILD_CODE = 107;

  function byId(id){ try { return document.getElementById(id); } catch (_) { return null; } }
  function page(name){ return byId("page_" + name); }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch (_) { return []; } }
  function safeString(value){ try { return String(value == null ? "" : value); } catch (_) { return ""; } }
  function escSafe(value){
    try { return typeof esc === "function" ? esc(value == null ? "" : value) : safeString(value).replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch])); }
    catch (_) { return ""; }
  }
  function moneySafe(value){
    try { return typeof money === "function" ? money(value) : new Intl.NumberFormat("ar-YE").format(Number(value || 0)); }
    catch (_) { return safeString(value || 0); }
  }
  function dtSafe(ms){
    try { return typeof dt === "function" ? dt(ms) : (ms ? new Date(Number(ms)).toLocaleString("ar") : "-"); }
    catch (_) { return "-"; }
  }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch (_) {} }
  function saveState(){ try { if(typeof save === "function") save(); } catch (_) {} }
  function now(){ try { return Date.now(); } catch (_) { return 0; } }
  function today(){ try { return typeof todayIso === "function" ? todayIso() : new Date().toISOString().slice(0,10); } catch (_) { return ""; } }
  function role(){ try { return state && state.role; } catch (_) { return ""; } }
  function isTraderRole(){ return role() === "trader"; }
  function itemCat(item){
    try { return typeof itemCategory === "function" ? itemCategory(item) : (item && (item.category || item.group || "عام")) || "عام"; }
    catch (_) { return "عام"; }
  }
  function statusTextSafe(status){
    try { return typeof statusText === "function" ? statusText(status) : ({approved:"مقبول",pending:"معلق",rejected:"مرفوض",paid:"مدفوع",cancelled:"ملغي"}[status] || status || "-"); }
    catch (_) { return status || "-"; }
  }

  function ensureStyle(){
    if(byId("stockCollectionsSweepStyle")) return;
    const style = document.createElement("style");
    style.id = "stockCollectionsSweepStyle";
    style.textContent = `
      #page_stock,#page_collections{max-width:100%;overflow-x:hidden;}
      #page_stock .card,#page_collections .card{max-width:100%;}
      .stock-collections-tabs{display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:4px 0 8px;}
      .stock-collections-tabs .workspace-tab{white-space:nowrap;min-width:max-content;}
      .stock-collections-table-wrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
      .stock-collections-table{width:100%;min-width:720px;}
      .stock-collections-toolbar{display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:8px 0;}
      .stock-collections-toolbar .field{flex:1 1 150px;margin:0;}
      .stock-collections-toolbar .actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
      .stock-collections-mini-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;}
      .stock-collections-mini-stat{border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:10px;background:rgba(255,255,255,.55);}
      .stock-collections-mini-stat span{display:block;font-size:12px;opacity:.75;}
      .stock-collections-mini-stat b{font-size:16px;}
      .stock-collections-safe-actions{display:flex;gap:5px;flex-wrap:wrap;}
      .stock-collections-note{font-size:12px;opacity:.72;margin-top:4px;}
      @media(max-width:640px){
        .stock-collections-table{min-width:650px;}
        .stock-collections-toolbar .field{flex:1 1 100%;}
        .stock-collections-toolbar .actions{width:100%;}
        .stock-collections-toolbar .actions .btn{flex:1 1 auto;}
      }
    `;
    try { document.head.appendChild(style); } catch (_) {}
  }

  function ensureMobileTableGuard(root){
    if(!root) return;
    ensureStyle();
    try{
      qsa(".tablewrap,.table-wrap", root).forEach(function(w){
        w.classList.add("stock-collections-table-wrap");
        w.style.maxWidth = "100%";
        w.style.overflowX = "auto";
        w.style.webkitOverflowScrolling = "touch";
      });
      qsa("table", root).forEach(function(t){ t.classList.add("stock-collections-table"); });
    }catch(_){ }
  }

  function getState(key, fallback){ try { return (state && state[key] != null && state[key] !== "") ? state[key] : fallback; } catch (_) { return fallback; } }
  function setState(key, value){ try { state[key] = value; saveState(); } catch (_) {} }
  function setPage(key, pageNo){ setState(key + "Page", Math.max(1, Number(pageNo || 1))); }

  function norm(value){
    return safeString(value).toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[أإآا]/g, "ا")
      .replace(/[ى]/g, "ي")
      .replace(/[ة]/g, "ه")
      .replace(/\s+/g, " ").trim();
  }
  function localFilter(key, data, textFn, pageSize){
    const all = Array.isArray(data) ? data : [];
    const q = norm(getState(key + "Q", ""));
    const size = Math.max(5, Number(getState(key + "PageSize", pageSize || 50)) || 50);
    const filtered = q ? all.filter(function(row){ return norm(textFn ? textFn(row) : JSON.stringify(row || {})).indexOf(q) >= 0; }) : all.slice();
    const pages = Math.max(1, Math.ceil(filtered.length / size));
    let pageNo = Math.max(1, Number(getState(key + "Page", 1)) || 1);
    if(pageNo > pages){ pageNo = pages; setPage(key, pageNo); }
    const start = (pageNo - 1) * size;
    return { key, q, page:pageNo, pageSize:size, total:all.length, filteredCount:filtered.length, pages, filtered, visible:filtered.slice(start, start + size) };
  }
  function toolbarHtml(key, meta, searchLabel, extra){
    const value = escSafe(getState(key + "Q", ""));
    return `<div class="stock-collections-toolbar" data-sweep-toolbar="${escSafe(key)}">
      <div class="field"><label>${escSafe(searchLabel || "بحث")}</label><input id="${escSafe(key)}Search" value="${value}" type="search" inputmode="search" autocomplete="off" placeholder="بحث"></div>
      ${extra || ""}
      <div class="actions">
        <button type="button" class="btn secondary mini" id="${escSafe(key)}Apply">بحث</button>
        <button type="button" class="btn light mini" id="${escSafe(key)}Clear">مسح</button>
        <button type="button" class="btn light mini" id="${escSafe(key)}Prev" ${meta.page <= 1 ? "disabled" : ""}>السابق</button>
        <span class="muted">${moneySafe(meta.page)} / ${moneySafe(meta.pages)}</span>
        <button type="button" class="btn light mini" id="${escSafe(key)}Next" ${meta.page >= meta.pages ? "disabled" : ""}>التالي</button>
      </div>
    </div>`;
  }
  function bindToolbar(key, rerender){
    const input = byId(key + "Search"), apply = byId(key + "Apply"), clear = byId(key + "Clear"), prev = byId(key + "Prev"), next = byId(key + "Next");
    if(input){
      input.oninput = function(){ /* keep keyboard open; apply search explicitly */ };
      input.onkeydown = function(ev){ if(ev.key === "Enter"){ ev.preventDefault(); setState(key + "Q", input.value || ""); setPage(key, 1); if(typeof rerender === "function") rerender(); } };
    }
    if(apply) apply.onclick = function(){ setState(key + "Q", input ? input.value || "" : ""); setPage(key, 1); if(typeof rerender === "function") rerender(); };
    if(clear) clear.onclick = function(){ if(input) input.value = ""; setState(key + "Q", ""); setPage(key, 1); if(typeof rerender === "function") rerender(); };
    if(prev) prev.onclick = function(){ setPage(key, Number(getState(key + "Page", 1)) - 1); if(typeof rerender === "function") rerender(); };
    if(next) next.onclick = function(){ setPage(key, Number(getState(key + "Page", 1)) + 1); if(typeof rerender === "function") rerender(); };
  }
  function tableHtml(key, title, headers, rows, meta, emptyText, extra){
    return `<div class="card demand-card" data-demand-card="${escSafe(key)}">
      <div class="row"><h2>${escSafe(title)}</h2><span class="badge">${moneySafe(meta.filteredCount)} / ${moneySafe(meta.total)}</span></div>
      ${toolbarHtml(key, meta, "بحث", extra)}
      <div class="stock-collections-table-wrap"><table class="stock-collections-table"><thead><tr>${headers.map(function(h){ return `<th>${escSafe(h)}</th>`; }).join("")}</tr></thead><tbody>${rows.length ? rows.join("") : `<tr><td colspan="${Math.max(1, headers.length)}" class="muted">${escSafe(emptyText || "لا توجد بيانات")}</td></tr>`}</tbody></table></div>
    </div>`;
  }
  function tabBarHtml(key, current, tabs){
    return `<div class="card page-tabs-card"><div class="stock-collections-tabs">${tabs.map(function(t){ return `<button type="button" class="workspace-tab ${current === t[0] ? "active" : ""}" data-stock-collections-tab="${escSafe(key)}" data-tab-value="${escSafe(t[0])}"><span>${t[1]}</span><b>${escSafe(t[2])}</b></button>`; }).join("")}</div></div>`;
  }
  function bindTabs(key, rerender){
    qsa(`[data-stock-collections-tab="${key}"]`).forEach(function(btn){
      btn.onclick = function(){ setState(key + "Tab", btn.getAttribute("data-tab-value") || "list"); if(typeof rerender === "function") rerender(); };
    });
  }
  function miniStatsHtml(items){
    return `<div class="card"><div class="stock-collections-mini-stats">${items.map(function(x){ return `<div class="stock-collections-mini-stat"><span>${escSafe(x[0])}</span><b>${escSafe(x[1])}</b></div>`; }).join("")}</div></div>`;
  }
  function statusClass(cls){ return cls === "out" ? "rejected" : (cls === "low" ? "pending" : "approved"); }
  function stockStatus(item){
    const stock = Number(item && item.stock || 0);
    const min = Number(item && item.minStock || 0);
    if(stock <= 0) return { key:"out", label:"نافد", cls:"out" };
    if(min > 0 && stock <= min) return { key:"low", label:"منخفض", cls:"low" };
    return { key:"good", label:"جيد", cls:"good" };
  }
  function categories(){
    const set = new Set(["الكل"]);
    try { (cache.items || []).forEach(function(i){ set.add(itemCat(i)); }); } catch (_) {}
    return Array.from(set).filter(Boolean).sort(function(a,b){ return a === "الكل" ? -1 : (b === "الكل" ? 1 : a.localeCompare(b)); });
  }
  function stockDataForTab(tab){
    let data = [];
    try { data = (cache.items || []).slice(); } catch (_) { data = []; }
    const cat = getState("stockSweepCategory", "الكل");
    const status = getState("stockSweepStatus", "all");
    if(cat && cat !== "الكل") data = data.filter(function(i){ return itemCat(i) === cat; });
    if(tab === "low") data = data.filter(function(i){ return ["low","out"].indexOf(stockStatus(i).key) >= 0; });
    if(status !== "all") data = data.filter(function(i){ return stockStatus(i).key === status; });
    return data;
  }
  function stockExtraControls(){
    const cat = getState("stockSweepCategory", "الكل");
    const status = getState("stockSweepStatus", "all");
    return `<div class="field"><label>التصنيف</label><select id="stockSweepCategory">${categories().map(function(c){ return `<option value="${escSafe(c)}" ${c === cat ? "selected" : ""}>${escSafe(c)}</option>`; }).join("")}</select></div>
      <div class="field"><label>الحالة</label><select id="stockSweepStatus"><option value="all" ${status === "all" ? "selected" : ""}>الكل</option><option value="good" ${status === "good" ? "selected" : ""}>جيد</option><option value="low" ${status === "low" ? "selected" : ""}>منخفض</option><option value="out" ${status === "out" ? "selected" : ""}>نافد</option></select></div>
      <div class="actions"><button type="button" class="btn light mini" id="stockSweepExportItems">CSV الأصناف</button><button type="button" class="btn light mini" id="stockSweepExportLedger">CSV الحركات</button></div>`;
  }
  function stockRows(items){
    return items.map(function(i){
      const st = stockStatus(i);
      const active = i && i.isActive === false ? "مخفي" : "ظاهر";
      return `<tr><td class="name"><b>${escSafe(i && i.name || "صنف")}</b><div class="subcell">${escSafe(i && (i.barcode || i.code || ""))}</div></td><td>${escSafe(itemCat(i))}</td><td>${escSafe(i && i.unit || "-")}</td><td><b>${moneySafe(Number(i && i.stock || 0))}</b></td><td>${moneySafe(Number(i && i.minStock || 0))}</td><td><span class="status ${statusClass(st.cls)}">${escSafe(st.label)}</span><div class="subcell">${active}</div></td><td><div class="stock-collections-safe-actions"><button type="button" class="btn secondary mini" data-stock-adjust="${escSafe(i && i.id)}">تسوية</button><button type="button" class="btn light mini" data-stock-edit="${escSafe(i && i.id)}">تعديل</button></div></td></tr>`;
    });
  }
  function ledgerRows(rows){
    return rows.map(function(s){
      const diff = Number(s && (s.qtyChange != null ? s.qtyChange : s.qty || 0));
      return `<tr><td>${dtSafe(s && s.createdMs)}</td><td class="name">${escSafe(s && s.itemName || "صنف")}</td><td>${moneySafe(Number(s && s.qty || Math.abs(diff) || 0))}</td><td><b>${diff > 0 ? "+" : ""}${moneySafe(diff)}</b></td><td>${escSafe(s && s.type || "-")}</td><td>${escSafe(s && (s.reason || s.note || s.sourceType || ""))}</td></tr>`;
    });
  }
  function exportCsv(filename, header, rows){
    function csv(v){ return '"' + safeString(v).replace(/"/g, '""') + '"'; }
    const text = "\ufeff" + [header.map(csv).join(",")].concat(rows.map(function(r){ return r.map(csv).join(","); })).join("\n");
    try{
      const blob = new Blob([text], { type:"text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
      notify("تم تجهيز ملف CSV.", "success");
      return true;
    }catch(_){ notify("تعذر تصدير CSV من هذا الجهاز.", "error"); return false; }
  }
  function exportStockItems(){
    let rows = [];
    try { rows = (cache.items || []).map(function(i){ const st = stockStatus(i); return [i.name || "", itemCat(i), i.unit || "", i.barcode || i.code || "", i.stock || 0, i.minStock || 0, st.label, i.isActive === false ? "hidden" : "visible"]; }); } catch (_) {}
    return exportCsv("hesabi-stock-items-" + today() + ".csv", ["name","category","unit","barcode","stock","minStock","status","visibility"], rows);
  }
  function exportStockLedger(){
    let rows = [];
    try { rows = (cache.stockLedger || []).map(function(s){ return [s.createdMs ? new Date(Number(s.createdMs)).toISOString() : "", s.itemName || "", s.qty || 0, s.qtyChange || 0, s.type || "", s.reason || s.note || s.sourceType || ""]; }); } catch (_) {}
    return exportCsv("hesabi-stock-ledger-" + today() + ".csv", ["date","item","qty","qtyChange","type","note"], rows);
  }
  function openItemEdit(itemId){
    try{
      if(!itemId) return;
      if(typeof selectItemForEdit === "function") { selectItemForEdit(itemId); return; }
      state.editItemId = itemId;
      state.itemsTab = "edit";
      saveState();
      if(typeof show === "function") show("items");
      else if(typeof renderItems === "function") renderItems();
    }catch(_){ notify("تعذر فتح تعديل الصنف.", "error"); }
  }
  function bindStockNow(){
    const root = page("stock");
    if(!root) return { ok:false, reason:"stock page missing" };
    bindTabs("stockSweep", renderStock);
    ["stockSweepItems","stockSweepLedger"].forEach(function(key){ bindToolbar(key, renderStock); });
    const cat = byId("stockSweepCategory"), status = byId("stockSweepStatus");
    if(cat) cat.onchange = function(){ setState("stockSweepCategory", cat.value || "الكل"); setPage("stockSweepItems", 1); renderStock(); };
    if(status) status.onchange = function(){ setState("stockSweepStatus", status.value || "all"); setPage("stockSweepItems", 1); renderStock(); };
    const expItems = byId("stockSweepExportItems"), expLedger = byId("stockSweepExportLedger");
    if(expItems) expItems.onclick = exportStockItems;
    if(expLedger) expLedger.onclick = exportStockLedger;
    qsa("[data-stock-adjust]", root).forEach(function(b){ b.onclick = function(){ const id = b.getAttribute("data-stock-adjust"); if(typeof editStock === "function") editStock(id); else notify("دالة تسوية المخزون غير متاحة.", "error"); }; });
    qsa("[data-stock-edit]", root).forEach(function(b){ b.onclick = function(){ openItemEdit(b.getAttribute("data-stock-edit")); }; });
    ensureMobileTableGuard(root);
    window.__hesabiStockSweepBound = { at:now(), items:(cache.items || []).length, ledger:(cache.stockLedger || []).length };
    return Object.assign({ ok:true }, window.__hesabiStockSweepBound);
  }
  function renderStockSweep(){
    if(!isTraderRole()){ if(typeof show === "function") show("home"); return; }
    ensureStyle();
    const root = page("stock");
    if(!root) return;
    const tab = getState("stockSweepTab", "summary");
    const tabs = [["summary","📊","ملخص"],["items","📦","المخزون"],["low","⚠️","منخفض"],["ledger","🧾","الحركات"]];
    const allItems = (cache.items || []).slice();
    const allLedger = (cache.stockLedger || []).slice();
    const low = allItems.filter(function(i){ return stockStatus(i).key === "low"; }).length;
    const out = allItems.filter(function(i){ return stockStatus(i).key === "out"; }).length;
    const totalQty = allItems.reduce(function(a,i){ return a + Number(i.stock || 0); }, 0);
    const stats = miniStatsHtml([["الأصناف", moneySafe(allItems.length)],["إجمالي الكمية", moneySafe(totalQty)],["منخفض", moneySafe(low)],["نافد", moneySafe(out)],["حركات المخزون", moneySafe(allLedger.length)]]);
    const itemSource = stockDataForTab(tab);
    const itemMeta = localFilter("stockSweepItems", itemSource, function(i){ return [i.name, itemCat(i), i.unit, i.barcode, i.code, i.stock, i.minStock, stockStatus(i).label].join(" "); }, 25);
    const ledgerSource = allLedger.slice().sort(function(a,b){ return Number(b.createdMs || 0) - Number(a.createdMs || 0); });
    const ledgerMeta = localFilter("stockSweepLedger", ledgerSource, function(s){ return [s.itemName, s.qty, s.qtyChange, s.type, s.reason, s.note, s.sourceType].join(" "); }, 25);
    let html = tabBarHtml("stockSweep", tab, tabs) + stats;
    if(tab === "summary"){
      html += tableHtml("stockSweepItems", "الأصناف المنخفضة والنافدة", ["الصنف","التصنيف","الوحدة","الكمية","حد التنبيه","الحالة","إجراء"], stockRows(itemMeta.visible), itemMeta, "لا توجد أصناف منخفضة", stockExtraControls());
      html += tableHtml("stockSweepLedger", "آخر حركات المخزون", ["التاريخ","الصنف","الكمية","الفرق","النوع","البيان"], ledgerRows(ledgerMeta.visible.slice(0,10)), ledgerMeta, "لا توجد حركات مخزون", `<div class="actions"><button type="button" class="btn light mini" id="stockSweepExportLedger">CSV الحركات</button></div>`);
    } else if(tab === "ledger"){
      html += tableHtml("stockSweepLedger", "حركات المخزون", ["التاريخ","الصنف","الكمية","الفرق","النوع","البيان"], ledgerRows(ledgerMeta.visible), ledgerMeta, "لا توجد حركات مخزون", `<div class="actions"><button type="button" class="btn light mini" id="stockSweepExportLedger">CSV الحركات</button></div>`);
    } else {
      html += tableHtml("stockSweepItems", tab === "low" ? "الأصناف المنخفضة والنافدة" : "المخزون", ["الصنف","التصنيف","الوحدة","الكمية","حد التنبيه","الحالة","إجراء"], stockRows(itemMeta.visible), itemMeta, "لا توجد أصناف مطابقة", stockExtraControls());
    }
    root.innerHTML = html;
    setTimeout(bindStockNow, 0);
  }

  function paymentDateSafe(p){
    try { if(typeof paymentDate === "function") return paymentDate(p); } catch (_) {}
    try { if(p && p.createdMs) return new Date(Number(p.createdMs)).toISOString().slice(0,10); } catch (_) {}
    return today();
  }
  function collectionRows(rows){
    return rows.map(function(p){
      const status = p && p.status || "pending";
      const actions = [`${p && p.receiptData ? `<button type="button" class="btn secondary mini" data-open-receipt="${escSafe(p.id)}">إيصال</button>` : ""}`];
      if(status === "pending") actions.push(`<button type="button" class="btn ok mini" data-approve-pay="${escSafe(p.id)}">قبول</button><button type="button" class="btn danger mini" data-reject-pay="${escSafe(p.id)}">رفض</button>`);
      return `<tr><td class="name"><b>${escSafe(p && p.customerName || "عميل")}</b><div class="subcell">${dtSafe(p && p.createdMs)}</div></td><td><b>${moneySafe(p && p.amount || 0)}</b></td><td>${escSafe(p && p.method || "-")}</td><td>${escSafe(p && p.referenceNo || "-")}</td><td><span class="status ${escSafe(status)}">${escSafe(statusTextSafe(status))}</span></td><td><div class="stock-collections-safe-actions">${actions.join("")}</div></td></tr>`;
    });
  }
  function collectionMethods(){
    const set = new Set(["all"]);
    try { (cache.payments || []).forEach(function(p){ set.add(p.method || "غير محدد"); }); } catch (_) {}
    return Array.from(set);
  }
  function collectionFilterSource(){
    const tab = getState("collectionSweepTab", "today");
    const selectedDate = getState("collectionSweepDate", today());
    const method = getState("collectionSweepMethod", "all");
    let data = [];
    try { data = (cache.payments || []).slice(); } catch (_) { data = []; }
    data = data.filter(function(p){ return paymentDateSafe(p) === selectedDate; });
    if(tab === "pending") data = data.filter(function(p){ return (p.status || "pending") === "pending"; });
    if(tab === "approved") data = data.filter(function(p){ return p.status === "approved"; });
    if(tab === "rejected") data = data.filter(function(p){ return p.status === "rejected"; });
    if(method !== "all") data = data.filter(function(p){ return (p.method || "غير محدد") === method; });
    return data.sort(function(a,b){ return Number(b.createdMs || 0) - Number(a.createdMs || 0); });
  }
  function collectionExtraControls(){
    const selectedDate = getState("collectionSweepDate", today());
    const method = getState("collectionSweepMethod", "all");
    return `<div class="field"><label>التاريخ</label><input id="collectionSweepDate" type="date" value="${escSafe(selectedDate)}"></div>
      <div class="field"><label>الطريقة</label><select id="collectionSweepMethod">${collectionMethods().map(function(m){ const label = m === "all" ? "كل الطرق" : m; return `<option value="${escSafe(m)}" ${m === method ? "selected" : ""}>${escSafe(label)}</option>`; }).join("")}</select></div>
      <div class="actions"><button type="button" class="btn secondary mini" id="collectionSweepShare">مشاركة</button><button type="button" class="btn light mini" id="collectionSweepExportCsv">CSV</button></div>`;
  }
  function exportCollections(){
    const rows = collectionFilterSource().map(function(p){ return [p.createdMs ? new Date(Number(p.createdMs)).toISOString() : "", p.customerName || "", p.amount || 0, p.method || "", p.referenceNo || "", p.status || "", p.note || ""]; });
    return exportCsv("hesabi-daily-collections-" + getState("collectionSweepDate", today()) + ".csv", ["date","customer","amount","method","reference","status","note"], rows);
  }
  function shareCollections(){
    try { if(typeof shareCollectionReport === "function") { shareCollectionReport(); return true; } } catch (_) {}
    const data = collectionFilterSource();
    const approved = data.filter(function(p){ return p.status === "approved"; }).reduce(function(a,p){ return a + Number(p.amount || 0); }, 0);
    const pending = data.filter(function(p){ return (p.status || "pending") === "pending"; }).reduce(function(a,p){ return a + Number(p.amount || 0); }, 0);
    const text = `تقرير التحصيل اليومي\nالتاريخ: ${getState("collectionSweepDate", today())}\nمقبول: ${moneySafe(approved)}\nمعلق: ${moneySafe(pending)}\nالعدد: ${data.length}`;
    try { if(navigator.share){ navigator.share({ title:"تقرير التحصيل", text }); return true; } } catch (_) {}
    try { if(navigator.clipboard){ navigator.clipboard.writeText(text); notify("تم نسخ تقرير التحصيل.", "success"); return true; } } catch (_) {}
    try { if(typeof showAppDialog === "function") showAppDialog("تقرير التحصيل", text, "notice"); } catch (_) {}
    return true;
  }
  function bindCollectionsNow(){
    const root = page("collections");
    if(!root) return { ok:false, reason:"collections page missing" };
    bindTabs("collectionSweep", renderCollections);
    bindToolbar("collectionSweepList", renderCollections);
    const date = byId("collectionSweepDate"), method = byId("collectionSweepMethod");
    if(date) date.onchange = function(){ setState("collectionSweepDate", date.value || today()); setPage("collectionSweepList", 1); renderCollections(); };
    if(method) method.onchange = function(){ setState("collectionSweepMethod", method.value || "all"); setPage("collectionSweepList", 1); renderCollections(); };
    const share = byId("collectionSweepShare"), exp = byId("collectionSweepExportCsv");
    if(share) share.onclick = shareCollections;
    if(exp) exp.onclick = exportCollections;
    qsa("[data-open-receipt]", root).forEach(function(b){ b.onclick = function(){ if(typeof openReceipt === "function") openReceipt(b.getAttribute("data-open-receipt")); }; });
    qsa("[data-approve-pay]", root).forEach(function(b){ b.onclick = function(){ if(typeof approvePayment === "function") approvePayment(b.getAttribute("data-approve-pay")); }; });
    qsa("[data-reject-pay]", root).forEach(function(b){ b.onclick = function(){ if(typeof rejectPayment === "function") rejectPayment(b.getAttribute("data-reject-pay")); }; });
    ensureMobileTableGuard(root);
    window.__hesabiCollectionsSweepBound = { at:now(), payments:(cache.payments || []).length, visible:collectionFilterSource().length };
    return Object.assign({ ok:true }, window.__hesabiCollectionsSweepBound);
  }
  function renderCollectionsSweep(){
    if(!isTraderRole()){ if(typeof show === "function") show("home"); return; }
    ensureStyle();
    const root = page("collections");
    if(!root) return;
    if(!getState("collectionSweepDate", "")) setState("collectionSweepDate", today());
    const tab = getState("collectionSweepTab", "today");
    const tabs = [["today","🧮","اليوم"],["pending","⏳","معلق"],["approved","✅","مقبول"],["rejected","❌","مرفوض"]];
    const data = collectionFilterSource();
    const approved = data.filter(function(p){ return p.status === "approved"; }).reduce(function(a,p){ return a + Number(p.amount || 0); }, 0);
    const pending = data.filter(function(p){ return (p.status || "pending") === "pending"; }).reduce(function(a,p){ return a + Number(p.amount || 0); }, 0);
    const rejected = data.filter(function(p){ return p.status === "rejected"; }).reduce(function(a,p){ return a + Number(p.amount || 0); }, 0);
    const total = data.reduce(function(a,p){ return a + Number(p.amount || 0); }, 0);
    const meta = localFilter("collectionSweepList", data, function(p){ return [p.customerName, p.amount, p.method, p.referenceNo, p.status, p.note].join(" "); }, 25);
    const stats = miniStatsHtml([["إجمالي", moneySafe(total)],["مقبول", moneySafe(approved)],["معلق", moneySafe(pending)],["مرفوض", moneySafe(rejected)],["عدد", moneySafe(data.length)]]);
    root.innerHTML = tabBarHtml("collectionSweep", tab, tabs) + stats + tableHtml("collectionSweepList", "التحصيل اليومي", ["العميل","المبلغ","الطريقة","المرجع","الحالة","إجراء"], collectionRows(meta.visible), meta, "لا توجد تحصيلات مطابقة", collectionExtraControls());
    setTimeout(bindCollectionsNow, 0);
  }

  function activate(){
    ensureStyle();
    let replacedStock = false, replacedCollections = false;
    try { renderStock = renderStockSweep; replacedStock = true; } catch (_) {}
    try { window.renderStock = renderStockSweep; } catch (_) {}
    try { renderCollections = renderCollectionsSweep; replacedCollections = true; } catch (_) {}
    try { window.renderCollections = renderCollectionsSweep; } catch (_) {}
    try {
      if(globalThis.__hesabiRenderers){
        globalThis.__hesabiRenderers.stock = renderStockSweep;
        globalThis.__hesabiRenderers.collections = renderCollectionsSweep;
      }
    } catch (_) {}
    try { if(page("stock")) bindStockNow(); } catch (_) {}
    try { if(page("collections")) bindCollectionsNow(); } catch (_) {}
    window.__hesabiStockCollectionsPageSweepInstalled = { at: now(), replacedStock, replacedCollections };
    return window.__hesabiStockCollectionsPageSweepInstalled;
  }

  function selfCheck(){
    const api = window.hesabiStockCollectionsPageSweep || {};
    const required = ["renderStockSweep","renderCollectionsSweep","bindStockNow","bindCollectionsNow","exportStockItems","exportCollections","activate"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    const funcs = [
      ["renderStock", typeof renderStock === "function"],
      ["renderCollections", typeof renderCollections === "function"],
      ["editStock", typeof editStock === "function"],
      ["openReceipt", typeof openReceipt === "function"]
    ];
    const missingFuncs = funcs.filter(function(x){ return !x[1]; }).map(function(x){ return x[0]; });
    let filterOk = false;
    try { filterOk = localFilter("__stockCollectionsTest", [{name:"ماء"},{name:"زيت"}], function(x){ return x.name; }, 10).total === 2; } catch (_) { filterOk = false; }
    return { ok: missing.length === 0 && missingFuncs.length === 0 && filterOk, version: VERSION, build: BUILD_CODE, missing, missingFuncs, filterOk, installed: !!window.__hesabiStockCollectionsPageSweepInstalled, bindings: { stock: window.__hesabiStockSweepBound || null, collections: window.__hesabiCollectionsSweepBound || null } };
  }

  const api = { version:VERSION, build:BUILD_CODE, renderStockSweep, renderCollectionsSweep, bindStockNow, bindCollectionsNow, exportStockItems, exportStockLedger, exportCollections, shareCollections, ensureMobileTableGuard, activate, selfCheck };
  window.hesabiStockCollectionsPageSweep = api;
  window.hesabiStockCollectionsPageSweepSelfCheck = selfCheck;
  activate();
})();
