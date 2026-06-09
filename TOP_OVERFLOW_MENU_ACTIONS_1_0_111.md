# Hesabi App 1.0.111 - Top Overflow Menu Actions

## الهدف
إضافة زر ثلاث نقاط أعلى الصفحة بجانب عنوان/أيقونة حسابي التجاري، وعند الضغط تظهر قائمة تشغيل سريعة.

## الخيارات المفعلة
- تحديث التطبيق:
  - تحديث الواجهات وتنظيف الكاش ثم إعادة تحميل التطبيق.
  - تحديث APK من رابط آخر إصدار.
  - فحص الإصدار الحالي والمتاح.
- تواصل معنا:
  - نموذج رسالة.
  - حفظ محلي داخل التطبيق.
  - محاولة حفظ داخل رسائل المتجر عند توفر الصلاحية.
  - مشاركة/نسخ/بريد كاحتياط.
- إبلاغ وشكاوي:
  - نموذج بلاغ/شكوى/اقتراح.
  - حفظ محلي ومشاركة/نسخ/بريد كاحتياط.
- معلومات التطبيق:
  - عرض الإصدار، build، APK، الدور، المتجر، العميل، الاتصال، وعدد السجلات المهمة.
  - نسخ المعلومات.
  - فحص سريع للـ runtime.

## ملفات المرحلة
- `js/modules/52_top_overflow_menu_actions.js`
- `js/index_script.js`
- `js/modules/00_core_update_auth.js`
- `js/modules/02_runtime_smoke.js`
- `js/modules/25_apk_version_final_check.js`
- `js/modules/31_final_release_validation.js`
- `js/modules/46_audit_update_cache_final_sweep.js`
- `js/modules/51_final_all_pages_validation_cleanup.js`
- `js/modules/manifest.json`
- `index.html`
- `android-update.json`
- `app/build.gradle`

## الفحص
```javascript
window.hesabiTopOverflowMenuActionsSelfCheck()
window.hesabiFullRuntimeSmokeSelfCheck()
window.hesabiRuntimeSmokeSelfCheck()
window.hesabiApkVersionFinalCheckSelfCheck()
```

## ملاحظات أمان
لم يتم تغيير منطق الطلبات أو السداد أو الفواتير أو المخزون أو قواعد Firestore.
