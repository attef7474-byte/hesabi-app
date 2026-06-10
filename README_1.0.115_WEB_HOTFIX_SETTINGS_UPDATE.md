# Hesabi 1.0.115 - Web Hotfix

تصحيح واجهات فقط، بدون APK جديد.

## المنفذ
- تحميل module 54 فعلياً من index_script.js.
- زر تحديث واحد ذكي داخل الإعدادات.
- إذا لا يوجد APK أحدث يظهر الزر: أنت على آخر نسخة ويكون معطل.
- إرجاع كرت تاجر/عميل ومتاجري داخل الإعدادات.
- الحفاظ على الترميز UTF-8 وعدم استخدام PowerShell Set-Content.

## الفحص
```js
window.hesabiUtf8Recovery115SelfCheck()
window.hesabiSettingsRoleUnifiedUpdateSelfCheck()
window.__hesabiRuntime
```
