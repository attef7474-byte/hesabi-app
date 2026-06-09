/* Hesabi 1.0.113 - Header, home and navigation cleanup.
   Scope: UI cleanup only.
   - Move the top three-dot menu to the beginning beside the app icon/title and rebind it.
   - Remove repeated page toolbars: تحديث / تصدير CSV / فحص.
   - Remove home summary metric cards; keep home icons only.
   - Remove the bottom navigation Search button.
   No Firestore writes, no orders/payments/invoices/items/stock/account logic changed. */
(function(){
  "use strict";

  const VERSION = "1.0.113";
  const BUILD_CODE = 113;
  const SUPPORT_EMAIL = "attef7474@gmail.com";

  function byId(id){ try { return document.getElementById(id); } catch(_) { return null; } }
  function qsa(sel, root){ try { return Array.from((root || document).querySelectorAll(sel)); } catch(_) { return []; } }
  function safeString(v){ try { return v == null ? "" : String(v); } catch(_) { return ""; } }
  function textOf(el){ try { return safeString(el && el.textContent).replace(/\s+/g," ").trim(); } catch(_) { return ""; } }
  function esc(v){ return safeString(v).replace(/[&<>"']/g, function(ch){ return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch] || ch; }); }
  function isHidden(el){
    try { return !!(el.hidden || getComputedStyle(el).display === "none" || getComputedStyle(el).visibility === "hidden"); }
    catch(_) { return false; }
  }
  function notify(text, type){
    try { if(typeof msg === "function") msg(text, type || "notice"); else console.log(text); } catch(_) {}
  }

  function ensureStyle(){
    if(byId("hesabiUiCleanup113Style")) return true;
    try {
      const style = document.createElement("style");
      style.id = "hesabiUiCleanup113Style";
      style.textContent = `
        /* header/menu placement */
        .top .title{direction:rtl!important;align-items:center!important;gap:8px!important;}
        .top .title .hesabi-brand-menu-wrap{display:inline-flex!important;direction:rtl!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;min-width:0!important;position:relative!important;order:5!important;}
        .top .title .hesabi-brand-menu-wrap h1{order:2!important;display:inline-flex!important;align-items:center!important;gap:6px!important;margin:0!important;white-space:nowrap!important;}
        #hesabiTopOverflowButton{order:1!important;width:34px!important;height:34px!important;min-width:34px!important;border:1px solid var(--line,#dbe7ee)!important;border-radius:14px!important;background:#fff!important;color:#0f172a!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:22px!important;font-weight:900!important;line-height:1!important;box-shadow:0 4px 12px rgba(15,23,42,.08)!important;cursor:pointer!important;padding:0!important;z-index:10065!important;}
        #hesabiTopOverflowButton:active{transform:scale(.97)!important;}
        #hesabiTopOverflowMenu{position:absolute!important;top:42px!important;right:0!important;left:auto!important;width:min(260px,calc(100vw - 26px))!important;background:#fff!important;border:1px solid var(--line,#dbe7ee)!important;border-radius:18px!important;box-shadow:0 18px 42px rgba(15,23,42,.18)!important;padding:8px!important;z-index:10070!important;display:grid!important;gap:5px!important;}
        #hesabiTopOverflowMenu.hidden{display:none!important;}
        #hesabiTopOverflowMenu button{border:0!important;border-radius:14px!important;background:#f8fafc!important;color:#0f172a!important;padding:10px 11px!important;display:grid!important;grid-template-columns:auto 1fr!important;gap:8px!important;align-items:center!important;text-align:right!important;font-weight:900!important;cursor:pointer!important;width:100%!important;}
        #hesabiTopOverflowMenu .menu-icon{font-size:18px!important;line-height:1!important;}
        #hesabiTopOverflowMenu .menu-label{font-size:13px!important;line-height:1.25!important;}

        /* remove unwanted repeated sweep toolbars/search boxes */
        .customers-owner-search-box,
        .reports-policies-search-box,
        .audit-cache-final-search,
        #auditFinalToolbar,
        .stock-collections-search-box,
        .messages-notifications-search-box,
        .returns-schedules-search-box,
        .payments-statements-search-box,
        .settings-invoices-search-box,
        .catalog-cart-purchase-search-box,
        .orders-approval-search-box,
        [data-hesabi-ui-cleanup113="removed"]{display:none!important;}

        /* home icons only */
        #page_home .home-sweep-stats,
        #page_home .quick-summary-row,
        #page_home .home-sweep-stat,
        #page_home #homeSweepOpenSearch{display:none!important;}
        #page_home .card > .grid:first-of-type{display:none!important;}
        #page_home .card > h2,
        #page_home .home-sweep-head{margin-bottom:8px!important;}

        /* bottom search button removal marker */
        #navInner [data-hesabi-nav-search-hidden="1"]{display:none!important;}

        html,body,.app{max-width:100%!important;overflow-x:hidden!important;}
        section[id^="page_"],.card,.top,#nav,#navInner{max-width:100%!important;box-sizing:border-box!important;}
        section[id^="page_"]{overflow-x:hidden!important;}

        .hesabi113-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:10080;display:flex;align-items:center;justify-content:center;padding:14px;}
        .hesabi113-modal{width:min(560px,100%);max-height:86vh;overflow:auto;background:#fff;border:1px solid var(--line,#dbe7ee);border-radius:22px;box-shadow:0 22px 55px rgba(15,23,42,.28);padding:14px;text-align:right;}
        .hesabi113-modal-head{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:10px;}
        .hesabi113-modal-head h2{font-size:18px;margin:0;color:#0f172a;}
        .hesabi113-close{border:0;background:#f1f5f9;color:#0f172a;border-radius:12px;width:34px;height:34px;font-size:18px;font-weight:900;cursor:pointer;}
        .hesabi113-modal-body{display:grid;gap:10px;}
        .hesabi113-status{border:1px dashed #99f6e4;background:#f0fdfa;color:#115e59;border-radius:14px;padding:10px;font-size:13px;font-weight:800;white-space:pre-wrap;}
        .hesabi113-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;}
        .hesabi113-actions .btn{width:auto!important;flex:1 1 auto;min-height:38px;}
        .hesabi113-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .hesabi113-info-cell{border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:10px;}
        .hesabi113-info-cell span{display:block;font-size:11px;color:#64748b;margin-bottom:3px;}
        .hesabi113-info-cell b{font-size:13px;color:#0f172a;word-break:break-word;}
        @media(max-width:520px){
          #hesabiTopOverflowButton{width:32px!important;height:32px!important;min-width:32px!important;font-size:21px!important;}
          #hesabiTopOverflowMenu{top:40px!important;right:0!important;width:min(250px,calc(100vw - 18px))!important;}
          .hesabi113-info-grid{grid-template-columns:1fr;}
          .hesabi113-actions{display:grid;grid-template-columns:1fr;}
          .hesabi113-actions .btn{width:100%!important;}
          .title h1{font-size:18px!important;}
        }
      `;
      document.head.appendChild(style);
      return true;
    } catch(_) { return false; }
  }

  function closeMenu(){
    const menu = byId("hesabiTopOverflowMenu");
    const btn = byId("hesabiTopOverflowButton");
    if(menu) menu.classList.add("hidden");
    if(btn) btn.setAttribute("aria-expanded","false");
  }

  function toggleMenu(){
    const menu = byId("hesabiTopOverflowMenu");
    const btn = byId("hesabiTopOverflowButton");
    if(!menu) return;
    const willOpen = menu.classList.contains("hidden");
    menu.classList.toggle("hidden", !willOpen);
    if(btn) btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
  }

  function ensureHeaderMenu(){
    ensureStyle();
    const title = document.querySelector(".top .title");
    if(!title) return false;
    let wrap = title.querySelector(".hesabi-brand-menu-wrap");
    let h1 = title.querySelector("h1");
    if(!wrap){
      wrap = document.createElement("div");
      wrap.className = "hesabi-brand-menu-wrap";
      if(h1) {
        title.insertBefore(wrap, h1);
        wrap.appendChild(h1);
      } else {
        title.insertBefore(wrap, title.firstChild);
      }
    }
    if(h1 && h1.parentElement !== wrap) wrap.appendChild(h1);

    let btn = byId("hesabiTopOverflowButton");
    if(!btn){
      btn = document.createElement("button");
      btn.id = "hesabiTopOverflowButton";
      btn.className = "hesabi-top-menu-btn";
      btn.type = "button";
      btn.textContent = "⋮";
    }
    btn.setAttribute("aria-label","قائمة التطبيق");
    btn.setAttribute("aria-haspopup","menu");
    btn.setAttribute("aria-expanded","false");
    btn.className = "hesabi-top-menu-btn";
    if(btn.parentElement !== wrap) wrap.insertBefore(btn, wrap.firstChild);
    else wrap.insertBefore(btn, wrap.firstChild);

    let menu = byId("hesabiTopOverflowMenu");
    if(!menu){
      menu = document.createElement("div");
      menu.id = "hesabiTopOverflowMenu";
      menu.className = "hesabi-top-overflow-menu hidden";
      menu.setAttribute("role","menu");
    }
    menu.innerHTML = [
      ["update","🔄","تحديث التطبيق"],
      ["contact","☎️","تواصل معنا"],
      ["report","⚠️","إبلاغ وشكاوي"],
      ["info","ℹ️","معلومات التطبيق"]
    ].map(function(item){
      return `<button type="button" role="menuitem" data-top-menu-action="${item[0]}"><span class="menu-icon">${item[1]}</span><span class="menu-label">${item[2]}</span></button>`;
    }).join("");
    if(menu.parentElement !== wrap) wrap.appendChild(menu);

    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.onclick = function(ev){ ev.preventDefault(); ev.stopPropagation(); toggleMenu(); return false; };

    qsa("[data-top-menu-action]", menu).forEach(function(item){
      item.onclick = function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        const action = item.getAttribute("data-top-menu-action") || "";
        closeMenu();
        if(action === "update") openUpdateModal();
        else if(action === "contact") openContactModal();
        else if(action === "report") openReportModal();
        else if(action === "info") openInfoModal();
        return false;
      };
    });

    if(!document.__hesabiUiCleanup113TopMenuCloseBound){
      document.__hesabiUiCleanup113TopMenuCloseBound = true;
      document.addEventListener("click", function(ev){
        const t = ev.target;
        if(t && t.closest && t.closest("#hesabiTopOverflowButton,#hesabiTopOverflowMenu,.hesabi113-modal")) return;
        closeMenu();
      }, false);
      document.addEventListener("keydown", function(ev){ if(ev.key === "Escape") { closeMenu(); closeModal(); } }, false);
    }
    return true;
  }

  function closeModal(){
    const back = byId("hesabi113ModalBackdrop");
    if(back) back.remove();
  }

  function openModal(title, bodyHtml){
    closeModal();
    const back = document.createElement("div");
    back.id = "hesabi113ModalBackdrop";
    back.className = "hesabi113-modal-backdrop";
    back.innerHTML = `<div class="hesabi113-modal" role="dialog" aria-modal="true"><div class="hesabi113-modal-head"><h2>${esc(title)}</h2><button class="hesabi113-close" id="hesabi113ModalClose" type="button" aria-label="إغلاق">×</button></div><div class="hesabi113-modal-body">${bodyHtml}</div></div>`;
    document.body.appendChild(back);
    const x = byId("hesabi113ModalClose");
    if(x) x.onclick = closeModal;
    back.onclick = function(ev){ if(ev.target === back) closeModal(); };
    return back;
  }

  function updateStatus(text){ const el = byId("hesabi113UpdateStatus"); if(el) el.textContent = text; }

  function openUpdateModal(){
    openModal("تحديث التطبيق", `<div class="hesabi113-status" id="hesabi113UpdateStatus">اختر العملية المطلوبة.</div><div class="hesabi113-actions"><button class="btn ok" id="hesabi113RefreshUi" type="button">تحديث الواجهات</button><button class="btn secondary" id="hesabi113DownloadApk" type="button">تحديث APK</button><button class="btn light" id="hesabi113CheckVersion" type="button">فحص الإصدار</button></div>`);
    const refresh = byId("hesabi113RefreshUi");
    const apk = byId("hesabi113DownloadApk");
    const check = byId("hesabi113CheckVersion");
    if(refresh) refresh.onclick = async function(){
      try {
        updateStatus("جاري تنظيف الكاش وتحديث الواجهات...");
        if(typeof refreshWebUiNow === "function") await refreshWebUiNow();
        updateStatus("تم تجهيز التحديث. سيتم إعادة تحميل الواجهة الآن.");
        setTimeout(function(){ try { location.replace(location.pathname + "?v=" + Date.now()); } catch(_) { location.reload(); } }, 450);
      } catch(e) { updateStatus("تعذر تحديث الواجهات: " + safeString(e && e.message || e)); }
    };
    if(apk) apk.onclick = async function(){
      try {
        updateStatus("جاري فتح تحديث APK...");
        if(typeof downloadApkUpdate === "function") await downloadApkUpdate();
        else updateStatus("دالة تحديث APK غير متاحة في هذه النسخة.");
      } catch(e) { updateStatus("تعذر فتح تحديث APK: " + safeString(e && e.message || e)); }
    };
    if(check) check.onclick = async function(){
      try {
        updateStatus("جاري فحص الإصدار...");
        if(typeof checkApkUpdateOnly === "function") await checkApkUpdateOnly(true);
        updateStatus("تم تنفيذ فحص الإصدار.");
      } catch(e) { updateStatus("تعذر فحص الإصدار: " + safeString(e && e.message || e)); }
    };
  }

  function mailtoUrl(subject, body){
    return "mailto:" + encodeURIComponent(SUPPORT_EMAIL) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  function openContactModal(){
    openModal("تواصل معنا", `<div class="hesabi113-status">اكتب رسالتك ثم انسخها أو افتح البريد.</div><div class="field"><label>الرسالة</label><textarea id="hesabi113ContactText" placeholder="اكتب رسالتك هنا"></textarea></div><div class="hesabi113-actions"><button class="btn ok" id="hesabi113CopyContact">نسخ</button><button class="btn secondary" id="hesabi113MailContact">فتح البريد</button></div>`);
    const txt = byId("hesabi113ContactText");
    const copy = byId("hesabi113CopyContact");
    const mail = byId("hesabi113MailContact");
    if(copy) copy.onclick = async function(){
      const body = txt ? txt.value : "";
      try { await navigator.clipboard.writeText(body); notify("تم نسخ الرسالة.", "success"); } catch(_) { notify("تعذر النسخ من هذا الجهاز.", "error"); }
    };
    if(mail) mail.onclick = function(){
      const body = txt ? txt.value : "";
      location.href = mailtoUrl("تواصل من تطبيق حسابي التجاري", body);
    };
  }

  function openReportModal(){
    openModal("إبلاغ وشكاوي", `<div class="hesabi113-status">اكتب البلاغ أو الشكوى ثم انسخها أو افتح البريد.</div><div class="field"><label>نوع البلاغ</label><select id="hesabi113ReportType"><option>مشكلة في التطبيق</option><option>شكوى</option><option>اقتراح</option></select></div><div class="field"><label>التفاصيل</label><textarea id="hesabi113ReportText" placeholder="اكتب التفاصيل هنا"></textarea></div><div class="hesabi113-actions"><button class="btn ok" id="hesabi113CopyReport">نسخ</button><button class="btn secondary" id="hesabi113MailReport">فتح البريد</button></div>`);
    const type = byId("hesabi113ReportType");
    const txt = byId("hesabi113ReportText");
    const body = function(){ return "النوع: " + (type ? type.value : "-") + "\n\n" + (txt ? txt.value : ""); };
    const copy = byId("hesabi113CopyReport");
    const mail = byId("hesabi113MailReport");
    if(copy) copy.onclick = async function(){
      try { await navigator.clipboard.writeText(body()); notify("تم نسخ البلاغ.", "success"); } catch(_) { notify("تعذر النسخ من هذا الجهاز.", "error"); }
    };
    if(mail) mail.onclick = function(){ location.href = mailtoUrl("بلاغ من تطبيق حسابي التجاري", body()); };
  }

  function openInfoModal(){
    let role = "", shop = "", apk = "", ui = "";
    try { role = typeof roleName === "function" ? roleName() : safeString(state && state.role); } catch(_) {}
    try { shop = safeString(state && state.shopId || "-"); } catch(_) {}
    try { apk = typeof nativeVersionLabel === "function" ? nativeVersionLabel() : "-"; } catch(_) {}
    try { ui = (typeof APP_VERSION !== "undefined" ? safeString(APP_VERSION) : VERSION) + " / build " + (typeof APP_BUILD_CODE !== "undefined" ? safeString(APP_BUILD_CODE) : BUILD_CODE); } catch(_) { ui = VERSION; }
    openModal("معلومات التطبيق", `<div class="hesabi113-info-grid"><div class="hesabi113-info-cell"><span>إصدار الواجهات</span><b>${esc(ui)}</b></div><div class="hesabi113-info-cell"><span>إصدار APK</span><b>${esc(apk)}</b></div><div class="hesabi113-info-cell"><span>الدور</span><b>${esc(role || "-")}</b></div><div class="hesabi113-info-cell"><span>المتجر</span><b>${esc(shop || "-")}</b></div></div><div class="hesabi113-actions"><button class="btn light" id="hesabi113CopyInfo">نسخ المعلومات</button><button class="btn secondary" id="hesabi113QuickCheck">فحص سريع</button></div>`);
    const copy = byId("hesabi113CopyInfo");
    const check = byId("hesabi113QuickCheck");
    if(copy) copy.onclick = async function(){
      const text = "حسابي التجاري\nواجهة: " + ui + "\nAPK: " + apk + "\nالدور: " + role + "\nالمتجر: " + shop;
      try { await navigator.clipboard.writeText(text); notify("تم نسخ معلومات التطبيق.", "success"); } catch(_) { notify("تعذر النسخ من هذا الجهاز.", "error"); }
    };
    if(check) check.onclick = function(){
      try {
        const r = selfCheck();
        notify(r.ok ? "الفحص سريع سليم." : "الفحص يحتاج مراجعة.", r.ok ? "success" : "warn");
      } catch(_) {}
    };
  }

  function markRemove(el, reason){
    if(!el) return false;
    try {
      el.setAttribute("data-hesabi-ui-cleanup113", "removed");
      el.setAttribute("hidden", "hidden");
      el.setAttribute("aria-hidden", "true");
      el.style.setProperty("display","none","important");
      if(el.parentNode) el.parentNode.removeChild(el);
      return true;
    } catch(_) {
      try { el.style.setProperty("display","none","important"); return true; } catch(__) {}
    }
    return false;
  }

  function isUnwantedToolbarCard(card){
    if(!card || isHidden(card)) return false;
    const txt = textOf(card);
    if(!txt || txt.length > 90) return false;
    const hasUpdate = /تحديث/.test(txt);
    const hasCsv = /CSV|سي\s*اس\s*في|تصدير/.test(txt);
    const hasCheck = /فحص/.test(txt);
    const hasButtons = qsa("button,.btn", card).length >= 2;
    const hasDataContent = qsa("table,input,select,textarea,h2,h3,.metric,.item,.quick-home-btn,.wa-thread", card).length > 0;
    return hasButtons && hasUpdate && hasCsv && hasCheck && !hasDataContent;
  }

  function removeToolbars(root){
    const base = root && root.querySelectorAll ? root : document;
    let removed = 0;
    qsa("#auditFinalToolbar,.audit-cache-final-toolbar", base).forEach(function(el){ if(markRemove(el,"toolbar-id")) removed++; });
    qsa("section[id^='page_'] .card", base).forEach(function(card){
      if(isUnwantedToolbarCard(card) && markRemove(card, "toolbar-text")) removed++;
    });
    return removed;
  }

  function removeLocalSearchCards(root){
    const base = root && root.querySelectorAll ? root : document;
    let removed = 0;
    qsa(".customers-owner-search-box,.reports-policies-search-box,.audit-cache-final-search,.stock-collections-search-box,.messages-notifications-search-box,.returns-schedules-search-box,.payments-statements-search-box,.settings-invoices-search-box,.catalog-cart-purchase-search-box,.orders-approval-search-box", base).forEach(function(el){
      if(markRemove(el, "local-search-class")) removed++;
    });
    qsa('input[placeholder*="للبحث داخل الصفحة"],input[id$="SweepSearch"],input[id$="FinalSearch"]', base).forEach(function(input){
      const card = input.closest ? input.closest(".card,section,div") : null;
      if(card && markRemove(card, "local-search-input")) removed++;
    });
    return removed;
  }

  function cleanupHome(){
    const root = byId("page_home");
    if(!root) return 0;
    let removed = 0;
    qsa(".home-sweep-stats,.quick-summary-row,.home-sweep-stat,#homeSweepOpenSearch", root).forEach(function(el){
      if(markRemove(el, "home-summary")) removed++;
    });
    qsa(".metric", root).forEach(function(el){
      if(el.closest && el.closest(".quick-home-grid")) return;
      if(markRemove(el, "home-metric")) removed++;
    });
    qsa(".grid", root).forEach(function(grid){
      if(qsa(".metric", grid).length || /الأصناف|العملاء|طلبات|سدادات|الرصيد/.test(textOf(grid))) {
        if(markRemove(grid, "home-grid-summary")) removed++;
      }
    });
    return removed;
  }

  function removeBottomSearchNav(){
    const nav = byId("navInner") || byId("nav");
    if(!nav) return 0;
    let removed = 0;
    qsa(".tab,button,a,[data-page],[data-nav-page]", nav).forEach(function(el){
      const txt = textOf(el);
      const target = safeString(el.getAttribute && (el.getAttribute("data-page") || el.getAttribute("data-nav-page") || el.getAttribute("data-page-key") || el.getAttribute("data-home-page") || ""));
      const aria = safeString(el.getAttribute && (el.getAttribute("aria-label") || el.getAttribute("title") || ""));
      const isSearch = target === "search" || txt === "بحث" || aria === "بحث" || /بحث/.test(txt) && /🔎|🔍/.test(txt);
      if(isSearch){
        el.setAttribute("data-hesabi-nav-search-hidden", "1");
        if(markRemove(el, "bottom-search-nav")) removed++;
      }
    });
    return removed;
  }

  function cleanupAll(){
    ensureStyle();
    ensureHeaderMenu();
    const result = {
      toolbars: removeToolbars(document),
      localSearch: removeLocalSearchCards(document),
      home: cleanupHome(),
      bottomSearch: removeBottomSearchNav()
    };
    return result;
  }

  function installWrappers(){
    let wrapped = window.__hesabiUiCleanup113Wrapped || {};
    if(typeof render === "function" && !wrapped.render){
      const baseRender = render;
      render = function(){ const out = baseRender.apply(this, arguments); scheduleCleanup(); return out; };
      wrapped.render = true;
    }
    if(typeof show === "function" && !wrapped.show){
      const baseShow = show;
      show = function(){ const out = baseShow.apply(this, arguments); scheduleCleanup(); return out; };
      wrapped.show = true;
    }
    if(typeof renderHome === "function" && !wrapped.renderHome){
      const baseHome = renderHome;
      renderHome = function(){ const out = baseHome.apply(this, arguments); scheduleCleanup(); return out; };
      wrapped.renderHome = true;
    }
    if(typeof renderNav === "function" && !wrapped.renderNav){
      const baseNav = renderNav;
      renderNav = function(){ const out = baseNav.apply(this, arguments); scheduleCleanup(); return out; };
      wrapped.renderNav = true;
    }
    window.__hesabiUiCleanup113Wrapped = wrapped;
    return wrapped;
  }

  function scheduleCleanup(){
    setTimeout(cleanupAll, 0);
    setTimeout(cleanupAll, 80);
    setTimeout(cleanupAll, 250);
    setTimeout(cleanupAll, 900);
  }

  function installObserver(){
    if(window.__hesabiUiCleanup113Observer) return true;
    try {
      let pending = false;
      const obs = new MutationObserver(function(){
        if(pending) return;
        pending = true;
        setTimeout(function(){ pending = false; cleanupAll(); }, 35);
      });
      obs.observe(document.documentElement, { childList:true, subtree:true });
      window.__hesabiUiCleanup113Observer = obs;
      return true;
    } catch(_) { return false; }
  }

  function visibleUnwanted(){
    const out = [];
    try {
      qsa("section[id^='page_'] .card").forEach(function(card){
        if(isUnwantedToolbarCard(card)) out.push({ type:"toolbar", page:(card.closest("section")||{}).id||"", text:textOf(card) });
      });
      qsa(".customers-owner-search-box,.reports-policies-search-box,.audit-cache-final-search", document).forEach(function(el){
        if(!isHidden(el)) out.push({ type:"local-search", page:(el.closest("section")||{}).id||"", text:textOf(el).slice(0,90) });
      });
      const nav = byId("navInner") || byId("nav");
      if(nav){
        qsa(".tab,button,a", nav).forEach(function(el){ if(textOf(el)==="بحث" && !isHidden(el)) out.push({ type:"bottom-search", text:textOf(el) }); });
      }
      const home = byId("page_home");
      if(home && !home.classList.contains("hidden")){
        qsa(".metric,.home-sweep-stats,.quick-summary-row", home).forEach(function(el){ if(!isHidden(el)) out.push({ type:"home-summary", text:textOf(el).slice(0,80) }); });
      }
    } catch(_) {}
    return out;
  }

  function selfCheck(){
    ensureStyle();
    installWrappers();
    installObserver();
    const cleanup = cleanupAll();
    const visible = visibleUnwanted();
    const btn = byId("hesabiTopOverflowButton");
    const menu = byId("hesabiTopOverflowMenu");
    const ok = visible.length === 0 && !!btn && !!menu && typeof btn.onclick === "function";
    const result = { ok, version:VERSION, build:BUILD_CODE, cleanup, visibleCount:visible.length, visible:visible.slice(0,30), hasMenuButton:!!btn, hasMenu:!!menu, checkedAt:new Date().toISOString() };
    window.__hesabiUiCleanupHeaderHomeNav = result;
    try { localStorage.setItem("hesabi_ui_cleanup_header_home_nav_113", JSON.stringify({ ok, visibleCount:visible.length, at:result.checkedAt })); } catch(_) {}
    return result;
  }

  ensureStyle();
  installWrappers();
  installObserver();
  scheduleCleanup();

  window.hesabiUiCleanupHeaderHomeNav = { version:VERSION, build:BUILD_CODE, ensureStyle, ensureHeaderMenu, cleanupAll, selfCheck };
  window.hesabiUiCleanupHeaderHomeNavSelfCheck = selfCheck;
})();
