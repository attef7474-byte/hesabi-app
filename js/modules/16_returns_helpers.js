/* Hesabi 1.0.77 - Returns page stabilization.
   Display/filter/request-form helpers only. No Firestore writes, no invoice/stock/ledger mutation changes. */
(function(){
  "use strict";

  const VERSION = "1.0.77";
  const BUILD_CODE = 77;

  function escSafe(value){
    try { if(typeof esc === "function") return esc(value); } catch (_) {}
    return String(value ?? "").replace(/[&<>'"]/g, function(ch){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"})[ch]; });
  }

  function moneySafe(value){
    try { if(typeof money === "function") return money(value); } catch (_) {}
    const n = Number(value || 0);
    return (Number.isFinite(n) ? n : 0).toLocaleString("ar-YE") + " ريال";
  }

  function statusTextSafe(value){
    try { if(typeof statusText === "function") return statusText(value); } catch (_) {}
    const st = String(value || "pending");
    const map = { pending:"معلق", approved:"مقبول", rejected:"مرفوض", cancelled:"ملغي", done:"منتهي" };
    return map[st] || st;
  }

  function returnCreatedMs(row){
    const r = row && typeof row === "object" ? row : {};
    const direct = Number(r.createdMs || r.reviewedMs || r.updatedMs || 0);
    if(Number.isFinite(direct) && direct > 0) return direct;
    try {
      const ts = r.createdAt || r.reviewedAt || r.updatedAt;
      if(ts && typeof ts.toMillis === "function") return Number(ts.toMillis()) || 0;
      if(ts && ts.seconds) return Number(ts.seconds) * 1000;
    } catch (_) {}
    return 0;
  }

  function normalizeReturn(row, index){
    const r = row && typeof row === "object" ? row : {};
    const qty = Math.max(0, Number(r.qty || r.quantity || 0) || 0);
    const amount = Number(r.total ?? r.amount ?? 0) || 0;
    const status = String(r.status || "pending");
    return {
      raw: r,
      id: String(r.id || r.returnId || index || ""),
      invoiceId: String(r.invoiceId || ""),
      invoiceNo: String(r.invoiceNo || ""),
      customerId: String(r.customerId || ""),
      customerUid: String(r.customerUid || ""),
      customerName: String(r.customerName || "عميل"),
      itemId: String(r.itemId || ""),
      itemName: String(r.itemName || r.name || "صنف"),
      qty,
      amount,
      total: amount,
      reason: String(r.reason || r.note || ""),
      traderNote: String(r.traderNote || r.rejectReason || ""),
      status,
      statusText: statusTextSafe(status),
      createdMs: returnCreatedMs(r),
      invoicePaymentType: String(r.invoicePaymentType || r.paymentType || "")
    };
  }

  function normalizeList(returnsList){
    const list = Array.isArray(returnsList) ? returnsList : [];
    return list.map(normalizeReturn).sort(function(a,b){ return (b.createdMs || 0) - (a.createdMs || 0); });
  }

  function filterByRole(returnsList, opts){
    opts = opts || {};
    const stateObj = opts.state || {};
    const role = String(opts.role || stateObj.role || "");
    let list = normalizeList(returnsList);
    if(role === "customer") {
      const cid = String(stateObj.customerId || opts.customerId || "");
      const cuid = String((typeof uid === "function" ? uid() : "") || stateObj.uid || "");
      list = list.filter(function(row){
        return (!cid && !cuid) ? true : String(row.customerId || "") === cid || String(row.customerUid || "") === cuid;
      });
    }
    return list;
  }

  function isDoneStatus(status){
    const st = String(status || "pending");
    return st === "approved" || st === "rejected" || st === "cancelled" || st === "done";
  }

  function filterByTab(returnsList, tab, opts){
    let list = filterByRole(returnsList, opts);
    const t = String(tab || "pending");
    if(t === "pending") list = list.filter(function(row){ return String(row.status || "pending") === "pending"; });
    if(t === "done") list = list.filter(function(row){ return isDoneStatus(row.status); });
    if(t === "list") list = list;
    return list;
  }

  function stats(returnsList, opts){
    const list = filterByRole(returnsList, opts);
    const pending = list.filter(function(row){ return row.status === "pending"; });
    const approved = list.filter(function(row){ return row.status === "approved"; });
    const rejected = list.filter(function(row){ return row.status === "rejected" || row.status === "cancelled"; });
    return {
      totalCount: list.length,
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      totalAmount: list.reduce(function(sum,row){ return sum + Number(row.amount || 0); }, 0),
      pendingAmount: pending.reduce(function(sum,row){ return sum + Number(row.amount || 0); }, 0),
      approvedAmount: approved.reduce(function(sum,row){ return sum + Number(row.amount || 0); }, 0)
    };
  }

  function searchText(row){
    const r = row && row.raw ? row : normalizeReturn(row || {});
    return [r.customerName, r.invoiceNo, r.invoiceId, r.itemName, r.qty, r.amount, r.status, r.statusText, r.reason, r.traderNote, r.invoicePaymentType].join(" ");
  }

  function renderRequestBox(){
    let linesHtml = "";
    try {
      if(typeof renderReturnLines === "function") linesHtml = renderReturnLines();
    } catch (error) {
      try { console.warn("renderReturnLines failed, using fallback", error); } catch (_) {}
      linesHtml = "";
    }
    if(!linesHtml) linesHtml = '<div class="safe-placeholder">لا توجد فواتير متاحة لطلب مرتجع أو تعذر تجهيز نموذج المرتجع.</div>';
    return `<div class="card"><h2>طلب مرتجع</h2><p class="muted">اختر الفاتورة والصنف من بياناتك ثم أرسل الطلب للتاجر للمراجعة.</p>${linesHtml}<div class="field"><label>سبب المرتجع</label><textarea id="returnReason"></textarea></div><button class="btn compact-main-btn" id="sendReturnRequest">إرسال طلب المرتجع</button></div>`;
  }

  function renderRows(returnsList, opts){
    opts = opts || {};
    const role = String(opts.role || (opts.state && opts.state.role) || "");
    return normalizeList(returnsList).map(function(row){
      const canReview = role === "trader" && row.status === "pending" && row.id;
      const actions = canReview ? `<button class="btn ok mini" data-approve-return="${escSafe(row.id)}">قبول</button><button class="btn danger mini" data-reject-return="${escSafe(row.id)}">رفض</button>` : "";
      const actionHtml = typeof compactActionButtons === "function" ? compactActionButtons(actions) : actions;
      const statusCls = row.status === "approved" ? "approved" : (row.status === "pending" ? "pending" : "rejected");
      return `<tr><td class="name">${escSafe(row.customerName || "عميل")}</td><td>${escSafe(row.invoiceNo || row.invoiceId || "-")}</td><td>${escSafe(row.itemName || "صنف")}</td><td>${Number(row.qty || 0)}</td><td><b>${moneySafe(row.amount || 0)}</b></td><td><span class="status ${escSafe(statusCls)}">${escSafe(row.statusText)}</span></td><td>${actionHtml}</td></tr>`;
    });
  }

  function renderPage(opts){
    opts = opts || {};
    const stateObj = opts.state || {};
    const role = String(opts.role || stateObj.role || "");
    const tab = String(opts.tab || (role === "customer" ? "request" : "pending"));
    const pageTabs = role === "customer"
      ? [["request","↩️","طلب مرتجع"],["list","📋","مرتجعاتي"],["pending","⏳","معلقة"],["done","✅","منتهية"]]
      : [["pending","⏳","معلقة"],["done","✅","منتهية"],["all","📋","كل المرتجعات"]];
    const source = filterByTab(opts.returns || [], tab === "request" ? "list" : tab, opts);
    const st = stats(opts.returns || [], opts);
    const meta = typeof demandFilter === "function"
      ? demandFilter("returnsList23", source, function(row){ return searchText(row.raw || row); })
      : { visible: source, filteredCount: source.length, total: source.length, page: 1, pages: 1 };
    const rows = renderRows(meta.visible || source, opts);
    const head = typeof pageHead === "function" ? pageHead("المرتجعات", "المرتجعات منظمة بين طلب جديد، معلقة، ومنتهية مع فحص آمن للعرض.") : "";
    const tabs = typeof pageTabsBar === "function" ? pageTabsBar("returns", tab, pageTabs) : "";
    const statBlock = typeof pageStats === "function" ? pageStats([["كل المرتجعات", st.totalCount],["معلقة", st.pendingCount],["معتمدة", st.approvedCount],["قيمة المعتمد", moneySafe(st.approvedAmount)]]) : "";
    const table = typeof demandTableCard === "function"
      ? demandTableCard("returnsList23", "جدول المرتجعات", ["العميل","الفاتورة","الصنف","الكمية","المبلغ","الحالة","إجراء"], rows, meta, "لا توجد مرتجعات مطابقة")
      : `<div class="tablewrap"><table><thead><tr><th>العميل</th><th>الفاتورة</th><th>الصنف</th><th>الكمية</th><th>المبلغ</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
    const body = tab === "request" && role === "customer" ? renderRequestBox() : table;
    return { html: head + tabs + statBlock + body, tab, stats: st, count: source.length, meta };
  }

  function bindActions(opts){
    opts = opts || {};
    try { if(typeof opts.bindPageTabs === "function") opts.bindPageTabs("returns", opts.renderReturns); } catch (_) {}
    try { if(typeof opts.bindDemandTable === "function") opts.bindDemandTable("returnsList23", opts.renderReturns); } catch (_) {}
    try { if(typeof opts.phase6BindReturnForm === "function") opts.phase6BindReturnForm(); } catch (_) {}
    const $safe = typeof $ === "function" ? $ : function(id){ return document.getElementById(id); };
    const sendBtn = $safe("sendReturnRequest");
    if(sendBtn && typeof opts.sendReturnRequest === "function") sendBtn.onclick = opts.sendReturnRequest;
    document.querySelectorAll("[data-approve-return]").forEach(function(button){
      button.onclick = function(){ if(typeof opts.approveReturn === "function") opts.approveReturn(button.dataset.approveReturn); };
    });
    document.querySelectorAll("[data-reject-return]").forEach(function(button){
      button.onclick = function(){ if(typeof opts.rejectReturn === "function") opts.rejectReturn(button.dataset.rejectReturn); };
    });
    return { ok: true, sendBound: !!sendBtn };
  }

  function selfCheck(){
    const api = window.hesabiReturnsHelpers || {};
    const required = ["normalizeReturn","normalizeList","filterByTab","stats","renderRows","renderPage","bindActions","searchText","renderRequestBox"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    let sampleOk = false;
    try {
      const result = api.renderPage({
        role: "trader",
        tab: "pending",
        returns: [{ id:"r1", customerName:"اختبار", invoiceNo:"INV-1", itemName:"صنف", qty:2, total:500, status:"pending", reason:"اختبار" }],
        state: { role:"trader" }
      });
      sampleOk = !!(result && result.html && /المرتجعات/.test(result.html) && /اختبار/.test(result.html));
    } catch (_) { sampleOk = false; }
    return { ok: missing.length === 0 && sampleOk, version: VERSION, build: BUILD_CODE, missing, sampleOk };
  }

  window.hesabiReturnsHelpers = {
    version: VERSION,
    build: BUILD_CODE,
    normalizeReturn,
    normalizeList,
    filterByRole,
    filterByTab,
    stats,
    searchText,
    renderRequestBox,
    renderRows,
    renderPage,
    bindActions,
    isDoneStatus,
    returnCreatedMs
  };
  window.hesabiReturnsHelpersSelfCheck = selfCheck;
})();
