/* Hesabi 1.0.128 - Invoices commercial display/share helpers.
   Display/filter/share/export only. No Firestore writes and no invoice creation changes. */
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
    try { if(typeof dateText === "function") return dateText(ms); } catch (_) {}
    const n = Number(ms || 0);
    if(!n) return "-";
    try { return new Date(n).toLocaleDateString("ar-YE"); } catch (_) { return String(ms || "-"); }
  }

  function dateTimeSafe(ms){
    const n = Number(ms || 0);
    if(!n) return "-";
    try { return new Date(n).toLocaleString("ar-YE"); } catch (_) { return dateSafe(ms); }
  }

  function payTypeSafe(value){
    try { if(typeof payTypeText === "function") return payTypeText(value); } catch (_) {}
    const v = String(value || "cash");
    return ({ cash:"كاش", credit:"آجل" })[v] || v;
  }

  function shopNameSafe(opts){
    opts = opts || {};
    return String(opts.shopName || opts.state?.shopName || opts.cache?.shop?.name || "المتجر");
  }

  function invoiceStatusText(status, paymentType, remaining){
    const s = String(status || "issued");
    if(s === "cancelled") return "ملغاة";
    if(s === "paid" || paymentType !== "credit") return "مدفوعة";
    if(Number(remaining || 0) > 0) return "آجل - متبقي";
    return "صادرة";
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

  function paymentsForInvoice(inv, payments){
    const id = String(inv.id || inv.raw?.id || "");
    const customerId = String(inv.customerId || inv.raw?.customerId || "");
    return (Array.isArray(payments) ? payments : []).filter(function(p){
      if(String(p.status || "") !== "approved") return false;
      if(id && String(p.invoiceId || "") === id) return true;
      return !p.invoiceId && customerId && String(p.customerId || "") === customerId;
    });
  }

  function paidAmountFor(inv, payments){
    const raw = inv.raw || inv;
    const direct = Number(raw.paidAmount || inv.paidAmount || 0);
    if(direct > 0) return direct;
    if(String(inv.paymentType || raw.paymentType || "cash") !== "credit") return Number(inv.total || 0);
    return paymentsForInvoice(inv, payments).reduce(function(sum, p){ return sum + Number(p.amount || 0); }, 0);
  }

  function remainingAmountFor(inv, paid){
    if(String(inv.paymentType || "cash") !== "credit") return 0;
    return Math.max(Number(inv.total || 0) - Number(paid || 0), 0);
  }

  function normalizeInvoice(invoice, index, opts){
    opts = opts || {};
    const inv = invoice && typeof invoice === "object" ? invoice : {};
    const lines = invoiceLines(inv);
    const lineTotalSum = lines.reduce(function(sum, line){ return sum + lineTotal(line); }, 0);
    const total = Number(inv.total || inv.amount || lineTotalSum || 0) || 0;
    const paymentType = String(inv.paymentType || inv.payType || "cash");
    const paidAmount = paidAmountFor({ raw: inv, id: inv.id, customerId: inv.customerId, paymentType, total }, opts.payments || []);
    const remaining = remainingAmountFor({ paymentType, total }, paidAmount);
    return {
      raw: inv,
      id: String(inv.id || inv.invoiceId || index || ""),
      invoiceNo: String(inv.invoiceNo || inv.number || inv.id || inv.invoiceId || ""),
      customerId: String(inv.customerId || ""),
      customerUid: String(inv.customerUid || ""),
      customerName: String(inv.customerName || inv.name || "عميل"),
      customerPhone: String(inv.customerPhone || inv.phone || ""),
      shopName: shopNameSafe(opts),
      paymentType,
      total,
      paidAmount,
      remaining,
      balanceDue: Number(inv.balanceDue || remaining || 0) || 0,
      createdMs: invoiceCreatedMs(inv),
      lines,
      itemCount: Number(inv.itemCount || lines.length || 0) || 0,
      qtyCount: Number(inv.qtyCount || lines.reduce(function(sum,line){ return sum + lineQty(line); }, 0) || 0) || 0,
      status: String(inv.status || "issued"),
      statusText: invoiceStatusText(inv.status, paymentType, remaining)
    };
  }

  function normalizeList(invoices, opts){
    const list = Array.isArray(invoices) ? invoices : [];
    return list.map(function(inv, index){ return normalizeInvoice(inv, index, opts); }).sort(function(a,b){ return (b.createdMs || 0) - (a.createdMs || 0); });
  }

  function invoiceSearchText(invoice){
    const inv = normalizeInvoice(invoice);
    const lineText = inv.lines.map(function(line){ return [lineName(line), lineQty(line), linePrice(line), lineTotal(line)].join(" "); }).join(" ");
    return [inv.invoiceNo, inv.id, inv.customerName, inv.customerPhone, inv.customerId, inv.paymentType, inv.total, inv.paidAmount, inv.remaining, inv.statusText, lineText].join(" ");
  }

  function filterInvoices(invoices, opts){
    opts = opts || {};
    let list = normalizeList(invoices, opts);
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

  function stats(invoices, opts){
    const list = normalizeList(invoices, opts);
    const credit = list.filter(function(inv){ return inv.paymentType === "credit"; });
    const cash = list.filter(function(inv){ return inv.paymentType !== "credit"; });
    return {
      totalCount: list.length,
      totalAmount: list.reduce(function(sum, inv){ return sum + Number(inv.total || 0); }, 0),
      paidAmount: list.reduce(function(sum, inv){ return sum + Number(inv.paidAmount || 0); }, 0),
      remainingAmount: list.reduce(function(sum, inv){ return sum + Number(inv.remaining || 0); }, 0),
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

  function renderRows(invoices, opts){
    const rows = normalizeList(invoices, opts).map(function(inv){
      const cls = inv.paymentType === "credit" ? (inv.remaining > 0 ? "pending" : "approved") : "approved";
      return `<tr><td class="name">${escSafe(inv.invoiceNo || inv.id)}<div class="subcell">${escSafe(inv.itemCount)} صنف / ${escSafe(inv.qtyCount)} كمية</div><div class="subcell muted">${dateTimeSafe(inv.createdMs)}</div></td><td>${escSafe(inv.customerName || "")}<div class="subcell muted">${escSafe(inv.customerPhone || "-")}</div></td><td><span class="status ${cls}">${escSafe(payTypeSafe(inv.paymentType))}</span><div class="subcell">${escSafe(inv.statusText)}</div></td><td><b>${moneySafe(inv.total)}</b><div class="subcell">مدفوع: ${moneySafe(inv.paidAmount)}</div><div class="subcell">متبقي: ${moneySafe(inv.remaining)}</div></td><td>${dateSafe(inv.createdMs)}</td><td>${actionButtons(inv)}</td></tr><tr class="lines-row"><td colspan="6"><div class="demand-details">${renderLineRows(inv)}</div></td></tr>`;
    }).join("");
    return rows || '<tr><td colspan="6">لا توجد فواتير مطابقة</td></tr>';
  }

  function renderTable(rows, meta){
    if(typeof demandTableCard === "function") {
      return demandTableCard("invoicesList", "الفواتير", ["الفاتورة","العميل","الدفع / الحالة","المبالغ","التاريخ","إجراء"], rows, meta, "لا توجد فواتير مطابقة");
    }
    return `<div class="table-wrap"><table class="compact-table"><thead><tr><th>الفاتورة</th><th>العميل</th><th>الدفع</th><th>المبالغ</th><th>التاريخ</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function buildInvoiceText(invoice, opts){
    opts = opts || {};
    const inv = normalizeInvoice(invoice || {}, 0, opts);
    const rows = (inv.lines || []).map(function(line, index){
      return `${index + 1}. ${lineName(line)} × ${lineQty(line)} @ ${moneySafe(linePrice(line))} = ${moneySafe(lineTotal(line))}`;
    }).join("\n");
    return [
      "فاتورة حسابي التجاري",
      "----------------------",
      `رقم الفاتورة: ${inv.invoiceNo || inv.id}`,
      `المتجر: ${inv.shopName || shopNameSafe(opts)}`,
      `العميل: ${inv.customerName || ""}`,
      `الهاتف: ${inv.customerPhone || "-"}`,
      `نوع الفاتورة: ${payTypeSafe(inv.paymentType)}`,
      `حالة الفاتورة: ${inv.statusText}`,
      `التاريخ: ${dateTimeSafe(inv.createdMs)}`,
      "----------------------",
      "الأصناف:",
      rows || "لا توجد أصناف",
      "----------------------",
      `الإجمالي: ${moneySafe(inv.total)}`,
      `المدفوع: ${moneySafe(inv.paidAmount)}`,
      `المتبقي: ${moneySafe(inv.remaining)}`
    ].join("\n");
  }

  function exportInvoicesCsv(invoices, opts){
    opts = opts || {};
    const list = filterInvoices(invoices || [], opts);
    const rows = list.map(function(inv){
      return {
        invoiceNo: inv.invoiceNo || inv.id,
        shopName: inv.shopName || shopNameSafe(opts),
        customerName: inv.customerName || "",
        customerPhone: inv.customerPhone || "",
        paymentType: payTypeSafe(inv.paymentType),
        status: inv.statusText,
        total: inv.total,
        paidAmount: inv.paidAmount,
        remaining: inv.remaining,
        createdAt: dateTimeSafe(inv.createdMs)
      };
    });
    const cols = ["invoiceNo","shopName","customerName","customerPhone","paymentType","status","total","paidAmount","remaining","createdAt"];
    if(typeof exportCsv === "function") return exportCsv("hesabi-invoices-" + (new Date().toISOString().slice(0,10)) + ".csv", cols, rows);
    return { ok:false, reason:"exportCsv-missing", rows:rows.length };
  }

  function renderPage(opts){
    opts = opts || {};
    const selectedCustomer = String(opts.selectedCustomer || "");
    const selectedPay = String(opts.selectedPay || "");
    const filtered = filterInvoices(opts.invoices || [], opts);
    const st = stats(opts.invoices || [], opts);
    let meta;
    try {
      meta = typeof demandFilter === "function" ? demandFilter("invoicesList", filtered, invoiceSearchText) : { visible: filtered, total: filtered.length };
    } catch (_) { meta = { visible: filtered, total: filtered.length }; }
    const rows = renderRows(meta.visible || filtered, opts);
    const head = typeof pageHead === "function" ? pageHead("الفواتير", "عرض الفواتير التجاري مع الإجمالي والمدفوع والمتبقي ومشاركة واضحة.") : "";
    const statBlock = typeof pageStats === "function" ? pageStats([["الفواتير", st.totalCount],["الإجمالي", moneySafe(st.totalAmount)],["المدفوع", moneySafe(st.paidAmount)],["المتبقي", moneySafe(st.remainingAmount)]]) : "";
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
    const exportBtn = $safe("exportInvoicesCsv");
    if(customer && opts.state) customer.onchange = function(e){ opts.state.invFilterCustomer = e.target.value; if(typeof opts.save === "function") opts.save(); if(typeof opts.renderInvoices === "function") opts.renderInvoices(); };
    if(pay && opts.state) pay.onchange = function(e){ opts.state.invFilterPay = e.target.value; if(typeof opts.save === "function") opts.save(); if(typeof opts.renderInvoices === "function") opts.renderInvoices(); };
    if(clear && opts.state) clear.onclick = function(){ opts.state.invFilterCustomer = ""; opts.state.invFilterPay = ""; if(typeof opts.save === "function") opts.save(); if(typeof opts.renderInvoices === "function") opts.renderInvoices(); };
    if(exportBtn) exportBtn.onclick = function(){
      const result = exportInvoicesCsv(opts.invoices || [], {
        role: opts.state?.role,
        state: opts.state,
        selectedCustomer: opts.state?.invFilterCustomer || "",
        selectedPay: opts.state?.invFilterPay || "",
        shopName: opts.shopName,
        payments: opts.payments || []
      });
      if(result && result.ok === false && result.reason === "exportCsv-missing" && typeof opts.exportInvoicesCsv === "function") opts.exportInvoicesCsv();
    };
    document.querySelectorAll("[data-print-invoice]").forEach(function(btn){
      if(typeof opts.shareInvoiceText === "function") btn.onclick = function(){ opts.shareInvoiceText(btn.dataset.printInvoice); };
    });
    return { ok: true, hasCustomerFilter: !!customer, hasPayFilter: !!pay, shareButtons: document.querySelectorAll("[data-print-invoice]").length };
  }

  function selfCheck(){
    const api = window.hesabiInvoicesHelpers || {};
    const required = ["normalizeInvoice","filterInvoices","stats","renderPage","renderRows","bindActions","buildInvoiceText","exportInvoicesCsv"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    let sampleOk = false;
    try {
      const result = api.renderPage({
        role:"trader",
        selectedPay:"credit",
        shopName:"متجر اختبار",
        payments:[{status:"approved", customerId:"c1", amount:500}],
        customers:[{customerId:"c1", name:"عميل اختبار", phone:"777123456"}],
        invoices:[{ id:"i1", invoiceNo:"INV-1", customerId:"c1", customerName:"عميل اختبار", customerPhone:"777123456", paymentType:"credit", total:1500, lines:[{ name:"صنف", qty:2, price:750 }], createdMs:Date.now() }]
      });
      const text = api.buildInvoiceText({ id:"i1", invoiceNo:"INV-1", customerName:"عميل", paymentType:"credit", total:1500, createdMs:Date.now() }, { shopName:"متجر" });
      sampleOk = !!(result && result.html && /INV-1/.test(result.html) && /المتبقي/.test(text));
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
    exportInvoicesCsv,
    invoiceSearchText,
    invoiceLines,
    paidAmountFor,
    remainingAmountFor
  };
  window.hesabiInvoicesHelpersSelfCheck = selfCheck;
})();
