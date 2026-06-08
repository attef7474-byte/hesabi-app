/* Hesabi 1.0.75 - Invoices page stabilization.
   Display/filter/share-action helpers only. No Firestore writes and no invoice creation changes. */
(function(){
  "use strict";

  const VERSION = "1.0.75";
  const BUILD_CODE = 75;

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

  function payTypeSafe(value){
    try { if(typeof payTypeText === "function") return payTypeText(value); } catch (_) {}
    try { if(typeof paymentTypeText === "function") return paymentTypeText(value); } catch (_) {}
    const v = String(value || "cash");
    return ({ cash:"كاش", credit:"آجل" })[v] || v;
  }

  function lineName(line){
    const l = line && typeof line === "object" ? line : {};
    return String(l.name || l.itemName || l.title || "صنف");
  }

  function lineQty(line){
    const l = line && typeof line === "object" ? line : {};
    return Number(l.qty || l.quantity || 0) || 0;
  }

  function linePrice(line){
    const l = line && typeof line === "object" ? line : {};
    return Number(l.price || l.unitPrice || l.cashPrice || l.creditPrice || 0) || 0;
  }

  function lineTotal(line){
    const l = line && typeof line === "object" ? line : {};
    const direct = Number(l.total || l.amount || 0);
    if(Number.isFinite(direct) && direct > 0) return direct;
    return lineQty(l) * linePrice(l);
  }

  function invoiceLines(invoice){
    const inv = invoice && typeof invoice === "object" ? invoice : {};
    if(Array.isArray(inv.items)) return inv.items;
    if(Array.isArray(inv.lines)) return inv.lines;
    return [];
  }

  function invoiceCreatedMs(invoice){
    const inv = invoice && typeof invoice === "object" ? invoice : {};
    const direct = Number(inv.createdMs || inv.approvedMs || inv.updatedMs || 0);
    if(Number.isFinite(direct) && direct > 0) return direct;
    try {
      const ts = inv.createdAt || inv.approvedAt || inv.updatedAt;
      if(ts && typeof ts.toMillis === "function") return Number(ts.toMillis()) || 0;
      if(ts && ts.seconds) return Number(ts.seconds) * 1000;
    } catch (_) {}
    return 0;
  }

  function normalizeInvoice(invoice, index){
    const inv = invoice && typeof invoice === "object" ? invoice : {};
    const lines = invoiceLines(inv);
    const lineTotalSum = lines.reduce(function(sum, line){ return sum + lineTotal(line); }, 0);
    const total = Number(inv.total || inv.amount || lineTotalSum || 0) || 0;
    const paymentType = String(inv.paymentType || inv.payType || "cash");
    return {
      raw: inv,
      id: String(inv.id || inv.invoiceId || index || ""),
      invoiceNo: String(inv.invoiceNo || inv.number || inv.id || inv.invoiceId || ""),
      customerId: String(inv.customerId || ""),
      customerUid: String(inv.customerUid || ""),
      customerName: String(inv.customerName || inv.name || "عميل"),
      paymentType,
      total,
      balanceDue: Number(inv.balanceDue || (paymentType === "credit" ? total : 0) || 0) || 0,
      createdMs: invoiceCreatedMs(inv),
      lines,
      itemCount: Number(inv.itemCount || lines.length || 0) || 0,
      qtyCount: Number(inv.qtyCount || lines.reduce(function(sum,line){ return sum + lineQty(line); }, 0) || 0) || 0,
      status: String(inv.status || "issued")
    };
  }

  function normalizeList(invoices){
    const list = Array.isArray(invoices) ? invoices : [];
    return list.map(normalizeInvoice).sort(function(a,b){ return (b.createdMs || 0) - (a.createdMs || 0); });
  }

  function invoiceSearchText(invoice){
    const inv = normalizeInvoice(invoice);
    const lineText = inv.lines.map(function(line){ return [lineName(line), lineQty(line), linePrice(line), lineTotal(line)].join(" "); }).join(" ");
    return [inv.invoiceNo, inv.id, inv.customerName, inv.customerId, inv.paymentType, inv.total, inv.status, lineText].join(" ");
  }

  function filterInvoices(invoices, opts){
    opts = opts || {};
    let list = normalizeList(invoices);
    const role = String(opts.role || "");
    const selectedCustomer = String(opts.selectedCustomer || "");
    const selectedPay = String(opts.selectedPay || "");
    const stateObj = opts.state || {};
    if(role === "trader" && selectedCustomer) list = list.filter(function(inv){ return String(inv.customerId || "") === selectedCustomer; });
    if(role === "customer") {
      const cid = String(stateObj.customerId || opts.customerId || "");
      const cuid = String((typeof uid === "function" ? uid() : "") || stateObj.uid || "");
      list = list.filter(function(inv){
        return !cid && !cuid ? true : String(inv.customerId || "") === cid || String(inv.customerUid || "") === cuid;
      });
    }
    if(selectedPay) list = list.filter(function(inv){ return String(inv.paymentType || "cash") === selectedPay; });
    return list;
  }

  function stats(invoices){
    const list = normalizeList(invoices);
    const credit = list.filter(function(inv){ return inv.paymentType === "credit"; });
    const cash = list.filter(function(inv){ return inv.paymentType !== "credit"; });
    return {
      totalCount: list.length,
      totalAmount: list.reduce(function(sum, inv){ return sum + Number(inv.total || 0); }, 0),
      creditCount: credit.length,
      creditAmount: credit.reduce(function(sum, inv){ return sum + Number(inv.total || 0); }, 0),
      cashCount: cash.length,
      cashAmount: cash.reduce(function(sum, inv){ return sum + Number(inv.total || 0); }, 0)
    };
  }

  function customerOptions(customers, selectedCustomer){
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
    const selectedPay = String(opts.selectedPay || "");
    const customerFilter = role === "trader" ? `<div class="field"><label>العميل</label><select id="invFilterCustomer"><option value="">كل العملاء</option>${customerOptions(opts.customers, selectedCustomer)}</select></div>` : "";
    return `<div class="card"><div class="grid compact-filters">${customerFilter}<div class="field"><label>نوع الدفع</label><select id="invFilterPay"><option value="" ${!selectedPay ? "selected" : ""}>الكل</option><option value="cash" ${selectedPay === "cash" ? "selected" : ""}>كاش</option><option value="credit" ${selectedPay === "credit" ? "selected" : ""}>آجل</option></select></div></div><div class="actions"><button class="btn light mini" id="clearInvoiceFilters">مسح الفلاتر</button></div></div>`;
  }

  function renderLineRows(invoice){
    try {
      if(typeof compactLineRows === "function") return compactLineRows(invoice.lines || []);
    } catch (_) {}
    const rows = (invoice.lines || []).map(function(line){
      return `<div class="line-row"><span>${escSafe(lineName(line))}</span><b>${escSafe(lineQty(line))} × ${moneySafe(linePrice(line))} = ${moneySafe(lineTotal(line))}</b></div>`;
    }).join("");
    return rows || '<div class="muted">لا توجد أصناف داخل الفاتورة.</div>';
  }

  function actionButtons(invoice){
    const html = `<button class="btn light mini" data-print-invoice="${escSafe(invoice.id)}">مشاركة</button><button class="btn secondary mini" data-toggle-row="1">تفاصيل</button>`;
    try { return typeof compactActionButtons === "function" ? compactActionButtons(html) : html; }
    catch (_) { return html; }
  }

  function renderRows(invoices){
    const rows = normalizeList(invoices).map(function(inv){
      const cls = inv.paymentType === "credit" ? "pending" : "approved";
      return `<tr><td class="name">${escSafe(inv.invoiceNo || inv.id)}<div class="subcell">${escSafe(inv.itemCount)} صنف / ${escSafe(inv.qtyCount)} كمية</div></td><td>${escSafe(inv.customerName || "")}</td><td><span class="status ${cls}">${escSafe(payTypeSafe(inv.paymentType))}</span></td><td><b>${moneySafe(inv.total)}</b></td><td>${dateSafe(inv.createdMs)}</td><td>${actionButtons(inv)}</td></tr><tr class="lines-row"><td colspan="6"><div class="demand-details">${renderLineRows(inv)}</div></td></tr>`;
    }).join("");
    return rows || '<tr><td colspan="6">لا توجد فواتير مطابقة</td></tr>';
  }

  function renderTable(rows, meta){
    if(typeof demandTableCard === "function") {
      return demandTableCard("invoicesList", "الفواتير", ["الفاتورة","العميل","الدفع","الإجمالي","التاريخ","إجراء"], rows, meta, "لا توجد فواتير مطابقة");
    }
    return `<div class="table-wrap"><table class="compact-table"><thead><tr><th>الفاتورة</th><th>العميل</th><th>الدفع</th><th>الإجمالي</th><th>التاريخ</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function buildInvoiceText(invoice){
    const inv = normalizeInvoice(invoice || {});
    const rows = (inv.lines || []).map(function(line, index){
      return `${index + 1}. ${lineName(line)} × ${lineQty(line)} = ${moneySafe(lineTotal(line))}`;
    }).join("\n");
    return `فاتورة ${inv.invoiceNo || inv.id}\nالعميل: ${inv.customerName || ""}\nنوع الدفع: ${payTypeSafe(inv.paymentType)}\nالتاريخ: ${dateSafe(inv.createdMs)}\n----------------------\n${rows || "لا توجد أصناف"}\n----------------------\nالإجمالي: ${moneySafe(inv.total)}`;
  }

  function renderPage(opts){
    opts = opts || {};
    const selectedCustomer = String(opts.selectedCustomer || "");
    const selectedPay = String(opts.selectedPay || "");
    const filtered = filterInvoices(opts.invoices || [], opts);
    const st = stats(filtered);
    let meta;
    try {
      meta = typeof demandFilter === "function" ? demandFilter("invoicesList", filtered, invoiceSearchText) : { visible: filtered, total: filtered.length };
    } catch (_) { meta = { visible: filtered, total: filtered.length }; }
    const rows = renderRows(meta.visible || filtered);
    const head = typeof pageHead === "function" ? pageHead("الفواتير", "عرض الفواتير مع فلاتر آمنة حسب العميل ونوع الدفع.") : "";
    const statBlock = typeof pageStats === "function" ? pageStats([["الفواتير", st.totalCount],["الإجمالي", moneySafe(st.totalAmount)],["آجل", moneySafe(st.creditAmount)],["كاش", moneySafe(st.cashAmount)]]) : "";
    const filters = renderFilters({ role: opts.role, customers: opts.customers || [], selectedCustomer, selectedPay });
    return { html: head + statBlock + filters + renderTable(rows, meta), filteredCount: filtered.length, stats: st };
  }

  function bindActions(opts){
    opts = opts || {};
    try { if(typeof opts.bindDemandTable === "function") opts.bindDemandTable("invoicesList", opts.renderInvoices); }
    catch (_) {}
    const $safe = typeof $ === "function" ? $ : function(id){ return document.getElementById(id); };
    const customer = $safe("invFilterCustomer");
    const pay = $safe("invFilterPay");
    const clear = $safe("clearInvoiceFilters");
    if(customer && opts.state) customer.onchange = function(e){ opts.state.invFilterCustomer = e.target.value; if(typeof opts.save === "function") opts.save(); if(typeof opts.renderInvoices === "function") opts.renderInvoices(); };
    if(pay && opts.state) pay.onchange = function(e){ opts.state.invFilterPay = e.target.value; if(typeof opts.save === "function") opts.save(); if(typeof opts.renderInvoices === "function") opts.renderInvoices(); };
    if(clear && opts.state) clear.onclick = function(){ opts.state.invFilterCustomer = ""; opts.state.invFilterPay = ""; if(typeof opts.save === "function") opts.save(); if(typeof opts.renderInvoices === "function") opts.renderInvoices(); };
    document.querySelectorAll("[data-print-invoice]").forEach(function(btn){
      if(typeof opts.shareInvoiceText === "function") btn.onclick = function(){ opts.shareInvoiceText(btn.dataset.printInvoice); };
    });
    return { ok: true, hasCustomerFilter: !!customer, hasPayFilter: !!pay, shareButtons: document.querySelectorAll("[data-print-invoice]").length };
  }

  function selfCheck(){
    const api = window.hesabiInvoicesHelpers || {};
    const required = ["normalizeInvoice","filterInvoices","stats","renderPage","renderRows","bindActions","buildInvoiceText"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    let sampleOk = false;
    try {
      const result = api.renderPage({ role:"trader", selectedPay:"credit", customers:[{customerId:"c1", name:"عميل اختبار", phone:"777"}], invoices:[{ id:"i1", invoiceNo:"INV-1", customerId:"c1", customerName:"عميل اختبار", paymentType:"credit", total:1500, lines:[{ name:"صنف", qty:2, price:750 }], createdMs:Date.now() }] });
      sampleOk = !!(result && result.html && /الفواتير/.test(result.html) && /INV-1/.test(result.html));
    } catch (_) { sampleOk = false; }
    return { ok: missing.length === 0 && sampleOk, version: VERSION, build: BUILD_CODE, missing, sampleOk };
  }

  window.hesabiInvoicesHelpers = {
    version: VERSION,
    build: BUILD_CODE,
    normalizeInvoice,
    normalizeList,
    filterInvoices,
    stats,
    renderFilters,
    renderRows,
    renderPage,
    bindActions,
    buildInvoiceText,
    invoiceSearchText,
    invoiceLines
  };
  window.hesabiInvoicesHelpersSelfCheck = selfCheck;
})();
