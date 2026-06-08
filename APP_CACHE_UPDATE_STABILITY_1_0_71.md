# 1.0.71 - App Cache / Update Stability

## الهدف
تثبيت سلوك الكاش والتحديثات بعد تقسيم ملفات التطبيق إلى وحدات متعددة، بدون تغيير منطق الشراء أو Firestore أو السداد أو الصلاحيات.

## ما تم تغييره
- إضافة `js/modules/01_update_cache_stability.js`.
- إضافة `window.hesabiUpdateCacheStability`.
- إضافة `window.hesabiUpdateCacheStabilitySelfCheck()`.
- ربط تنظيف الكاش وجلب `android-update.json` بدوال آمنة تستخدم `cache: no-store` و query cache-buster.
- ربط فحص الكاش/التحديث مع `hesabiFullRuntimeSmokeSelfCheck()`.
- رفع الإصدار إلى `1.0.71` و `versionCode 71`.

## ما لم يتم تغييره
- لم يتم تعديل منطق الشراء أو السلة أو إرسال الطلب.
- لم يتم تعديل Firestore rules أو أي مسارات قاعدة بيانات.
- لم يتم تعديل السداد أو الفواتير أو الصلاحيات.
- لم يتم إضافة نظام تحديث APK جديد؛ فقط تثبيت أدوات الكاش وفحص ملفات التحديث الحالية.

## الفحوصات المطلوبة بعد التطبيق
```javascript
window.hesabiUpdateCacheStabilitySelfCheck()
window.hesabiFullRuntimeSmokeSelfCheck()
window.hesabiRuntimeSmokeSelfCheck()
```

## ملاحظات
هذه مرحلة آمنة جزئية. تم فحص الملفات نحويًا و runtime داخل بيئة محاكاة، ولم يتم اختبار APK على هاتف فعلي ضمن هذه الحزمة.
