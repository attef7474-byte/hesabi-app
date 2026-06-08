/* Hesabi 1.0.75 - Payments page stabilization.
   Safe helpers only: no Firestore writes and no change to payment approval/rejection persistence logic. */
(function(){
  "use strict";

  const VERSION = "1.0.75";
  const BUILD_CODE = 75;

  function escSafe(value){
    if(typeof esc === "function") return esc(value == null ? "" : value);
    return String(value == null ? "" : value).replace(/[&<>"']/g, function(ch){
      return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch];
    });
  }

  function moneySafe(value){
    try { if(typeof money === "function") return money(value); } catch (_) {}
    const n = Number(value || 0);
    return (Number.isFinite(n) ? n : 0).toLocaleString("ar-YE") + " ر.ي";
  }

  function dateSafe(value){
    try { if(typeof dt === "function") return dt(value); } catch (_) {}
    try {
      if(!value) return "-";
      const n = Number(value);
      const d = Number.isFinite(n) ? new Date(n) : new Date(value);
      if(String(d) === "Invalid Date") return "-";
      return d.toLocaleString("ar-YE");
    } catch (_) { return "-"; }
  }

  function statusTextSafe(status){
    try { if(typeof statusText === "function") return statusText(status); } catch (_) {}
    const s = String(status || "pending");
    return ({ pending:"معلّق", approved:"مقبول", rejected:"مرفوض", cancelled:"ملغي" })[s] || s;
  }

  function paymentCreatedMs(payment){
    const p = payment && typeof payment === "object" ? payment : {};
    const direct = Number(p.createdMs || p.approvedMs || p.rejectedMs || p.updatedMs || 0);
    if(Number.isFinite(direct) && direct > 0) return direct;
    try {
      const ts = p.createdAt || p.updatedAt || p.approvedAt || p.rejectedAt;
      if(ts && typeof ts.toMillis === "function") return Number(ts.toMillis()) || 0;
      if(ts && ts.seconds) return Number(ts.seconds) * 1000;
    } catch (_) {}
    return 0;
  }

  function normalizePayment(payment, index){
    const p = payment && typeof payment === "object" ? payment : {};
    return {
      id: String(p.id || p.paymentId || index || ""),
      customerId: String(p.customerId || ""),
      customerName: String(p.customerName || p.name || "عميل"),
      amount: Number(p.amount || 0),
      method: String(p.method || p.paymentMethod || ""),
      referenceNo: String(p.referenceNo || p.reference || p.ref || ""),
      status: String(p.status || "pending"),
      createdMs: paymentCreatedMs(p),
      receiptData: p.receiptData || p.receiptUrl || "",
      traderNote: String(p.traderNote || p.note || "")
    };
  }

  function normalizeList(payments){
    const list = Array.isArray(payments) ? payments : [];
    return list.map(normalizePayment).sort(function(a,b){ return (b.createdMs || 0) - (a.createdMs || 0); });
  }

  function filterByTab(payments, tab){
    const list = normalizeList(payments);
    const t = String(tab || "all");
    if(!t || t === "all" || t === "list" || t === "request") return list;
    if(t === "pending") return list.filter(function(p){ return String(p.status || "pending").indexOf("pending") >= 0; });
    if(t === "approved") return list.filter(function(p){ return p.status === "approved"; });
    if(t === "rejected") return list.filter(function(p){ return p.status === "rejected" || p.status === "cancelled"; });
    return list;
  }

  function stats(payments, debt){
    const list = normalizeList(payments);
    return {
      total: list.length,
      pending: list.filter(function(p){ return String(p.status || "pending").indexOf("pending") >= 0; }).length,
      approved: list.filter(function(p){ return p.status === "approved"; }).length,
      rejected: list.filter(function(p){ return p.status === "rejected" || p.status === "cancelled"; }).length,
      amountPending: list.filter(function(p){ return String(p.status || "pending").indexOf("pending") >= 0; }).reduce(function(a,p){ return a + Number(p.amount || 0); },0),
      amountApproved: list.filter(function(p){ return p.status === "approved"; }).reduce(function(a,p){ return a + Number(p.amount || 0); },0),
      debt: Number(debt || 0)
    };
  }

  function tabsForRole(role){
    return String(role || "") === "customer" ?
      [["request","💸","إرسال سداد"],["list","📋","سداداتي"],["pending","⏳","معلقة"],["approved","✅","مقبولة"]] :
      [["pending","⏳","بانتظار الموافقة"],["approved","✅","مقبولة"],["rejected","❌","مرفوضة"],["all","📋","كل السداد"]];
  }

  function renderPayBox(debt){
    const amountDisabled = Number(debt || 0) > 0 ? "" : " disabled";
    return `<div class="card"><h2>إرسال طلب سداد</h2><div class="grid"><div class="metric"><span class="muted">الدين الحالي</span><b>${moneySafe(debt)}</b></div></div><div class="form compact-form"><div class="grid"><div class="field"><label>المبلغ</label><input id="payAmount" type="number" min="1" inputmode="decimal"></div><div class="field"><label>طريقة السداد</label><input id="payMethod" placeholder="كاش / حوالة / كريمي / بنك"></div><div class="field"><label>رقم المرجع</label><input id="payRef"></div><div class="field"><label>صورة الإيصال</label><input id="payReceipt" type="file" accept="image/*"></div></div><div class="field"><label>ملاحظة</label><textarea id="payNote"></textarea></div><button class="btn compact-main-btn" id="sendPayment"${amountDisabled}>إرسال السداد</button></div></div>`;
  }

  function actionButtons(payment, role){
    let html = "";
    if(payment.receiptData){ html += `<button class="btn secondary mini" data-open-receipt="${escSafe(payment.id)}">إيصال</button>`; }
    if(String(role || "") === "trader" && payment.status === "pending"){
      html += `<button class="btn ok mini" data-approve-pay="${escSafe(payment.id)}">قبول</button><button class="btn danger mini" data-reject-pay="${escSafe(payment.id)}">رفض</button>`;
    }
    try { return typeof compactActionButtons === "function" ? compactActionButtons(html) : html; }
    catch (_) { return html; }
  }

  function renderRows(payments, role, fallbackCustomerName){
    const rows = normalizeList(payments).map(function(p){
      return `<tr><td class="name">${escSafe(p.customerName || fallbackCustomerName || "عميل")}</td><td><b>${moneySafe(p.amount)}</b></td><td>${escSafe(p.method || "-")}</td><td>${escSafe(p.referenceNo || "-")}</td><td><span class="status ${escSafe(p.status)}">${escSafe(statusTextSafe(p.status))}</span></td><td>${escSafe(dateSafe(p.createdMs))}</td><td>${actionButtons(p, role)}</td></tr>`;
    }).join("");
    return rows || '<tr><td colspan="7">لا توجد طلبات سداد مطابقة</td></tr>';
  }

  function renderTable(id, title, rows, meta){
    if(typeof demandTableCard === "function") {
      return demandTableCard(id, title, ["العميل","المبلغ","الطريقة","المرجع","الحالة","التاريخ","إجراء"], rows, meta, "لا توجد طلبات سداد مطابقة");
    }
    return `<div class="table-wrap"><table class="compact-table"><thead><tr><th>العميل</th><th>المبلغ</th><th>الطريقة</th><th>المرجع</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderPage(opts){
    opts = opts || {};
    const role = String(opts.role || "");
    const tab = String(opts.tab || (role === "customer" ? "request" : "pending"));
    const debt = Number(opts.debt || 0);
    const source = filterByTab(opts.payments || [], tab);
    const st = stats(opts.payments || [], debt);
    const rows = renderRows(source, role, (opts.state && opts.state.customerName) || "");
    let meta;
    try {
      meta = typeof demandFilter === "function" ? demandFilter("paymentsList23", source, function(p){ return `${p.customerName || ""} ${p.amount || ""} ${p.method || ""} ${p.referenceNo || ""} ${p.status || ""}`; }) : { visible: source, total: source.length };
    } catch (_) { meta = { visible: source, total: source.length }; }
    const filteredRows = renderRows(meta.visible || source, role, (opts.state && opts.state.customerName) || "");
    const head = typeof pageHead === "function" ? pageHead("السداد والتحويلات","السداد منظم حسب الإرسال والمراجعة والحالة.") : '<div class="card"><h2>السداد والتحويلات</h2></div>';
    const tabs = typeof pageTabsBar === "function" ? pageTabsBar("payments", tab, tabsForRole(role)) : "";
    const statBlock = typeof pageStats === "function" ? pageStats([["كل السداد", st.total],["معلق", st.pending],["مقبول", st.approved],["الدين", moneySafe(st.debt)]]) : "";
    const payBox = role === "customer" ? renderPayBox(debt) : "";
    const table = renderTable("paymentsList23", role === "trader" ? "طلبات السداد" : "سداداتي", filteredRows, meta);
    return { html: head + tabs + statBlock + (tab === "request" ? payBox : table), tab, stats: st, count: source.length };
  }

  function bindActions(opts){
    opts = opts || {};
    try { if(typeof opts.bindPageTabs === "function") opts.bindPageTabs("payments", opts.renderPayments); }
    catch (_) {}
    try { if(typeof opts.bindDemandTable === "function") opts.bindDemandTable("paymentsList23", opts.renderPayments); }
    catch (_) {}
    const $safe = typeof $ === "function" ? $ : function(id){ return document.getElementById(id); };
    const sendBtn = $safe("sendPayment");
    if(sendBtn && typeof opts.sendPayment === "function") sendBtn.onclick = opts.sendPayment;
    document.querySelectorAll("[data-approve-pay]").forEach(function(btn){ if(typeof opts.approvePayment === "function") btn.onclick = function(){ opts.approvePayment(btn.dataset.approvePay); }; });
    document.querySelectorAll("[data-reject-pay]").forEach(function(btn){ if(typeof opts.rejectPayment === "function") btn.onclick = function(){ opts.rejectPayment(btn.dataset.rejectPay); }; });
    document.querySelectorAll("[data-open-receipt]").forEach(function(btn){ if(typeof opts.openReceipt === "function") btn.onclick = function(){ opts.openReceipt(btn.dataset.openReceipt); }; });
    return { ok: true, sendBound: !!sendBtn, actionButtons: document.querySelectorAll("[data-approve-pay],[data-reject-pay],[data-open-receipt]").length };
  }

  function selfCheck(){
    const api = window.hesabiPaymentsHelpers || {};
    const required = ["normalizePayment","filterByTab","stats","renderPage","renderRows","bindActions","tabsForRole"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    let sampleOk = false;
    try {
      const result = api.renderPage({ role:"trader", tab:"pending", debt:0, payments:[{ id:"p1", customerName:"اختبار", amount:1000, status:"pending", method:"كاش", referenceNo:"A1", createdMs:Date.now() }], state:{} });
      sampleOk = !!(result && result.html && /السداد/.test(result.html) && /اختبار/.test(result.html));
    } catch (_) { sampleOk = false; }
    return { ok: missing.length === 0 && sampleOk, version: VERSION, build: BUILD_CODE, missing, sampleOk };
  }

  window.hesabiPaymentsHelpers = {
    version: VERSION,
    build: BUILD_CODE,
    normalizePayment,
    normalizeList,
    filterByTab,
    stats,
    tabsForRole,
    renderPayBox,
    renderRows,
    renderPage,
    bindActions,
    paymentCreatedMs
  };
  window.hesabiPaymentsHelpersSelfCheck = selfCheck;
})();
