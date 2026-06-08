# Hesabi App 1.0.60 - Module Loader Stability + Runtime Self Check

## الهدف
تثبيت تحميل ملفات JavaScript المقسمة بعد مرحلة 1.0.59، ومنع بقاء التطبيق على شاشة خطأ عامة عند فشل تحميل ملف أو نقص دالة.

## ما تم تعديله

1. تحديث الإصدار إلى 1.0.60 في:
   - index.html
   - js/index_script.js
   - js/modules/00_core_update_auth.js
   - js/modules/manifest.json
   - android-update.json
   - app/build.gradle

2. تحسين js/index_script.js:
   - تحميل كل جزء من js/modules بترتيب ثابت.
   - إضافة timeout للتحميل.
   - تسجيل كل ملف تم تحميله في window.__hesabiRuntime.loadedParts.
   - تسجيل الملفات الفاشلة في window.__hesabiRuntime.failedParts.
   - عرض رسالة واضحة عند فشل تحميل أي ملف.
   - تشغيل فحص ذاتي بعد import.

3. إضافة Runtime Self Check:
   - window.hesabiRuntimeSelfCheck()
   - window.__hesabiRuntime
   - window.__hesabiRuntimeLoaded
   - data-hesabi-runtime-phase على عنصر html.

4. تعريض الدوال الحرجة على window:
   - show
   - render
   - renderItems
   - renderCustomerItemsReadonly
   - sendCustomerOrder
   - approveOrder
   - sendPayment
   - renderSettings
   - renderMessages
   - renderReports
   - downloadApkUpdate
   - refreshWebUiNow
   - editStock
   - shareStatementText

5. تحسين startup-recovery.js:
   - تأخير فحص التعافي إلى 25 ثانية.
   - عدم إظهار مربع الاسترداد أثناء تحميل modules فعليًا.
   - إظهار مربع الاسترداد فقط عند فشل runtime أو استمرار عدم ظهور أي شاشة.

## الفحص المنفذ

- node --check js/index_script.js: PASS
- node --check js/startup-recovery.js: PASS
- node --check على تجميع js/modules/*.js: PASS
- android-update.json parse: PASS
- توافق الإصدار 1.0.60: PASS
- توازن أقواس MainActivity.java: PASS

## ملاحظات الاختبار العملي
بعد رفع النسخة وبناء APK يجب اختبار:

1. فتح التطبيق.
2. الإعدادات.
3. الأصناف.
4. شراء.
5. الطلبات.
6. الفواتير.
7. الرسائل.
8. تحديث APK.
9. من Console يمكن تنفيذ:
   - window.__hesabiRuntime
   - window.hesabiRuntimeSelfCheck()
   - window.hesabiFinalSelfCheck()

## النتيجة
هذه المرحلة لا تضيف ميزات جديدة. الهدف هو تثبيت تحميل modules وفحص runtime حتى يظهر سبب الخطأ بدقة بدل شاشة فارغة أو مربع استرداد متكرر.
