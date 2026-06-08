# 1.0.78 - Schedules Page Stabilization

تمت إضافة `js/modules/17_schedules_helpers.js` لتثبيت عرض الجداول والأقساط وحماية الفلاتر والحالات والملخصات.

## ما تم تغييره
- تثبيت عرض تبويبات الجداول حسب الدور.
- حماية فلترة المستحقة والمتأخرة والمدفوعة.
- إبقاء `createSchedule` و `paySchedule` و `cancelSchedule` كما هي بدون تغيير منطق Firestore.
- إضافة `window.hesabiSchedulesHelpersSelfCheck()`.

## ما لم يتم تغييره
- لم يتم تغيير إنشاء الجدولة أو إلغاءها أو سدادها.
- لم يتم تغيير قواعد Firestore أو الفواتير أو كشف الحساب.
