# Hesabi App 1.0.114 - Settings Role + Unified Smart Update

## المنفذ
- إرجاع كرت التبديل بين تاجر وعميل داخل صفحة الإعدادات.
- إرجاع الوصول إلى متاجري / ربط متجر من صفحة الإعدادات.
- الحفاظ على فصل بيانات كل متجر حسب shopId و activeShopId بدون تغيير منطق Firestore.
- استبدال أزرار التحديث المنفصلة بزر واحد فقط:
  - يفحص android-update.json
  - إذا توجد نسخة أحدث: يتفعل
  - عند الضغط: ينظف الكاش + يجهز الواجهات + يفتح تحديث APK
  - إذا التطبيق على آخر نسخة: الزر معطل ويعرض "أنت على آخر نسخة"

## فحص بعد التحديث
```js
window.hesabiSettingsRoleUnifiedUpdateSelfCheck()
window.hesabiUiCleanupHeaderHomeNavSelfCheck()
window.hesabiFullRuntimeSmokeSelfCheck()
```
