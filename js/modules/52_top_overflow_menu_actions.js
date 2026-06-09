/* Hesabi 1.0.111 - Top overflow menu actions.
   Adds a three-dot menu beside the Hesabi brand with active Update, Contact, Complaint/Report and App Info actions. */
(function(){
  "use strict";

  const VERSION = "1.0.111";
  const BUILD_CODE = 111;
  const SUPPORT_EMAIL = "attef7474@gmail.com";
  const REPORTS_KEY = "hesabi_support_reports_v1";

  function byId(id){ try { return document.getElementById(id); } catch (_) { return null; } }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch (_) { return []; } }
  function safeString(v){ try { return v == null ? "" : String(v); } catch (_) { return ""; } }
  function safeEsc(v){ try { return typeof esc === "function" ? esc(v) : safeString(v).replace(/[&<>\"]/g, function(ch){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"})[ch] || ch; }); } catch (_) { return safeString(v); } }
  function safeMsg(text, type){ try { if(typeof msg === "function") msg(text, type || "notice"); else alert(safeString(text)); } catch (_) {} }
  function closeMenu(){ const menu = byId("hesabiTopOverflowMenu"); const btn = byId("hesabiTopOverflowButton"); if(menu) menu.classList.add("hidden"); if(btn) btn.setAttribute("aria-expanded", "false"); }
  function toggleMenu(){ const menu = byId("hesabiTopOverflowMenu"); const btn = byId("hesabiTopOverflowButton"); if(!menu) return; const open = menu.classList.contains("hidden"); menu.classList.toggle("hidden", !open); if(btn) btn.setAttribute("aria-expanded", open ? "true" : "false"); }
  function roleText(){ try { return typeof roleName === "function" ? roleName() : safeString(state && state.role || ""); } catch (_) { return ""; } }
  function currentUid(){ try { return typeof uid === "function" ? uid() : ""; } catch (_) { return ""; } }
  function nativeLabel(){ try { return typeof nativeVersionLabel === "function" ? nativeVersionLabel() : ""; } catch (_) { return ""; } }
  function cacheCount(name){ try { return Array.isArray(cache && cache[name]) ? cache[name].length : 0; } catch (_) { return 0; } }
  function getAppVersion(){ try { return typeof APP_VERSION !== "undefined" ? safeString(APP_VERSION) : VERSION; } catch (_) { return VERSION; } }
  function getAppBuild(){ try { return typeof APP_BUILD_CODE !== "undefined" ? Number(APP_BUILD_CODE || 0) : BUILD_CODE; } catch (_) { return BUILD_CODE; } }

  function ensureStyle(){
    if(byId("hesabiTopOverflowMenuStyle")) return true;
    try {
      const style = document.createElement("style");
      style.id = "hesabiTopOverflowMenuStyle";
      style.textContent = `
        .hesabi-brand-menu-wrap{display:flex;align-items:center;gap:7px;min-width:0;position:relative;}
        .hesabi-top-menu-btn{width:34px;height:34px;min-width:34px;border:1px solid var(--line,#dbe7ee);border-radius:12px;background:#fff;color:#0f172a;display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;line-height:1;box-shadow:0 4px 12px rgba(15,23,42,.08);cursor:pointer;padding:0;}
        .hesabi-top-menu-btn:active{transform:scale(.97)}
        .hesabi-top-overflow-menu{position:absolute;top:44px;right:0;width:min(260px,calc(100vw - 26px));background:#fff;border:1px solid var(--line,#dbe7ee);border-radius:18px;box-shadow:0 18px 42px rgba(15,23,42,.18);padding:8px;z-index:10050;display:grid;gap:5px;}
        .hesabi-top-overflow-menu button{border:0;border-radius:14px;background:#f8fafc;color:#0f172a;padding:10px 11px;display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:center;text-align:right;font-weight:900;cursor:pointer;}
        .hesabi-top-overflow-menu button:active{transform:scale(.99)}
        .hesabi-top-overflow-menu .menu-icon{font-size:18px;line-height:1}.hesabi-top-overflow-menu .menu-label{font-size:13px;line-height:1.25;}
        .hesabi-top-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:10060;display:flex;align-items:center;justify-content:center;padding:14px;}
        .hesabi-top-modal{width:min(560px,100%);max-height:86vh;overflow:auto;background:#fff;border:1px solid var(--line,#dbe7ee);border-radius:22px;box-shadow:0 22px 55px rgba(15,23,42,.28);padding:14px;}
        .hesabi-top-modal-head{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:10px;}
        .hesabi-top-modal-head h2{font-size:18px;margin:0;color:#0f172a}.hesabi-top-close{border:0;background:#f1f5f9;color:#0f172a;border-radius:12px;width:34px;height:34px;font-size:18px;font-weight:900;cursor:pointer;}
        .hesabi-top-modal-body{display:grid;gap:10px}.hesabi-top-modal-body .field{display:grid;gap:5px}.hesabi-top-modal-body label{font-size:12px;color:#64748b;font-weight:900}.hesabi-top-modal-body input,.hesabi-top-modal-body select,.hesabi-top-modal-body textarea{width:100%;border:1px solid #dbe7ee;border-radius:13px;padding:10px;background:#fff;color:#0f172a}.hesabi-top-modal-body textarea{min-height:110px;resize:vertical}.hesabi-top-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}.hesabi-top-actions .btn{width:auto!important;flex:1 1 auto;min-height:38px;}
        .hesabi-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.hesabi-info-cell{border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:10px}.hesabi-info-cell span{display:block;font-size:11px;color:#64748b;margin-bottom:3px}.hesabi-info-cell b{font-size:13px;color:#0f172a;word-break:break-word}.hesabi-support-status{border:1px dashed #99f6e4;background:#f0fdfa;color:#115e59;border-radius:14px;padding:10px;font-size:13px;font-weight:800;white-space:pre-wrap;}
        body[data-theme="dark"] .hesabi-top-menu-btn, body[data-theme="dark"] .hesabi-top-overflow-menu, body[data-theme="dark"] .hesabi-top-modal{background:#1e293b;color:#e5e7eb;border-color:#334155} body[data-theme="dark"] .hesabi-top-overflow-menu button, body[data-theme="dark"] .hesabi-top-close, body[data-theme="dark"] .hesabi-info-cell{background:#334155;color:#e5e7eb;border-color:#475569} body[data-theme="dark"] .hesabi-top-modal-head h2, body[data-theme="dark"] .hesabi-info-cell b{color:#e5e7eb} body[data-theme="dark"] .hesabi-top-modal-body input, body[data-theme="dark"] .hesabi-top-modal-body select, body[data-theme="dark"] .hesabi-top-modal-body textarea{background:#0f172a;color:#e5e7eb;border-color:#475569}
        @media(max-width:520px){.hesabi-top-menu-btn{width:32px;height:32px;min-width:32px;font-size:21px}.hesabi-top-overflow-menu{top:40px;right:0;width:min(250px,calc(100vw - 18px));}.hesabi-info-grid{grid-template-columns:1fr}.hesabi-top-modal{border-radius:20px;padding:12px}.hesabi-top-actions{display:grid;grid-template-columns:1fr}.hesabi-top-actions .btn{width:100%!important}.title{gap:6px}.title h1{font-size:18px!important}}
      `;
      document.head.appendChild(style);
      return true;
    } catch (_) { return false; }
  }

  function ensureDom(){
    ensureStyle();
    const title = document.querySelector(".top .title");
    if(!title) return false;
    let wrap = title.querySelector(".hesabi-brand-menu-wrap");
    const h1 = title.querySelector("h1");
    if(!wrap){
      wrap = document.createElement("div");
      wrap.className = "hesabi-brand-menu-wrap";
      if(h1) title.insertBefore(wrap, h1);
      if(h1) wrap.appendChild(h1);
      else title.insertBefore(wrap, title.firstChild);
    }
    let btn = byId("hesabiTopOverflowButton");
    if(!btn){
      btn = document.createElement("button");
      btn.id = "hesabiTopOverflowButton";
      btn.className = "hesabi-top-menu-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", "قائمة التطبيق");
      btn.setAttribute("aria-haspopup", "menu");
      btn.setAttribute("aria-expanded", "false");
      btn.textContent = "⋮";
      wrap.appendChild(btn);
    }
    let menu = byId("hesabiTopOverflowMenu");
    if(!menu){
      menu = document.createElement("div");
      menu.id = "hesabiTopOverflowMenu";
      menu.className = "hesabi-top-overflow-menu hidden";
      menu.setAttribute("role", "menu");
      menu.innerHTML = [
        ["update","🔄","تحديث التطبيق"],
        ["contact","☎️","تواصل معنا"],
        ["report","⚠️","إبلاغ وشكاوي"],
        ["info","ℹ️","معلومات التطبيق"]
      ].map(function(item){ return `<button type="button" role="menuitem" data-top-menu-action="${item[0]}"><span class="menu-icon">${item[1]}</span><span class="menu-label">${item[2]}</span></button>`; }).join("");
      wrap.appendChild(menu);
    }
    if(!btn.__hesabiTopMenuBound){
      btn.__hesabiTopMenuBound = true;
      btn.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); toggleMenu(); });
    }
    qsa("[data-top-menu-action]", menu).forEach(function(item){
      if(item.__hesabiTopMenuBound) return;
      item.__hesabiTopMenuBound = true;
      item.addEventListener("click", function(ev){
        ev.preventDefault(); ev.stopPropagation();
        const action = item.getAttribute("data-top-menu-action") || "";
        closeMenu();
        if(action === "update") openUpdateModal();
        else if(action === "contact") openContactModal();
        else if(action === "report") openReportModal();
        else if(action === "info") openInfoModal();
      });
    });
    if(!document.__hesabiTopMenuDocumentBound){
      document.__hesabiTopMenuDocumentBound = true;
      document.addEventListener("click", function(ev){
        const target = ev.target;
        if(target && target.closest && target.closest("#hesabiTopOverflowButton,#hesabiTopOverflowMenu")) return;
        closeMenu();
      }, true);
      document.addEventListener("keydown", function(ev){ if(ev.key === "Escape") { closeMenu(); closeModal(); } });
    }
    return true;
  }

  function closeModal(){ const back = byId("hesabiTopModalBackdrop"); if(back) back.remove(); }
  function openModal(title, bodyHtml){
    closeModal();
    const back = document.createElement("div");
    back.id = "hesabiTopModalBackdrop";
    back.className = "hesabi-top-modal-backdrop";
    back.innerHTML = `<div class="hesabi-top-modal" role="dialog" aria-modal="true"><div class="hesabi-top-modal-head"><h2>${safeEsc(title)}</h2><button class="hesabi-top-close" id="hesabiTopModalClose" type="button" aria-label="إغلاق">×</button></div><div class="hesabi-top-modal-body">${bodyHtml}</div></div>`;
    document.body.appendChild(back);
    const close = byId("hesabiTopModalClose");
    if(close) close.onclick = closeModal;
    back.addEventListener("click", function(ev){ if(ev.target === back) closeModal(); });
    return back;
  }

  function updateStatus(text){ const el = byId("hesabiUpdateMenuStatus"); if(el) el.textContent = text; }
  async function refreshUiAndReload(){
    try {
      updateStatus("جاري تنظيف الكاش وتحديث الواجهات...");
      if(typeof refreshWebUiNow === "function") await refreshWebUiNow();
      updateStatus("تم تجهيز التحديث. سيتم إعادة تحميل الواجهة الآن.");
      setTimeout(function(){ try { location.replace(location.pathname + "?v=" + Date.now()); } catch (_) { location.reload(); } }, 500);
    } catch (error) { updateStatus("تعذر تحديث الواجهات: " + safeString(error && error.message || error)); safeMsg("تعذر تحديث الواجهات", "error"); }
  }
  async function checkAppUpdate(){
    try {
      updateStatus("جاري فحص الإصدار...");
      if(typeof checkApkUpdateOnly === "function") await checkApkUpdateOnly(true);
      const info = typeof fetchAndroidUpdateInfo === "function" ? await fetchAndroidUpdateInfo() : null;
      const latestName = info ? safeString(info.latestVersionName || info.versionName || "") : "";
      const latestCode = info ? Number(info.latestVersionCode || info.versionCode || 0) : 0;
      updateStatus("الإصدار الحالي: " + getAppVersion() + " / build " + getAppBuild() + "\nآخر إصدار متاح: " + (latestName || "غير معروف") + " / build " + (latestCode || "-"));
    } catch (error) { updateStatus("تعذر فحص الإصدار: " + safeString(error && error.message || error)); }
  }
  function openUpdateModal(){
    openModal("تحديث التطبيق", `<div class="hesabi-support-status" id="hesabiUpdateMenuStatus">اختر نوع التحديث المطلوب.</div><div class="hesabi-top-actions"><button class="btn ok" id="hesabiMenuRefreshUi" type="button">تحديث الواجهات</button><button class="btn secondary" id="hesabiMenuDownloadApk" type="button">تحديث APK</button><button class="btn light" id="hesabiMenuCheckVersion" type="button">فحص الإصدار</button></div>`);
    const refresh = byId("hesabiMenuRefreshUi");
    const apk = byId("hesabiMenuDownloadApk");
    const check = byId("hesabiMenuCheckVersion");
    if(refresh) refresh.onclick = refreshUiAndReload;
    if(apk) apk.onclick = function(){ updateStatus("جاري فتح رابط تحديث APK..."); try { if(typeof downloadApkUpdate === "function") downloadApkUpdate(); else location.href = "https://github.com/attef7474-byte/hesabi-app/releases/latest/download/hesabi-app-latest.apk"; } catch (error) { updateStatus("تعذر فتح تحديث APK: " + safeString(error && error.message || error)); } };
    if(check) check.onclick = checkAppUpdate;
  }

  function supportBase(){
    let shopName = "";
    try { shopName = safeString((cache && cache.shop && cache.shop.name) || (state && state.shopName) || ""); } catch (_) {}
    let phone = "";
    try { phone = safeString((state && (state.customerPhone || state.authPhone || state.phone || state.shopPhone)) || ""); } catch (_) {}
    return { uid: currentUid(), role: roleText(), shopId: safeString((state && state.shopId) || ""), shopName, customerId: safeString((state && state.customerId) || ""), customerName: safeString((state && state.customerName) || ""), phone, appVersion: getAppVersion(), appBuild: getAppBuild(), native: nativeLabel(), url: safeString(location && location.href || ""), at: new Date().toISOString() };
  }
  function localReports(){ try { const list = JSON.parse(localStorage.getItem(REPORTS_KEY) || "[]"); return Array.isArray(list) ? list : []; } catch (_) { return []; } }
  function saveLocalReport(payload){
    try { const list = localReports(); list.unshift(payload); localStorage.setItem(REPORTS_KEY, JSON.stringify(list.slice(0,60))); return true; } catch (_) { return false; }
  }
  async function tryFirestoreReport(payload){
    try {
      if(!db || typeof addDoc !== "function" || typeof collection !== "function") return { ok:false, reason:"db-not-ready" };
      const sid = safeString(payload.shopId || "");
      if(!sid) return { ok:false, reason:"no-shop" };
      const data = Object.assign({}, payload, { createdMs: Date.now(), createdAt: (typeof serverTimestamp === "function" ? serverTimestamp() : new Date().toISOString()) });
      await addDoc(collection(db, "shops", sid, "messages"), Object.assign({}, data, { customerId: payload.customerId || "__app_owner__", customerUid: payload.uid || "", text: payload.message || payload.details || "", kind: payload.kind || "support", toAppOwner: true, readByCustomer: true }));
      return { ok:true, path:"shops/" + sid + "/messages" };
    } catch (error) { return { ok:false, reason:safeString(error && error.message || error) }; }
  }
  function mailtoUrl(payload){
    const subject = encodeURIComponent((payload.kind === "complaint" ? "بلاغ أو شكوى - " : "تواصل معنا - ") + "حسابي التجاري " + getAppVersion());
    const body = encodeURIComponent(formatPayloadText(payload));
    return "mailto:" + SUPPORT_EMAIL + "?subject=" + subject + "&body=" + body;
  }
  function formatPayloadText(payload){
    const b = payload.base || supportBase();
    return [
      "حسابي التجاري",
      "النوع: " + (payload.kind === "complaint" ? "إبلاغ وشكاوي" : "تواصل معنا"),
      payload.title ? ("العنوان: " + payload.title) : "",
      payload.contact ? ("وسيلة التواصل: " + payload.contact) : "",
      "الرسالة:",
      payload.message || payload.details || "",
      "----------------------",
      "الدور: " + (b.role || "-"),
      "المتجر: " + (b.shopName || b.shopId || "-"),
      "العميل: " + (b.customerName || b.customerId || "-"),
      "الهاتف: " + (b.phone || "-"),
      "المستخدم: " + (b.uid || "-"),
      "الإصدار: " + (b.appVersion || "-") + " / build " + (b.appBuild || "-"),
      "APK: " + (b.native || "-"),
      "الوقت: " + (b.at || "-")
    ].filter(Boolean).join("\n");
  }
  async function copyPayload(payload){
    const text = formatPayloadText(payload);
    try { await navigator.clipboard.writeText(text); return true; } catch (_) { return false; }
  }
  async function sharePayload(payload){
    const text = formatPayloadText(payload);
    try { if(navigator.share){ await navigator.share({ title: payload.kind === "complaint" ? "بلاغ وشكوى" : "تواصل معنا", text }); return { ok:true, method:"share" }; } } catch (error) { return { ok:false, reason:safeString(error && error.message || error) }; }
    return { ok:false, reason:"share-not-supported" };
  }
  async function submitSupportPayload(kind){
    const title = safeString(byId("hesabiSupportTitle") && byId("hesabiSupportTitle").value).trim();
    const contact = safeString(byId("hesabiSupportContact") && byId("hesabiSupportContact").value).trim();
    const message = safeString(byId("hesabiSupportMessage") && byId("hesabiSupportMessage").value).trim();
    const category = safeString(byId("hesabiSupportCategory") && byId("hesabiSupportCategory").value).trim();
    const status = byId("hesabiSupportStatus");
    if(!message || message.length < 4){ if(status) status.textContent = "اكتب نص الرسالة أولًا."; return; }
    const payload = { id:"SUP-" + Date.now().toString(36).toUpperCase(), kind, category, title, contact, message, base:supportBase(), createdMs:Date.now() };
    saveLocalReport(payload);
    if(status) status.textContent = "تم حفظ الرسالة محليًا، وجاري محاولة الإرسال...";
    const cloud = await tryFirestoreReport(payload);
    const shared = await sharePayload(payload);
    if(!shared.ok){ await copyPayload(payload); try { setTimeout(function(){ location.href = mailtoUrl(payload); }, 250); } catch (_) {} }
    if(status) status.textContent = cloud.ok ? "تم حفظ البلاغ داخل رسائل المتجر، وتم فتح المشاركة/البريد عند توفرها." : "تم حفظ الرسالة محليًا ونسخها/فتح المشاركة أو البريد عند توفرها.";
    safeMsg(kind === "complaint" ? "تم تجهيز البلاغ أو الشكوى للإرسال." : "تم تجهيز رسالة التواصل للإرسال.", "success");
  }

  function supportForm(kind){
    const isComplaint = kind === "complaint";
    return `<div class="field"><label>التصنيف</label><select id="hesabiSupportCategory"><option value="${isComplaint ? "complaint" : "contact"}">${isComplaint ? "شكوى" : "تواصل"}</option>${isComplaint ? '<option value="bug">بلاغ عن مشكلة</option><option value="suggestion">اقتراح</option>' : '<option value="support">دعم فني</option><option value="sales">استفسار</option>'}</select></div><div class="field"><label>العنوان</label><input id="hesabiSupportTitle" placeholder="عنوان مختصر"></div><div class="field"><label>وسيلة التواصل</label><input id="hesabiSupportContact" placeholder="رقم هاتف أو بريد للتواصل"></div><div class="field"><label>${isComplaint ? "تفاصيل البلاغ أو الشكوى" : "رسالتك"}</label><textarea id="hesabiSupportMessage" placeholder="اكتب هنا"></textarea></div><div class="hesabi-support-status" id="hesabiSupportStatus">سيتم حفظ الطلب داخل التطبيق وفتحه للمشاركة أو البريد، مع نسخ التفاصيل احتياطيًا.</div><div class="hesabi-top-actions"><button class="btn ok" id="hesabiSupportSubmit" type="button">إرسال</button><button class="btn light" id="hesabiSupportCopy" type="button">نسخ</button></div>`;
  }
  function bindSupportForm(kind){
    const submit = byId("hesabiSupportSubmit");
    const copy = byId("hesabiSupportCopy");
    if(submit) submit.onclick = function(){ submitSupportPayload(kind); };
    if(copy) copy.onclick = async function(){
      const payload = { kind, category:safeString(byId("hesabiSupportCategory") && byId("hesabiSupportCategory").value), title:safeString(byId("hesabiSupportTitle") && byId("hesabiSupportTitle").value), contact:safeString(byId("hesabiSupportContact") && byId("hesabiSupportContact").value), message:safeString(byId("hesabiSupportMessage") && byId("hesabiSupportMessage").value), base:supportBase(), createdMs:Date.now() };
      const ok = await copyPayload(payload); const status = byId("hesabiSupportStatus"); if(status) status.textContent = ok ? "تم نسخ الرسالة." : "تعذر النسخ من هذا الجهاز.";
    };
  }
  function openContactModal(){ openModal("تواصل معنا", supportForm("contact")); bindSupportForm("contact"); }
  function openReportModal(){ openModal("إبلاغ وشكاوي", supportForm("complaint")); bindSupportForm("complaint"); }

  function openInfoModal(){
    const b = supportBase();
    const info = [
      ["الإصدار", getAppVersion() + " / build " + getAppBuild()],
      ["APK", nativeLabel() || "Web"],
      ["الدور", b.role || "-"],
      ["المتجر", b.shopName || b.shopId || "-"],
      ["العميل", b.customerName || b.customerId || "-"],
      ["الحالة", navigator.onLine ? "متصل" : "غير متصل"],
      ["الأصناف", cacheCount("items")],
      ["العملاء", cacheCount("customers")],
      ["الطلبات", cacheCount("orders")],
      ["الفواتير", cacheCount("invoices")],
      ["السداد", cacheCount("payments")],
      ["آخر فحص", new Date().toLocaleString("ar-YE")]
    ];
    openModal("معلومات التطبيق", `<div class="hesabi-info-grid">${info.map(function(x){ return `<div class="hesabi-info-cell"><span>${safeEsc(x[0])}</span><b>${safeEsc(x[1])}</b></div>`; }).join("")}</div><div class="hesabi-top-actions"><button class="btn secondary" id="hesabiInfoCopy" type="button">نسخ المعلومات</button><button class="btn light" id="hesabiInfoRuntime" type="button">فحص سريع</button></div><div class="hesabi-support-status" id="hesabiInfoStatus">جاهز.</div>`);
    const copy = byId("hesabiInfoCopy");
    const runtime = byId("hesabiInfoRuntime");
    const status = byId("hesabiInfoStatus");
    if(copy) copy.onclick = async function(){
      const text = info.map(function(x){ return x[0] + ": " + x[1]; }).join("\n");
      try { await navigator.clipboard.writeText(text); if(status) status.textContent = "تم نسخ معلومات التطبيق."; } catch (_) { if(status) status.textContent = "تعذر النسخ من هذا الجهاز."; }
    };
    if(runtime) runtime.onclick = function(){
      try {
        const result = typeof window.hesabiFullRuntimeSmokeSelfCheck === "function" ? window.hesabiFullRuntimeSmokeSelfCheck() : null;
        if(status) status.textContent = result ? (result.ok ? "الفحص السريع ناجح." : "الفحص السريع فيه ملاحظات. راجع Console.") : "فحص runtime غير متوفر.";
      } catch (error) { if(status) status.textContent = "تعذر الفحص: " + safeString(error && error.message || error); }
    };
  }

  function installWrappers(){
    if(window.__hesabiTopOverflowMenuWrapped) return true;
    const wrapped = {};
    if(typeof render === "function"){
      const baseRender = render;
      render = function(){ const out = baseRender.apply(this, arguments); setTimeout(ensureDom,0); setTimeout(ensureDom,120); return out; };
      wrapped.render = true;
    }
    window.__hesabiTopOverflowMenuWrapped = wrapped;
    return true;
  }
  function installObserver(){
    if(window.__hesabiTopOverflowMenuObserver) return true;
    try {
      const obs = new MutationObserver(function(){ ensureDom(); });
      obs.observe(document.documentElement, { childList:true, subtree:true });
      window.__hesabiTopOverflowMenuObserver = obs;
      return true;
    } catch (_) { return false; }
  }

  function selfCheck(){
    ensureStyle(); ensureDom();
    const btn = byId("hesabiTopOverflowButton");
    const menu = byId("hesabiTopOverflowMenu");
    const items = qsa("[data-top-menu-action]", menu);
    const actions = items.map(function(x){ return x.getAttribute("data-top-menu-action"); });
    const hasAll = ["update","contact","report","info"].every(function(a){ return actions.indexOf(a) >= 0; });
    const result = { ok: !!btn && !!menu && hasAll, version: VERSION, build: BUILD_CODE, button: !!btn, menu: !!menu, actions, supportEmail: SUPPORT_EMAIL, localReports: localReports().length, checkedAt: new Date().toISOString() };
    window.__hesabiTopOverflowMenuActions = result;
    return result;
  }

  ensureStyle();
  installWrappers();
  installObserver();
  setTimeout(ensureDom,0);
  setTimeout(ensureDom,250);
  setTimeout(ensureDom,1000);

  window.hesabiTopOverflowMenuActions = { version: VERSION, build: BUILD_CODE, ensureDom, openUpdateModal, openContactModal, openReportModal, openInfoModal, selfCheck };
  window.hesabiTopOverflowMenuActionsSelfCheck = selfCheck;
})();
