/* Hesabi 1.0.128 - Permissions / role guards customer access fix.
   Scope: allow customer commercial pages while keeping trader-only administration protected. */
(function(){
  "use strict";
  const VERSION = "1.0.128";
  const BUILD_CODE = 128;
  const ALL_PAGES = ["home","search","tasks","items","orders","customers","shops","messages","payments","invoices","statement","audit","stock","returns","schedules","collections","reports","policies","notifications","shopcode","settings","owner"];
  // Trader-only administration pages.
  // Customer commercial pages must remain open to linked customers:
  // items = purchase catalog, invoices = customer invoices, returns = return requests, schedules = installments.
  const TRADER_ONLY = ["customers","audit","stock","collections","policies","reports"];
  const CUSTOMER_ALLOWED_COMMERCIAL = ["items","orders","payments","invoices","statement","returns","schedules","messages","notifications","shopcode","settings","tasks","search","home","shops"];
  const CUSTOMER_ONLY = ["shops"];
  const CUSTOMER_ONLY_REDIRECTS = { };
  function normalizePage(page){ return ALL_PAGES.indexOf(page) >= 0 ? page : "home"; }
  function roleLabel(role){ return role === "trader" ? "تاجر" : (role === "customer" ? "عميل" : "غير محدد"); }
  function canOpenPage(ctx){
    ctx = ctx || {};
    const page = normalizePage(ctx.page || "home");
    const role = String(ctx.role || "");
    const isOwner = !!ctx.isOwner;
    if(page === "owner" && !isOwner) return { ok:false, page, fallback:"home", code:"owner_only", message:"صفحة مالك التطبيق خاصة بحساب المالك فقط" };
    if(role !== "trader" && TRADER_ONLY.indexOf(page) >= 0) return { ok:false, page, fallback:"home", code:"trader_only", message:"هذه الصفحة خاصة بالتاجر فقط" };
    if(role === "trader" && CUSTOMER_ONLY.indexOf(page) >= 0) return { ok:false, page, fallback:"home", code:"customer_page_forbidden_to_trader", message:"هذه الصفحة خاصة بحساب العميل" };
    return { ok:true, page, fallback:page, role, roleLabel:roleLabel(role) };
  }
  function pageMatrix(role, isOwner){
    return ALL_PAGES.map(function(page){ return Object.assign({ page }, canOpenPage({ page, role, isOwner })); });
  }
  function requiredTraderAction(action, ctx){
    ctx = ctx || {};
    if(String(ctx.role || "") !== "trader") return { ok:false, action:action||"هذه العملية", message:(action||"هذه العملية") + " خاصة بحساب التاجر فقط" };
    if(!ctx.shopId) return { ok:false, action:action||"هذه العملية", message:"لا يوجد متجر نشط لحساب التاجر" };
    return { ok:true, action:action||"هذه العملية" };
  }
  function selfCheck(){
    const missing = ["normalizePage","canOpenPage","pageMatrix","requiredTraderAction"].filter(function(name){ return typeof api[name] !== "function"; });
    const traderOk = canOpenPage({ page:"customers", role:"trader" }).ok === true;
    const customerBlocked = canOpenPage({ page:"customers", role:"customer" }).ok === false;
    const ownerBlocked = canOpenPage({ page:"owner", role:"trader", isOwner:false }).ok === false;
    const ownerAllowed = canOpenPage({ page:"owner", role:"trader", isOwner:true }).ok === true;
    const customerPurchaseOk = canOpenPage({ page:"items", role:"customer" }).ok === true;
    const customerInvoicesOk = canOpenPage({ page:"invoices", role:"customer" }).ok === true;
    const customerReturnsOk = canOpenPage({ page:"returns", role:"customer" }).ok === true;
    const customerSchedulesOk = canOpenPage({ page:"schedules", role:"customer" }).ok === true;
    const customerReportsBlocked = canOpenPage({ page:"reports", role:"customer" }).ok === false;
    const traderShopsBlocked = canOpenPage({ page:"shops", role:"trader" }).ok === false;
    const sampleOk = traderOk && customerBlocked && ownerBlocked && ownerAllowed && customerPurchaseOk && customerInvoicesOk && customerReturnsOk && customerSchedulesOk && customerReportsBlocked && traderShopsBlocked;
    return { ok: missing.length === 0 && sampleOk, version: VERSION, build: BUILD_CODE, missing, sampleOk, checks:{traderOk,customerBlocked,ownerBlocked,ownerAllowed,customerPurchaseOk,customerInvoicesOk,customerReturnsOk,customerSchedulesOk,customerReportsBlocked,traderShopsBlocked} };
  }
  const api = { version: VERSION, build: BUILD_CODE, pages: ALL_PAGES.slice(), traderOnly: TRADER_ONLY.slice(), customerAllowedCommercial: CUSTOMER_ALLOWED_COMMERCIAL.slice(), normalizePage, roleLabel, canOpenPage, pageMatrix, requiredTraderAction };
  window.hesabiPermissionsRoleGuards = api;
  window.hesabiPermissionsRoleGuardsSelfCheck = selfCheck;
})();
