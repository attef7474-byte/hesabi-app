# 1.0.95 - Items Final Interaction Controller

## الهدف
إصلاح نهائي ومحدود لصفحة الأصناف بعد ظهور مشاكل في:
- التنقل بين أيقونات صفحة الأصناف.
- البحث داخل جدول الأصناف.
- أزرار الإجراءات داخل الجدول: تعديل، سعر، حفظ السعر، إظهار/إخفاء، حذف.

## السبب الفني
في مراحل إصلاح سابقة تم تسجيل event delegation يعتمد على `window.state`، بينما حالة التطبيق الأصلية معرفة داخل module scope باسم `state` وليست دائمًا موجودة على `window`. لذلك كانت بعض النقرات يتم إيقافها قبل أن تصل للمعالج الصحيح.

## ما تم
- إضافة `js/modules/34_items_final_interaction_controller.js`.
- عمل bridge آمن بين `state/cache` الداخليتين و `window.state/window.cache`.
- إعادة ربط تبويبات الأصناف.
- إعادة ربط البحث بدون إعادة الرسم أثناء الكتابة.
- إعادة ربط السابق/التالي.
- إعادة ربط أزرار تعديل/سعر/حفظ/إظهار/حذف.
- رفع الإصدار إلى `1.0.95` و `versionCode 95`.

## ما لم يتم تغييره
- Firestore rules.
- منطق إضافة/تعديل/حذف الصنف نفسه.
- الطلبات.
- السداد.
- الفواتير.
- كشف الحساب.

## الفحوصات
- `node --check js/index_script.js`
- `node --check js/modules/34_items_final_interaction_controller.js`
- فحص JSON للـ manifest و android-update.

## فحص APK
بعد تثبيت APK شغّل:
```js
window.hesabiItemsFinalInteractionControllerSelfCheck()
window.hesabiItemsActionsSearchFixSelfCheck()
window.hesabiItemsMobileTableFixSelfCheck()
window.hesabiFullRuntimeSmokeSelfCheck()
```
