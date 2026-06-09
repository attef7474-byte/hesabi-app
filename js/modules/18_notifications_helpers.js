/* Hesabi 1.0.90 - Notifications / badge mobile layout fix.
   Safe rendering/counter helpers only. No Firestore writes except existing clear/read handlers. */
(function(){
  "use strict";
  const VERSION = "1.0.90";
  const BUILD_CODE = 90;

  function escSafe(value){
    try { return typeof esc === "function" ? esc(value) : String(value == null ? "" : value).replace(/[&<>"']/g, function(ch){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch]; }); }
    catch (_) { return ""; }
  }

  function dtSafe(value){
    try { return typeof dt === "function" ? dt(value) : String(value || ""); }
    catch (_) { return String(value || ""); }
  }

  function normalizeCounters(counters){
    counters = counters || {};
    const out = {
      orders:Number(counters.orders||0),
      messages:Number(counters.messages||0),
      payments:Number(counters.payments||0),
      returns:Number(counters.returns||0),
      schedules:Number(counters.schedules||0)
    };
    out.notifications = Number(counters.notifications || (out.orders + out.messages + out.payments + out.returns + out.schedules));
    return out;
  }

  function permissionText(permission){
    const p = String(permission || "unknown");
    if(p === "granted") return "مفعّلة";
    if(p === "denied") return "مرفوضة من النظام";
    if(p === "default") return "لم يتم الاختيار";
    if(p === "unsupported") return "غير مدعومة على هذا الجهاز";
    return "غير معروفة";
  }

  function normalizeNote(n){
    n = n || {};
    return {
      id:String(n.id||""),
      type:String(n.type||""),
      page:String(n.page||"home"),
      title:String(n.title||"تنبيه"),
      body:String(n.body||""),
      createdMs:Number(n.createdMs||Date.now()),
      unread:n.unread !== false,
      raw:n
    };
  }

  function normalizeNotes(notes){
    return Array.isArray(notes) ? notes.map(normalizeNote).sort(function(a,b){ return Number(b.createdMs||0)-Number(a.createdMs||0); }) : [];
  }

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

  function noteIcon(note){
    const type = String((note && (note.type || note.page)) || "");
    if(type.indexOf("message") >= 0 || type.indexOf("messages") >= 0) return "💬";
    if(type.indexOf("payment") >= 0) return "💸";
    if(type.indexOf("return") >= 0) return "↩️";
    if(type.indexOf("schedule") >= 0) return "📅";
    if(type.indexOf("order") >= 0) return "🧾";
    return "🔔";
  }

  function notesCardsHtml(notes){
    const list = normalizeNotes(notes);
    if(!list.length) return '<div class="notify-empty">لا توجد إشعارات غير مقروءة</div>';
    return list.map(function(n){
      return `<div class="notify-row ${n.unread ? "unread" : ""}"><div class="notify-icon">${noteIcon(n)}</div><div class="notify-main"><div class="notify-title">${escSafe(n.title)}</div><div class="notify-body" dir="auto">${escSafe(n.body)}</div></div><div class="notify-meta"><span class="notify-time">${escSafe(dtSafe(n.createdMs))}</span><span class="notify-state">${n.unread ? "جديدة" : "مقروءة"}</span><button class="btn light notify-open" data-notify-open="${escSafe(n.page || "home")}">فتح</button></div></div>`;
    }).join("");
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
    return `<div class="card notify-card"><h2>الإشعارات</h2><div class="notify-summary-grid"><div class="metric"><span class="muted">الرسائل</span><b>${c.messages}</b></div><div class="metric"><span class="muted">الطلبات والمراجعات</span><b>${reviewTotal}</b></div><div class="metric"><span class="muted">الإجمالي</span><b>${c.notifications}</b></div></div><div class="notify-actions"><button class="btn ok" id="enableNotifyBtn">تفعيل التنبيهات</button><button class="btn light" id="clearNotifyBtn">تصفير العدّاد</button><button class="btn secondary" id="testBadgeBtn">اختبار العدّاد</button></div><div class="notify-permission">صلاحية التنبيهات: <b>${escSafe(permissionText(permission))}</b></div><div class="notify-detail">تفاصيل العدّاد: ${escSafe(badgeDetail(c))}</div></div><div class="card notify-list-card"><h2>قائمة التنبيهات</h2><div class="notify-list">${notesCardsHtml(ctx.notes || [])}</div></div>`;
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
    try {
      document.querySelectorAll("[data-notify-open]").forEach(function(b){
        b.onclick = function(){ if(typeof actions.openNotificationPage === "function") actions.openNotificationPage(b.dataset.notifyOpen || "home"); };
      });
    } catch (_) {}
  }

  function selfCheck(){
    const missing = ["normalizeCounters","normalizeNotes","badgeDetail","renderPage","bindActions","notesCardsHtml","permissionText"].filter(function(name){ return typeof api[name] !== "function"; });
    const c = normalizeCounters({messages:1,orders:2});
    const html = renderPage({counters:c, permission:"unsupported", notes:[{title:"اختبار", body:"تنبيه", page:"messages"}]});
    const sampleOk = c.notifications === 3 && badgeDetail(c).indexOf("رسائل") >= 0 && /notify-list/.test(html) && /غير مدعومة/.test(html) && !/<table/i.test(html);
    return { ok: missing.length === 0 && sampleOk, version: VERSION, build: BUILD_CODE, missing, sampleOk, sampleCounters:c };
  }

  const api = { version: VERSION, build: BUILD_CODE, normalizeCounters, normalizeNote, normalizeNotes, badgeDetail, rowsHtml, notesCardsHtml, renderPage, bindActions, permissionText };
  window.hesabiNotificationsHelpers = api;
  window.hesabiNotificationsHelpersSelfCheck = selfCheck;
})();
