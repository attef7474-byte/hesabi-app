/* Hesabi 1.0.111 - Final All Pages Validation + Explanation Cleanup.
   Scope: final read-only page checks, mobile guards, and hiding explanatory/help text inside pages.
   No Firestore writes, no orders/payments/invoices/items mutations. */
(function(){
  "use strict";
  const VERSION = "1.0.111";
  const BUILD_CODE = 111;

  const PAGE_IDS = [
    "home","search","items","customers","orders","invoices","payments","statement","returns","schedules",
    "messages","notifications","reports","policies","settings","owner","stock","collections","audit","shops",
    "shopcode","tasks"
  ];

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

  const EXPLANATION_TEXT_PATTERNS = [
    /شرح|توضيح|ملاحظة|تنبيه عام|إرشاد|للمساعدة/i,
    /هذه المرحلة|هذا القسم|هذه الصفحة|الصفحة تعرض|نظام موحد/i,
    /اختر تبويب|افتح تبويب|استخدم .* لعرض|اضغط .* للعرض/i,
    /لا يتم تحميل|سيتم تسجيل|سيتم حفظ|عند .* ستظهر/i,
    /يعتمد على|تفيد عندما|لضمان عدم|للتأكد من/i,
    /safe|placeholder|helper|workflow|setup/i
  ];

  const PAGE_SWEEP_CHECKS = [
    ["settings-invoices", "hesabiSettingsInvoicesPageSweepSelfCheck"],
    ["payments-statements", "hesabiPaymentsStatementsPageSweepSelfCheck"],
    ["orders-approval", "hesabiOrdersApprovalPageSweepSelfCheck"],
    ["remove-explanations", "hesabiRemovePageExplanationsSelfCheck"],
    ["catalog-cart-purchase", "hesabiCatalogCartPurchasePageSweepSelfCheck"],
    ["returns-schedules", "hesabiReturnsSchedulesPageSweepSelfCheck"],
    ["messages-notifications", "hesabiMessagesNotificationsPageSweepSelfCheck"],
    ["customers-owner", "hesabiCustomersOwnerPageSweepSelfCheck"],
    ["reports-policies", "hesabiReportsPoliciesPageSweepSelfCheck"],
    ["audit-update-cache", "hesabiAuditUpdateCacheFinalSweepSelfCheck"],
    ["stock-collections", "hesabiStockCollectionsPageSweepSelfCheck"],
    ["auth-linking", "hesabiAuthCustomerLinkingPageSweepSelfCheck"],
    ["home-search-navigation", "hesabiHomeSearchNavigationSweepSelfCheck"],
    ["top-overflow-menu", "hesabiTopOverflowMenuActionsSelfCheck"],
    ["final-release-validation", "hesabiFinalReleaseValidationSelfCheck"]
  ];

  function byId(id){ try { return document.getElementById(id); } catch (_) { return null; } }
  function page(id){ return byId("page_" + id); }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch (_) { return []; } }
  function safeString(v){ try { return v == null ? "" : String(v); } catch (_) { return ""; } }
  function textOf(el){ try { return safeString(el.textContent).replace(/\s+/g," ").trim(); } catch (_) { return ""; } }
  function isInteractive(el){
    try { return !!(el.closest("table,thead,tbody,tfoot,tr,td,th,button,a,input,select,textarea,label,.btn,.tab,.pill,.qbadge,.badge,.actions,.field")); }
    catch (_) { return false; }
  }
  function shouldHideByText(el){
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

  function hideElement(el, reason){
    try {
      el.setAttribute("hidden", "hidden");
      el.setAttribute("aria-hidden", "true");
      el.setAttribute("data-hesabi-explanation-hidden", reason || "final-cleanup");
      el.style.setProperty("display", "none", "important");
    } catch (_) {}
  }

  function ensureStyle(){
    if(byId("hesabiFinalAllPagesValidationCleanupStyle")) return true;
    try {
      const style = document.createElement("style");
      style.id = "hesabiFinalAllPagesValidationCleanupStyle";
      style.textContent = `
        ${EXPLANATION_SELECTORS.join(",")} {display:none!important;}
        [data-hesabi-explanation-hidden="final-cleanup"],
        [data-hesabi-explanation-hidden="selector"],
        [data-hesabi-explanation-hidden="text"]{display:none!important;}
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

  function cleanExplanations(root){
    ensureStyle();
    const base = root && root.querySelectorAll ? root : document;
    let selectorHidden = 0, textHidden = 0;
    EXPLANATION_SELECTORS.forEach(function(sel){
      qsa(sel, base).forEach(function(el){ hideElement(el, "selector"); selectorHidden++; });
    });
    qsa("section[id^='page_'] .card > p, section[id^='page_'] .card > small, section[id^='page_'] .card > div, section[id^='page_'] .form > div, section[id^='page_'] .grid > div", base).forEach(function(el){
      if(shouldHideByText(el)){ hideElement(el, "text"); textHidden++; }
    });
    return { ok:true, selectorHidden, textHidden };
  }

  function cleanActivePage(){
    let active = null;
    try { active = qsa("section[id^='page_']").find(function(el){ return !el.classList.contains("hidden") && getComputedStyle(el).display !== "none"; }); } catch (_) {}
    return cleanExplanations(active || document);
  }

  function installWrappers(){
    let wrapped = window.__hesabiFinalAllPagesCleanupWrapped || {};
    if(typeof pageHead === "function" && !wrapped.pageHead){
      pageHead = function(title){ return `<div class="card page-workspace-head clean-page-head"><h2>${typeof esc === "function" ? esc(title) : safeString(title)}</h2></div>`; };
      wrapped.pageHead = true;
    }
    if(typeof render === "function" && !wrapped.render){
      const baseRender = render;
      render = function(){ const out = baseRender.apply(this, arguments); setTimeout(cleanActivePage,0); setTimeout(cleanActivePage,80); return out; };
      wrapped.render = true;
    }
    if(typeof show === "function" && !wrapped.show){
      const baseShow = show;
      show = function(){ const out = baseShow.apply(this, arguments); setTimeout(cleanActivePage,0); setTimeout(cleanActivePage,120); return out; };
      wrapped.show = true;
    }
    if(typeof bindPageTabs === "function" && !wrapped.bindPageTabs){
      const baseTabs = bindPageTabs;
      bindPageTabs = function(){ const out = baseTabs.apply(this, arguments); setTimeout(cleanActivePage,0); setTimeout(cleanActivePage,80); return out; };
      wrapped.bindPageTabs = true;
    }
    window.__hesabiFinalAllPagesCleanupWrapped = wrapped;
    return wrapped;
  }

  function installObserver(){
    if(window.__hesabiFinalAllPagesCleanupObserver) return true;
    try {
      const obs = new MutationObserver(function(){ cleanActivePage(); });
      obs.observe(document.documentElement, { childList:true, subtree:true });
      window.__hesabiFinalAllPagesCleanupObserver = obs;
      return true;
    } catch (_) { return false; }
  }

  function runNamedCheck(label, fnName){
    const fn = window[fnName];
    if(typeof fn !== "function") return { name:label, fn:fnName, ok:false, missing:true };
    try {
      const result = fn();
      const ok = !(result && typeof result === "object" && result.ok === false);
      return { name:label, fn:fnName, ok, result };
    } catch (error) { return { name:label, fn:fnName, ok:false, error:safeString(error && error.message || error) }; }
  }

  function checkPagesExist(){
    const existing = PAGE_IDS.filter(function(id){ return !!page(id); });
    const missing = PAGE_IDS.filter(function(id){ return !page(id); });
    return { ok: missing.length === 0, expected: PAGE_IDS.length, existing: existing.length, missing };
  }

  function checkVisibleExplanations(){
    cleanExplanations(document);
    const visible = [];
    qsa("section[id^='page_']").forEach(function(section){
      EXPLANATION_SELECTORS.forEach(function(sel){
        qsa(sel, section).forEach(function(el){
          try {
            if(!el.hidden && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden") visible.push({ page: section.id, selector: sel, text: textOf(el).slice(0,120) });
          } catch (_) {}
        });
      });
    });
    return { ok: visible.length === 0, visibleCount: visible.length, visible: visible.slice(0,30) };
  }

  function checkMobileOverflow(){
    let width = 0, scroll = 0;
    try { width = window.innerWidth || document.documentElement.clientWidth || 0; } catch (_) {}
    try { scroll = Math.max(document.documentElement.scrollWidth || 0, document.body ? (document.body.scrollWidth || 0) : 0); } catch (_) {}
    const overflowPx = Math.max(0, scroll - width);
    return { ok: overflowPx <= 24, width, scrollWidth: scroll, overflowPx };
  }

  function checkVersion(){
    const rt = window.__hesabiRuntime || {};
    const appVersion = typeof APP_VERSION !== "undefined" ? safeString(APP_VERSION) : "";
    const appBuild = typeof APP_BUILD_CODE !== "undefined" ? Number(APP_BUILD_CODE || 0) : 0;
    return { ok: safeString(rt.version) === VERSION && Number(rt.build || 0) === BUILD_CODE && appVersion === VERSION && appBuild === BUILD_CODE, expectedVersion: VERSION, expectedBuild: BUILD_CODE, runtimeVersion: safeString(rt.version), runtimeBuild: Number(rt.build || 0), appVersion, appBuild };
  }

  function runFinalAllPagesValidation(){
    ensureStyle();
    installWrappers();
    installObserver();
    const cleanup = cleanExplanations(document);
    const pages = checkPagesExist();
    const explanations = checkVisibleExplanations();
    const mobile = checkMobileOverflow();
    const version = checkVersion();
    const checks = PAGE_SWEEP_CHECKS.map(function(x){ return runNamedCheck(x[0], x[1]); });
    const failed = checks.filter(function(x){ return x.ok === false; });
    const ok = pages.ok && explanations.ok && version.ok && failed.length === 0;
    const result = { ok, version: VERSION, build: BUILD_CODE, pages, explanations, mobile, versionState: version, cleanup, checks, failed, checkedAt: new Date().toISOString() };
    window.__hesabiFinalAllPagesValidationCleanup = result;
    try { localStorage.setItem("hesabi_final_all_pages_validation_cleanup", JSON.stringify({ ok, version: VERSION, build: BUILD_CODE, failed: failed.map(function(x){ return x.name; }), missingPages: pages.missing, visibleExplanations: explanations.visibleCount, overflowPx: mobile.overflowPx, at: result.checkedAt })); } catch (_) {}
    if(!ok){ try { console.warn("Hesabi final all pages validation warnings:", result); } catch (_) {} }
    return result;
  }

  ensureStyle();
  installWrappers();
  installObserver();
  setTimeout(cleanExplanations,0,document);
  setTimeout(cleanExplanations,250,document);
  setTimeout(cleanExplanations,1000,document);

  window.hesabiFinalAllPagesValidationCleanup = {
    version: VERSION,
    build: BUILD_CODE,
    pages: PAGE_IDS.slice(),
    selectors: EXPLANATION_SELECTORS.slice(),
    ensureStyle,
    cleanExplanations,
    cleanActivePage,
    run: runFinalAllPagesValidation
  };
  window.hesabiFinalAllPagesValidationCleanupSelfCheck = runFinalAllPagesValidation;
})();
