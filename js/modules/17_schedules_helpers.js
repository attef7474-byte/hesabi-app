/* Hesabi 1.0.78 - Schedules page stabilization.
   Safe rendering/filter helpers only. No Firestore writes or schedule mutations. */
(function(){
  "use strict";

  const VERSION = "1.0.78";
  const BUILD_CODE = 78;
  const VALID_TRADER_TABS = ["create", "due", "overdue", "all"];
  const VALID_CUSTOMER_TABS = ["list", "overdue", "paid"];

  function escSafe(value){
    try { return typeof esc === "function" ? esc(value) : String(value == null ? "" : value).replace(/[&<>"']/g, function(ch){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch]; }); } catch (_) { return ""; }
  }
  function moneySafe(value){ try { return typeof money === "function" ? money(value) : String(Number(value || 0)); } catch (_) { return String(value || 0); } }
  function todaySafe(){ try { return typeof todayIso === "function" ? todayIso() : new Date().toISOString().slice(0,10); } catch (_) { return ""; } }
  function dtSafe(value){ try { return typeof dt === "function" ? dt(value) : String(value || ""); } catch (_) { return String(value || ""); } }

  function normalizeSchedule(s){
    s = s || {};
    return {
      id: String(s.id || s.scheduleId || ""),
      customerId: String(s.customerId || ""),
      customerName: String(s.customerName || (window.state && state.customerName) || "عميل"),
      invoiceId: String(s.invoiceId || ""),
      amount: Number(s.amount || s.total || 0),
      dueDate: String(s.dueDate || ""),
      installmentNo: Number(s.installmentNo || 1),
      installmentCount: Number(s.installmentCount || 1),
      status: String(s.status || "pending"),
      note: String(s.note || ""),
      createdMs: Number(s.createdMs || s.createdAtMs || 0),
      raw: s
    };
  }
  function normalizeList(list){ return Array.isArray(list) ? list.map(normalizeSchedule) : []; }
  function normalizeTab(role, tab){
    const allowed = role === "trader" ? VALID_TRADER_TABS : VALID_CUSTOMER_TABS;
    const fallback = role === "trader" ? "due" : "list";
    return allowed.indexOf(tab) >= 0 ? tab : fallback;
  }
  function scheduleState(row){
    const due = String(row.dueDate || "");
    const status = String(row.status || "pending");
    if(status === "paid" || status === "approved") return { cls:"approved", text:"مدفوع" };
    if(status === "cancelled" || status === "rejected") return { cls:"rejected", text:"ملغى" };
    if(status === "pending" && due && due < todaySafe()) return { cls:"rejected", text:"متأخر" };
    return { cls:"pending", text:"مستحق" };
  }
  function filterSchedules(list, tab, role){
    const rows = normalizeList(list).sort(function(a,b){ return String(a.dueDate || "").localeCompare(String(b.dueDate || "")); });
    const cleanTab = normalizeTab(role, tab);
    if(cleanTab === "due") return rows.filter(function(s){ return s.status === "pending"; });
    if(cleanTab === "overdue") return rows.filter(function(s){ return s.status === "pending" && String(s.dueDate || "") < todaySafe(); });
    if(cleanTab === "paid") return rows.filter(function(s){ return s.status === "paid" || s.status === "approved"; });
    if(cleanTab === "create") return [];
    return rows;
  }
  function summary(list){
    const rows = normalizeList(list);
    const pending = rows.filter(function(s){ return s.status === "pending"; });
    const overdue = rows.filter(function(s){ return s.status === "pending" && String(s.dueDate || "") < todaySafe(); });
    const paid = rows.filter(function(s){ return s.status === "paid" || s.status === "approved"; });
    return {
      total: rows.length,
      pending: pending.length,
      overdue: overdue.length,
      paid: paid.length,
      pendingAmount: pending.reduce(function(a,s){ return a + Number(s.amount || 0); }, 0),
      overdueAmount: overdue.reduce(function(a,s){ return a + Number(s.amount || 0); }, 0),
      paidAmount: paid.reduce(function(a,s){ return a + Number(s.amount || 0); }, 0)
    };
  }
  function tabs(role){
    return role === "trader" ? [["create","➕","إنشاء"],["due","📅","المستحقة"],["overdue","⚠️","المتأخرة"],["all","📋","الكل"]] : [["list","📅","استحقاقاتي"],["overdue","⚠️","المتأخرة"],["paid","✅","المدفوعة"]];
  }
  function renderCreateBox(customers, invoices){
    const customerOptions = (Array.isArray(customers)?customers:[]).map(function(c){ return `<option value="${escSafe(c.customerId || c.id || "")}">${escSafe(c.name || "عميل")} - دينه: ${moneySafe(c.balance || 0)}</option>`; }).join("");
    const invoiceOptions = (Array.isArray(invoices)?invoices:[]).filter(function(i){ return String(i.paymentType || "") === "credit"; }).map(function(i){ return `<option value="${escSafe(i.id || "")}">${escSafe(i.invoiceNo || i.id || "فاتورة")} - ${escSafe(i.customerName || "")} - ${moneySafe(i.total || 0)}</option>`; }).join("");
    return `<div class="card"><h2>جدولة سداد / أقساط</h2><div class="form compact-form"><div class="grid"><div class="field"><label>العميل</label><select id="schedCustomer"><option value="">اختر العميل</option>${customerOptions}</select></div><div class="field"><label>فاتورة آجلة</label><select id="schedInvoice"><option value="">بدون</option>${invoiceOptions}</select></div><div class="field"><label>إجمالي المبلغ</label><input id="schedTotal" type="number" min="1"></div><div class="field"><label>عدد الدفعات</label><input id="schedCount" type="number" min="1" value="1"></div><div class="field"><label>تاريخ أول استحقاق</label><input id="schedStart" type="date"></div><div class="field"><label>الفاصل بالأيام</label><input id="schedInterval" type="number" min="1" value="7"></div></div><div class="field"><label>ملاحظة</label><textarea id="schedNote"></textarea></div><button class="btn compact-main-btn" id="createSchedule">إنشاء الجدولة</button></div></div>`;
  }
  function rowHtml(s, role){
    const st = scheduleState(s);
    let actions = "";
    if(role === "customer" && s.status === "pending") actions += `<button class="btn ok mini" data-pay-schedule="${escSafe(s.id)}">سداد</button>`;
    if(role === "trader" && s.status === "pending") actions += `<button class="btn danger mini" data-cancel-schedule="${escSafe(s.id)}">إلغاء</button>`;
    const actionHtml = typeof compactActionButtons === "function" ? compactActionButtons(actions) : actions;
    return `<tr><td class="name">${escSafe(s.customerName)}</td><td><b>${moneySafe(s.amount)}</b></td><td>${escSafe(s.dueDate || "-")}</td><td>${Number(s.installmentNo || 1)} / ${Number(s.installmentCount || 1)}</td><td><span class="status ${st.cls}">${escSafe(st.text)}</span></td><td>${actionHtml}</td></tr>`;
  }
  function renderPage(ctx){
    ctx = ctx || {};
    const role = ctx.role || (window.state && state.role) || "customer";
    const tab = normalizeTab(role, ctx.tab);
    const allSchedules = Array.isArray(ctx.schedules) ? ctx.schedules : [];
    const stats = summary(allSchedules);
    const pageTabs = tabs(role);
    let content = "";
    if(role === "trader" && tab === "create") {
      content = renderCreateBox(ctx.customers || [], ctx.invoices || []);
    } else {
      const filtered = filterSchedules(allSchedules, tab, role);
      const meta = typeof demandFilter === "function" ? demandFilter("schedulesList23", filtered, function(s){ return `${s.customerName || ""} ${s.amount || ""} ${s.dueDate || ""} ${s.status || ""} ${s.installmentNo || ""} ${s.note || ""}`; }) : { visible: filtered };
      const rows = (meta.visible || []).map(function(s){ return rowHtml(s, role); });
      content = typeof demandTableCard === "function" ? demandTableCard("schedulesList23", role === "trader" ? "استحقاقات العملاء" : "استحقاقاتي", ["العميل","المبلغ","الاستحقاق","الدفعة","الحالة","إجراء"], rows, meta, "لا توجد استحقاقات مطابقة") : `<div class="table-wrap"><table class="compact-table"><tbody>${rows.join("") || "<tr><td>لا توجد استحقاقات</td></tr>"}</tbody></table></div>`;
    }
    const head = typeof pageHead === "function" ? pageHead("الجداول والأقساط", "تم تثبيت عرض الاستحقاقات والجداول مع حماية الفلاتر والحالات.") : "";
    const bar = typeof pageTabsBar === "function" ? pageTabsBar("schedules", tab, pageTabs) : "";
    const statHtml = typeof pageStats === "function" ? pageStats([["كل الاستحقاقات", stats.total], ["معلقة", stats.pending], ["متأخرة", stats.overdue], ["مدفوعة", stats.paid]]) : "";
    return { html: head + bar + statHtml + content, tab, stats };
  }
  function bindActions(actions){
    actions = actions || {};
    try { if(typeof actions.bindPageTabs === "function") actions.bindPageTabs("schedules", actions.renderSchedules); } catch (_) {}
    try { if(typeof actions.bindDemandTable === "function") actions.bindDemandTable("schedulesList23", actions.renderSchedules); } catch (_) {}
    const byId = function(id){ try { return document.getElementById(id); } catch (_) { return null; } };
    if(byId("createSchedule") && typeof actions.createSchedule === "function") byId("createSchedule").onclick = actions.createSchedule;
    if(byId("schedInvoice") && typeof actions.fillScheduleFromInvoice === "function") byId("schedInvoice").onchange = actions.fillScheduleFromInvoice;
    try { document.querySelectorAll("[data-pay-schedule]").forEach(function(b){ b.onclick = function(){ if(typeof actions.paySchedule === "function") actions.paySchedule(b.dataset.paySchedule); }; }); } catch (_) {}
    try { document.querySelectorAll("[data-cancel-schedule]").forEach(function(b){ b.onclick = function(){ if(typeof actions.cancelSchedule === "function") actions.cancelSchedule(b.dataset.cancelSchedule); }; }); } catch (_) {}
  }
  function selfCheck(){
    const missing = ["normalizeSchedule","filterSchedules","summary","renderPage","bindActions"].filter(function(name){ return typeof api[name] !== "function"; });
    const sample = summary([{amount:10,status:"pending",dueDate:"2000-01-01"},{amount:5,status:"paid",dueDate:"2099-01-01"}]);
    const sampleOk = sample.total === 2 && sample.pending === 1 && sample.paid === 1 && sample.overdue >= 1;
    return { ok: missing.length === 0 && sampleOk, version: VERSION, build: BUILD_CODE, missing, sampleOk, sample };
  }
  const api = { version: VERSION, build: BUILD_CODE, normalizeSchedule, normalizeList, normalizeTab, scheduleState, filterSchedules, summary, tabs, renderPage, bindActions };
  window.hesabiSchedulesHelpers = api;
  window.hesabiSchedulesHelpersSelfCheck = selfCheck;
})();
