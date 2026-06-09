# Final Release Validation 1.0.92

## الهدف
إغلاق مرحلة التثبيت الأخيرة قبل الاعتماد التجريبي القوي للتطبيق، مع التركيز على أن جميع وحدات الفحص والإصلاح حتى 1.0.91 يتم تحميلها فعليًا داخل `js/index_script.js` وليس فقط داخل `manifest.json`.

## ما تم
- رفع الإصدار إلى `1.0.92` و `versionCode 92`.
- تحديث `android-update.json` و `app/build.gradle` و `index.html`.
- إضافة وحدة جديدة: `js/modules/31_final_release_validation.js`.
- توحيد قائمة `HESABI_MODULE_PARTS` داخل `js/index_script.js` لتشمل وحدات 1.0.86 إلى 1.0.91:
  - `25_apk_version_final_check.js`
  - `26_production_release_candidate.js`
  - `27_customer_catalog_bug_fixes.js`
  - `28_payments_statements_real_data.js`
  - `29_items_mobile_table_fix.js`
  - `31_final_release_validation.js`
- تحديث `js/modules/02_runtime_smoke.js` ليعرف مرحلة 1.0.92 ويفحص وحدة الإغلاق النهائية.
- تحديث هدف فحص APK داخل `25_apk_version_final_check.js` و `26_production_release_candidate.js` إلى 1.0.92 / build 92.
- إضافة حراسة CSS خفيفة لمنع تمدد الهاتف أفقيًا بدون تغيير منطق البيانات.

## ما لم يتم تغييره
- لم يتم تغيير Firestore.
- لم يتم تغيير إرسال الطلبات.
- لم يتم تغيير اعتماد الطلبات.
- لم يتم تغيير السداد أو الفواتير أو كشف الحساب.
- لم يتم تغيير منطق إضافة/تعديل/حذف الأصناف.

## الفحوصات المنفذة
- `node --check js/index_script.js`
- `node --check js/startup-recovery.js`
- `node --check js/modules/02_runtime_smoke.js`
- `node --check js/modules/25_apk_version_final_check.js`
- `node --check js/modules/26_production_release_candidate.js`
- `node --check js/modules/31_final_release_validation.js`
- فحص JSON لـ `manifest.json` و `android-update.json`.
- فحص تحميل runtime مجمع حسب ترتيب `HESABI_MODULE_PARTS`.

## ملاحظة
لم يتم اختبار APK على هاتف فعلي من داخل هذه البيئة. يجب بناء APK من GitHub Actions وتجربته على الهاتف قبل اعتماد النسخة.
