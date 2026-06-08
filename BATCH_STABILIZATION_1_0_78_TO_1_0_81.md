# Batch Stabilization 1.0.78 to 1.0.81

هذه حزمة واحدة تضم أربع مراحل صغيرة:

1. `1.0.78 - Schedules Page Stabilization`
2. `1.0.79 - Notifications / Badge Stabilization`
3. `1.0.80 - Owner / Subscription Settings Stabilization`
4. `1.0.81 - Permissions / Role Guards Review`

## الضوابط
- لم يتم تغيير منطق Firestore للطلبات أو السداد أو الفواتير أو المرتجعات.
- لم يتم تغيير قواعد Firestore.
- لم يتم تغيير تسجيل الدخول أو ربط العميل بالتاجر.
- أضيفت وحدات مساعدة وفحوصات ذاتية وربط آمن فقط.

## فحوصات مقترحة بعد APK
```javascript
window.hesabiSchedulesHelpersSelfCheck()
window.hesabiNotificationsHelpersSelfCheck()
window.hesabiOwnerSubscriptionHelpersSelfCheck()
window.hesabiPermissionsRoleGuardsSelfCheck()
window.hesabiFullRuntimeSmokeSelfCheck()
window.hesabiRuntimeSmokeSelfCheck()
```

## ملاحظة
لم يتم اختبار APK على هاتف فعلي داخل هذه المرحلة.
