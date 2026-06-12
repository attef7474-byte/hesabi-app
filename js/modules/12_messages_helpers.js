/* Hesabi 1.0.90 - Messages mobile layout fix.
   Safe UI helpers only: no Firestore writes and no change to sendMessage persistence logic. */
(function(){
  "use strict";

  const VERSION = "1.0.128";
  const BUILD_CODE = 128;
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
    const id = String(m.id || m.messageId || index || "");
    const fromRole = String(m.fromRole || m.senderRole || "system");
    const text = messageText(m);
    return {
      id,
      fromName: String(m.fromName || m.senderName || m.customerName || (fromRole === "trader" ? "التاجر" : "عميل")),
      fromRole,
      text,
      type: m.type || (m.attachmentData ? (m.attachmentKind || 'image') : 'chat'),
      attachmentKind: m.attachmentKind || '',
      attachmentData: m.attachmentData || m.attachmentUrl || '',
      attachmentName: m.attachmentName || '',
      createdMs: messageCreatedMs(m),
      readByTrader: m.readByTrader !== false,
      readByCustomer: m.readByCustomer !== false,
      empty: !text && !id && !m.attachmentData
    };
  }

  function latestMessages(messages, limit){
    const list = Array.isArray(messages) ? messages : [];
    const mapped = list.map(normalizeMessage).filter(function(m){ return !m.empty; });
    mapped.sort(function(a,b){ return (a.createdMs || 0) - (b.createdMs || 0); });
    return mapped.slice(-Math.max(1, Number(limit || MAX_MESSAGES)));
  }

  function customerOptions(customers, selectedId){
    const list = Array.isArray(customers) ? customers : [];
    return list.map(function(c){
      const id = String((c && (c.customerId || c.id)) || "");
      const selected = selectedId && String(selectedId) === id ? " selected" : "";
      return `<option value="${escSafe(id)}"${selected}>${escSafe((c && c.name) || "عميل")} - ${escSafe((c && c.phone) || "")}</option>`;
    }).join("");
  }

  function renderCustomerSelector(customers, role, selectedId){
    if(String(role || "") !== "trader") return "";
    return `<div class="field wa-contact-select"><label>العميل</label><select id="messageCustomer"><option value="">اختر العميل</option>${customerOptions(customers, selectedId)}</select></div>`;
  }

  function isMine(message, role){
    const r = String(role || "");
    return r && String(message && message.fromRole || "") === r;
  }

  function renderMessageCards(messages, role){
    const list = latestMessages(messages);
    if(!list.length) return '<div class="wa-empty">لا توجد رسائل حتى الآن.</div>';
    return list.map(function(m){
      const mine = isMine(m, role);
      const cls = mine ? "mine" : "theirs";
      const name = mine ? "أنت" : (m.fromName || roleText(m.fromRole));
      const unread = (String(role || "") === "trader" && m.readByTrader === false) || (String(role || "") === "customer" && m.readByCustomer === false);

      let statusHtml = '';
      if(mine){
        const isRead = (String(role || "") === "trader") ? m.readByCustomer : m.readByTrader;
        const statusClass = isRead ? 'read' : 'delivered';
        const ticks = isRead ? '✓✓' : '✓✓';
        statusHtml = `<span class="msg-status ${statusClass}">${ticks}</span>`;
      }

      let attachmentHtml = '';
      if(m.attachmentData){
        if(m.attachmentKind === 'audio' || m.type === 'audio'){
          attachmentHtml = `<div class="wa-audio"><audio controls src="${m.attachmentData}"></audio></div>`;
        } else {
          attachmentHtml = `<div class="wa-image"><img src="${m.attachmentData}" alt="مرفق" onclick="window.hesabiMessagesHelpers.openFullscreenImage('${escSafe(m.attachmentData)}')"></div>`;
        }
      }

      return `<div class="wa-bubble ${cls}" data-message-id="${escSafe(m.id)}"><div class="wa-name">${escSafe(name)} · ${escSafe(roleText(m.fromRole))}</div>${attachmentHtml}<div class="wa-text" dir="auto">${escSafe(m.text || "")}</div><div class="wa-meta"><span>${escSafe(dateSafe(m.createdMs))}</span>${statusHtml}${unread?'<span class="wa-unread-chip">جديدة</span>':''}</div></div>`;
    }).join("");
  }

  function renderMessageRows(messages){
    const rows = latestMessages(messages).slice().reverse().map(function(m){
      const attach = m.attachmentData ? (m.attachmentKind === 'audio' ? '[صوت]' : '[صورة]') : '';
      return `<tr><td class="name"><b>${escSafe(m.fromName)}</b><div class="muted">${escSafe(roleText(m.fromRole))}</div></td><td>${attach} ${escSafe(m.text)}</td><td>${escSafe(dateSafe(m.createdMs))}</td></tr>`;
    }).join("");
    return rows || '<tr><td colspan="3">لا توجد رسائل</td></tr>';
  }

  function renderPage(opts){
    opts = opts || {};
    const check = opts.check && typeof opts.check === "object" ? opts.check : { ok: true, msg: "" };
    const disabled = check.ok ? "" : " disabled";
    const warning = check.ok ? "" : `<div class="notice warn">${escSafe(check.msg || "المراسلة غير متاحة حاليًا.")}</div>`;
    const selectedCustomer = opts.state && opts.state.messageCustomerId ? opts.state.messageCustomerId : "";
    const selector = renderCustomerSelector(opts.customers, opts.role, selectedCustomer);
    const count = latestMessages(opts.messages).length;

    return `<div class="card wa-chat-card"><div class="wa-chat-head"><h2>الرسائل</h2><span class="wa-count-chip">${escSafe(count)} / ${escSafe(MAX_MESSAGES)}</span></div>${warning}<div class="notice wa-info">آخر الرسائل المعروضة: ${escSafe(count)} من ${escSafe(MAX_MESSAGES)} كحد أقصى.</div>${selector}<div class="wa-thread" id="messagesThread">${renderMessageCards(opts.messages, opts.role)}</div>
    <div id="waAttachmentPreview" class="wa-attachment-preview hidden"></div>
    <div class="wa-composer">
      <div class="wa-composer-actions">
        <button class="btn light icon-btn" id="waAddImageBtn" title="إرفاق صورة" ${disabled}>📷</button>
        <button class="btn light icon-btn" id="waAddAudioBtn" title="تسجيل صوت" ${disabled}>🎤</button>
        <input type="file" id="waImageInput" accept="image/*" style="display:none">
      </div>
      <textarea id="messageText" placeholder="اكتب رسالتك هنا" dir="auto" ${disabled}></textarea>
      <button class="btn ok" id="sendMessageBtn"${disabled}>إرسال</button>
    </div></div>`;
  }

  let pendingAttachment = null;
  let recordingStartedAt = 0;

  function setPendingAttachment(data){
    pendingAttachment = data;
    const preview = document.getElementById('waAttachmentPreview');
    if(!preview) return;
    if(!data){ preview.classList.add('hidden'); preview.innerHTML = ''; return; }

    preview.classList.remove('hidden');
    let content = '';
    if(data.kind === 'image'){
      content = `<div class="preview-wrap"><img src="${data.dataUrl}"><button class="btn danger mini" onclick="window.hesabiMessagesHelpers.clearPendingAttachment()">×</button></div>`;
    } else if(data.kind === 'audio'){
      content = `<div class="preview-wrap audio-preview"><span>🎤 جاري المعاينة...</span><audio controls src="${data.dataUrl}"></audio><button class="btn danger mini" onclick="window.hesabiMessagesHelpers.clearPendingAttachment()">×</button></div>`;
    }
    preview.innerHTML = content;
  }

  function clearPendingAttachment(){
    setPendingAttachment(null);
  }

  function openFullscreenImage(url){
    const div = document.createElement('div');
    div.className = 'fullscreen-image-overlay';
    div.innerHTML = `<div class="overlay-content"><img src="${url}"><button class="close-btn">إغلاق</button></div>`;
    div.onclick = () => div.remove();
    document.body.appendChild(div);
  }

  function bindActions(sendFn){
    const btn = document.getElementById("sendMessageBtn");
    if(btn && typeof sendFn === "function"){
      btn.onclick = async function(){
        if(btn.disabled) return;
        btn.disabled = true; btn.textContent = '...';
        try {
          await sendFn(pendingAttachment);
          clearPendingAttachment();
        } finally {
          btn.disabled = false; btn.textContent = 'إرسال';
        }
      };
    }

    const imgBtn = document.getElementById('waAddImageBtn');
    const imgInput = document.getElementById('waImageInput');
    if(imgBtn && imgInput){
      imgBtn.onclick = () => imgInput.click();
      imgInput.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if(!file) return;
        try {
          if(typeof hesabiUtilsHelpers !== 'undefined' && typeof hesabiUtilsHelpers.compressImage === 'function'){
            const res = await hesabiUtilsHelpers.compressImage(file, 800, 800, 0.7);
            setPendingAttachment({ kind: 'image', dataUrl: res.dataUrl, name: file.name });
          }
        } catch(err) { if(typeof msg === 'function') msg(err.message, 'error'); }
        imgInput.value = '';
      };
    }

    const audioBtn = document.getElementById('waAddAudioBtn');
    if(audioBtn){
      let isRecording = false;
      audioBtn.onclick = async () => {
        if(typeof hesabiUtilsHelpers === 'undefined') return;
        if(!isRecording){
          try {
            audioBtn.textContent = '⏹️'; audioBtn.classList.add('recording');
            isRecording = true;
            recordingStartedAt = Date.now();
            const res = await hesabiUtilsHelpers.startAudioRecording();
            const duration = Math.round((Date.now() - recordingStartedAt) / 1000);
            if(duration < 1) { if(typeof msg === 'function') msg('التسجيل قصير جدًا.', 'notice'); return; }
            if(res.dataUrl.length > 300000) { if(typeof msg === 'function') msg('التسجيل طويل جدًا للحل المؤقت. قلل المدة.', 'error'); return; }
            setPendingAttachment({ kind: 'audio', dataUrl: res.dataUrl, name: 'voice_note.webm', duration });
          } catch(err) { if(typeof msg === 'function') msg(err.message, 'error'); }
          finally { audioBtn.textContent = '🎤'; audioBtn.classList.remove('recording'); isRecording = false; }
        } else {
          hesabiUtilsHelpers.stopAudioRecording();
        }
      };
    }

    try {
      const thread = document.getElementById("messagesThread");
      if(thread) thread.scrollTop = thread.scrollHeight;
    } catch (_) {}
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
    const required = ["latestMessages","renderPage","renderMessageRows","renderMessageCards","bindActions","safeMarkRead","normalizeMessage","getPendingAttachment","clearPendingAttachment","openFullscreenImage"];
    const missing = required.filter(function(name){ return typeof api[name] !== "function"; });
    let sampleOk = false;
    try {
      const html = api.renderPage({ role: "customer", messages: [{ fromName:"اختبار", fromRole:"trader", text:"مرحبا", createdMs: Date.now() }], customers: [], check: { ok:true } });
      sampleOk = /wa-thread/.test(html) && /wa-bubble/.test(html) && /مرحبا/.test(html) && !/<table/i.test(html);
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
    renderMessageCards,
    renderPage,
    bindActions,
    safeMarkRead,
    roleText,
    messageText,
    getPendingAttachment: () => pendingAttachment,
    clearPendingAttachment,
    openFullscreenImage
  };
  window.hesabiMessagesHelpersSelfCheck = selfCheck;
})();
