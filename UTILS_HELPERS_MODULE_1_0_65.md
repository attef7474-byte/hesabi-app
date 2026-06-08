# Hesabi App 1.0.65 - Utilities and Helpers Module Extraction

## الهدف
مرحلة صغيرة وآمنة لاستخراج الأدوات العامة والمساعدات إلى وحدة مستقلة بدون تغيير منطق الشراء أو السداد أو Firestore أو الصلاحيات.

## الملفات المضافة
- `js/modules/07_utils_helpers.js`

## الملفات المعدلة
- `index.html`
- `android-update.json`
- `app/build.gradle`
- `js/index_script.js`
- `js/modules/00_core_update_auth.js`
- `js/modules/manifest.json`

## ما تم تغييره
- رفع إصدار التطبيق إلى `1.0.65` و `versionCode 65`.
- إضافة وحدة `js/modules/07_utils_helpers.js` إلى ترتيب التحميل بعد النواة وقبل dialogs/toasts.
- إنشاء كائن آمن:
  - `window.hesabiUtilsHelpers`
- إضافة فحص:
  - `window.hesabiUtilsHelpersSelfCheck()`
- توحيد wrappers للأدوات العامة مع الحفاظ على أسماء الدوال القديمة:
  - `esc`
  - `money`
  - `todayIso`
  - `fileToDataUrl`
  - `id`
  - `normalizePhone`
  - `phoneKeyToInternational`
  - `toInternationalPhone`

## ما لم يتم تغييره
- لم يتم تعديل منطق الشراء أو الكتالوج.
- لم يتم تعديل Firestore أو قواعده.
- لم يتم تعديل السداد أو الفواتير أو المرتجعات.
- لم يتم تعديل الصلاحيات أو ربط العميل بالتاجر.
- لم يتم تعديل Android native bridge إلا من حيث ترتيب التحميل العام.

## الفحوصات المنفذة
- `node --check js/index_script.js`
- `node --check js/startup-recovery.js`
- `node --check js/modules/00_core_update_auth.js`
- `node --check js/modules/07_utils_helpers.js`
- `node --check js/modules/08_dialogs_toasts.js`
- `node --check js/modules/09_android_bridge.js`
- فحص JSON لملفي:
  - `js/modules/manifest.json`
  - `android-update.json`
- فحص runtime مجمع حسب ترتيب loader باسم:
  - `hesabi-runtime-combined-1.0.65.mjs`
- فحص عدم وجود استدعاء قديم مباشر باسم `window.AndroidBridge` أو `AndroidBridge.`.
- فحص ذاتي لوحدة helpers داخل Node بإرجاع `ok: true`.

## ملاحظات
هذه مرحلة آمنة جزئية. لم يتم اختبار APK على هاتف فعلي ضمن هذه الحزمة.
بعد تطبيق التحديث ورفعه، يجب بناء APK من GitHub Actions واختبار فتح التطبيق، تسجيل الدخول، الإعدادات، التنبيهات، الأصناف، الكتالوج، وطلب شراء بسيط.

## المرحلة التالية المقترحة
بعد نجاح 1.0.65 على APK يمكن الانتقال إلى مرحلة صغيرة لاحقة مثل:
- `1.0.66 - Excel import/export extraction`

ولا يتم الانتقال إليها إذا ظهر خطأ في 1.0.65.
