# Hesabi App 1.0.112 - Remove Local Search Cards

## الهدف
حذف كروت البحث المحلية التي كانت تظهر داخل الصفحات وتشوّه الواجهة، مثل:

- بحث في العملاء والأصناف المعروضة
- بحث في المالك والاشتراكات
- بحث في سجل العمليات
- بحث في التقارير
- بحث في السياسات
- أي كرت بحث محلي يستخدم عبارة: اكتب للبحث داخل الصفحة

## الملفات المعدلة
- js/modules/51_final_all_pages_validation_cleanup.js

## نطاق التعديل
- تعديل واجهة فقط.
- لا يوجد تغيير في Firestore.
- لا يوجد تغيير في الطلبات أو السداد أو الفواتير أو المخزون أو المصادقة.
- لا يوجد تغيير في الحسابات أو التقارير نفسها.

## الفحص بعد التحديث
نفّذ داخل Console:

```js
window.hesabiRemoveLocalSearchCardsSelfCheck()
window.hesabiFinalAllPagesValidationCleanupSelfCheck()
window.hesabiFullRuntimeSmokeSelfCheck()
```

النتيجة المطلوبة في الفحص الأول:
- ok: true
- visibleLocalSearchCount: 0


## تحديثات الإصدار
- android-update.json إلى 1.0.112 / build 112
- app/build.gradle إلى versionName 1.0.112 و versionCode 112

ملاحظة:
هذا التحديث لا يغيّر منطق البيانات. إذا ظهرت خانة "إصدار الواجهات" 1.0.111 داخل صفحة الإعدادات، فهذا لأن ثابت الواجهة الأساسي موجود في ملف core كبير ولم يتم استبداله في هذا التحديث حتى لا نخاطر بتغيير حساس غير متعلق بالمشكلة.
