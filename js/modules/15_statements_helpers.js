/* Hesabi 1.0.128 - Statements commercial display/share/export helpers.
   Display/filter/summary/share/export only. No Firestore writes. */
(function(){
  "use strict";

  const VERSION = "1.0.128";
  const BUILD_CODE = 128;

  function escSafe(value){
    try { if(typeof esc === "function") return esc(value); } catch (_) {}
    return String(value ?? "").replace(/[&<>'"]/g, function(ch){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"})[ch]; });
  }

  function moneySafe(value){
    try { if(typeof money === "function") return money(value); } catch (_) {}
    const n = Number(value || 0);
    return (Number.isFinite(n) ? n : 0).toLocaleString("ar-YE") + " ريال";
  }

  function dateSafe(ms){
    try { if(typeof dt === "function") return dt(ms); } catch (_) {}
    const n = Number(ms || 0);
    if(!n) return "-";
    try { return new Date(n).toLocaleDateString("ar-YE"); } catch (_) { return String(ms || "-"); }
  }

  function dateTimeSafe(ms){
    const n = Number(ms || 0);
    if(!n) return "-";
    try { return new Date(n).toLocaleString("ar-YE"); } catch (_) { return dateSafe(ms); }
  }

  function isoDay(ms){
    const n = Number(ms || 0);
    if(!n) return "";
    try { return new Date(n).toISOString().slice(0, 10); } catch (_) { return ""; }
  }

  function ledgerTypeSafe(type){
    try { if(typeof ledgerTypeText === "function") return ledgerTypeText(type); } catch (_) {}
    const value = String(type || "");
    const map = {
      invoice_credit: "فاتورة آجل",
      invoice_cash: "فاتورة كاش",
      debit_invoice: "فاتورة آجل",
      cash_invoice: "فاتورة كاش",
      payment_approved: "سداد",
      payment: "سداد",
      return_credit: "مرتجع آجل",
      return_cash: "مرتجع كاش",
      adjustment: "تسوية",
      opening_balance: "رصيد افتتاحي"
    };
    return map[value] || value || "حركة";
  }

  function isPaymentType(type){
    const t = String(type || "").toLowerCase();
    return t.includes("payment") || t.includes("pay") || t.includes("سداد") || t === "receipt";
  }

  function isReturnType(type){
    const t = String(type || "").toLowerCase();
    return t.includes("return") || t.includes("refund") || t.includes("مرتجع");
  }

  function directionOf(entry){
    const row = entry && typeof entry === "object" ? entry : {};
    const amount = Number(row.amount || 0) || 0;
    const type = String(row.type || "");
    const dir = String(row.direction || "");
    if(dir === "credit" || isPaymentType(type)) return "credit";
    if(dir === "debit" || type.includes("invoice_credit") || type.includes("debit_invoice") || type === "opening_balance") return "debit";
    if(dir === "neutral" || type.includes("invoice_cash") || type.includes("cash_invoice")) return "neutral";
    if(isReturnType(type)) return "credit";
    if(amount < 0) return "credit";
    if(amount > 0) return "debit";
    return "neutral";
  }

  function signedDelta(entry){
    const row = normalizeEntry(entry);
    if(row.direction === "credit") return -row.absAmount;
    if(row.direction === "debit") return row.absAmount;
    return 0;
  }

  function normalizeEntry(entry, index){
    const row = entry && typeof entry === "object" ? entry : {};
    const amount = Number(row.amount || 0) || 0;
    const direction = directionOf(row);
    return {
      raw: row,
      id: String(row.id || row.ledgerId || index || ""),
      customerId: String(row.customerId || ""),
      customerUid: String(row.customerUid || ""),
      customerName: String(row.customerName || row.name || "عميل"),
      type: String(row.type || ""),
      typeText: ledgerTypeSafe(row.type),
      amount,
      absAmount: Math.abs(amount),
      note: String(row.note || row.description || row.reason || ""),
      invoiceId: String(row.invoiceId || row.sourceInvoiceId || ""),
      paymentId: String(row.paymentId || row.sourcePaymentId || ""),
      createdMs: ledgerCreatedMs(row),
      direction
    };
  }

  function ledgerCreatedMs(entry){
    const row = entry && typeof entry === "object" ? entry : {};
    const direct = Number(row.createdMs || row.approvedMs || row.updatedMs || 0);
    if(Number.isFinite(direct) && direct > 0) return direct;
    try {
      const ts = row.createdAt || row.approvedAt || row.updatedAt;
      if(ts && typeof ts.toMillis === "function") return Number(ts.toMillis()) || 0;
      if(ts && ts.seconds) return Number(ts.seconds) * 1000;
    } catch (_) {}
    return 0;
  }

  function normalizeList(ledger){
    const list = Array.isArray(ledger) ? ledger : [];
    return list.map(normalizeEntry).sort(function(a,b){ return (a.createdMs || 0) - (b.createdMs || 0); });
  }

  function parseRange(opts){
    opts = opts || {};
    const stateObj = opts.state || {};
    return {
      from: String(opts.fromDate || stateObj.statementFrom || ""),
      to: String(opts.toDate || stateObj.statementTo || "")
    };
  }

  function filterByRoleAndCustomer(ledger, opts){
    opts = opts || {};
    let list = normalizeList(ledger);
    const stateObj = opts.state || {};
    const role = String(opts.role || stateObj.role || "");
    const selectedCustomer = String(opts.selectedCustomer || stateObj.statementCustomer || "");
    if(role === "trader" && selectedCustomer) {
      list = list.filter(function(row){ return String(row.customerId || "") === selectedCustomer; });
    }
    if(role === "customer") {
      const cid = String(stateObj.customerId || opts.customerId || "");
      const cuid = String((typeof uid === "function" ? uid() : "") || stateObj.uid || "");
      list = list.filter(function(row){
        return !cid && !cuid ? true : String(row.customerId || "") === cid || String(row.customerUid || "") === cuid;
      });
    }
    return list;
  }

  function filterByDateRange(list, from, to){
    if(!from && !to) return list.slice();
    return list.filter(function(row){
      const day = isoDay(row.createdMs);
      if(!day) return false;
      if(from && day < from) return false;
      if(to && day > to) return false;
      return true;
    });
  }

  function filterByTab(ledger, tab, opts){
    let list = filterByRoleAndCustomer(ledger, opts);
    const range = parseRange(opts);
    list = filterByDateRange(list, range.from, range.to);
    const t = String(tab || "ledger");
    if(t === "debit") list = list.filter(function(row){ return row.direction === "debit"; });
    if(t === "credit") list = list.filter(function(row){ return row.direction === "credit"; });
    return list;
  }

  function periodSummary(ledger, opts){
    const all = filterByRoleAndCustomer(ledger, opts);
    const range = parseRange(opts);
    const before = range.from ? all.filter(function(row){ return isoDay(row.createdMs) < range.from; }) : [];
    const period = filterByDateRange(all, range.from, range.to);
    const opening = before.reduce(function(sum, row){ return sum + signedDelta(row); }, 0);
    const debit = period.filter(function(row){ return row.direction === "debit"; }).reduce(function(sum, row){ return sum + row.absAmount; }, 0);
    const credit = period.filter(function(row){ return row.direction === "credit"; }).reduce(function(sum, row){ return sum + row.absAmount; }, 0);
    const closing = opening + debit - credit;
    return { opening, debit, credit, closing, periodCount: period.length, allCount: all.length, from: range.from, to: range.to };
  }

  function stats(ledger, opts){
    const summary = periodSummary(ledger, opts);
    return {
      totalCount: summary.periodCount,
      debitCount: filterByTab(ledger, "debit", opts).length,
      creditCount: filterByTab(ledger, "credit", opts).length,
      debit: summary.debit,
      credit: summary.credit,
      balance: summary.closing,
      opening: summary.opening,
      closing: summary.closing,
      rawAmountTotal: summary.closing
    };
  }

  function searchText(entry){
    const row = normalizeEntry(entry || {});
    return [row.customerName, row.customerId, row.type, row.typeText, row.amount, row.note, row.invoiceId, row.paymentId, dateSafe(row.createdMs)].join(" ");
  }

  function renderRows(ledger, opts){
    let running = Number(periodSummary(ledger, opts).opening || 0);
    const rows = filterByTab(ledger, "ledger", opts).map(function(row){
      running += signedDelta(row);
      const cls = row.direction === "credit" ? "approved" : (row.direction === "debit" ? "pending" : "notice");
      return `<tr><td>${dateTimeSafe(row.createdMs)}</td><td class="name">${escSafe(row.customerName || "عميل")}</td><td><span class="status ${cls}">${escSafe(row.typeText)}</span></td><td><b>${moneySafe(row.absAmount || row.amount)}</b><div class="subcell muted">${row.direction === "credit" ? "دائن" : (row.direction === "debit" ? "مدين" : "محايد")}</div></td><td>${escSafe(row.note || "")}</td><td><b>${moneySafe(running)}</b></td></tr>`;
    }).join("");
    return rows || '<tr><td colspan="6">لا توجد حركات مطابقة</td></tr>';
  }

  function renderCustomerOptions(customers, selectedCustomer){
    const list = Array.isArray(customers) ? customers : [];
    return list.map(function(c){
      const id = String(c && c.customerId || "");
      return `<option value="${escSafe(id)}" ${String(selectedCustomer || "") === id ? "selected" : ""}>${escSafe((c && c.name) || "عميل")} - ${escSafe((c && c.phone) || "")}</option>`;
    }).join("");
  }

  function renderFilters(opts){
    opts = opts || {};
    const role = String(opts.role || "");
    const selectedCustomer = String(opts.selectedCustomer || "");
    const range = parseRange(opts);
    const customerFilter = role === "trader" ? `<div class="field"><label>العميل</label><select id="statementFilterCustomer"><option value="">كل العملاء</option>${renderCustomerOptions(opts.customers, selectedCustomer)}</select></div>` : "";
    return `<div class="card"><div class="grid compact-filters">${customerFilter}<div class="field"><label>من تاريخ</label><input id="statementFromDate" type="date" value="${escSafe(range.from)}"></div><div class="field"><label>إلى تاريخ</label><input id="statementToDate" type="date" value="${escSafe(range.to)}"></div></div><div class="actions"><button class="btn light mini" id="clearStatementFilters">مسح الفلاتر</button></div></div>`;
  }

  function renderSummary(summary, opts){
    const customerName = (() => {
      const role = String(opts.role || "");
      if(role === "customer") return String(opts.state?.customerName || "حسابي");
      const cid = String(opts.selectedCustomer || opts.state?.statementCustomer || "");
      if(!cid) return "كل العملاء";
      const c = (opts.customers || []).find(function(x){ return String(x.customerId || "") === cid; });
      return String((c && c.name) || cid);
    })();
    return `<div class="card"><h2>ملخص كشف الحساب</h2><p class="muted">العميل: ${escSafe(customerName)}${summary.from || summary.to ? ` | الفترة: ${escSafe(summary.from || "...")} → ${escSafe(summary.to || "...")}` : ""}</p><div class="grid"><div class="metric"><span class="muted">رصيد افتتاحي</span><b>${moneySafe(summary.opening)}</b></div><div class="metric"><span class="muted">إجمالي مدين</span><b>${moneySafe(summary.debit)}</b></div><div class="metric"><span class="muted">إجمالي دائن</span><b>${moneySafe(summary.credit)}</b></div><div class="metric"><span class="muted">رصيد ختامي</span><b>${moneySafe(summary.closing)}</b></div></div><div class="notice">المدين = ما على العميل (فواتير/آجل). الدائن = ما دفعه العميل (سداد/مرتجع).</div></div>`;
  }

  function renderShareBox(selectedCustomer, summary){
    const disabled = selectedCustomer || summary.periodCount > 0 ? "" : "disabled";
    const hint = selectedCustomer ? "يمكن مشاركة أو تصدير كشف الحساب للعميل المحدد." : "اختر عميلًا أو استخدم حسابك كعميل، ثم حدّد الفترة إن لزم.";
    return `<div class="card"><h2>مشاركة كشف الحساب</h2><p class="muted">${escSafe(hint)}</p><div class="settings-compact-actions"><button class="btn secondary" id="shareSelectedStatement" ${disabled}>مشاركة كشف الحساب</button><button class="btn light" id="exportStatementCsv" ${disabled}>تصدير CSV</button></div></div>`;
  }

  function resolveCustomerContext(opts){
    opts = opts || {};
    const role = String(opts.role || opts.state?.role || "");
    let customerId = String(opts.selectedCustomer || opts.state?.statementCustomer || opts.customerId || opts.state?.customerId || "");
    let customerName = "";
    let customerPhone = "";
    if(role === "customer") {
      customerId = String(opts.state?.customerId || customerId);
      customerName = String(opts.state?.customerName || "");
      customerPhone = String(opts.state?.customerPhone || "");
    } else if(customerId) {
      const c = (opts.customers || []).find(function(x){ return String(x.customerId || "") === customerId; });
      customerName = String((c && c.name) || "");
      customerPhone = String((c && c.phone) || "");
    }
    return { customerId, customerName, customerPhone };
  }

  function buildStatementText(ledger, opts){
    opts = opts || {};
    const ctx = resolveCustomerContext(opts);
    const summary = periodSummary(ledger, opts);
    const rows = filterByTab(ledger, "ledger", opts);
    let running = Number(summary.opening || 0);
    const body = rows.map(function(row){
      running += signedDelta(row);
      return `${dateSafe(row.createdMs)} | ${row.typeText} | ${row.direction === "credit" ? "-" : "+"}${moneySafe(row.absAmount)} | الرصيد: ${moneySafe(running)} | ${row.note || ""}`;
    }).join("\n");
    return [
      "كشف حساب - حسابي التجاري",
      "----------------------",
      `المتجر: ${String(opts.shopName || opts.state?.shopName || opts.cache?.shop?.name || "")}`,
      `العميل: ${ctx.customerName || ctx.customerId || "عميل"}`,
      `الهاتف: ${ctx.customerPhone || "-"}`,
      summary.from || summary.to ? `الفترة: ${summary.from || "..."} → ${summary.to || "..."}` : "",
      `رصيد افتتاحي: ${moneySafe(summary.opening)}`,
      `إجمالي مدين: ${moneySafe(summary.debit)}`,
      `إجمالي دائن: ${moneySafe(summary.credit)}`,
      `رصيد ختامي: ${moneySafe(summary.closing)}`,
      "----------------------",
      body || "لا توجد حركات في الفترة المحددة."
    ].filter(Boolean).join("\n");
  }

  function exportStatementCsv(ledger, opts){
    opts = opts || {};
    const ctx = resolveCustomerContext(opts);
    const summary = periodSummary(ledger, opts);
    let running = Number(summary.opening || 0);
    const rows = filterByTab(ledger, "ledger", opts).map(function(row){
      running += signedDelta(row);
      return {
        date: dateTimeSafe(row.createdMs),
        customerName: row.customerName,
        type: row.typeText,
        direction: row.direction === "credit" ? "دائن" : (row.direction === "debit" ? "مدين" : "محايد"),
        amount: row.absAmount,
        runningBalance: running,
        note: row.note
      };
    });
    const cols = ["date","customerName","type","direction","amount","runningBalance","note"];
    const filename = "hesabi-statement-" + (ctx.customerId || "all") + "-" + (new Date().toISOString().slice(0,10)) + ".csv";
    if(typeof exportCsv === "function") return exportCsv(filename, cols, rows);
    return { ok:false, reason:"exportCsv-missing", rows:rows.length };
  }

  function renderPage(opts){
    opts = opts || {};
    const tab = String(opts.tab || "ledger");
    const selectedCustomer = String(opts.selectedCustomer || "");
    const source = filterByTab(opts.ledger || [], tab === "ledger" ? "ledger" : tab, opts);
    const summary = periodSummary(opts.ledger || [], opts);
    const st = stats(opts.ledger || [], opts);
    const meta = typeof demandFilter === "function"
      ? demandFilter("statementList23", source, function(row){ return searchText(row.raw || row); })
      : { visible: source };
    const rows = renderRows(meta.visible || source, opts);
    const head = typeof pageHead === "function" ? pageHead("كشف الحساب", "كشف حساب تجاري مع رصيد افتتاحي/ختامي وفلتر تاريخ ومشاركة وتصدير.") : "";
    const tabs = typeof pageTabsBar === "function" ? pageTabsBar("statement", tab, [["summary","📊","ملخص"],["ledger","📒","الحركات"],["debit","⬆️","مدين"],["credit","⬇️","دائن"],["share","📤","مشاركة"]]) : "";
    const statBlock = typeof pageStats === "function" ? pageStats([["الحركات", st.totalCount],["مدين", moneySafe(st.debit)],["دائن", moneySafe(st.credit)],["الرصيد", moneySafe(st.closing)]]) : "";
    const filters = renderFilters(opts);
    const table = typeof demandTableCard === "function"
      ? demandTableCard("statementList23", "حركات كشف الحساب", ["التاريخ","العميل","نوع الحركة","المبلغ","البيان","الرصيد"], rows, meta, "لا توجد حركات مطابقة")
      : `<div class="table-wrap"><table class="compact-table"><thead><tr><th>التاريخ</th><th>العميل</th><th>نوع الحركة</th><th>المبلغ</th><th>البيان</th><th>الرصيد</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    const body = tab === "summary" ? renderSummary(summary, opts) : (tab === "share" ? renderShareBox(selectedCustomer || opts.state?.customerId, summary) : table);
    return { html: head + tabs + statBlock + filters + body, tab, stats: st, summary, count: source.length, meta };
  }

  function bindActions(opts){
    opts = opts || {};
    try { if(typeof opts.bindPageTabs === "function") opts.bindPageTabs("statement", opts.renderStatement); } catch (_) {}
    try { if(typeof opts.bindDemandTable === "function") opts.bindDemandTable("statementList23", opts.renderStatement); } catch (_) {}
    const $safe = typeof $ === "function" ? $ : function(id){ return document.getElementById(id); };
    const applyFilters = function(){
      if(typeof opts.renderStatement === "function") opts.renderStatement();
    };
    const filter = $safe("statementFilterCustomer");
    const from = $safe("statementFromDate");
    const to = $safe("statementToDate");
    if(filter) filter.onchange = function(event){
      opts.state.statementCustomer = event.target.value || "";
      try { if(typeof opts.save === "function") opts.save(); } catch (_) {}
      applyFilters();
    };
    if(from) from.onchange = function(event){
      opts.state.statementFrom = event.target.value || "";
      try { if(typeof opts.save === "function") opts.save(); } catch (_) {}
      applyFilters();
    };
    if(to) to.onchange = function(event){
      opts.state.statementTo = event.target.value || "";
      try { if(typeof opts.save === "function") opts.save(); } catch (_) {}
      applyFilters();
    };
    const clear = $safe("clearStatementFilters");
    if(clear) clear.onclick = function(){
      opts.state.statementCustomer = "";
      opts.state.statementFrom = "";
      opts.state.statementTo = "";
      try { if(typeof opts.save === "function") opts.save(); } catch (_) {}
      applyFilters();
    };
    const share = $safe("shareSelectedStatement");
    if(share) share.onclick = function(){
      if(typeof opts.shareStatementText === "function") opts.shareStatementText((opts.state && opts.state.statementCustomer) || opts.state?.customerId || "");
    };
    const exportBtn = $safe("exportStatementCsv");
    if(exportBtn) exportBtn.onclick = function(){
      exportStatementCsv(opts.ledger || [], opts);
    };
    return { ok: true, filterBound: !!filter, shareBound: !!share, exportBound: !!exportBtn };
  }

  function selfCheck(){
    const api = window.hesabiStatementsHelpers || {};
    const required = ["normalizeEntry","normalizeList","filterByTab","stats","renderRows","renderPage","bindActions","searchText","buildStatementText","exportStatementCsv","periodSummary"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    let sampleOk = false;
    try {
      const ledger = [
        { id:"l0", customerId:"c1", customerName:"اختبار", type:"opening_balance", direction:"debit", amount:200, note:"رصيد", createdMs:Date.now()-86400000 },
        { id:"l1", customerId:"c1", customerName:"اختبار", type:"invoice_credit", direction:"debit", amount:1000, note:"فاتورة", createdMs:Date.now() },
        { id:"l2", customerId:"c1", customerName:"اختبار", type:"payment_approved", direction:"credit", amount:300, note:"سداد", createdMs:Date.now() }
      ];
      const result = api.renderPage({ role:"trader", tab:"summary", selectedCustomer:"c1", ledger, customers:[{ customerId:"c1", name:"اختبار", phone:"777" }], state:{ role:"trader", statementCustomer:"c1" } });
      const text = api.buildStatementText(ledger, { role:"trader", selectedCustomer:"c1", customers:[{ customerId:"c1", name:"اختبار", phone:"777" }], state:{ role:"trader", statementCustomer:"c1" }, shopName:"متجر" });
      sampleOk = !!(result && result.html && /رصيد افتتاحي/.test(result.html) && /رصيد ختامي/.test(text));
    } catch (_) { sampleOk = false; }
    return { ok: missing.length === 0 && sampleOk, version: VERSION, build: BUILD_CODE, missing, sampleOk };
  }

  window.hesabiStatementsHelpers = {
    version: VERSION,
    build: BUILD_CODE,
    normalizeEntry,
    normalizeList,
    filterByRoleAndCustomer,
    filterByTab,
    filterByDateRange,
    periodSummary,
    stats,
    searchText,
    renderRows,
    renderFilters,
    renderShareBox,
    renderPage,
    bindActions,
    buildStatementText,
    exportStatementCsv,
    ledgerCreatedMs,
    directionOf,
    signedDelta
  };
  window.hesabiStatementsHelpersSelfCheck = selfCheck;
})();
