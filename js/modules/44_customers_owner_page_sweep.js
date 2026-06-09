/* Hesabi 1.0.104 - Customers + Owner/Subscriptions Page Final Sweep.
   Scope: interaction binding, local search, tab navigation and mobile table guards only.
   No Firestore write logic is changed; existing customer and owner actions remain the source of truth. */
(function(){
  "use strict";
  const VERSION = "1.0.104";
  const BUILD_CODE = 104;

  function byId(id){ try { return document.getElementById(id); } catch (_) { return null; } }
  function page(name){ return byId("page_" + name); }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch (_) { return []; } }
  function inPage(name, el){ const p = page(name); return !!(p && el && (el === p || p.contains(el))); }
  function norm(value){
    return String(value == null ? "" : value)
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[أإآا]/g, "ا")
      .replace(/[ى]/g, "ي")
      .replace(/[ة]/g, "ه")
      .replace(/\s+/g, " ")
      .trim();
  }
  function escSafe(value){
    try { return typeof esc === "function" ? esc(value == null ? "" : value) : String(value == null ? "" : value).replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch])); }
    catch (_) { return ""; }
  }
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch (_) {} }
  function saveState(){ try { if(typeof save === "function") save(); } catch (_) {} }

  function setTab(key, value){
    if(!key || !value) return false;
    try{
      if(typeof setPageTab === "function") { setPageTab(key, value, key === "customers" ? renderCustomers : renderOwnerConsole); return true; }
      if(typeof state === "object" && state){ state[key + "Tab"] = value; if(!state.pageTabs) state.pageTabs = {}; state.pageTabs[key] = value; }
      saveState();
      if(key === "customers" && typeof renderCustomers === "function") renderCustomers();
      if(key === "owner" && typeof renderOwnerConsole === "function") renderOwnerConsole();
      return true;
    }catch(e){ try { console.warn("customers/owner set tab failed", e); } catch(_){} return false; }
  }

  function ensureMobileTableGuard(root){
    if(!root) return;
    try{
      root.classList.add("customers-owner-sweep-root");
      qsa(".table-wrap", root).forEach(w => {
        w.classList.add("customers-owner-safe-table-wrap");
        w.style.maxWidth = "100%";
        w.style.overflowX = "auto";
        w.style.webkitOverflowScrolling = "touch";
      });
      qsa("table", root).forEach(t => {
        t.classList.add("customers-owner-safe-table");
        t.style.width = "100%";
      });
      if(!byId("customersOwnerSweepStyle")){
        const style = document.createElement("style");
        style.id = "customersOwnerSweepStyle";
        style.textContent = `
          #page_customers, #page_owner{max-width:100%;overflow-x:hidden;}
          .customers-owner-safe-table-wrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
          .customers-owner-safe-table{min-width:680px;}
          .customers-owner-search-box{margin:10px 0;}
          .customers-owner-search-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
          .customers-owner-search-row input{flex:1 1 180px;min-width:0;}
          .customers-owner-actions{display:flex;gap:6px;flex-wrap:wrap;}
          @media(max-width:640px){.customers-owner-safe-table{min-width:620px}.customers-owner-search-row .btn{flex:0 0 auto}}
        `;
        document.head.appendChild(style);
      }
    }catch(_){ }
  }

  function tableRows(root){
    return qsa("tbody tr", root).filter(function(row){ return !row.classList.contains("lines-row") || true; });
  }
  function applySearch(root, query){
    const q = norm(query);
    let visible = 0;
    const rows = tableRows(root);
    rows.forEach(function(row){
      const text = norm(row.textContent || "");
      const show = !q || text.indexOf(q) >= 0;
      row.style.display = show ? "" : "none";
      if(show) visible++;
    });
    const counter = root ? root.querySelector("[data-customers-owner-search-count]") : null;
    if(counter) counter.textContent = String(visible);
    return visible;
  }
  function ensureSearch(root, id, title){
    if(!root || byId(id)) return;
    const host = root.querySelector(".page-tabs-card") || root.querySelector(".card") || root;
    const box = document.createElement("div");
    box.className = "card customers-owner-search-box";
    box.innerHTML = `<div class="field"><label>${escSafe(title || "بحث")}</label><div class="customers-owner-search-row"><input id="${escSafe(id)}" type="search" autocomplete="off" inputmode="search" placeholder="اكتب للبحث داخل الصفحة"><button type="button" class="btn secondary mini" id="${escSafe(id)}Apply">بحث</button><button type="button" class="btn light mini" id="${escSafe(id)}Clear">مسح</button></div><div class="subcell">النتائج المعروضة: <b data-customers-owner-search-count="1">${tableRows(root).length}</b></div></div>`;
    try { host.insertAdjacentElement("afterend", box); } catch (_) { root.insertAdjacentElement("afterbegin", box); }
    const input = byId(id), apply = byId(id + "Apply"), clear = byId(id + "Clear");
    if(input){
      input.addEventListener("input", function(){ /* no rerender while typing, keep keyboard open */ });
      input.addEventListener("keydown", function(ev){ if(ev.key === "Enter"){ ev.preventDefault(); applySearch(root, input.value); } });
    }
    if(apply) apply.onclick = function(){ applySearch(root, input ? input.value : ""); };
    if(clear) clear.onclick = function(){ if(input) input.value = ""; applySearch(root, ""); if(input) input.focus(); };
    applySearch(root, "");
  }

  function bindCustomersNow(){
    const root = page("customers");
    if(!root) return { ok:false, reason:"customers page missing" };
    ensureMobileTableGuard(root);
    ensureSearch(root, "customersSweepSearch", "بحث في العملاء والأصناف المعروضة");
    try { if(typeof bindPageTabs === "function") bindPageTabs("customers", renderCustomers); } catch (_) {}
    qsa("[data-set-limit]", root).forEach(function(btn){ if(btn.__hesabiCustomersOwnerBound) return; btn.__hesabiCustomersOwnerBound = true; btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); if(typeof setCreditLimit === "function") setCreditLimit(btn.getAttribute("data-set-limit")); }); });
    qsa("[data-customer-status]", root).forEach(function(btn){ if(btn.__hesabiCustomersOwnerBound) return; btn.__hesabiCustomersOwnerBound = true; btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); if(typeof setCustomerStatus === "function") setCustomerStatus(btn.getAttribute("data-customer-status"), btn.getAttribute("data-status-value")); }); });
    const add = byId("addManualCustomerBtn");
    if(add && !add.__hesabiCustomersOwnerBound){ add.__hesabiCustomersOwnerBound = true; add.addEventListener("click", function(ev){ ev.preventDefault(); if(typeof addManualCustomer === "function") addManualCustomer(); }); }
    const sale = byId("sendTraderSale");
    if(sale && !sale.__hesabiCustomersOwnerBound){ sale.__hesabiCustomersOwnerBound = true; sale.addEventListener("click", function(ev){ ev.preventDefault(); if(typeof sendTraderSale === "function") sendTraderSale(); }); }
    const payType = byId("salePayType");
    if(payType && !payType.__hesabiCustomersOwnerBound){ payType.__hesabiCustomersOwnerBound = true; payType.addEventListener("change", function(){ /* preserve selection; existing renderer recalculates on full render only */ }); }
    window.__hesabiCustomersOwnerSweepCustomersBound = { at: Date.now(), rows: tableRows(root).length, actions: qsa("[data-set-limit],[data-customer-status]", root).length, hasAdd: !!add, hasSale: !!sale };
    return Object.assign({ ok:true }, window.__hesabiCustomersOwnerSweepCustomersBound);
  }

  function bindOwnerNow(){
    const root = page("owner");
    if(!root) return { ok:false, reason:"owner page missing" };
    ensureMobileTableGuard(root);
    ensureSearch(root, "ownerSweepSearch", "بحث في المالك والاشتراكات");
    try { if(typeof bindPageTabs === "function") bindPageTabs("owner", renderOwnerConsole); } catch (_) {}
    const reload = byId("ownerReload");
    if(reload && !reload.__hesabiCustomersOwnerBound){ reload.__hesabiCustomersOwnerBound = true; reload.addEventListener("click", async function(ev){ ev.preventDefault(); if(typeof loadOwnerConsoleDataPhase8 === "function"){ await loadOwnerConsoleDataPhase8(true); if(typeof renderOwnerConsole === "function") renderOwnerConsole(); } }); }
    const send = byId("ownerSendMsg");
    if(send && !send.__hesabiCustomersOwnerBound){ send.__hesabiCustomersOwnerBound = true; send.addEventListener("click", function(ev){ ev.preventDefault(); if(typeof ownerSendMessagePhase8 === "function") ownerSendMessagePhase8(); }); }
    ["ownerWarnShop","ownerSuspendShop","ownerActivateShop","ownerExpireShop"].forEach(function(id){ const btn = byId(id); if(btn && !btn.__hesabiCustomersOwnerBound){ btn.__hesabiCustomersOwnerBound = true; btn.addEventListener("click", function(ev){ ev.preventDefault(); if(typeof ownerSetShopStatusPhase8 === "function") ownerSetShopStatusPhase8(id); }); } });
    const saveSub = byId("ownerSaveSub");
    if(saveSub && !saveSub.__hesabiCustomersOwnerBound){ saveSub.__hesabiCustomersOwnerBound = true; saveSub.addEventListener("click", function(ev){ ev.preventDefault(); if(typeof ownerSaveSubscriptionPhase8 === "function") ownerSaveSubscriptionPhase8(); }); }
    const subShop = byId("ownerSubShop");
    if(subShop && !subShop.__hesabiCustomersOwnerBound){
      subShop.__hesabiCustomersOwnerBound = true;
      subShop.addEventListener("change", function(){
        try{
          const id = subShop.value || "";
          const shop = (cache.ownerShops || []).find(s => String(s.shopId || s.id || "") === String(id));
          if(shop){
            if(byId("ownerSubPlan")) byId("ownerSubPlan").value = shop.subscriptionPlan || "monthly";
            if(byId("ownerSubAmount")) byId("ownerSubAmount").value = Number(shop.subscriptionAmount || 0);
            if(byId("ownerSubDue")) byId("ownerSubDue").value = shop.subscriptionDueDate || "";
            if(byId("ownerSubStatus")) byId("ownerSubStatus").value = shop.subscriptionStatus || "active";
            if(byId("ownerSubNote")) byId("ownerSubNote").value = shop.subscriptionNote || shop.ownerWarning || "";
          }
        }catch(_){ }
      });
    }
    window.__hesabiCustomersOwnerSweepOwnerBound = { at: Date.now(), rows: tableRows(root).length, hasReload: !!reload, hasSend: !!send, hasSaveSub: !!saveSub };
    return Object.assign({ ok:true }, window.__hesabiCustomersOwnerSweepOwnerBound);
  }

  function delegatedClick(ev){
    const tab = ev.target && ev.target.closest ? ev.target.closest("[data-page-tab-key='customers'],[data-page-tab-key='owner']") : null;
    if(tab){ ev.preventDefault(); ev.stopPropagation(); setTab(tab.getAttribute("data-page-tab-key"), tab.getAttribute("data-page-tab-value")); return; }
    const limit = ev.target && ev.target.closest ? ev.target.closest("[data-set-limit]") : null;
    if(limit && inPage("customers", limit)){ ev.preventDefault(); ev.stopPropagation(); if(typeof setCreditLimit === "function") setCreditLimit(limit.getAttribute("data-set-limit")); return; }
    const status = ev.target && ev.target.closest ? ev.target.closest("[data-customer-status]") : null;
    if(status && inPage("customers", status)){ ev.preventDefault(); ev.stopPropagation(); if(typeof setCustomerStatus === "function") setCustomerStatus(status.getAttribute("data-customer-status"), status.getAttribute("data-status-value")); return; }
  }

  function bindCurrentPages(){
    let customers = null, owner = null;
    try { customers = bindCustomersNow(); } catch(e){ customers = { ok:false, error:String(e && e.message || e) }; }
    try { owner = bindOwnerNow(); } catch(e){ owner = { ok:false, error:String(e && e.message || e) }; }
    return { customers, owner };
  }
  function install(){
    if(window.__hesabiCustomersOwnerPageSweepInstalled) return;
    window.__hesabiCustomersOwnerPageSweepInstalled = true;
    document.addEventListener("click", delegatedClick, true);
    window.addEventListener("hashchange", function(){ setTimeout(bindCurrentPages, 50); });
    setTimeout(bindCurrentPages, 80);
  }
  function selfCheck(){
    const required = [
      ["renderCustomers", typeof renderCustomers === "function"],
      ["renderOwnerConsole", typeof renderOwnerConsole === "function"],
      ["setCreditLimit", typeof setCreditLimit === "function"],
      ["setCustomerStatus", typeof setCustomerStatus === "function"],
      ["ownerSaveSubscriptionPhase8", typeof ownerSaveSubscriptionPhase8 === "function"]
    ];
    const missing = required.filter(x => !x[1]).map(x => x[0]);
    let searchOk = false;
    try{
      const div = document.createElement("div");
      div.innerHTML = '<table><tbody><tr><td>عميل زيت</td></tr><tr><td>عميل ماء</td></tr></tbody></table><b data-customers-owner-search-count="1"></b>';
      searchOk = applySearch(div, "زيت") === 1 && div.querySelectorAll("tbody tr")[1].style.display === "none";
    }catch(_){ searchOk = false; }
    return { ok: missing.length === 0 && searchOk, version: VERSION, build: BUILD_CODE, missing, searchOk, installed: !!window.__hesabiCustomersOwnerPageSweepInstalled, bindings: { customers: window.__hesabiCustomersOwnerSweepCustomersBound || null, owner: window.__hesabiCustomersOwnerSweepOwnerBound || null } };
  }

  const api = { version: VERSION, build: BUILD_CODE, bindCustomersNow, bindOwnerNow, bindCurrentPages, applySearch, ensureSearch, ensureMobileTableGuard, setTab, install, selfCheck };
  window.hesabiCustomersOwnerPageSweep = api;
  window.hesabiCustomersOwnerPageSweepSelfCheck = selfCheck;
  install();
})();
