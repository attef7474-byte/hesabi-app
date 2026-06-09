# 1.0.96 - Items Remaining Actions Fix

## النطاق
إصلاح ثلاث مشاكل متبقية في صفحة الأصناف فقط:

1. زر إلغاء التحديد.
2. زر تعديل داخل جدول الأصناف.
3. حفظ سعر الصنف من جدول الأسعار.

## ما تم تغييره
- إضافة `js/modules/35_items_remaining_actions_fix.js`.
- إعادة تعريف آمن لـ `clearSelectedItems`.
- إعادة تعريف آمن لـ `selectItemForEdit`.
- إعادة تعريف آمن لـ `saveItemPriceQuick` لقراءة الحقول الحالية `cash_<id>` و `credit_<id>` بالإضافة إلى الأسماء القديمة.
- ربط الأزرار بطريقة مباشرة ومفوّضة حتى لا تتأثر بتغيّر عرض الجدول.
- رفع الإصدار إلى `1.0.96 / 96`.

## ما لم يتم تغييره
- لم يتم تغيير الطلبات.
- لم يتم تغيير السداد.
- لم يتم تغيير الفواتير.
- لم يتم تغيير قواعد Firestore.

## الفحوصات
- `node --check js/index_script.js`
- `node --check js/modules/35_items_remaining_actions_fix.js`
- فحص JSON للـ `manifest.json` و `android-update.json`.

## فحص المتصفح
```js
window.hesabiItemsRemainingActionsFixSelfCheck()
window.hesabiItemsFinalInteractionControllerSelfCheck()
window.hesabiFullRuntimeSmokeSelfCheck()
```
