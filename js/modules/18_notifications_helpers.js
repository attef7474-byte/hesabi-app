/* Hesabi 1.0.79 - Notifications / badge stabilization.
   Safe rendering/counter helpers only. No Firestore writes except existing clear/read handlers. */
(function(){
  "use strict";
  const VERSION = "1.0.79";
  const BUILD_CODE = 79;
  function escSafe(value){ try { return typeof esc === "function" ? esc(value) : String(value == null ? "" : value).replace(/[&<>"']/g, function(ch){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch]; }); } catch (_) { return ""; } }
  function dtSafe(value){ try { return typeof dt === "function" ? dt(value) : String(value || ""); } catch (_) { return String(value || ""); } }
  function normalizeCounters(counters){
    counters = counters || {};
    const out = { orders:Number(counters.orders||0), messages:Number(counters.messages||0), payments:Number(counters.payments||0), returns:Number(counters.returns||0), schedules:Number(counters.schedules||0) };
    out.notifications = Number(counters.notifications || (out.orders + out.messages + out.payments + out.returns + out.schedules));
    return out;
  }
  function normalizeNote(n){
    n = n || {};
    return { id:String(n.id||""), type:String(n.type||""), page:String(n.page||"home"), title:String(n.title||"تنبيه"), body:String(n.body||""), createdMs:Number(n.createdMs||Date.now()), raw:n };
  }
  function normalizeNotes(notes){ return Array.isArray(notes) ? notes.map(normalizeNote).sort(function(a,b){ return Number(b.createdMs||0)-Number(a.createdMs||0); }) : []; }
  function badgeDetail(counters){
    const c = normalizeCounters(counters);
    const parts = [];
    if(c.messages) parts.push("رسائل: " + c.messages);
    if(c.orders) parts.push("طلبات: " + c.orders);
    if(c.payments) parts.push("سداد: " + c.payments);
    if(c.returns) parts.push("مرتجعات: " + c.returns);
    if(c.schedules) parts.push("استحقاقات: " + c.schedules);
    return parts.length ? parts.join(" | ") : "لا توجد مراجعات جديدة";
  }
  function rowsHtml(notes){
    const rows = normalizeNotes(notes).map(function(n){
      return `<tr><td class="name"><b>${escSafe(n.title)}</b><div class="muted">${escSafe(n.body)}</div></td><td>${dtSafe(n.createdMs)}</td><td><button class="btn light" data-notify-open="${escSafe(n.page || "home")}">فتح</button></td></tr>`;
    }).join("");
    return rows || '<tr><td colspan="3">لا توجد إشعارات غير مقروءة</td></tr>';
  }
  function renderPage(ctx){
    ctx = ctx || {};
    const c = normalizeCounters(ctx.counters || {});
    const permission = String(ctx.permission || "unknown");
    const reviewTotal = c.orders + c.payments + c.returns + c.schedules;
    return `<div class="card"><h2>الإشعارات</h2><div class="grid"><div class="metric"><span class="muted">الرسائل</span><b>${c.messages}</b></div><div class="metric"><span class="muted">الطلبات والمراجعات</span><b>${reviewTotal}</b></div><div class="metric"><span class="muted">الإجمالي</span><b>${c.notifications}</b></div></div><div class="actions"><button class="btn ok" id="enableNotifyBtn">تفعيل التنبيهات</button><button class="btn light" id="clearNotifyBtn">تصفير العدّاد</button><button class="btn secondary" id="testBadgeBtn">اختبار العدّاد</button></div><p class="muted">صلاحية التنبيهات: ${escSafe(permission)}</p><p class="muted">تفاصيل العداد: ${escSafe(badgeDetail(c))}</p></div><div class="table-wrap"><table class="compact-table"><thead><tr><th>التنبيه</th><th>الوقت</th><th>إجراء</th></tr></thead><tbody>${rowsHtml(ctx.notes || [])}</tbody></table></div>`;
  }
  function bindActions(actions){
    actions = actions || {};
    const byId = function(id){ try { return document.getElementById(id); } catch (_) { return null; } };
    if(byId("enableNotifyBtn") && typeof actions.requestNotificationPermission === "function") byId("enableNotifyBtn").onclick = function(){ actions.requestNotificationPermission(true); };
    if(byId("clearNotifyBtn") && typeof actions.clearAllNotificationCounters === "function") byId("clearNotifyBtn").onclick = function(){ actions.clearAllNotificationCounters(); if(typeof actions.msg === "function") actions.msg("تم تصفير عداد الإشعارات.", "success"); };
    if(byId("testBadgeBtn")) byId("testBadgeBtn").onclick = function(){
      try {
        if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.updateLauncherBadge === "function") window.hesabiAndroidBridge.updateLauncherBadge(1, "اختبار عداد حسابي التجاري");
        if(typeof actions.msg === "function") actions.msg("تم إرسال اختبار للعداد. قد يظهر رقم أو نقطة حسب نوع الهاتف.", "success");
      } catch (e) { if(typeof actions.msg === "function") actions.msg("تعذر اختبار العداد: " + (e.message || e), "error"); }
    };
    try { document.querySelectorAll("[data-notify-open]").forEach(function(b){ b.onclick = function(){ if(typeof actions.openNotificationPage === "function") actions.openNotificationPage(b.dataset.notifyOpen || "home"); }; }); } catch (_) {}
  }
  function selfCheck(){
    const missing = ["normalizeCounters","normalizeNotes","badgeDetail","renderPage","bindActions"].filter(function(name){ return typeof api[name] !== "function"; });
    const c = normalizeCounters({messages:1,orders:2});
    const sampleOk = c.notifications === 3 && badgeDetail(c).indexOf("رسائل") >= 0;
    return { ok: missing.length === 0 && sampleOk, version: VERSION, build: BUILD_CODE, missing, sampleOk, sampleCounters:c };
  }
  const api = { version: VERSION, build: BUILD_CODE, normalizeCounters, normalizeNote, normalizeNotes, badgeDetail, rowsHtml, renderPage, bindActions };
  window.hesabiNotificationsHelpers = api;
  window.hesabiNotificationsHelpersSelfCheck = selfCheck;
})();
