# 1.0.62 - Safe Android Bridge Module Extraction

## الهدف
استخراج طبقة جسر أندرويد إلى ملف مستقل بدون تغيير سلوك التطبيق التجاري.

## الملفات المضافة
- `js/modules/09_android_bridge.js`

## ما تم
- إضافة `window.hesabiAndroidBridge` كواجهة مركزية للتعامل مع `HesabiAndroid`.
- إضافة دوال آمنة عامة لاستخدام الجسر:
  - `hesabiNativeAvailable`
  - `hesabiNativeCanCall`
  - `hesabiNativeCall`
  - `hesabiNativeClearWebCacheForUpdate`
  - `hesabiNativeOpenApkUrl`
  - `hesabiNativeOpenLatestApk`
  - `hesabiNativeRegisterSession`
  - `hesabiNativeUpdateLauncherBadge`
  - `hesabiNativeScanItemBarcodeEmbedded`
  - `hesabiNativeScanItemBarcodeExternal`
  - `hesabiNativeScanItemOcrNative`
- إضافة `window.hesabiAndroidBridgeSelfCheck()`.
- تحديث ترتيب التحميل في `js/index_script.js` ليتم تحميل الجسر بعد `00_core_update_auth.js`.
- تحديث `js/modules/manifest.json`.
- تحديث الإصدار إلى `1.0.62` و `versionCode 62`.

## ملاحظات أمان
لم يتم حذف أو استبدال الاستدعاءات القديمة مباشرة داخل الملفات الكبيرة. هذه مرحلة تأسيسية آمنة، والاستبدال التدريجي يتم لاحقًا بعد اختبار التطبيق.

## الفحص
- فحص syntax لملف الجسر الجديد.
- فحص syntax لـ `js/index_script.js`.
- فحص syntax لـ `js/startup-recovery.js`.
- التأكد من عدم وجود `AndroidBridge`.
