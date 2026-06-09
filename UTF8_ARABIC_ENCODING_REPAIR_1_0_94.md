# UTF-8 Arabic Encoding Repair 1.0.94

## الهدف
إصلاح مشكلة ظهور النص العربي كرموز صينية/غريبة بعد بعض تحديثات التغليف، خصوصًا في شاشة البداية والدخول والعناوين العامة.

## ما تم
- إصلاح ترميز `index.html` وإعادته إلى UTF-8 صحيح.
- إصلاح ترميز `js/index_script.js` وإعادة رسائل بدء التشغيل العربية بشكل صحيح.
- رفع الإصدار إلى `1.0.94` و `versionCode 94`.
- إضافة وحدة `js/modules/33_utf8_arabic_encoding_repair.js`.
- إضافة الفحص `window.hesabiUtf8ArabicEncodingRepairSelfCheck()`.
- ربط الوحدة بالـ loader و `manifest.json`.
- الحفاظ على إصلاحات الأصناف والبحث والأزرار السابقة.

## ما لم يتم تغييره
- لم يتم تغيير Firestore.
- لم يتم تغيير تسجيل الدخول.
- لم يتم تغيير الطلبات أو السداد أو الفواتير أو كشف الحساب.
- لم يتم تغيير بيانات المستخدمين.

## الفحوصات
- فحص نحوي لملفات JavaScript الأساسية.
- فحص JSON للـ `manifest.json` و `android-update.json`.
- فحص عدم بقاء رموز CJK/Mojibake في `index.html` و `js/index_script.js`.

## فحص بعد تثبيت APK
```javascript
window.hesabiUtf8ArabicEncodingRepairSelfCheck()
window.hesabiItemsActionsSearchFixSelfCheck()
window.hesabiFullRuntimeSmokeSelfCheck()
window.hesabiRuntimeSmokeSelfCheck()
```

## ملاحظة
هذه مرحلة إصلاح ترميز وواجهة آمنة جزئية. لا تعتبر نهائية 100% إلا بعد اختبار APK فعليًا على الهاتف.
