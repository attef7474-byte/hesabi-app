/* Hesabi 1.0.105 - Reports + Policies Page Final Sweep.
   Scope: UI interaction binding, local search, export/save buttons and mobile table guards only.
   No Firestore writes, report calculations, payments, invoices or policy save logic are changed. */
(function(){
  "use strict";
  const VERSION = "1.0.105";
  const BUILD_CODE = 105;

  function byId(id){ try { return document.getElementById(id); } catch (_) { return null; } }
  function page(name){ return byId("page_" + name); }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch (_) { return []; } }
  function escSafe(value){
    try { return typeof esc === "function" ? esc(value == null ? "" : value) : String(value == null ? "" : value).replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch])); }
    catch (_) { return ""; }
  }
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
  function notify(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); } catch (_) {} }

  function ensureStyle(){
    if(byId("reportsPoliciesSweepStyle")) return;
    const style = document.createElement("style");
    style.id = "reportsPoliciesSweepStyle";
    style.textContent = `
      #page_reports,#page_policies{max-width:100%;overflow-x:hidden;}
      .reports-policies-safe-table-wrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}
      .reports-policies-safe-table{width:100%;min-width:620px;}
      .reports-policies-search-box{margin:10px 0;}
      .reports-policies-search-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
      .reports-policies-search-row input{flex:1 1 180px;min-width:0;}
      .reports-policies-actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
      #page_reports .page-tabs,#page_policies .page-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;}
      #page_reports .card,#page_policies .card{max-width:100%;}
      @media(max-width:640px){.reports-policies-safe-table{min-width:560px}.reports-policies-search-row .btn{flex:0 0 auto}}
    `;
    try { document.head.appendChild(style); } catch (_) {}
  }

  function ensureMobileTableGuard(root){
    if(!root) return;
    ensureStyle();
    try{
      root.classList.add("reports-policies-sweep-root");
      qsa(".table-wrap", root).forEach(function(w){
        w.classList.add("reports-policies-safe-table-wrap");
        w.style.maxWidth = "100%";
        w.style.overflowX = "auto";
        w.style.webkitOverflowScrolling = "touch";
      });
      qsa("table", root).forEach(function(t){
        t.classList.add("reports-policies-safe-table");
      });
    }catch(_){ }
  }

  function searchableNodes(root){
    if(!root) return [];
    const nodes = qsa("tbody tr,.metric,.card:not(.reports-policies-search-box)", root);
    return nodes.filter(function(node){ return !node.closest || !node.closest(".reports-policies-search-box"); });
  }

  function applySearch(root, query){
    const q = norm(query);
    const targets = searchableNodes(root);
    let visible = 0;
    targets.forEach(function(el){
      const text = norm(el.textContent || "");
      const show = !q || text.indexOf(q) >= 0;
      el.style.display = show ? "" : "none";
      if(show) visible++;
    });
    const count = root ? root.querySelector("[data-reports-policies-search-count]") : null;
    if(count) count.textContent = String(visible);
    return visible;
  }

  function ensureSearch(root, id, title){
    if(!root || byId(id)) return;
    const host = root.querySelector(".page-tabs-card") || root.querySelector(".card") || root;
    const box = document.createElement("div");
    box.className = "card reports-policies-search-box";
    box.innerHTML = `<div class="field"><label>${escSafe(title || "بحث")}</label><div class="reports-policies-search-row"><input id="${escSafe(id)}" type="search" autocomplete="off" inputmode="search" placeholder="اكتب للبحث داخل الصفحة"><button type="button" class="btn secondary mini" id="${escSafe(id)}Apply">بحث</button><button type="button" class="btn light mini" id="${escSafe(id)}Clear">مسح</button></div><div class="subcell">النتائج المعروضة: <b data-reports-policies-search-count="1">${searchableNodes(root).length}</b></div></div>`;
    try { host.insertAdjacentElement("afterend", box); } catch (_) { root.insertAdjacentElement("afterbegin", box); }
    const input = byId(id), apply = byId(id + "Apply"), clear = byId(id + "Clear");
    if(input){
      input.addEventListener("input", function(){ /* no rerender while typing; keep keyboard open */ });
      input.addEventListener("keydown", function(ev){ if(ev.key === "Enter"){ ev.preventDefault(); applySearch(root, input.value); } });
    }
    if(apply) apply.onclick = function(){ applySearch(root, input ? input.value : ""); };
    if(clear) clear.onclick = function(){ if(input) input.value = ""; applySearch(root, ""); if(input) input.focus(); };
    applySearch(root, "");
  }

  function bindReportsNow(){
    const root = page("reports");
    if(!root) return { ok:false, reason:"reports page missing" };
    ensureMobileTableGuard(root);
    ensureSearch(root, "reportsSweepSearch", "بحث في التقارير");
    try { if(typeof bindPageTabs === "function") bindPageTabs("reports", renderReports); } catch (_) {}
    try { if(window.hesabiReportsHelpers && typeof window.hesabiReportsHelpers.bindReportsExportButtons === "function") window.hesabiReportsHelpers.bindReportsExportButtons(); } catch (_) {}
    const share = byId("shareBusinessReport");
    if(share && !share.__hesabiReportsPoliciesBound){ share.__hesabiReportsPoliciesBound = true; share.addEventListener("click", function(ev){ ev.preventDefault(); if(typeof shareBusinessReport === "function") shareBusinessReport(); }); }
    const inv = byId("exportInvoicesCsv");
    if(inv && !inv.__hesabiReportsPoliciesBound){ inv.__hesabiReportsPoliciesBound = true; inv.addEventListener("click", function(ev){ ev.preventDefault(); if(typeof exportInvoicesCsv === "function") exportInvoicesCsv(); }); }
    const pay = byId("exportPaymentsCsv");
    if(pay && !pay.__hesabiReportsPoliciesBound){ pay.__hesabiReportsPoliciesBound = true; pay.addEventListener("click", function(ev){ ev.preventDefault(); if(typeof exportPaymentsCsv === "function") exportPaymentsCsv(); }); }
    const cust = byId("exportCustomersCsv");
    if(cust && !cust.__hesabiReportsPoliciesBound){ cust.__hesabiReportsPoliciesBound = true; cust.addEventListener("click", function(ev){ ev.preventDefault(); if(typeof exportCustomersCsv === "function") exportCustomersCsv(); }); }
    window.__hesabiReportsPoliciesReportsBound = { at: Date.now(), nodes: searchableNodes(root).length, exports: [!!share, !!inv, !!pay, !!cust] };
    return Object.assign({ ok:true }, window.__hesabiReportsPoliciesReportsBound);
  }

  function bindPoliciesNow(){
    const root = page("policies");
    if(!root) return { ok:false, reason:"policies page missing" };
    ensureMobileTableGuard(root);
    ensureSearch(root, "policiesSweepSearch", "بحث في السياسات");
    try { if(typeof bindPageTabs === "function") bindPageTabs("policies", renderPolicies); } catch (_) {}
    const saveBtn = byId("savePoliciesPhase8");
    if(saveBtn && !saveBtn.__hesabiReportsPoliciesBound){
      saveBtn.__hesabiReportsPoliciesBound = true;
      saveBtn.addEventListener("click", function(ev){
        ev.preventDefault();
        if(typeof saveShopPoliciesPhase8 === "function") saveShopPoliciesPhase8();
        else notify("دالة حفظ السياسات غير متاحة.", "error");
      });
    }
    try{
      const canEdit = typeof state === "object" && state && state.role === "trader";
      if(!canEdit){ qsa("input,select,textarea", root).forEach(function(x){ x.disabled = true; }); }
    }catch(_){ }
    window.__hesabiReportsPoliciesPoliciesBound = { at: Date.now(), nodes: searchableNodes(root).length, hasSave: !!saveBtn };
    return Object.assign({ ok:true }, window.__hesabiReportsPoliciesPoliciesBound);
  }

  function bindCurrentPages(){
    const result = {};
    if(page("reports")) result.reports = bindReportsNow();
    if(page("policies")) result.policies = bindPoliciesNow();
    return result;
  }

  function afterRender(pageName){
    setTimeout(function(){
      try{
        if(pageName === "reports") bindReportsNow();
        if(pageName === "policies") bindPoliciesNow();
      }catch(e){ try { console.warn("reports/policies sweep bind failed", e); } catch(_){} }
    }, 0);
  }

  function wrapRenderer(name, pageName){
    try{
      const current = (typeof window[name] === "function") ? window[name] : (typeof eval(name) === "function" ? eval(name) : null);
      if(!current || current.__hesabiReportsPoliciesSweepWrapped) return false;
      const wrapped = function(){ const result = current.apply(this, arguments); afterRender(pageName); return result; };
      wrapped.__hesabiReportsPoliciesSweepWrapped = true;
      try { window[name] = wrapped; } catch (_) {}
      try { eval(name + " = wrapped"); } catch (_) {}
      return true;
    }catch(_){ return false; }
  }

  function activate(){
    ensureStyle();
    const wrappedReports = wrapRenderer("renderReports", "reports");
    const wrappedPolicies = wrapRenderer("renderPolicies", "policies");
    try{
      document.addEventListener("click", function(ev){
        const target = ev.target && ev.target.closest ? ev.target.closest("#shareBusinessReport,#exportInvoicesCsv,#exportPaymentsCsv,#exportCustomersCsv,#savePoliciesPhase8") : null;
        if(!target) return;
        if(page("reports")) bindReportsNow();
        if(page("policies")) bindPoliciesNow();
      }, true);
    }catch(_){ }
    try { bindCurrentPages(); } catch (_) {}
    window.__hesabiReportsPoliciesPageSweepInstalled = { at: Date.now(), wrappedReports, wrappedPolicies };
    return window.__hesabiReportsPoliciesPageSweepInstalled;
  }

  function selfCheck(){
    const api = window.hesabiReportsPoliciesPageSweep || {};
    const required = ["bindReportsNow","bindPoliciesNow","applySearch","ensureSearch","activate"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    let searchOk = false;
    try{
      const div = document.createElement("div");
      div.innerHTML = '<table><tbody><tr><td>تقرير المبيعات</td></tr><tr><td>سياسة الدوام</td></tr></tbody></table><b data-reports-policies-search-count="1"></b>';
      searchOk = applySearch(div, "المبيعات") === 1 && div.querySelectorAll("tbody tr")[1].style.display === "none";
    }catch(_){ searchOk = false; }
    const funcs = [
      ["renderReports", typeof renderReports === "function"],
      ["renderPolicies", typeof renderPolicies === "function"],
      ["saveShopPoliciesPhase8", typeof saveShopPoliciesPhase8 === "function"]
    ];
    const missingFuncs = funcs.filter(function(x){ return !x[1]; }).map(function(x){ return x[0]; });
    return { ok: missing.length === 0 && missingFuncs.length === 0 && searchOk, version: VERSION, build: BUILD_CODE, missing, missingFuncs, searchOk, installed: !!window.__hesabiReportsPoliciesPageSweepInstalled, bindings: { reports: window.__hesabiReportsPoliciesReportsBound || null, policies: window.__hesabiReportsPoliciesPoliciesBound || null } };
  }

  const api = { version: VERSION, build: BUILD_CODE, bindReportsNow, bindPoliciesNow, bindCurrentPages, applySearch, ensureSearch, ensureMobileTableGuard, activate, selfCheck };
  window.hesabiReportsPoliciesPageSweep = api;
  window.hesabiReportsPoliciesPageSweepSelfCheck = selfCheck;
  activate();
})();
