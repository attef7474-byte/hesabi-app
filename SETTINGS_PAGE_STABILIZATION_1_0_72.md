# 1.0.72 - Settings Page Stabilization

## الهدف
تثبيت صفحة الإعدادات بدون تعديل Firestore أو الشراء أو السداد أو الصلاحيات.

## ما تم تغييره
- إضافة `js/modules/11_settings_helpers.js`.
- إضافة `window.hesabiSettingsHelpers`.
- إضافة `window.hesabiSettingsHelpersSelfCheck()`.
- جعل `renderSettings` موجودة كما هي، لكنها تفوض بناء المحتوى وربط الأزرار إلى وحدة الإعدادات الجديدة.
- ربط فحص الإعدادات داخل `hesabiFullRuntimeSmokeSelfCheck`.
- رفع الإصدار إلى `1.0.72` و `versionCode 72`.

## نطاق التثبيت
- تبويبات الإعدادات.
- أزرار تحديث الواجهات وتنظيف الكاش وتحديث APK وفحص APK.
- أزرار الأمان والشكل والتنبيهات.
- منع انهيار صفحة الإعدادات إذا تعذر تنفيذ إجراء، مع إظهار رسالة خطأ آمنة.

## ما لم يتم تغييره
- لم يتم تعديل Firestore rules.
- لم يتم تعديل منطق الشراء أو إرسال الطلبات.
- لم يتم تعديل السداد أو الفواتير.
- لم يتم تعديل الصلاحيات العميقة.
- لم يتم إضافة ميزة جديدة تتطلب اختبار هاتف إلزامي.

## الفحوصات المنفذة
- `node --check js/index_script.js`
- `node --check js/startup-recovery.js`
- `node --check js/modules/11_settings_helpers.js`
- فحص JSON للـ `manifest.json` و `android-update.json`.
- فحص runtime مجمع حسب ترتيب `manifest.json`.
- فحص ذاتي لـ `window.hesabiSettingsHelpersSelfCheck()` باستخدام stubs.

## فحص APK المطلوب
بعد بناء APK افتح صفحة الإعدادات وافحص:
- تبويب الأمان.
- تبويب الشكل.
- تبويب التحديث والكاش.
- زر فحص الإعدادات.
- زر تنظيف الكاش.
- زر تحديث APK.
- عدم ظهور شاشة بيضاء أو نافذة إصلاح.
