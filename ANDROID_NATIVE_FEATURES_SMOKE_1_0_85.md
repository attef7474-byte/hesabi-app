# 1.0.85 - Android Native Features Smoke

مرحلة فحص آمن لميزات أندرويد الأصلية.

## ما تم
- إضافة `js/modules/24_android_native_smoke.js`.
- إضافة `window.hesabiAndroidNativeSmokeSelfCheck()`.
- فحص توفر دوال `HesabiAndroid` للجسر، الكاش، التحديث، الباركود، OCR، والبادج.
- عدم اعتبار غياب Native في المتصفح خطأ قاتلًا.

## ما لم يتم
- لم يتم استدعاء وظائف خطرة.
- لم يتم فتح APK أو تنظيف الكاش تلقائيًا أثناء الفحص.

## الفحص
```javascript
window.hesabiAndroidNativeSmokeSelfCheck()
window.hesabiAndroidNativeSmoke.runSmoke()
```
