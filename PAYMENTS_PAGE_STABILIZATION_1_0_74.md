# 1.0.74 - Payments Page Stabilization

## الهدف
تثبيت صفحة السداد والتحويلات بطريقة صغيرة وآمنة بدون تغيير منطق Firestore أو إرسال السداد أو اعتماد/رفض السداد.

## الملفات المضافة
- `js/modules/13_payments_helpers.js`

## الملفات المعدلة
- `index.html`
- `android-update.json`
- `app/build.gradle`
- `js/index_script.js`
- `js/modules/00_core_update_auth.js`
- `js/modules/02_runtime_smoke.js`
- `js/modules/50_auth_order_approval.js`
- `js/modules/manifest.json`

## ما تم تثبيته
- تطبيع بيانات السداد قبل العرض.
- فلترة حالات السداد: معلّق، مقبول، مرفوض، الكل.
- حساب ملخصات السداد والدين بطريقة آمنة.
- بناء صفوف جدول السداد بطريقة محمية من القيم الناقصة.
- ربط أزرار: إرسال السداد، فتح الإيصال، قبول السداد، رفض السداد.
- إضافة `window.hesabiPaymentsHelpersSelfCheck()`.
- إدخال فحص السداد ضمن `window.hesabiFullRuntimeSmokeSelfCheck()`.

## ما لم يتم تغييره
- لم يتم تغيير `sendPayment`.
- لم يتم تغيير `approvePayment`.
- لم يتم تغيير `rejectPayment`.
- لم يتم تغيير Firestore rules أو أسماء collections.
- لم يتم تغيير منطق كشف الحساب أو أرصدة العملاء.

## الفحوصات
- `node --check js/index_script.js`
- `node --check js/modules/13_payments_helpers.js`
- `node --check js/modules/50_auth_order_approval.js`
- فحص JSON للـ `manifest.json` و `android-update.json`.
- فحص runtime مجمع حسب ترتيب manifest.

## ملاحظة
هذه مرحلة آمنة جزئية. لم يتم اختبار APK على هاتف فعلي.
