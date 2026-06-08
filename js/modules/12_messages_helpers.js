/* Hesabi 1.0.73 - Messages page stabilization.
   Safe helpers only: no Firestore writes and no change to sendMessage persistence logic. */
(function(){
  "use strict";

  const VERSION = "1.0.73";
  const BUILD_CODE = 73;
  const MAX_MESSAGES = 80;

  function escSafe(value){
    if(typeof esc === "function") return esc(value == null ? "" : value);
    return String(value == null ? "" : value).replace(/[&<>"']/g, function(ch){
      return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch];
    });
  }

  function dateSafe(ms){
    try {
      if(typeof dt === "function") return dt(ms);
      if(!ms) return "-";
      return new Date(Number(ms)).toLocaleString("ar");
    } catch (_) { return "-"; }
  }

  function roleText(role){
    const r = String(role || "");
    if(r === "trader") return "تاجر";
    if(r === "customer") return "عميل";
    if(r === "owner") return "مالك";
    return "النظام";
  }

  function messageText(message){
    if(!message || typeof message !== "object") return "";
    return String(message.text || message.body || message.message || message.note || "");
  }

  function messageCreatedMs(message){
    if(!message || typeof message !== "object") return 0;
    const direct = Number(message.createdMs || message.updatedMs || message.readMs || 0);
    if(Number.isFinite(direct) && direct > 0) return direct;
    try {
      const ts = message.createdAt || message.updatedAt;
      if(ts && typeof ts.toMillis === "function") return Number(ts.toMillis()) || 0;
      if(ts && ts.seconds) return Number(ts.seconds) * 1000;
    } catch (_) {}
    return 0;
  }

  function normalizeMessage(message, index){
    const m = message && typeof message === "object" ? message : {};
    return {
      id: String(m.id || m.messageId || index || ""),
      fromName: String(m.fromName || m.senderName || m.customerName || "رسالة"),
      fromRole: String(m.fromRole || m.senderRole || "system"),
      text: messageText(m),
      createdMs: messageCreatedMs(m),
      readByTrader: m.readByTrader !== false,
      readByCustomer: m.readByCustomer !== false
    };
  }

  function latestMessages(messages, limit){
    const list = Array.isArray(messages) ? messages : [];
    const mapped = list.map(normalizeMessage);
    mapped.sort(function(a,b){ return (a.createdMs || 0) - (b.createdMs || 0); });
    return mapped.slice(-Math.max(1, Number(limit || MAX_MESSAGES))).reverse();
  }

  function customerOptions(customers, selectedId){
    const list = Array.isArray(customers) ? customers : [];
    return list.map(function(c){
      const id = String((c && (c.customerId || c.id)) || "");
      const selected = selectedId && String(selectedId) === id ? " selected" : "";
      return `<option value="${escSafe(id)}"${selected}>${escSafe((c && c.name) || "عميل")} - ${escSafe((c && c.phone) || "")}</option>`;
    }).join("");
  }

  function renderCustomerSelector(customers, role){
    if(String(role || "") !== "trader") return "";
    return `<div class="field"><label>العميل</label><select id="messageCustomer"><option value="">اختر العميل</option>${customerOptions(customers)}</select></div>`;
  }

  function renderMessageRows(messages){
    const rows = latestMessages(messages).map(function(m){
      return `<tr><td class="name"><b>${escSafe(m.fromName)}</b><div class="muted">${escSafe(roleText(m.fromRole))}</div></td><td>${escSafe(m.text)}</td><td>${escSafe(dateSafe(m.createdMs))}</td></tr>`;
    }).join("");
    return rows || '<tr><td colspan="3">لا توجد رسائل</td></tr>';
  }

  function renderPage(opts){
    opts = opts || {};
    const check = opts.check && typeof opts.check === "object" ? opts.check : { ok: true, msg: "" };
    const disabled = check.ok ? "" : " disabled";
    const warning = check.ok ? "" : `<div class="notice warn">${escSafe(check.msg || "المراسلة غير متاحة حاليًا.")}</div>`;
    const selector = renderCustomerSelector(opts.customers, opts.role);
    const count = latestMessages(opts.messages).length;
    return `<div class="card"><h2>الرسائل</h2>${warning}<div class="notice">آخر الرسائل المعروضة: ${escSafe(count)} من ${escSafe(MAX_MESSAGES)} كحد أقصى.</div>${selector}<div class="field"><label>نص الرسالة</label><textarea id="messageText" placeholder="اكتب رسالتك هنا"></textarea></div><button class="btn ok" id="sendMessageBtn"${disabled}>إرسال</button></div><div class="table-wrap"><table class="compact-table"><thead><tr><th>المرسل</th><th>الرسالة</th><th>التاريخ</th></tr></thead><tbody>${renderMessageRows(opts.messages)}</tbody></table></div>`;
  }

  function bindActions(sendFn){
    const btn = typeof $ === "function" ? $("sendMessageBtn") : document.getElementById("sendMessageBtn");
    if(btn && typeof sendFn === "function") btn.onclick = sendFn;
    return { ok: !!btn, sendBound: !!(btn && typeof sendFn === "function") };
  }

  function safeMarkRead(markFn){
    setTimeout(function(){
      try { if(typeof markFn === "function") markFn(); }
      catch(error){ try { console.warn("mark messages read failed", error); } catch (_) {} }
    }, 150);
  }

  function selfCheck(){
    const api = window.hesabiMessagesHelpers || {};
    const required = ["latestMessages","renderPage","renderMessageRows","bindActions","safeMarkRead","normalizeMessage"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    let sampleOk = false;
    try {
      const html = api.renderPage({ role: "customer", messages: [{ fromName:"اختبار", fromRole:"trader", text:"مرحبا", createdMs: Date.now() }], customers: [], check: { ok:true } });
      sampleOk = /الرسائل/.test(html) && /مرحبا/.test(html);
    } catch (_) { sampleOk = false; }
    return { ok: missing.length === 0 && sampleOk, version: VERSION, build: BUILD_CODE, missing, sampleOk };
  }

  window.hesabiMessagesHelpers = {
    version: VERSION,
    build: BUILD_CODE,
    maxMessages: MAX_MESSAGES,
    normalizeMessage,
    latestMessages,
    renderMessageRows,
    renderPage,
    bindActions,
    safeMarkRead,
    roleText,
    messageText
  };
  window.hesabiMessagesHelpersSelfCheck = selfCheck;
})();
