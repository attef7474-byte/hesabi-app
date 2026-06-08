# 1.0.82 - Firestore Rules Alignment Review

مرحلة مراجعة آمنة فقط.

## ما تم
- إضافة `js/modules/21_firestore_rules_alignment.js`.
- إضافة فحص `window.hesabiFirestoreRulesAlignmentSelfCheck()`.
- تعريف مسارات Firestore المتوقعة للتاجر والعميل والمالك.
- إضافة تشخيص آمن لأخطاء `permission-denied` بدون أي كتابة في Firestore.

## ما لم يتم
- لم يتم تعديل `firestore.rules`.
- لم يتم تغيير منطق الطلبات أو السداد أو الفواتير.

## الفحص
استخدم Console:

```javascript
window.hesabiFirestoreRulesAlignmentSelfCheck()
window.hesabiFirestoreRulesAlignment.reviewRuntimeReadiness()
```
