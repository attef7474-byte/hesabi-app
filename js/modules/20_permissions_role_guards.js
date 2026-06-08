/* Hesabi 1.0.81 - Permissions / role guards review.
   Read-only guard helpers for page access. No Firestore reads/writes. */
(function(){
  "use strict";
  const VERSION = "1.0.81";
  const BUILD_CODE = 81;
  const ALL_PAGES = ["home","search","tasks","items","orders","customers","shops","messages","payments","invoices","statement","audit","stock","returns","schedules","collections","reports","policies","notifications","shopcode","settings","owner"];
  const TRADER_ONLY = ["customers","audit","stock","collections","policies","reports"];
  const CUSTOMER_ONLY_REDIRECTS = { shops:"home" };
  function normalizePage(page){ return ALL_PAGES.indexOf(page) >= 0 ? page : "home"; }
  function roleLabel(role){ return role === "trader" ? "تاجر" : (role === "customer" ? "عميل" : "غير محدد"); }
  function canOpenPage(ctx){
    ctx = ctx || {};
    const page = normalizePage(ctx.page || "home");
    const role = String(ctx.role || "");
    const isOwner = !!ctx.isOwner;
    if(page === "owner" && !isOwner) return { ok:false, page, fallback:"home", code:"owner_only", message:"صفحة مالك التطبيق خاصة بحساب المالك فقط" };
    if(role !== "trader" && TRADER_ONLY.indexOf(page) >= 0) return { ok:false, page, fallback:"home", code:"trader_only", message:"هذه الصفحة خاصة بالتاجر فقط" };
    if(role === "trader" && CUSTOMER_ONLY_REDIRECTS[page]) return { ok:false, page, fallback:CUSTOMER_ONLY_REDIRECTS[page], code:"customer_page_forbidden_to_trader", message:"هذه الصفحة خاصة بحساب العميل" };
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
    const sampleOk = traderOk && customerBlocked && ownerBlocked && ownerAllowed;
    return { ok: missing.length === 0 && sampleOk, version: VERSION, build: BUILD_CODE, missing, sampleOk, checks:{traderOk,customerBlocked,ownerBlocked,ownerAllowed} };
  }
  const api = { version: VERSION, build: BUILD_CODE, pages: ALL_PAGES.slice(), traderOnly: TRADER_ONLY.slice(), normalizePage, roleLabel, canOpenPage, pageMatrix, requiredTraderAction };
  window.hesabiPermissionsRoleGuards = api;
  window.hesabiPermissionsRoleGuardsSelfCheck = selfCheck;
})();
