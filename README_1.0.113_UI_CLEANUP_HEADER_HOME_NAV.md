# Hesabi App 1.0.113 - UI Cleanup: Header, Home, Nav

## المطلوب المنفذ
- نقل زر الثلاث نقاط إلى بداية العنوان بجانب أيقونة/عنوان التطبيق.
- إعادة ربط زر الثلاث نقاط حتى يفتح القائمة ويعمل.
- حذف كروت الأزرار الزائدة التي تظهر في الصفحات: تحديث / تصدير CSV / فحص.
- حذف ملخصات الصفحة الرئيسية والإبقاء على الأيقونات فقط.
- حذف زر البحث من شريط التنقل السفلي.

## نطاق التعديل
تعديل واجهة فقط.

لا يوجد تغيير في:
- Firestore
- الطلبات
- السداد
- الفواتير
- المخزون
- الحسابات
- بيانات العملاء أو الأصناف

## الملفات
- index.html
- js/index_script.js
- js/modules/53_ui_cleanup_header_home_nav.js
- android-update.json
- app/build.gradle

## فحص بعد التحديث
```js
window.hesabiUiCleanupHeaderHomeNavSelfCheck()
window.hesabiFullRuntimeSmokeSelfCheck()
```

المطلوب:
- ok: true
- visibleCount: 0
