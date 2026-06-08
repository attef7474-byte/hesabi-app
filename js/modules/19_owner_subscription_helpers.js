/* Hesabi 1.0.80 - Owner / subscription settings stabilization.
   Safe owner-console rendering helpers only. Existing owner write actions are not changed. */
(function(){
  "use strict";
  const VERSION = "1.0.80";
  const BUILD_CODE = 80;
  const VALID_TABS = ["metrics", "users", "shops", "message", "control", "subs", "logs"];
  function escSafe(value){ try { return typeof esc === "function" ? esc(value) : String(value == null ? "" : value).replace(/[&<>"']/g, function(ch){ return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch]; }); } catch (_) { return ""; } }
  function dtSafe(value){ try { return typeof dt === "function" ? dt(value) : String(value || ""); } catch (_) { return String(value || ""); } }
  function normalizeTab(tab){ return VALID_TABS.indexOf(tab) >= 0 ? tab : "metrics"; }
  function statusText(status){ return ({active:"نشط", trial:"تجريبي", warning:"إنذار", suspended:"موقوف", expired:"منتهي"}[status] || status || "غير محدد"); }
  function normalizeShop(s){ s=s||{}; return { id:String(s.id||s.shopId||""), shopId:String(s.shopId||s.id||""), name:String(s.name||s.shopName||s.shopId||s.id||"متجر"), phone:String(s.phone||""), subscriptionStatus:String(s.subscriptionStatus||"trial"), subscriptionDueDate:String(s.subscriptionDueDate||""), ownerWarning:String(s.ownerWarning||""), raw:s }; }
  function normalizeUser(u){ u=u||{}; return { id:String(u.id||u.uid||""), email:String(u.email||u.authEmail||""), phone:String(u.phone||u.authPhoneNumber||""), role:String(u.role||u.lastRole||"-"), lastSeenMs:Number(u.lastSeenMs||u.updatedMs||u.createdMs||0), raw:u }; }
  function summary(shops, users){
    const s = Array.isArray(shops)?shops.map(normalizeShop):[];
    const u = Array.isArray(users)?users.map(normalizeUser):[];
    return { shops:s.length, users:u.length, suspended:s.filter(function(x){return x.subscriptionStatus==="suspended";}).length, warning:s.filter(function(x){return x.subscriptionStatus==="warning" || x.ownerWarning;}).length, expired:s.filter(function(x){return x.subscriptionStatus==="expired";}).length };
  }
  function tabs(){ return [["metrics","📊","المؤشرات"],["users","👤","المستخدمون"],["shops","🏪","المتاجر"],["message","💬","مراسلة"],["control","⛔","التحكم"],["subs","💳","الاشتراكات"],["logs","🗂️","السجل"]]; }
  function shopOptions(shops){ return (Array.isArray(shops)?shops.map(normalizeShop):[]).map(function(s){ return `<option value="${escSafe(s.shopId || s.id)}">${escSafe(s.name || s.shopId || s.id)}</option>`; }).join(""); }
  function statusSelect(){ return `<select id="ownerSubStatus"><option value="active">نشط</option><option value="trial">تجريبي</option><option value="warning">إنذار</option><option value="expired">منتهي</option><option value="suspended">موقوف</option></select>`; }
  function renderContent(tab, shops, users){
    const cleanTab = normalizeTab(tab);
    const normalizedShops = Array.isArray(shops)?shops.map(normalizeShop):[];
    const normalizedUsers = Array.isArray(users)?users.map(normalizeUser):[];
    const stats = summary(normalizedShops, normalizedUsers);
    const options = shopOptions(normalizedShops);
    if(cleanTab === "metrics") return `<div class="card owner-console-head"><h2>لوحة مالك التطبيق</h2><p class="muted">الاشتراك على المتجر فقط، ولا يوجد اشتراك على العميل.</p></div><div class="grid"><div class="owner-metric"><span>المستخدمون</span><b>${stats.users}</b></div><div class="owner-metric"><span>المتاجر</span><b>${stats.shops}</b></div><div class="owner-metric owner-suspended"><span>موقوفة</span><b>${stats.suspended}</b></div><div class="owner-metric owner-warn"><span>إنذارات</span><b>${stats.warning}</b></div></div><div class="card"><button class="btn secondary" id="ownerReload">تحديث بيانات المالك</button></div>`;
    if(cleanTab === "users") return `<div class="card"><h2>المستخدمون</h2><div class="table-wrap"><table class="compact-table"><thead><tr><th>الحساب</th><th>الدور</th><th>آخر دخول</th></tr></thead><tbody>${normalizedUsers.map(function(u){ return `<tr><td class="name">${escSafe(u.email || u.phone || u.id)}</td><td>${escSafe(u.role)}</td><td>${dtSafe(u.lastSeenMs)}</td></tr>`; }).join("") || '<tr><td colspan="3">لا توجد بيانات</td></tr>'}</tbody></table></div></div>`;
    if(cleanTab === "shops") return `<div class="card"><h2>المتاجر</h2><div class="table-wrap"><table class="compact-table"><thead><tr><th>المتجر</th><th>الهاتف</th><th>الاشتراك</th><th>الاستحقاق</th></tr></thead><tbody>${normalizedShops.map(function(s){ return `<tr><td class="name">${escSafe(s.name)}</td><td>${escSafe(s.phone)}</td><td>${escSafe(statusText(s.subscriptionStatus))}</td><td>${escSafe(s.subscriptionDueDate)}</td></tr>`; }).join("") || '<tr><td colspan="4">اضغط تحديث بيانات المالك</td></tr>'}</tbody></table></div></div>`;
    if(cleanTab === "message") return `<div class="card"><h2>مراسلة متجر</h2><div class="field"><label>المتجر</label><select id="ownerMsgShop"><option value="">اختر متجر</option>${options}</select></div><div class="field"><label>نص الرسالة</label><textarea id="ownerMsgText" placeholder="اكتب رسالة للمتجر"></textarea></div><button class="btn ok" id="ownerSendMsg">إرسال</button></div>`;
    if(cleanTab === "control") return `<div class="card"><h2>التحكم بالمتاجر</h2><div class="field"><label>المتجر</label><select id="ownerCtrlShop"><option value="">اختر متجر</option>${options}</select></div><div class="field"><label>سبب/رسالة</label><textarea id="ownerCtrlNote" placeholder="سبب الإنذار أو الإيقاف"></textarea></div><div class="owner-actions-grid"><button class="btn warn" id="ownerWarnShop">إنذار</button><button class="btn danger" id="ownerSuspendShop">إيقاف</button><button class="btn ok" id="ownerActivateShop">تفعيل</button><button class="btn secondary" id="ownerExpireShop">اشتراك منتهي</button></div></div>`;
    if(cleanTab === "subs") return `<div class="card"><h2>الاشتراكات</h2><div class="field"><label>المتجر</label><select id="ownerSubShop"><option value="">اختر متجر</option>${options}</select></div><div class="grid"><div class="field"><label>الخطة</label><input id="ownerSubPlan" value="monthly"></div><div class="field"><label>المبلغ</label><input id="ownerSubAmount" type="number" min="0" value="0"></div><div class="field"><label>تاريخ الاستحقاق</label><input id="ownerSubDue" type="date"></div><div class="field"><label>الحالة</label>${statusSelect()}</div></div><div class="field"><label>ملاحظات</label><textarea id="ownerSubNote"></textarea></div><button class="btn ok" id="ownerSaveSub">حفظ الاشتراك</button></div>`;
    return `<div class="card"><h2>سجل المالك</h2><p class="muted">يتم حفظ إجراءات المالك داخل ownerLogs لكل متجر عند تنفيذ التحكم أو الاشتراك.</p></div>`;
  }
  function renderPage(ctx){
    ctx = ctx || {};
    const tab = normalizeTab(ctx.tab);
    const bar = typeof pageTabsBar === "function" ? pageTabsBar("owner", tab, tabs()) : "";
    return { html: bar + renderContent(tab, ctx.shops || [], ctx.users || []), tab, summary: summary(ctx.shops || [], ctx.users || []) };
  }
  function bindActions(actions){
    actions = actions || {};
    try { if(typeof actions.bindPageTabs === "function") actions.bindPageTabs("owner", actions.renderOwnerConsole); } catch (_) {}
    const byId = function(id){ try { return document.getElementById(id); } catch (_) { return null; } };
    if(byId("ownerReload") && typeof actions.reload === "function") byId("ownerReload").onclick = actions.reload;
    if(byId("ownerSendMsg") && typeof actions.ownerSendMessage === "function") byId("ownerSendMsg").onclick = actions.ownerSendMessage;
    ["ownerWarnShop","ownerSuspendShop","ownerActivateShop","ownerExpireShop"].forEach(function(id){ if(byId(id) && typeof actions.ownerSetShopStatus === "function") byId(id).onclick = function(){ actions.ownerSetShopStatus(id); }; });
    if(byId("ownerSaveSub") && typeof actions.ownerSaveSubscription === "function") byId("ownerSaveSub").onclick = actions.ownerSaveSubscription;
  }
  function selfCheck(){
    const missing = ["normalizeShop","normalizeUser","summary","renderPage","bindActions"].filter(function(name){ return typeof api[name] !== "function"; });
    const s = summary([{subscriptionStatus:"suspended"},{subscriptionStatus:"warning"}], [{role:"trader"}]);
    const sampleOk = s.shops === 2 && s.users === 1 && s.suspended === 1 && s.warning === 1;
    return { ok: missing.length === 0 && sampleOk, version: VERSION, build: BUILD_CODE, missing, sampleOk, sampleSummary:s };
  }
  const api = { version: VERSION, build: BUILD_CODE, normalizeTab, statusText, normalizeShop, normalizeUser, summary, tabs, shopOptions, renderContent, renderPage, bindActions };
  window.hesabiOwnerSubscriptionHelpers = api;
  window.hesabiOwnerSubscriptionHelpersSelfCheck = selfCheck;
})();
