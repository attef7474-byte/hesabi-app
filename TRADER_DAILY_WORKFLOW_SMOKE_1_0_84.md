# 1.0.84 - Trader Daily Workflow Smoke Fixes

مرحلة فحص دخان آمن لسير عمل التاجر اليومي.

## ما تم
- إضافة `js/modules/23_trader_workflow_smoke.js`.
- إضافة `window.hesabiTraderWorkflowSmokeSelfCheck()`.
- فحص وجود دوال الطلبات والعملاء والفواتير والسداد والكشوفات والمرتجعات والجداول.
- حساب مؤشرات قراءة فقط من `cache`.

## ما لم يتم
- لم يتم اعتماد أو رفض أي طلب.
- لم يتم إنشاء فاتورة أو تعديل مخزون أو كشف حساب.

## الفحص
```javascript
window.hesabiTraderWorkflowSmokeSelfCheck()
window.hesabiTraderWorkflowSmoke.runSmoke()
```
