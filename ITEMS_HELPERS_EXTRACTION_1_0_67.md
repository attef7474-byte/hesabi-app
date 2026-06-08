# Hesabi App 1.0.67 - Items Helpers Extraction

## الهدف
استخراج أدوات الأصناف العامة إلى ملف مستقل بدون تغيير منطق الشراء أو الطلبات أو Firestore.

## الملفات المضافة
- `js/modules/05_items_helpers.js`

## الملفات المعدلة
- `index.html`
- `android-update.json`
- `app/build.gradle`
- `js/index_script.js`
- `js/modules/manifest.json`
- `js/modules/00_core_update_auth.js`
- `js/modules/05_items_helpers.js`
- `js/modules/06_excel_import_export.js`
- `js/modules/07_utils_helpers.js`
- `js/modules/30_purchase_catalog.js`
- `js/modules/70_settings_owner_items_bridge.js`

## ما تم استخراجه
- تصنيف الصنف `itemCategory`
- تطبيع مفاتيح الأصناف `normalizeItemKey`
- كشف تكرار الصنف بالاسم أو الباركود
- جلب الصنف بالمعرف
- بناء مرجع مستند الصنف الحالي
- أدوات تحديد الأصناف المحددة للحذف
- قائمة التصنيفات وتصفية الأصناف حسب التصنيف
- البحث عن صنف بالكود/الباركود/السيريال
- استخراج اسم صنف مقترح من OCR
- أدوات أسعار الكاش والآجل كدوال مساعدة آمنة

## ما لم يتم تغييره
- لم يتم تغيير منطق حفظ الأصناف في Firestore.
- لم يتم تغيير منطق الشراء أو الكتالوج أو السلة.
- لم يتم تغيير السداد أو الفواتير أو الصلاحيات.
- لم تتم إضافة ميزة جديدة؛ المرحلة تنظيمية فقط.

## الفحص
- `node --check js/index_script.js`
- `node --check js/modules/05_items_helpers.js`
- فحص JSON لملفي `manifest.json` و `android-update.json`
- فحص runtime مجمع حسب ترتيب loader
- فحص ذاتي: `window.hesabiItemsHelpersSelfCheck()`

## ملاحظات
هذه مرحلة آمنة جزئية. لم يتم اختبار APK على هاتف فعلي ضمن هذا التحديث.
