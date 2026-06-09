/* Hesabi 1.0.112 - Remove injected local page search cards.
   Scope: UI cleanup only.
   Removes the extra local-search cards that were injected by page sweep modules
   such as:
   - بحث في العملاء والأصناف المعروضة
   - بحث في المالك والاشتراكات
   - بحث في سجل العمليات
   - بحث في التقارير
   - بحث في السياسات
   This does not change Firestore, orders, payments, invoices, stock, reports calculations, or authentication. */
(function(){
  "use strict";

  const VERSION = "1.0.112";
  const BUILD_CODE = 112;

  const EXPLANATION_SELECTORS = [
    ".page-workspace-head .page-help",
    ".page-workspace-head .phase-note",
    ".page-workspace-head .muted",
    ".phase-note",
    ".page-help",
    ".safe-placeholder",
    ".mini-help",
    ".form-help",
    ".form-hint",
    ".help-text",
    ".helper-text",
    ".hint",
    ".setup-help",
    ".workflow-help",
    ".page-description",
    ".page-caption",
    ".explain",
    ".explanation",
    ".description",
    ".note-text",
    ".notice-text",
    ".card > p.muted",
    "section.card > p.muted",
    ".card > div.muted",
    "section.card > div.muted",
    ".card > small.muted",
    "section.card > small.muted"
  ];

  const LOCAL_SEARCH_CARD_SELECTORS = [
    ".customers-owner-search-box",
    ".reports-policies-search-box",
    ".audit-cache-final-search",
    ".stock-collections-search-box",
    ".messages-notifications-search-box",
    ".returns-schedules-search-box",
    ".payments-statements-search-box",
    ".settings-invoices-search-box",
    ".catalog-cart-purchase-search-box",
    ".orders-approval-search-box",
    ".home-inline-search-box",
    ".page-inline-search-box",
    ".sweep-search-box",
    ".local-search-box"
  ];

  const LOCAL_SEARCH_INPUT_IDS = [
    "customersSweepSearch",
    "ownerSweepSearch",
    "auditFinalSearch",
    "reportsSweepSearch",
    "policiesSweepSearch",
    "messagesSweepSearch",
    "notificationsSweepSearch",
    "returnsSweepSearch",
    "schedulesSweepSearch",
    "stockSweepSearch",
    "collectionsSweepSearch",
    "paymentsSweepSearch",
    "statementsSweepSearch",
    "invoicesSweepSearch",
    "settingsSweepSearch",
    "ordersSweepSearch",
    "approvalSweepSearch",
    "catalogSweepSearch",
    "purchaseSweepSearch"
  ];

  const LOCAL_SEARCH_TITLE_PATTERNS = [
    /بحث\s+في\s+العملاء/i,
    /بحث\s+في\s+المالك/i,
    /بحث\s+في\s+سجل\s+العمليات/i,
    /بحث\s+في\s+التقارير/i,
    /بحث\s+في\s+السياسات/i,
    /بحث\s+في\s+الرسائل/i,
    /بحث\s+في\s+الإشعارات/i,
    /بحث\s+في\s+الاشعارات/i,
    /بحث\s+في\s+المرتجعات/i,
    /بحث\s+في\s+الجداول/i,
    /بحث\s+في\s+الأقساط/i,
    /بحث\s+في\s+الاقساط/i,
    /بحث\s+في\s+المخزون/i,
    /بحث\s+في\s+التحصيل/i,
    /بحث\s+في\s+السداد/i,
    /بحث\s+في\s+كشف\s+الحساب/i,
    /بحث\s+في\s+الفواتير/i,
    /بحث\s+في\s+الطلبات/i,
    /بحث\s+داخل\s+الصفحة/i
  ];

  const EXPLANATION_TEXT_PATTERNS = [
    /شرح|توضيح|ملاحظة|تنبيه عام|إرشاد|للمساعدة/i,
    /هذه المرحلة|هذا القسم|هذه الصفحة|الصفحة تعرض|نظام موحد/i,
    /اختر تبويب|افتح تبويب|استخدم .* لعرض|اضغط .* للعرض/i,
    /لا يتم تحميل|سيتم تسجيل|سيتم حفظ|عند .* ستظهر/i,
    /يعتمد على|تفيد عندما|لضمان عدم|للتأكد من/i,
    /safe|placeholder|helper|workflow|setup/i
  ];

  function byId(id){ try { return document.getElementById(id); } catch (_) { return null; } }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch (_) { return []; } }
  function safeString(v){ try { return v == null ? "" : String(v); } catch (_) { return ""; } }
  function textOf(el){ try { return safeString(el.textContent).replace(/\s+/g," ").trim(); } catch (_) { return ""; } }
  function isHidden(el){
    try { return !!(el.hidden || getComputedStyle(el).display === "none" || getComputedStyle(el).visibility === "hidden"); }
    catch (_) { return false; }
  }
  function closestCard(el){
    try { return el && el.closest ? el.closest(".card,section,div") : null; }
    catch (_) { return null; }
  }
  function markRemove(el, reason){
    if(!el) return false;
    try {
      el.setAttribute("hidden","hidden");
      el.setAttribute("aria-hidden","true");
      el.setAttribute("data-hesabi-local-search-removed", reason || "1.0.112");
      el.style.setProperty("display","none","important");
      if(el.parentNode) el.parentNode.removeChild(el);
      return true;
    } catch (_) {
      try { el.style.setProperty("display","none","important"); return true; } catch(__) {}
    }
    return false;
  }

  function isInteractive(el){
    try { return !!(el.closest("table,thead,tbody,tfoot,tr,td,th,button,a,input,select,textarea,label,.btn,.tab,.pill,.qbadge,.badge,.actions,.field")); }
    catch (_) { return false; }
  }

  function shouldHideExplanationByText(el){
    if(!el || isInteractive(el)) return false;
    const tag = safeString(el.tagName).toLowerCase();
    if(["script","style","table","thead","tbody","tfoot","tr","td","th","button","input","select","textarea","label","option"].indexOf(tag) >= 0) return false;
    const txt = textOf(el);
    if(!txt || txt.length < 8 || txt.length > 420) return false;
    const cls = safeString(el.className);
    const likelyInfoBlock = /muted|hint|help|note|caption|description|placeholder|phase|safe|mini|form/i.test(cls) || ["p","small"].indexOf(tag) >= 0;
    if(!likelyInfoBlock) return false;
    return EXPLANATION_TEXT_PATTERNS.some(function(rx){ return rx.test(txt) || rx.test(cls); });
  }

  function hideExplanation(el, reason){
    try {
      el.setAttribute("hidden", "hidden");
      el.setAttribute("aria-hidden", "true");
      el.setAttribute("data-hesabi-explanation-hidden", reason || "final-cleanup");
      el.style.setProperty("display", "none", "important");
    } catch (_) {}
  }

  function ensureStyle(){
    if(byId("hesabiRemoveLocalSearchCards112Style")) return true;
    try {
      const style = document.createElement("style");
      style.id = "hesabiRemoveLocalSearchCards112Style";
      style.textContent = `
        ${EXPLANATION_SELECTORS.join(",")} {display:none!important;}
        ${LOCAL_SEARCH_CARD_SELECTORS.join(",")} {display:none!important;}
        [data-hesabi-local-search-removed]{display:none!important;}
        [data-hesabi-explanation-hidden="final-cleanup"],
        [data-hesabi-explanation-hidden="selector"],
        [data-hesabi-explanation-hidden="text"]{display:none!important;}
        section[id^="page_"] .card:has(input[placeholder*="للبحث داخل الصفحة"]){display:none!important;}
        section[id^="page_"] .card:has(input[id$="SweepSearch"]){display:none!important;}
        section[id^="page_"] .card:has(input[id$="FinalSearch"]){display:none!important;}
        html,body,.app{max-width:100%!important;overflow-x:hidden!important;}
        section[id^="page_"],.card,.top,#nav,#navInner{max-width:100%!important;box-sizing:border-box!important;}
        section[id^="page_"]{overflow-x:hidden!important;}
        .tablewrap,.table-wrap,.mobile-table-wrap,.items-table-scroll,.audit-cache-final-safe-wrap{max-width:100%!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;}
        .page-tabs,.top-icons-row,.settings-top-icons,.items-top-icons{max-width:100%!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;}
        .page-workspace-head,.clean-page-head{display:block!important;}
        .page-workspace-head h2,.clean-page-head h2,.card>h2:first-child{margin-bottom:6px!important;}
      `;
      document.head.appendChild(style);
      return true;
    } catch (_) { return false; }
  }

  function removeLocalSearchCards(root){
    ensureStyle();
    const base = root && root.querySelectorAll ? root : document;
    let removed = 0;

    LOCAL_SEARCH_CARD_SELECTORS.forEach(function(sel){
      qsa(sel, base).forEach(function(el){ if(markRemove(el, "class-selector")) removed++; });
    });

    LOCAL_SEARCH_INPUT_IDS.forEach(function(id){
      const input = byId(id);
      const card = closestCard(input);
      if(card && markRemove(card, "known-input-id")) removed++;
    });

    qsa('input[placeholder*="للبحث داخل الصفحة"],input[id$="SweepSearch"],input[id$="FinalSearch"]', base).forEach(function(input){
      const card = closestCard(input);
      if(card && markRemove(card, "search-input")) removed++;
    });

    qsa("section[id^='page_'] .card, section[id^='page_'] div", base).forEach(function(el){
      if(isHidden(el)) return;
      const txt = textOf(el);
      if(!txt || txt.length > 260) return;
      const hasSearchInput = !!qsa('input[type="search"],input[inputmode="search"]', el).length;
      const hasSearchButtons = /بحث|مسح|المعروض|النتائج المعروضة/.test(txt);
      const titleMatches = LOCAL_SEARCH_TITLE_PATTERNS.some(function(rx){ return rx.test(txt); });
      if(hasSearchInput && hasSearchButtons && titleMatches){
        if(markRemove(el, "text-pattern")) removed++;
      }
    });

    return removed;
  }

  function cleanExplanations(root){
    ensureStyle();
    const base = root && root.querySelectorAll ? root : document;
    let selectorHidden = 0, textHidden = 0;
    EXPLANATION_SELECTORS.forEach(function(sel){
      qsa(sel, base).forEach(function(el){ hideExplanation(el, "selector"); selectorHidden++; });
    });
    qsa("section[id^='page_'] .card > p, section[id^='page_'] .card > small, section[id^='page_'] .card > div, section[id^='page_'] .form > div, section[id^='page_'] .grid > div", base).forEach(function(el){
      if(shouldHideExplanationByText(el)){ hideExplanation(el, "text"); textHidden++; }
    });
    return { ok:true, selectorHidden, textHidden };
  }

  function cleanActivePage(){
    let active = null;
    try { active = qsa("section[id^='page_']").find(function(el){ return !el.classList.contains("hidden") && getComputedStyle(el).display !== "none"; }); } catch (_) {}
    const root = active || document;
    const removedLocalSearch = removeLocalSearchCards(root);
    const explanations = cleanExplanations(root);
    return { ok:true, removedLocalSearch, explanations };
  }

  function installWrappers(){
    let wrapped = window.__hesabiFinalAllPagesCleanupWrapped || {};
    if(typeof pageHead === "function" && !wrapped.pageHead){
      pageHead = function(title){ return `<div class="card page-workspace-head clean-page-head"><h2>${typeof esc === "function" ? esc(title) : safeString(title)}</h2></div>`; };
      wrapped.pageHead = true;
    }
    if(typeof render === "function" && !wrapped.render){
      const baseRender = render;
      render = function(){ const out = baseRender.apply(this, arguments); scheduleCleanup(); return out; };
      wrapped.render = true;
    }
    if(typeof show === "function" && !wrapped.show){
      const baseShow = show;
      show = function(){ const out = baseShow.apply(this, arguments); scheduleCleanup(); return out; };
      wrapped.show = true;
    }
    if(typeof bindPageTabs === "function" && !wrapped.bindPageTabs){
      const baseTabs = bindPageTabs;
      bindPageTabs = function(){ const out = baseTabs.apply(this, arguments); scheduleCleanup(); return out; };
      wrapped.bindPageTabs = true;
    }
    window.__hesabiFinalAllPagesCleanupWrapped = wrapped;
    return wrapped;
  }

  function scheduleCleanup(){
    setTimeout(cleanActivePage, 0);
    setTimeout(cleanActivePage, 80);
    setTimeout(cleanActivePage, 250);
  }

  function installObserver(){
    if(window.__hesabiRemoveLocalSearchCardsObserver) return true;
    try {
      let pending = false;
      const obs = new MutationObserver(function(){
        if(pending) return;
        pending = true;
        setTimeout(function(){ pending = false; cleanActivePage(); }, 30);
      });
      obs.observe(document.documentElement, { childList:true, subtree:true });
      window.__hesabiRemoveLocalSearchCardsObserver = obs;
      return true;
    } catch (_) { return false; }
  }

  function visibleLocalSearchCards(){
    const found = [];
    try {
      qsa("section[id^='page_']").forEach(function(section){
        qsa(LOCAL_SEARCH_CARD_SELECTORS.join(","), section).forEach(function(el){
          if(!isHidden(el)) found.push({ page: section.id, cls: safeString(el.className), text: textOf(el).slice(0,120) });
        });
        qsa('input[placeholder*="للبحث داخل الصفحة"],input[id$="SweepSearch"],input[id$="FinalSearch"]', section).forEach(function(input){
          const card = closestCard(input);
          if(card && !isHidden(card)) found.push({ page: section.id, id: input.id || "", text: textOf(card).slice(0,120) });
        });
      });
    } catch (_) {}
    return found;
  }

  function runFinalAllPagesValidation(){
    ensureStyle();
    installWrappers();
    installObserver();
    const cleanup = cleanActivePage();
    removeLocalSearchCards(document);
    cleanExplanations(document);
    const visibleSearch = visibleLocalSearchCards();
    let width = 0, scroll = 0;
    try { width = window.innerWidth || document.documentElement.clientWidth || 0; } catch (_) {}
    try { scroll = Math.max(document.documentElement.scrollWidth || 0, document.body ? (document.body.scrollWidth || 0) : 0); } catch (_) {}
    const overflowPx = Math.max(0, scroll - width);
    const result = {
      ok: visibleSearch.length === 0,
      version: VERSION,
      build: BUILD_CODE,
      cleanup,
      visibleLocalSearchCount: visibleSearch.length,
      visibleLocalSearch: visibleSearch.slice(0,30),
      mobile: { ok: overflowPx <= 24, width, scrollWidth: scroll, overflowPx },
      checkedAt: new Date().toISOString()
    };
    window.__hesabiFinalAllPagesValidationCleanup = result;
    try { localStorage.setItem("hesabi_final_all_pages_validation_cleanup", JSON.stringify({ ok:result.ok, version:VERSION, build:BUILD_CODE, visibleLocalSearchCount:visibleSearch.length, overflowPx, at:result.checkedAt })); } catch (_) {}
    if(!result.ok){ try { console.warn("Hesabi local search cleanup warnings:", result); } catch (_) {} }
    return result;
  }

  ensureStyle();
  installWrappers();
  installObserver();
  setTimeout(cleanActivePage, 0);
  setTimeout(cleanActivePage, 250);
  setTimeout(cleanActivePage, 1000);
  setTimeout(function(){ removeLocalSearchCards(document); cleanExplanations(document); }, 1600);

  window.hesabiFinalAllPagesValidationCleanup = {
    version: VERSION,
    build: BUILD_CODE,
    selectors: EXPLANATION_SELECTORS.slice(),
    localSearchSelectors: LOCAL_SEARCH_CARD_SELECTORS.slice(),
    ensureStyle,
    removeLocalSearchCards,
    cleanExplanations,
    cleanActivePage,
    run: runFinalAllPagesValidation
  };
  window.hesabiFinalAllPagesValidationCleanupSelfCheck = runFinalAllPagesValidation;
  window.hesabiRemoveLocalSearchCardsSelfCheck = runFinalAllPagesValidation;
})();
