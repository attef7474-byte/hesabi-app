# Hesabi App 1.0.70 - Full Runtime Smoke Stabilization

## الهدف
تثبيت فحص Runtime شامل بعد مراحل استخراج الوحدات من 1.0.64 إلى 1.0.69، بدون تغيير منطق الشراء أو Firestore أو السداد أو الصلاحيات.

## ما تم تغييره
- إضافة ملف جديد: `js/modules/02_runtime_smoke.js`.
- إضافة كائن: `window.hesabiRuntimeSmoke`.
- إضافة فحصين متوافقين:
  - `window.hesabiFullRuntimeSmokeSelfCheck()`
  - `window.hesabiRuntimeSmokeSelfCheck()`
- ربط الفحص الشامل داخل `runPostImportChecks()` في `js/index_script.js`.
- توحيد رقم الإصدار إلى `1.0.70` و `versionCode 70`.
- تحديث `js/modules/manifest.json` لإضافة وحدة فحص runtime الجديدة.

## ما لم يتم تغييره
- لم يتم تعديل Firestore rules.
- لم يتم تعديل منطق إرسال الطلبات.
- لم يتم تعديل منطق السداد أو الفواتير.
- لم يتم تعديل صلاحيات التاجر/العميل.
- لم يتم نقل صفحات جديدة أو تغيير تصميم الواجهة.

## الفحص الجديد يتحقق من
- وجود كل ملفات modules المطلوبة في loader.
- عدم وجود ملفات مكررة في ترتيب التحميل.
- عدم وجود أجزاء فشلت أثناء التحميل.
- توافق `versionName/buildCode` في runtime.
- وجود كل دوال self-check للوحدات المستخرجة.
- تشغيل فحوصات:
  - reports helpers
  - catalog helpers
  - items helpers
  - Excel helpers
  - utilities helpers
  - dialogs/toasts
  - Android bridge
  - runtime missing functions
  - runtime self check
  - final self check

## الفحوصات المنفذة
- `node --check js/index_script.js`
- `node --check js/modules/02_runtime_smoke.js`
- `node --check js/modules/00_core_update_auth.js`
- `node --check js/modules/manifest.json` عبر JSON parser
- فحص دمج runtime حسب ترتيب `manifest.json`

## ملاحظات
هذه مرحلة تثبيت آمنة جزئية. لم يتم اختبار APK على جهاز فعلي ضمن هذه الحزمة، لذلك يجب بناء APK من GitHub Actions وتجربته على الهاتف قبل الانتقال لمرحلة جديدة.
