# Hesabi App 1.0.34 - Critical Firestore Permissions Fix

- إصلاح APP_BUILD_CODE إلى 34.
- توحيد android-update.json إلى 1.0.34.
- منع العميل من قراءة كل customers.
- العميل يستمع فقط لمستند العميل الخاص به.
- استعلامات العميل تعتمد على customerUid عند توفرها.
- إضافة customerUid للفواتير وكشف الحساب الناتج من الاعتماد.
- إضافة قواعد Firestore لـ deviceTokens و phoneUidLinks.
- السماح بالربط والاسترجاع حسب customerUidLinks/phoneKey مع منع تعديل الأصناف والأسعار والمخزون للعميل.
- تضييق تعديل الرسائل والأقساط.

مهم: يجب نشر Firestore Rules مع رفع APK.
