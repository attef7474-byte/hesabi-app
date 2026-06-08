/* Hesabi 1.0.76 - Statements page stabilization.
   Display/filter/summary helpers only. No Firestore writes, no invoice creation, no payment approval changes. */
(function(){
  "use strict";

  const VERSION = "1.0.76";
  const BUILD_CODE = 76;

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
    try { if(typeof dateText === "function") return dateText(ms); } catch (_) {}
    const n = Number(ms || 0);
    if(!n) return "-";
    try { return new Date(n).toLocaleDateString("ar-YE"); } catch (_) { return String(ms || "-"); }
  }

  function ledgerTypeSafe(type){
    try { if(typeof ledgerTypeText === "function") return ledgerTypeText(type); } catch (_) {}
    const value = String(type || "");
    const map = {
      invoice: "فاتورة",
      sale: "فاتورة",
      payment: "سداد",
      return: "مرتجع",
      adjustment: "تسوية",
      opening: "رصيد افتتاحي"
    };
    return map[value] || value || "حركة";
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
    if(isPaymentType(type) || isReturnType(type) || amount < 0) return "credit";
    if(amount > 0) return "debit";
    return "neutral";
  }

  function normalizeEntry(entry, index){
    const row = entry && typeof entry === "object" ? entry : {};
    const amount = Number(row.amount || 0) || 0;
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
      direction: directionOf(row)
    };
  }

  function normalizeList(ledger){
    const list = Array.isArray(ledger) ? ledger : [];
    return list.map(normalizeEntry).sort(function(a,b){ return (b.createdMs || 0) - (a.createdMs || 0); });
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

  function filterByTab(ledger, tab, opts){
    let list = filterByRoleAndCustomer(ledger, opts);
    const t = String(tab || "ledger");
    if(t === "debit") list = list.filter(function(row){ return row.direction === "debit"; });
    if(t === "credit") list = list.filter(function(row){ return row.direction === "credit"; });
    return list;
  }

  function stats(ledger, opts){
    const list = filterByRoleAndCustomer(ledger, opts);
    const debitRows = list.filter(function(row){ return row.direction === "debit"; });
    const creditRows = list.filter(function(row){ return row.direction === "credit"; });
    const debit = debitRows.reduce(function(sum,row){ return sum + row.absAmount; }, 0);
    const credit = creditRows.reduce(function(sum,row){ return sum + row.absAmount; }, 0);
    return {
      totalCount: list.length,
      debitCount: debitRows.length,
      creditCount: creditRows.length,
      debit,
      credit,
      balance: debit - credit,
      rawAmountTotal: list.reduce(function(sum,row){ return sum + Number(row.amount || 0); }, 0)
    };
  }

  function searchText(entry){
    const row = normalizeEntry(entry || {});
    return [row.customerName, row.customerId, row.type, row.typeText, row.amount, row.note, row.invoiceId, row.paymentId, dateSafe(row.createdMs)].join(" ");
  }

  function renderRows(ledger){
    const rows = normalizeList(ledger).map(function(row){
      const cls = row.direction === "credit" ? "approved" : (row.direction === "debit" ? "pending" : "notice");
      return `<tr><td>${dateSafe(row.createdMs)}</td><td class="name">${escSafe(row.customerName || "عميل")}</td><td><span class="status ${cls}">${escSafe(row.typeText)}</span></td><td><b>${moneySafe(row.absAmount || row.amount)}</b></td><td>${escSafe(row.note || "")}</td></tr>`;
    }).join("");
    return rows || '<tr><td colspan="5">لا توجد حركات مطابقة</td></tr>';
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
    if(role !== "trader") return "";
    return `<div class="card"><div class="grid compact-filters"><div class="field"><label>العميل</label><select id="statementFilterCustomer"><option value="">كل العملاء</option>${renderCustomerOptions(opts.customers, selectedCustomer)}</select></div></div><div class="actions"><button class="btn light mini" id="clearStatementFilters">مسح الفلاتر</button></div></div>`;
  }

  function renderShareBox(selectedCustomer){
    const disabled = selectedCustomer ? "" : "disabled";
    const hint = selectedCustomer ? "يمكن مشاركة كشف الحساب للعميل المحدد." : "اختر عميلًا من الفلتر أو من بطاقة العميل قبل المشاركة.";
    return `<div class="card"><h2>مشاركة كشف الحساب</h2><p class="muted">${escSafe(hint)}</p><button class="btn secondary" id="shareSelectedStatement" ${disabled}>مشاركة كشف العميل المحدد</button></div>`;
  }

  function renderPage(opts){
    opts = opts || {};
    const tab = String(opts.tab || "ledger");
    const selectedCustomer = String(opts.selectedCustomer || "");
    const source = filterByTab(opts.ledger || [], tab, opts);
    const st = stats(opts.ledger || [], opts);
    const meta = typeof demandFilter === "function"
      ? demandFilter("statementList23", source, function(row){ return searchText(row.raw || row); })
      : { visible: source };
    const rows = renderRows(meta.visible || source);
    const head = typeof pageHead === "function" ? pageHead("كشف الحساب", "كشف الحساب مقسم إلى ملخص، حركات، مدين، دائن، ومشاركة.") : "";
    const tabs = typeof pageTabsBar === "function" ? pageTabsBar("statement", tab, [["summary","📊","ملخص"],["ledger","📒","الحركات"],["debit","⬆️","مدين"],["credit","⬇️","دائن"],["share","📤","مشاركة"]]) : "";
    const statBlock = typeof pageStats === "function" ? pageStats([["إجمالي الحركات", st.totalCount],["مدين", moneySafe(st.debit)],["دائن", moneySafe(st.credit)],["الرصيد", moneySafe(st.balance)]]) : "";
    const filters = renderFilters({ role: opts.role, customers: opts.customers, selectedCustomer });
    const table = typeof demandTableCard === "function"
      ? demandTableCard("statementList23", "حركات كشف الحساب", ["التاريخ","العميل","نوع الحركة","المبلغ","البيان"], rows, meta, "لا توجد حركات مطابقة")
      : `<div class="table-wrap"><table class="compact-table"><thead><tr><th>التاريخ</th><th>العميل</th><th>نوع الحركة</th><th>المبلغ</th><th>البيان</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    const summary = `<div class="safe-placeholder">ملخص كشف الحساب: المدين ${moneySafe(st.debit)}، الدائن ${moneySafe(st.credit)}، الرصيد ${moneySafe(st.balance)}. افتح تبويب الحركات للعرض التفصيلي أو المشاركة لإرسال كشف مختصر.</div>`;
    const body = tab === "summary" ? summary : (tab === "share" ? renderShareBox(selectedCustomer) : table);
    return { html: head + tabs + statBlock + filters + body, tab, stats: st, count: source.length, meta };
  }

  function bindActions(opts){
    opts = opts || {};
    try { if(typeof opts.bindPageTabs === "function") opts.bindPageTabs("statement", opts.renderStatement); } catch (_) {}
    try { if(typeof opts.bindDemandTable === "function") opts.bindDemandTable("statementList23", opts.renderStatement); } catch (_) {}
    const $safe = typeof $ === "function" ? $ : function(id){ return document.getElementById(id); };
    const filter = $safe("statementFilterCustomer");
    if(filter) filter.onchange = function(event){
      opts.state.statementCustomer = event.target.value || "";
      try { if(typeof opts.save === "function") opts.save(); } catch (_) {}
      if(typeof opts.renderStatement === "function") opts.renderStatement();
    };
    const clear = $safe("clearStatementFilters");
    if(clear) clear.onclick = function(){
      opts.state.statementCustomer = "";
      try { if(typeof opts.save === "function") opts.save(); } catch (_) {}
      if(typeof opts.renderStatement === "function") opts.renderStatement();
    };
    const share = $safe("shareSelectedStatement");
    if(share) share.onclick = function(){
      if(typeof opts.shareStatementText === "function") opts.shareStatementText((opts.state && opts.state.statementCustomer) || "");
    };
    return { ok: true, filterBound: !!filter, shareBound: !!share };
  }

  function selfCheck(){
    const api = window.hesabiStatementsHelpers || {};
    const required = ["normalizeEntry","normalizeList","filterByTab","stats","renderRows","renderPage","bindActions","searchText"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    let sampleOk = false;
    try {
      const result = api.renderPage({
        role:"trader",
        tab:"ledger",
        selectedCustomer:"",
        ledger:[{ id:"l1", customerName:"اختبار", type:"invoice", amount:1000, note:"فاتورة", createdMs:Date.now() }, { id:"l2", customerName:"اختبار", type:"payment", amount:300, note:"سداد", createdMs:Date.now() }],
        customers:[{ customerId:"c1", name:"اختبار", phone:"777" }],
        state:{ role:"trader" }
      });
      sampleOk = !!(result && result.html && /كشف الحساب/.test(result.html) && /اختبار/.test(result.html));
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
    stats,
    searchText,
    renderRows,
    renderFilters,
    renderShareBox,
    renderPage,
    bindActions,
    ledgerCreatedMs,
    directionOf
  };
  window.hesabiStatementsHelpersSelfCheck = selfCheck;
})();
