# DIALOGS_TOASTS_MODULE_1_0_64

## المرحلة
1.0.64 - Dialogs and Toasts Module Extraction

## ما تم تغييره
- إضافة ملف جديد: `js/modules/08_dialogs_toasts.js`.
- إنشاء كائن موحد: `window.hesabiDialogsToasts`.
- إضافة فحص: `window.hesabiDialogsToastsSelfCheck()`.
- توحيد دوال الرسائل والتنبيهات والحوار داخل الوحدة الجديدة:
  - `showAppDialog`
  - `hideAppDialog`
  - `closeAppDialog`
  - `msg`
  - `safeMsg`
  - `toast`
  - `confirmDialog`
- إبقاء أسماء الدوال القديمة في الملفات الحالية كـ wrappers للتوافق وعدم كسر الاستدعاءات القديمة.
- إضافة `js/modules/08_dialogs_toasts.js` إلى loader في `js/index_script.js` بعد `00_core_update_auth.js` وقبل باقي الملفات.
- تحديث `js/modules/manifest.json` إلى الإصدار 1.0.64.
- تحديث رقم الإصدار والكاش في:
  - `index.html`
  - `js/index_script.js`
  - `js/modules/00_core_update_auth.js`
  - `app/build.gradle`
  - `android-update.json`

## ما لم يتم تغييره
- لم يتم تعديل منطق الشراء أو الكتالوج.
- لم يتم تعديل منطق السداد أو الفواتير أو المخزون.
- لم يتم تعديل Firestore أو قواعد الصلاحيات.
- لم يتم تعديل Android Bridge.
- لم يتم حذف الدوال القديمة، بل تم ربطها بالوحدة الجديدة بأمان.

## الفحوصات المنفذة
- `node --check js/index_script.js`
- `node --check js/startup-recovery.js`
- `node --check js/modules/08_dialogs_toasts.js`
- فحص runtime مجمع من ملفات modules حسب ترتيب loader.
- فحص عدم وجود الاستدعاء القديم `window.AndroidBridge` أو الرمز المستقل `AndroidBridge` داخل ملفات `js/modules/*.js`.

## ملاحظات مهمة
هذه مرحلة تنظيمية آمنة. تم الحفاظ على التوافق مع الدوال القديمة حتى لا تتعطل الأزرار أو الرسائل الحالية.
لم يتم اختبار التطبيق على جهاز Android فعلي ضمن هذه المرحلة.

## المرحلة التالية المقترحة
1.0.65 - Utilities / Helpers Safe Extraction
