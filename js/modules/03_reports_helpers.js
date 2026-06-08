(function(){
  "use strict";

  const VERSION = "1.0.69";

  function asArray(value){
    return Array.isArray(value) ? value : [];
  }

  function num(value){
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function getCache(inputCache){
    try { return inputCache || cache || {}; } catch (_) { return inputCache || {}; }
  }

  function getState(inputState){
    try { return inputState || state || {}; } catch (_) { return inputState || {}; }
  }

  function approvedPayments(payments){
    return asArray(payments).filter(function(payment){
      return String(payment && payment.status || "") === "approved";
    });
  }

  function lowStockItems(items){
    return asArray(items).filter(function(item){
      const stock = num(item && (item.stock ?? item.qty));
      const minStock = num(item && (item.minStock ?? item.minQty));
      return minStock > 0 && stock <= minStock;
    });
  }

  function reportsSnapshot(inputCache){
    const c = getCache(inputCache);
    const invoices = asArray(c.invoices);
    const payments = asArray(c.payments);
    const customers = asArray(c.customers);
    const items = asArray(c.items);
    const low = lowStockItems(items);
    const paid = approvedPayments(payments);
    return {
      invoices,
      payments,
      customers,
      items,
      approvedPayments: paid,
      lowStockItems: low,
      totals: {
        salesTotal: invoices.reduce(function(sum, invoice){ return sum + num(invoice && (invoice.total ?? invoice.amount)); }, 0),
        approvedPaymentsTotal: paid.reduce(function(sum, payment){ return sum + num(payment && payment.amount); }, 0),
        debtsTotal: customers.reduce(function(sum, customer){ return sum + num(customer && (customer.balance ?? customer.debt)); }, 0),
        lowStockCount: low.length,
        invoicesCount: invoices.length,
        paymentsCount: payments.length,
        customersCount: customers.length,
        itemsCount: items.length
      }
    };
  }

  function searchText(type, row){
    const r = row || {};
    if(type === "sales") return [r.invoiceNo, r.id, r.customerName, r.total, r.paymentType].join(" ");
    if(type === "debts") return [r.name, r.phone, r.balance, r.creditLimit, r.status].join(" ");
    if(type === "stock") return [r.name, r.stock, r.qty, r.minStock, r.minQty, r.category, r.itemCategory].join(" ");
    return JSON.stringify(r);
  }

  function businessReportText(inputCache, inputState){
    const c = getCache(inputCache);
    const s = getState(inputState);
    const snap = reportsSnapshot(c);
    const shopName = (c.shop && c.shop.name) || s.shopName || "";
    return [
      "تقرير حسابي التجاري",
      "المتجر: " + shopName,
      "الفواتير: " + snap.totals.invoicesCount,
      "إجمالي المبيعات: " + snap.totals.salesTotal,
      "السداد المقبول: " + snap.totals.approvedPaymentsTotal,
      "ديون العملاء: " + snap.totals.debtsTotal,
      "العملاء: " + snap.totals.customersCount,
      "الأصناف: " + snap.totals.itemsCount,
      "منخفض المخزون: " + snap.totals.lowStockCount
    ].join("\n");
  }

  function safeReportTab(tab){
    const allowed = ["summary", "sales", "debts", "stock", "export"];
    return allowed.includes(String(tab || "")) ? String(tab) : "summary";
  }

  function bindReportsExportButtons(){
    try {
      if(typeof $ !== "function") return false;
      if($("shareBusinessReport") && typeof shareBusinessReport === "function") $("shareBusinessReport").onclick = shareBusinessReport;
      if($("exportInvoicesCsv") && typeof exportInvoicesCsv === "function") $("exportInvoicesCsv").onclick = exportInvoicesCsv;
      if($("exportPaymentsCsv") && typeof exportPaymentsCsv === "function") $("exportPaymentsCsv").onclick = exportPaymentsCsv;
      if($("exportCustomersCsv") && typeof exportCustomersCsv === "function") $("exportCustomersCsv").onclick = exportCustomersCsv;
      return true;
    } catch (error) {
      console.warn("bindReportsExportButtons failed", error);
      return false;
    }
  }

  function formatSnapshotForConsole(inputCache){
    const snap = reportsSnapshot(inputCache);
    return Object.assign({ version: VERSION }, snap.totals);
  }

  window.hesabiReportsHelpers = {
    version: VERSION,
    asArray,
    num,
    approvedPayments,
    lowStockItems,
    reportsSnapshot,
    searchText,
    businessReportText,
    safeReportTab,
    bindReportsExportButtons,
    formatSnapshotForConsole
  };

  window.hesabiReportsHelpersSelfCheck = function(){
    const sample = reportsSnapshot({
      invoices: [{ total: 120 }, { total: "30" }],
      payments: [{ status: "approved", amount: 50 }, { status: "pending", amount: 99 }],
      customers: [{ balance: 25 }],
      items: [{ stock: 1, minStock: 2 }, { stock: 10, minStock: 2 }]
    });
    const required = ["reportsSnapshot", "searchText", "businessReportText", "lowStockItems", "bindReportsExportButtons"];
    const missing = required.filter(function(name){ return typeof window.hesabiReportsHelpers[name] !== "function"; });
    const ok = missing.length === 0 && sample.totals.salesTotal === 150 && sample.totals.approvedPaymentsTotal === 50 && sample.totals.lowStockCount === 1;
    return {
      ok,
      version: VERSION,
      missing,
      sample: sample.totals,
      checkedAt: new Date().toISOString()
    };
  };
})();
