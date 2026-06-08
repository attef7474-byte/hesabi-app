# Statements Page Stabilization 1.0.76

## الهدف
تثبيت صفحة كشف الحساب فقط، مع إبقاء منطق إنشاء الفواتير واعتماد السداد وعمليات Firestore كما هي بدون تغيير.

## الملفات المضافة
- `js/modules/15_statements_helpers.js`

## الملفات المعدلة
- `index.html`
- `android-update.json`
- `app/build.gradle`
- `js/index_script.js`
- `js/modules/00_core_update_auth.js`
- `js/modules/02_runtime_smoke.js`
- `js/modules/50_auth_order_approval.js`
- `js/modules/manifest.json`

## ما تم تثبيته
- تطبيع حركات كشف الحساب بطريقة آمنة.
- تصنيف الحركات إلى مدين / دائن بدون تعديل البيانات.
- حساب ملخص كشف الحساب: المدين، الدائن، الرصيد، وعدد الحركات.
- فلترة كشف الحساب حسب العميل عند التاجر.
- عرض تبويبات كشف الحساب مع fallback آمن إذا فشلت الوحدة الجديدة.
- إضافة فحص ذاتي: `window.hesabiStatementsHelpersSelfCheck()`.
- ربط الفحص داخل `window.hesabiFullRuntimeSmokeSelfCheck()`.

## ما لم يتم تغييره
- لم يتم تعديل Firestore rules.
- لم يتم تعديل إنشاء الفواتير عند اعتماد الطلبات.
- لم يتم تعديل إرسال أو قبول أو رفض السداد.
- لم يتم تعديل كشوف العملاء في قاعدة البيانات.

## الفحوصات المنفذة
- `node --check js/index_script.js`
- `node --check js/startup-recovery.js`
- `node --check js/modules/15_statements_helpers.js`
- فحص JSON للـ `manifest.json` و `android-update.json`.
- فحص runtime مجمع حسب ترتيب `manifest.json`.
- فحص ذاتي لوحدة كشف الحساب بإرجاع `ok: true`.

## ملاحظة
لم يتم اختبار APK على هاتف فعلي، لذلك هذه مرحلة آمنة جزئية وليست إعلانًا نهائيًا 100%.
