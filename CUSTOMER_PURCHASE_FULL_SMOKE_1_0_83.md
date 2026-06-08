# 1.0.83 - Customer Purchase Full Smoke Fixes

مرحلة فحص دخان آمن لمسار شراء العميل.

## ما تم
- إضافة `js/modules/22_customer_purchase_smoke.js`.
- إضافة `window.hesabiCustomerPurchaseSmokeSelfCheck()`.
- إضافة `window.hesabiCustomerPurchaseSmoke.runSmoke()`.
- فحص وجود دوال الشراء والكتالوج والسلة بدون إرسال طلب وبدون تعديل Firestore.

## ما لم يتم
- لم يتم إنشاء طلب شراء.
- لم يتم تعديل السلة أو الأصناف أو المخزون.

## الفحص
```javascript
window.hesabiCustomerPurchaseSmokeSelfCheck()
window.hesabiCustomerPurchaseSmoke.runSmoke()
```
