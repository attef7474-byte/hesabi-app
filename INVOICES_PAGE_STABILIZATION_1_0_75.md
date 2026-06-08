# 1.0.75 - Invoices Page Stabilization

## الهدف
تثبيت صفحة الفواتير بطريقة صغيرة وآمنة بدون تغيير منطق Firestore، وبدون تغيير اعتماد الطلبات أو إنشاء الفواتير أو السداد.

## ما تم تغييره
- إضافة ملف جديد: `js/modules/14_invoices_helpers.js`.
- إضافة الكائن: `window.hesabiInvoicesHelpers`.
- إضافة الفحص: `window.hesabiInvoicesHelpersSelfCheck()`.
- ربط `renderInvoices` بمساعدات الفواتير الجديدة مع fallback آمن عند حدوث خطأ.
- ربط فحص الفواتير داخل `window.hesabiFullRuntimeSmokeSelfCheck()` و `window.hesabiRuntimeSmokeSelfCheck()`.
- تحديث `js/index_script.js` و `js/modules/manifest.json` لإضافة الوحدة الجديدة.
- رفع الإصدار إلى `1.0.75` و `versionCode 75`.

## نطاق التثبيت
- تطبيع بيانات الفواتير قبل العرض.
- فلترة الفواتير حسب العميل ونوع الدفع.
- حساب ملخص الفواتير: العدد، الإجمالي، إجمالي الآجل، إجمالي الكاش.
- عرض تفاصيل الأصناف داخل الفاتورة بطريقة محمية.
- ربط زر مشاركة الفاتورة بدون تغيير الدالة الأصلية `shareInvoiceText`.

## ما لم يتم تغييره
- لم يتم تغيير Firestore.
- لم يتم تغيير إنشاء الفاتورة عند اعتماد الطلب.
- لم يتم تغيير `approveOrder`.
- لم يتم تغيير `sendPayment` أو اعتماد/رفض السداد.
- لم يتم تغيير كشف الحساب.

## الفحوصات المنفذة
- `node --check js/index_script.js`
- `node --check js/modules/14_invoices_helpers.js`
- `node --check js/modules/02_runtime_smoke.js`
- فحص JSON للـ `manifest.json` و `android-update.json`.
- فحص ذاتي لوحدة الفواتير بإرجاع `ok: true`.

## ملاحظة
لم يتم اختبار APK على هاتف فعلي. لذلك هذه مرحلة آمنة جزئية وليست إعلانًا نهائيًا 100%.
