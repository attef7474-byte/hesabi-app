# 1.0.73 - Messages Page Stabilization

## الهدف
تثبيت صفحة الرسائل بدون تغيير منطق Firestore أو عملية إرسال الرسائل.

## ما تم تغييره
- إضافة `js/modules/12_messages_helpers.js`.
- إضافة `window.hesabiMessagesHelpers`.
- إضافة `window.hesabiMessagesHelpersSelfCheck()`.
- جعل `renderMessages` يستخدم مساعدات الرسائل الجديدة مع fallback آمن للسلوك القديم.
- إبقاء `sendMessage` كما هو بدون تعديل منطق الكتابة في Firestore.
- ربط فحص الرسائل داخل `hesabiFullRuntimeSmokeSelfCheck` و `hesabiRuntimeSmokeSelfCheck`.
- رفع الإصدار إلى `1.0.73` و `versionCode 73`.

## ما لم يتم تغييره
- لم يتم تغيير Firestore rules.
- لم يتم تغيير إرسال الطلبات أو السداد أو الفواتير.
- لم يتم تغيير صلاحيات التاجر والعميل.
- لم تتم إضافة مرفقات صوت/صور في هذه المرحلة.

## الفحوصات المنفذة
- فحص بناء runtime المجمع حسب ترتيب `manifest.json`.
- فحص JSON لملفي `manifest.json` و `android-update.json`.
- فحص ذاتي لوحدة الرسائل الجديدة.
- فحص دخان عام للوحدات المرتبطة.

## ملاحظات
هذه مرحلة تثبيت صغيرة. لم يتم اختبار APK على هاتف فعلي داخل هذه البيئة.
