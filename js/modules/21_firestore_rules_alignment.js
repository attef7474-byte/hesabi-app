/* Hesabi 1.0.128 - Firestore Rules Alignment Review.
   Read-only diagnostics only. No Firestore reads/writes and no rules mutation from the app. */
(function(){
  "use strict";
  const VERSION = "1.0.128";
  const BUILD_CODE = 128;
  const EXPECTED_PATHS = [
    { key:"shops", path:"shops/{shopId}", roles:["trader","customer-discoverable"], note:"ملف المتجر وإعداداته" },
    { key:"items", path:"shops/{shopId}/items/{itemId}", roles:["trader","linked-customer-read"], note:"الأصناف والمخزون" },
    { key:"customers", path:"shops/{shopId}/customers/{customerId}", roles:["trader","linked-customer-read"], note:"بيانات العملاء والرصيد" },
    { key:"purchaseRequests", path:"shops/{shopId}/purchaseRequests/{requestId}", roles:["trader","linked-customer"], note:"طلبات الشراء" },
    { key:"invoices", path:"shops/{shopId}/invoices/{invoiceId}", roles:["trader","linked-customer-read"], note:"الفواتير" },
    { key:"paymentRequests", path:"shops/{shopId}/paymentRequests/{paymentId}", roles:["trader","linked-customer-create"], note:"السداد والموافقات" },
    { key:"returnRequests", path:"shops/{shopId}/returnRequests/{returnId}", roles:["trader","linked-customer-create"], note:"المرتجعات" },
    { key:"customerLedger", path:"shops/{shopId}/customerLedger/{ledgerId}", roles:["trader","linked-customer-read"], note:"كشف الحساب" },
    { key:"paymentSchedules", path:"shops/{shopId}/paymentSchedules/{scheduleId}", roles:["trader","linked-customer-read"], note:"الجداول والاستحقاقات" },
    { key:"messages", path:"shops/{shopId}/messages/{messageId}", roles:["trader","linked-customer"], note:"الرسائل" },
    { key:"customerUidLinks", path:"shops/{shopId}/customerUidLinks/{uid}", roles:["verified-customer-link"], note:"ربط العميل بالمتجر بعد التحقق" },
    { key:"auditLogs", path:"shops/{shopId}/auditLogs/{auditId}", roles:["trader-read","system-write"], note:"سجل العمليات" },
    { key:"stockLedger", path:"shops/{shopId}/stockLedger/{stockLedgerId}", roles:["trader-read","system-write"], note:"حركات المخزون" },
    { key:"shopPhones", path:"shopPhones/{phoneKey}", roles:["owner-or-auth-phone"], note:"استرجاع حساب التاجر بالهاتف" },
    { key:"customerPhoneLinks", path:"customerPhoneLinks/{phoneKey}/shops/{shopId}", roles:["auth-phone-link"], note:"روابط العميل بالمتاجر" },
    { key:"userProfiles", path:"userProfiles/{uid}", roles:["owner-user"], note:"ملف حساب المستخدم" }
  ];
  function isPermissionDenied(error){
    const text = String((error && (error.code || error.message)) || error || "").toLowerCase();
    return text.indexOf("permission-denied") >= 0 || text.indexOf("permission") >= 0 || text.indexOf("insufficient") >= 0;
  }
  function expectedKeys(){ return EXPECTED_PATHS.map(function(x){ return x.key; }); }
  function pathByKey(key){ return EXPECTED_PATHS.find(function(x){ return x.key === key; }) || null; }
  function runtimeContext(){
    const s = window.state || {};
    return {
      role: s.role || "",
      shopId: s.shopId || s.activeShopId || "",
      customerId: s.customerId || "",
      hasUid: typeof uid === "function" ? !!uid() : false,
      hasDb: typeof db !== "undefined" ? !!db : false,
      checkedAt: new Date().toISOString()
    };
  }
  function reviewRuntimeReadiness(){
    const ctx = runtimeContext();
    const missingContext = [];
    if(!ctx.hasUid) missingContext.push("uid");
    if(!ctx.hasDb) missingContext.push("db");
    if(!ctx.shopId && (ctx.role === "trader" || ctx.role === "customer")) missingContext.push("shopId");
    if(ctx.role === "customer" && !ctx.customerId) missingContext.push("customerId");
    return { ok:true, version:VERSION, build:BUILD_CODE, context:ctx, missingContext, expectedPaths:EXPECTED_PATHS.slice() };
  }
  function firestoreErrorAdvice(action, error){
    if(!isPermissionDenied(error)) return { permissionDenied:false, action:action||"", message:"الخطأ لا يبدو متعلقًا بالصلاحيات." };
    return { permissionDenied:true, action:action||"عملية Firestore", message:"يبدو أن قواعد Firestore لا تسمح بهذه العملية لهذا الدور أو الربط. افحص shopId/customerId/customerUidLinks وقواعد القراءة/الكتابة." };
  }
  function selfCheck(){
    const missing = ["expectedKeys","pathByKey","runtimeContext","reviewRuntimeReadiness","firestoreErrorAdvice"].filter(function(name){ return typeof api[name] !== "function"; });
    const sampleOk = expectedKeys().indexOf("purchaseRequests") >= 0 && !!pathByKey("paymentRequests") && isPermissionDenied({code:"permission-denied"});
    return { ok: missing.length === 0 && sampleOk, version:VERSION, build:BUILD_CODE, missing, sampleOk, pathCount:EXPECTED_PATHS.length };
  }
  const api = { version:VERSION, build:BUILD_CODE, expectedPaths:EXPECTED_PATHS.slice(), expectedKeys, pathByKey, isPermissionDenied, runtimeContext, reviewRuntimeReadiness, firestoreErrorAdvice };
  window.hesabiFirestoreRulesAlignment = api;
  window.hesabiFirestoreRulesAlignmentSelfCheck = selfCheck;
})();
