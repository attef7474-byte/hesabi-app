(function(){
  "use strict";

  function safeMsg(text, type){
    try {
      if (typeof msg === "function") msg(text, type || "info");
      else console.log("[Hesabi]", type || "info", text);
    } catch (_) {
      console.log("[Hesabi]", type || "info", text);
    }
  }

  async function safeLogout(){
    try {
      if (typeof unsubAll === "function") unsubAll();
    } catch (_) {}

    try {
      localStorage.removeItem("hesabi_active_shop_id");
      localStorage.removeItem("hesabi_active_customer_id");
      localStorage.removeItem("hesabi_selected_shop_id");
      sessionStorage.clear();
    } catch (_) {}

    try {
      if (typeof auth !== "undefined" && auth && typeof auth.signOut === "function") {
        await auth.signOut();
      }
    } catch (e) {
      console.warn("logout signOut warning", e);
    }

    try {
      if (typeof show === "function") show("login");
      else location.reload();
    } catch (_) {
      location.reload();
    }
  }

  async function safeClearWebCache(){
    try {
      if (window.HesabiAndroid && typeof window.HesabiAndroid.clearWebCacheForUpdate === "function") {
        window.HesabiAndroid.clearWebCacheForUpdate();
      }
    } catch (e) {
      console.warn("Native cache clear warning", e);
    }

    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (e) {
      console.warn("Cache API clear warning", e);
    }

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
    } catch (e) {
      console.warn("Service worker clear warning", e);
    }

    safeMsg("تم تنظيف الكاش. سيتم إعادة تحميل التطبيق.", "success");

    setTimeout(function(){
      try {
        location.href = location.pathname + "?v=" + Date.now();
      } catch (_) {
        location.reload();
      }
    }, 500);
  }

  function safeRenderReports(){
    const salesTotal = (cache.invoices || []).reduce(function(sum, inv){
      return sum + Number(inv.total || inv.amount || 0);
    }, 0);

    const debtTotal = (cache.customers || []).reduce(function(sum, c){
      return sum + Number(c.balance || c.debt || 0);
    }, 0);

    const lowStock = (cache.items || []).filter(function(item){
      return Number(item.qty || item.stock || 0) <= Number(item.minQty || 0);
    }).length;

    return `
      <section class="page-head">
        <h2>التقارير</h2>
        <p>ملخص سريع لحالة المبيعات والديون والمخزون.</p>
      </section>

      <div class="grid cards">
        <div class="card">
          <b>إجمالي الفواتير</b>
          <h3>${money ? money(salesTotal) : salesTotal}</h3>
        </div>
        <div class="card">
          <b>إجمالي الديون</b>
          <h3>${money ? money(debtTotal) : debtTotal}</h3>
        </div>
        <div class="card">
          <b>أصناف منخفضة المخزون</b>
          <h3>${lowStock}</h3>
        </div>
      </div>

      <div class="card">
        <h3>التقارير التفصيلية</h3>
        <p>هذه الصفحة تعرض ملخصًا آمنًا، ويمكن تطوير تقارير تفصيلية لاحقًا بدون كسر الصفحات.</p>
      </div>
    `;
  }

  if (typeof window.logout !== "function") {
    window.logout = safeLogout;
  }

  if (typeof window.clearWebCache !== "function") {
    window.clearWebCache = safeClearWebCache;
  }

  try {
    if (typeof renderReports !== "function") {
      renderReports = safeRenderReports;
    }
    window.renderReports = renderReports;
  } catch (_) {
    if (typeof window.renderReports !== "function") {
      window.renderReports = safeRenderReports;
    }
  }

  window.hesabiRuntimeMissingFunctionsFix = function(){
    const required = [
      "logout",
      "clearWebCache",
      "renderReports",
      "show",
      "renderSettings",
      "renderItems",
      "renderCustomerItemsReadonly",
      "sendCustomerOrder"
    ];

    const missing = required.filter(function(name){
      return typeof window[name] !== "function";
    });

    return {
      ok: missing.length === 0,
      missing,
      checkedAt: new Date().toISOString()
    };
  };

  console.log("[Hesabi] runtime missing functions safety fix loaded", window.hesabiRuntimeMissingFunctionsFix());
})();
