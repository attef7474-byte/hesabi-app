# 1.0.99 - Orders + Approval Page Final Sweep

## النطاق
تثبيت صفحة الطلبات واعتماد الطلبات فقط.

## ما تم
- إضافة `js/modules/38_orders_approval_page_sweep.js`.
- تثبيت التنقل بين تبويبات الطلبات.
- تثبيت أزرار اعتماد ورفض الطلب للتاجر.
- تثبيت أزرار موافقة ورفض العميل عند وجود طلب بانتظار العميل.
- تثبيت أزرار تعديل وإلغاء طلب العميل.
- تثبيت زر تفاصيل الطلب داخل الجدول.
- تحسين جدول الطلبات على الهاتف ومنع تمدد الصفحة أفقيًا.
- ربط الفحص داخل `hesabiFullRuntimeSmokeSelfCheck`.

## ما لم يتغير
- لم يتم تغيير منطق Firestore.
- لم يتم تغيير إنشاء الفواتير.
- لم يتم تغيير تحديث المخزون أو كشف الحساب.
- لم يتم تغيير السداد أو المرتجعات.

## الفحص
- `node --check js/index_script.js`
- `node --check js/modules/38_orders_approval_page_sweep.js`
- فحص JSON لـ `manifest.json` و `android-update.json`
- فحص runtime مجمع حسب ترتيب loader

## فحص Console
```js
window.hesabiOrdersApprovalPageSweepSelfCheck()
window.hesabiTraderWorkflowSmokeSelfCheck()
window.hesabiFullRuntimeSmokeSelfCheck()
window.hesabiRuntimeSmokeSelfCheck()
```
