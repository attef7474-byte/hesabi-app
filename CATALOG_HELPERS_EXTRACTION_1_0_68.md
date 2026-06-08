# Hesabi App 1.0.68 - Catalog Helpers Extraction

## الهدف
تنفيذ مرحلة صغيرة وآمنة لاستخراج أدوات الكتالوج العامة إلى وحدة مستقلة بدون تغيير منطق إرسال طلبات الشراء أو Firestore أو السداد أو الصلاحيات.

## الملفات المضافة
- `js/modules/04_catalog_helpers.js`

## الملفات المعدلة
- `index.html`
- `android-update.json`
- `app/build.gradle`
- `js/index_script.js`
- `js/modules/manifest.json`
- `js/modules/30_purchase_catalog.js`

## ما تم تغييره
- إضافة كائن آمن جديد:
  - `window.hesabiCatalogHelpers`
- إضافة فحص ذاتي جديد:
  - `window.hesabiCatalogHelpersSelfCheck()`
- توحيد أدوات الكتالوج والسلة والبحث والفرز والترقيم داخل وحدة مستقلة.
- إبقاء أسماء الدوال القديمة كما هي حتى لا تتأثر الصفحات الحالية.
- جعل الدوال القديمة تفوض إلى الوحدة الجديدة عند توفرها، وتبقى fallback بنفس المنطق القديم إذا لم تتوفر.

## الأدوات التي أصبحت داخل الوحدة
- حالة الكتالوج الافتراضية.
- جلب حالة الكتالوج لكل متجر.
- تحديد ظهور الصنف للعميل.
- فحص أوقات عمل المتجر.
- حساب الكميات المباعة للصنف.
- الأصناف الشائعة للعميل.
- الأصناف المرئية للشراء.
- بناء أسطر السلة.
- حساب إجماليات السلة.
- ضبط الكمية الآمنة حسب المخزون.
- فلترة أصناف الكتالوج.
- ترتيب نتائج البحث.
- نتائج بحث الكتالوج.
- اقتراحات إدخال الصنف داخل الفاتورة.
- فرز وترقيم صفحة إضافة الأصناف.

## ما لم يتم تغييره
- لم يتم تعديل منطق إرسال طلب الشراء.
- لم يتم تعديل Firestore.
- لم يتم تعديل الصلاحيات.
- لم يتم تعديل السداد أو الفواتير.
- لم يتم تغيير واجهة المستخدم جذريًا.
- لم يتم إضافة دعم جديد خارج نطاق الكتالوج.

## الإصدار
- `versionName`: `1.0.68`
- `versionCode`: `68`
- `android-update.json`: `1.0.68`
- cache query في `index.html`: `1.0.68`

## الفحوصات المنفذة
- `node --check js/index_script.js`
- `node --check js/startup-recovery.js`
- `node --check js/modules/04_catalog_helpers.js`
- `node --check js/modules/05_items_helpers.js`
- `node --check js/modules/30_purchase_catalog.js`
- فحص JSON لملفي:
  - `js/modules/manifest.json`
  - `android-update.json`
- فحص runtime مجمع حسب ترتيب loader.
- فحص ذاتي للوحدة الجديدة:
  - `window.hesabiCatalogHelpersSelfCheck()`

## ملاحظات مهمة
هذه مرحلة آمنة جزئية. لم يتم اختبار APK على هاتف فعلي، لذلك لا يتم اعتبارها نهائية 100% قبل بناء APK وتجربته.

## فحوصات Console المقترحة بعد تثبيت APK
```javascript
window.hesabiCatalogHelpersSelfCheck()
window.hesabiItemsHelpersSelfCheck()
window.hesabiExcelImportExportSelfCheck()
window.hesabiUtilsHelpersSelfCheck()
window.hesabiDialogsToastsSelfCheck()
window.hesabiAndroidBridgeSelfCheck()
window.hesabiRuntimeMissingFunctionsFix()
window.hesabiRuntimeSelfCheck()
window.hesabiFinalSelfCheck()
```
