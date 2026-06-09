/* Hesabi 1.0.89 - Payments / Statements Real Data Fixes.
   Read-only data consistency diagnostics. It never writes payments, invoices, ledger or balances. */
(function(){
  "use strict";
  const VERSION = "1.0.89";
  const BUILD_CODE = 89;
  function arr(value){ return Array.isArray(value) ? value : []; }
  function num(value){ const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
  function str(value){ try { return String(value == null ? "" : value); } catch (_) { return ""; } }
  function idOf(x){ return str(x && (x.id || x.invoiceId || x.paymentId || x.sourceId)); }
  function paymentIsApproved(p){ return str(p && p.status).toLowerCase() === "approved"; }
  function ledgerLooksPayment(l){ return /payment|سداد|تحصيل|paid/i.test(str(l && (l.type || l.note || l.source || ""))); }
  function ledgerLooksInvoice(l){ return /invoice|فاتورة|sale|debit/i.test(str(l && (l.type || l.note || l.source || ""))); }
  function snapshot(){
    const c = window.cache || {};
    const payments = arr(c.payments), ledger = arr(c.customerLedger), invoices = arr(c.invoices), customers = arr(c.customers);
    const approvedPayments = payments.filter(paymentIsApproved);
    const creditInvoices = invoices.filter(function(i){ return str(i.paymentType || "cash") === "credit"; });
    const totals = {
      approvedPayments: approvedPayments.reduce(function(a,p){ return a + num(p.amount); }, 0),
      ledgerCredits: ledger.filter(ledgerLooksPayment).reduce(function(a,l){ return a + Math.abs(num(l.amount)); }, 0),
      creditInvoices: creditInvoices.reduce(function(a,i){ return a + num(i.total); }, 0),
      ledgerDebits: ledger.filter(ledgerLooksInvoice).reduce(function(a,l){ return a + Math.abs(num(l.amount)); }, 0),
      customerBalances: customers.reduce(function(a,c){ return a + num(c.balance); }, 0)
    };
    return { payments, ledger, invoices, customers, approvedPayments, creditInvoices, totals };
  }
  function possiblePaymentLedgerMismatches(){
    const s = snapshot();
    const ledgerText = s.ledger.map(function(l){ return str(JSON.stringify({ id:l.id, sourceId:l.sourceId, paymentId:l.paymentId, note:l.note, type:l.type, amount:l.amount, customerId:l.customerId })); }).join("\n");
    return s.approvedPayments.filter(function(p){
      const keys = [p.id, p.paymentId, p.referenceNo, p.ref, p.customerName].map(str).filter(Boolean);
      const amount = num(p.amount);
      const hasKeyMatch = keys.some(function(k){ return ledgerText.indexOf(k) >= 0; });
      const hasAmountMatch = s.ledger.some(function(l){ return ledgerLooksPayment(l) && Math.abs(Math.abs(num(l.amount)) - amount) < 0.01 && (!p.customerId || !l.customerId || str(p.customerId) === str(l.customerId)); });
      return !(hasKeyMatch || hasAmountMatch);
    }).map(function(p){ return { paymentId:idOf(p), customerId:str(p.customerId), customerName:str(p.customerName), amount:num(p.amount), status:str(p.status), referenceNo:str(p.referenceNo) }; });
  }
  function possibleInvoiceLedgerMismatches(){
    const s = snapshot();
    const ledgerText = s.ledger.map(function(l){ return str(JSON.stringify({ id:l.id, sourceId:l.sourceId, invoiceId:l.invoiceId, note:l.note, type:l.type, amount:l.amount, customerId:l.customerId })); }).join("\n");
    return s.creditInvoices.filter(function(i){
      const keys = [i.id, i.invoiceId, i.invoiceNo, i.sourceOrderId, i.customerName].map(str).filter(Boolean);
      const amount = num(i.total);
      const hasKeyMatch = keys.some(function(k){ return ledgerText.indexOf(k) >= 0; });
      const hasAmountMatch = s.ledger.some(function(l){ return ledgerLooksInvoice(l) && Math.abs(Math.abs(num(l.amount)) - amount) < 0.01 && (!i.customerId || !l.customerId || str(i.customerId) === str(l.customerId)); });
      return !(hasKeyMatch || hasAmountMatch);
    }).map(function(i){ return { invoiceId:idOf(i), invoiceNo:str(i.invoiceNo), customerId:str(i.customerId), customerName:str(i.customerName), total:num(i.total), paymentType:str(i.paymentType) }; });
  }
  function customerBalanceDiagnostics(){
    const s = snapshot();
    return s.customers.map(function(c){
      const cid = str(c.customerId || c.id);
      const ledgerForCustomer = s.ledger.filter(function(l){ return str(l.customerId) === cid; });
      const ledgerBalance = ledgerForCustomer.reduce(function(a,l){ return a + num(l.amount); }, 0);
      const storedBalance = num(c.balance);
      return { customerId: cid, customerName: str(c.name || c.customerName), storedBalance, ledgerBalance, delta: Number((storedBalance - ledgerBalance).toFixed(2)), movementCount: ledgerForCustomer.length };
    }).filter(function(x){ return Math.abs(x.delta) > 0.01; });
  }
  function runRealDataReview(){
    const s = snapshot();
    const paymentMismatches = possiblePaymentLedgerMismatches();
    const invoiceMismatches = possibleInvoiceLedgerMismatches();
    const balanceMismatches = customerBalanceDiagnostics();
    const warnings = [];
    if(paymentMismatches.length) warnings.push("توجد سدادات معتمدة قد لا تظهر بوضوح في كشف الحساب.");
    if(invoiceMismatches.length) warnings.push("توجد فواتير آجلة قد لا تظهر بوضوح في كشف الحساب.");
    if(balanceMismatches.length) warnings.push("توجد فروقات بين رصيد العميل المحفوظ ومجموع الحركات.");
    const result = { ok: warnings.length === 0, version: VERSION, build: BUILD_CODE, counts:{ payments:s.payments.length, approvedPayments:s.approvedPayments.length, invoices:s.invoices.length, creditInvoices:s.creditInvoices.length, ledger:s.ledger.length, customers:s.customers.length }, totals:s.totals, paymentMismatches, invoiceMismatches, balanceMismatches, warnings, checkedAt:new Date().toISOString() };
    try { localStorage.setItem("hesabi_last_payments_statements_real_data", JSON.stringify({ ok:result.ok, at:result.checkedAt, warnings, counts:result.counts })); } catch (_) {}
    return result;
  }
  function selfCheck(){
    const required = ["snapshot","possiblePaymentLedgerMismatches","possibleInvoiceLedgerMismatches","customerBalanceDiagnostics","runRealDataReview"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    const s = snapshot();
    return { ok: missing.length === 0 && typeof s.totals === "object", version: VERSION, build: BUILD_CODE, missing, counts:{payments:s.payments.length, ledger:s.ledger.length, invoices:s.invoices.length} };
  }
  const api = { version: VERSION, build: BUILD_CODE, snapshot, possiblePaymentLedgerMismatches, possibleInvoiceLedgerMismatches, customerBalanceDiagnostics, runRealDataReview };
  window.hesabiPaymentsStatementsRealData = api;
  window.hesabiPaymentsStatementsRealDataSelfCheck = selfCheck;
})();
