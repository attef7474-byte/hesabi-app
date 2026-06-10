# Hesabi 1.0.117 - Visible reCAPTCHA Phone Auth

تصحيح واجهات/تسجيل دخول فقط، بدون APK جديد.

## المنفذ
- تحويل reCAPTCHA من invisible إلى visible/normal داخل شاشة SMS.
- عرض رسالة للمستخدم لإكمال reCAPTCHA قبل إرسال الكود.
- pre-render للـ reCAPTCHA بدل تركه يعلق داخل WebView.
- إعادة ضبط reCAPTCHA عند الفشل.
- لا يوجد تغيير في Firestore أو بيانات المتجر.

## الفحص
```js
window.hesabiVisibleRecaptchaPhoneAuthSelfCheck()
window.hesabiSmsAuthNoHangSelfCheck()
window.__hesabiRuntime
```
