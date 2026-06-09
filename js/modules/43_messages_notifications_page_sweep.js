/* Hesabi 1.0.103 - Messages + Notifications Page Final Sweep.
   Scope: UI interaction binding, local filtering/search, mobile table/card guards.
   No Firestore writes are changed. Existing sendMessage, notification open and counter handlers remain the source of truth. */
(function(){
  "use strict";
  const VERSION = "1.0.103";
  const BUILD_CODE = 103;
  const SEARCH_INPUT_ID = "mnPageSearch";

  function byId(id){ try { return document.getElementById(id); } catch (_) { return null; } }
  function escSafe(value){
    try { return typeof esc === "function" ? esc(value == null ? "" : value) : String(value == null ? "" : value).replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch])); }
    catch (_) { return ""; }
  }
  function norm(value){
    return String(value == null ? "" : value).toLowerCase().replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآا]/g,"ا").replace(/[ى]/g,"ي").replace(/[ة]/g,"ه").replace(/\s+/g," ").trim();
  }
  function page(pageId){ return byId("page_" + pageId); }
  function ensureTableGuard(container){
    if(!container) return;
    try{
      container.classList.add("mn-page-sweep");
      container.querySelectorAll(".table-wrap").forEach(w => w.classList.add("mn-safe-table-wrap"));
      container.querySelectorAll("table").forEach(t => t.classList.add("mn-safe-table"));
    }catch(_){ }
  }
  function rowsAndCards(container){
    if(!container) return [];
    return Array.from(container.querySelectorAll(".wa-bubble,.notify-row,tbody tr"));
  }
  function applySearch(container, query){
    const q = norm(query);
    const targets = rowsAndCards(container);
    let visible = 0;
    targets.forEach(el => {
      const text = norm(el.textContent || "");
      const show = !q || text.indexOf(q) >= 0;
      el.style.display = show ? "" : "none";
      if(show) visible++;
    });
    const count = container ? container.querySelector("[data-mn-search-count]") : null;
    if(count) count.textContent = String(visible);
    return visible;
  }
  function ensureSearch(container, title){
    if(!container || byId(SEARCH_INPUT_ID)) return;
    const host = container.querySelector(".wa-chat-card,.notify-list-card,.card") || container;
    const box = document.createElement("div");
    box.className = "mn-search-box";
    box.innerHTML = `<div class="field mn-search-field"><label>${escSafe(title || "بحث")}</label><div class="mn-search-row"><input id="${SEARCH_INPUT_ID}" type="search" autocomplete="off" inputmode="search" placeholder="اكتب للبحث داخل الصفحة"><button type="button" class="btn secondary mini" id="mnApplySearch">بحث</button><button type="button" class="btn light mini" id="mnClearSearch">مسح</button></div><div class="subcell">النتائج: <b data-mn-search-count="1">${rowsAndCards(container).length}</b></div></div>`;
    try { host.insertAdjacentElement("afterbegin", box); } catch (_) { container.insertAdjacentElement("afterbegin", box); }
    const input = byId(SEARCH_INPUT_ID);
    const apply = byId("mnApplySearch");
    const clear = byId("mnClearSearch");
    if(input){
      input.addEventListener("keydown", ev => { if(ev.key === "Enter"){ ev.preventDefault(); applySearch(container, input.value); } });
      input.addEventListener("input", () => { /* intentionally no rerender; keyboard remains open */ });
    }
    if(apply) apply.onclick = () => applySearch(container, input ? input.value : "");
    if(clear) clear.onclick = () => { if(input) input.value = ""; applySearch(container, ""); if(input) input.focus(); };
    applySearch(container, "");
  }
  function bindMessageActions(){
    const container = page("messages");
    if(!container) return { ok:false, reason:"messages page missing" };
    ensureTableGuard(container);
    ensureSearch(container, "بحث في الرسائل");
    const sendBtn = byId("sendMessageBtn");
    if(sendBtn && typeof sendMessage === "function") sendBtn.onclick = sendMessage;
    const selector = byId("messageCustomer");
    if(selector){
      selector.onchange = function(){
        try { state.messageCustomerId = selector.value || ""; if(typeof save === "function") save(); } catch (_) {}
      };
    }
    const txt = byId("messageText");
    if(txt){
      txt.addEventListener("keydown", function(ev){
        if((ev.ctrlKey || ev.metaKey) && ev.key === "Enter" && sendBtn){ ev.preventDefault(); sendBtn.click(); }
      });
    }
    return { ok:true, sendBound: !!sendBtn, hasSearch: !!byId(SEARCH_INPUT_ID), hasRows: rowsAndCards(container).length };
  }
  function bindNotificationActions(){
    const container = page("notifications");
    if(!container) return { ok:false, reason:"notifications page missing" };
    ensureTableGuard(container);
    ensureSearch(container, "بحث في الإشعارات");
    const enable = byId("enableNotifyBtn");
    const clear = byId("clearNotifyBtn");
    const test = byId("testBadgeBtn");
    if(enable && typeof requestNotificationPermission === "function") enable.onclick = () => requestNotificationPermission(true);
    if(clear && typeof clearAllNotificationCounters === "function") clear.onclick = () => { clearAllNotificationCounters(); if(typeof msg === "function") msg("تم تصفير عداد الإشعارات.", "success"); };
    if(test) test.onclick = () => {
      try{
        if(window.hesabiAndroidBridge && typeof window.hesabiAndroidBridge.updateLauncherBadge === "function") window.hesabiAndroidBridge.updateLauncherBadge(1, "اختبار عداد حسابي التجاري");
        if(typeof msg === "function") msg("تم إرسال اختبار للعداد.", "success");
      }catch(e){ if(typeof msg === "function") msg("تعذر اختبار العداد: " + (e && e.message || e), "error"); }
    };
    try{
      container.querySelectorAll("[data-notify-open]").forEach(btn => {
        btn.onclick = function(){ if(typeof openNotificationPage === "function") openNotificationPage(btn.dataset.notifyOpen || "home"); };
      });
    }catch(_){ }
    return { ok:true, enableBound: !!enable, clearBound: !!clear, testBound: !!test, hasSearch: !!byId(SEARCH_INPUT_ID), hasRows: rowsAndCards(container).length };
  }
  function afterRender(pageName){
    setTimeout(function(){
      try{
        if(pageName === "messages") bindMessageActions();
        if(pageName === "notifications") bindNotificationActions();
      }catch(e){ try { console.warn("messages/notifications sweep bind failed", e); } catch(_){} }
    }, 0);
  }
  function wrapRenderer(name, pageName){
    try{
      const current = (typeof window[name] === "function") ? window[name] : (typeof eval(name) === "function" ? eval(name) : null);
      if(!current || current.__hesabiMnSweepWrapped) return false;
      const wrapped = function(){ const result = current.apply(this, arguments); afterRender(pageName); return result; };
      wrapped.__hesabiMnSweepWrapped = true;
      try { window[name] = wrapped; } catch (_) {}
      try { eval(name + " = wrapped"); } catch (_) {}
      return true;
    }catch(_){ return false; }
  }
  function activate(){
    const wrappedMessages = wrapRenderer("renderMessages", "messages");
    const wrappedNotifications = wrapRenderer("renderNotifications", "notifications");
    try{
      document.addEventListener("click", function(ev){
        const target = ev.target && ev.target.closest ? ev.target.closest("#sendMessageBtn,#enableNotifyBtn,#clearNotifyBtn,#testBadgeBtn,[data-notify-open]") : null;
        if(!target) return;
        if(page("messages")) bindMessageActions();
        if(page("notifications")) bindNotificationActions();
      }, true);
    }catch(_){ }
    return { wrappedMessages, wrappedNotifications };
  }
  function selfCheck(){
    const api = window.hesabiMessagesNotificationsPageSweep || {};
    const required = ["bindMessageActions","bindNotificationActions","applySearch","ensureSearch","activate"];
    const missing = required.filter(name => typeof api[name] !== "function");
    let searchOk = false;
    try{
      const div = document.createElement("div");
      div.innerHTML = '<div class="wa-bubble">رسالة زيت</div><div class="wa-bubble">رسالة ماء</div><span data-mn-search-count="1"></span>';
      searchOk = api.applySearch(div, "زيت") === 1 && div.querySelectorAll(".wa-bubble")[1].style.display === "none";
    }catch(_){ searchOk = false; }
    return { ok: missing.length === 0 && searchOk, version: VERSION, build: BUILD_CODE, missing, searchOk };
  }
  const api = { version: VERSION, build: BUILD_CODE, bindMessageActions, bindNotificationActions, applySearch, ensureSearch, ensureTableGuard, activate, selfCheck };
  window.hesabiMessagesNotificationsPageSweep = api;
  window.hesabiMessagesNotificationsPageSweepSelfCheck = selfCheck;
  activate();
})();
