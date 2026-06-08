# Batch Smoke Stabilization 1.0.82 - 1.0.85

حزمة تثبيت آمنة مجمعة لأربع مراحل:

- 1.0.82 Firestore Rules Alignment Review
- 1.0.83 Customer Purchase Full Smoke Fixes
- 1.0.84 Trader Daily Workflow Smoke Fixes
- 1.0.85 Android Native Features Smoke

## ملاحظة مهمة
تم أيضًا إصلاح ربط loader ليشمل وحدات 1.0.78 إلى 1.0.85 ضمن `HESABI_MODULE_PARTS` و `HESABI_REQUIRED_GLOBALS`، حتى تظهر نتائجها داخل `window.hesabiFullRuntimeSmokeSelfCheck()`.

## حدود المرحلة
- لا تعديل Firestore rules من داخل هذه الحزمة.
- لا تغيير لمنطق السداد أو الفواتير أو الطلبات.
- لا اختبار APK فعلي داخل هذه البيئة.
