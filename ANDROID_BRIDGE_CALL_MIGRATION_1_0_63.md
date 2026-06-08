# 1.0.63 - Android Bridge Call Migration

## الهدف
استبدال الاستدعاءات القديمة المباشرة لـ `window.HesabiAndroid` في ملفات التطبيق بطبقة الجسر الموحدة `window.hesabiAndroidBridge` التي أضيفت في 1.0.62.

## ما تم تغييره
- تحديث دوال قراءة إصدار APK في `00_core_update_auth.js` لاستخدام `hesabiAndroidBridge`.
- تحديث تنظيف كاش WebView في `refreshWebUiNow` و `prepareFullUpdateRefresh` لاستخدام `hesabiAndroidBridge`.
- تحديث فتح APK إلى `hesabiAndroidBridge.openApkUrl/openLatestApk`.
- تحديث تسجيل جلسة Android إلى `hesabiAndroidBridge.registerSession`.
- تحديث شارة التطبيق إلى `hesabiAndroidBridge.updateLauncherBadge`.
- تحديث زر اختبار العداد في `10_firebase_live_data.js`.
- تحديث دوال ماسح الباركود و OCR في `70_settings_owner_items_bridge.js`.
- تحديث دالة تنظيف الكاش الاحتياطية في `99_runtime_missing_functions_fix.js`.

## ما لم يتغير
- لم يتم تغيير منطق الشراء.
- لم يتم تغيير منطق السداد.
- لم يتم تغيير الفواتير أو كشف الحساب.
- لم يتم تغيير Firestore Rules.
- لم يتم تغيير الواجهة.
- لم يتم تغيير اسم الحزمة أو Firebase project.

## فحص السلامة
- لا يوجد `AndroidBridge`.
- لا توجد استدعاءات مباشرة لـ `window.HesabiAndroid` خارج ملف `09_android_bridge.js`.
- `09_android_bridge.js` هو المكان الوحيد الذي يتعامل مباشرة مع `HesabiAndroid`.
- تم تحديث الإصدار إلى 1.0.63 و versionCode 63.

## اختبارات مقترحة على الجهاز
- فتح التطبيق.
- فتح الإعدادات.
- فحص APK وتحديث APK.
- تنظيف الكاش.
- فتح صفحة الأصناف.
- اختبار ماسح الباركود الداخلي والخارجي.
- اختبار OCR.
- تشغيل `window.hesabiAndroidBridgeSelfCheck()` من Console.
