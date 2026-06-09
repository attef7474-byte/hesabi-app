# 1.0.101 - Catalog / Cart / Customer Purchase Page Sweep

## Scope
تثبيت صفحة كتالوج العميل والسلة وطلب الشراء فقط.

## Changes
- تثبيت الانتقال من نموذج الطلب إلى صفحة إضافة الأصناف والعودة.
- تثبيت البحث في صفحة إضافة الأصناف بدون إعادة رسم الصفحة بعد كل حرف حتى لا تختفي لوحة المفاتيح.
- إضافة زر بحث وزر مسح بجانب حقل البحث.
- تثبيت أزرار السابق / التالي في صفحة إضافة الأصناف.
- تثبيت زر اختيار الصنف وإضافته للسلة.
- تحسين جدول إضافة الأصناف وجدول الطلب داخل تمرير أفقي محدود على الهاتف.
- إضافة فحص ذاتي: `window.hesabiCatalogCartPurchasePageSweepSelfCheck()`.

## Not Changed
- لم يتم تغيير Firestore.
- لم يتم تغيير منطق إرسال الطلب.
- لم يتم تغيير اعتماد الطلبات أو الفواتير أو السداد.

## Checks
- `node --check js/index_script.js`
- `node --check js/modules/41_catalog_cart_purchase_page_sweep.js`
- JSON checks for `manifest.json` and `android-update.json`
