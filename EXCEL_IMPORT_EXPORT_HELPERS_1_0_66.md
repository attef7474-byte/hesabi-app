# 1.0.66 - Excel Import / Export Helpers Extraction

## الهدف
استخراج أدوات استيراد وتصدير Excel/CSV إلى وحدة مستقلة صغيرة وآمنة بدون تعديل منطق الأصناف أو الطلبات أو Firestore.

## الملفات المضافة
- `js/modules/06_excel_import_export.js`

## الملفات المعدلة
- `js/index_script.js`
- `js/modules/manifest.json`
- `js/modules/70_settings_owner_items_bridge.js`
- `js/modules/00_core_update_auth.js`
- `index.html`
- `android-update.json`
- `app/build.gradle`

## ما تم تغييره
- إنشاء الكائن `window.hesabiExcelImportExport`.
- إضافة الدوال العامة:
  - `normalizeCell`
  - `splitDelimitedLine`
  - `parseDelimitedText`
  - `indexOfHeader`
  - `csvEscape`
  - `buildCsv`
  - `downloadBlob`
  - `exportCsv`
- إضافة الفحص:
  - `window.hesabiExcelImportExportSelfCheck()`
- جعل دالة `exportCsv` القديمة تفوض إلى الوحدة الجديدة عند توفرها مع بقاء fallback القديم.
- جعل استيراد الأصناف يستخدم parser مركزيًا مع الحفاظ على نفس منطق إنشاء الأصناف الحالي.

## ما لم يتم تغييره
- لم يتم تعديل منطق Firestore.
- لم يتم تعديل الصلاحيات.
- لم يتم تعديل الشراء أو السداد أو الفواتير.
- لم يتم تغيير منطق منع التكرار في الأصناف.
- لم يتم إضافة دعم XLSX حقيقي جديد في هذه المرحلة؛ بقيت المرحلة لاستخراج وتنظيم أدوات CSV/Excel الحالية فقط.

## الفحوصات المقترحة بعد التطبيق
```powershell
node --check .\js\index_script.js
node --check .\js\startup-recovery.js
node --check .\js\modules\06_excel_import_export.js
node --check .\js\modules\70_settings_owner_items_bridge.js
```

ومن Console بعد فتح التطبيق:

```javascript
window.hesabiExcelImportExportSelfCheck()
window.hesabiUtilsHelpersSelfCheck()
window.hesabiDialogsToastsSelfCheck()
window.hesabiAndroidBridgeSelfCheck()
window.hesabiRuntimeMissingFunctionsFix()
window.hesabiRuntimeSelfCheck()
window.hesabiFinalSelfCheck()
```

## ملاحظات المرحلة التالية
المرحلة التالية المقترحة بعد نجاح APK:
- `1.0.67 - Items Helpers Extraction`
