# 1.0.80 - Owner / Subscription Settings Stabilization

تمت إضافة `js/modules/19_owner_subscription_helpers.js` لتثبيت عرض لوحة المالك والاشتراكات.

## ما تم تغييره
- حماية عرض مؤشرات المالك والمتاجر والمستخدمين.
- تثبيت نماذج المراسلة والتحكم والاشتراك.
- إبقاء إجراءات المالك الأصلية كما هي.
- إضافة `window.hesabiOwnerSubscriptionHelpersSelfCheck()`.

## ما لم يتم تغييره
- لم يتم تغيير إرسال رسالة المالك.
- لم يتم تغيير حفظ الاشتراك أو إيقاف/تفعيل المتجر.
- لم يتم تغيير Firestore rules.
