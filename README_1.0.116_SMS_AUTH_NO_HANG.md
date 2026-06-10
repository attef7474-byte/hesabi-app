# Hesabi 1.0.116 - SMS Auth No-Hang Hotfix

تصحيح واجهات/تسجيل دخول فقط، بدون APK جديد.

## المنفذ
- منع زر "إرسال كود التحقق" من البقاء عالقًا على "جاري إرسال الكود..."
- إضافة مهلة 45 ثانية لإرسال كود SMS.
- إعادة تفعيل الزر عند فشل reCAPTCHA أو الشبكة أو Firebase.
- تصفير reCAPTCHA عند الفشل ليتمكن المستخدم من المحاولة مرة أخرى.
- لا يوجد تغيير في Firestore أو بيانات المتجر.

## الفحص
```js
window.hesabiSmsAuthNoHangSelfCheck()
window.__hesabiRuntime
```
