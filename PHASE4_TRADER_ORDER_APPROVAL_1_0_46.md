# hesabi-app 1.0.46 - Phase 4 Trader Order Approval Stability

تم تنفيذ مرحلة مراجعة طلبات الشراء عند التاجر:

- اعتماد الطلب من التاجر.
- رفض الطلب مع سبب.
- إنشاء فاتورة تلقائية عند الاعتماد.
- تحديث المخزون لكل صنف.
- إنشاء حركات مخزون stockLedger.
- تسجيل حركة كشف حساب customerLedger.
- زيادة رصيد العميل في حالة البيع الآجل فقط.
- منع اعتماد الطلب مرتين.
- منع اعتماد طلب بدون أصناف.
- منع اعتماد طلب يحتوي كمية أكبر من المخزون إذا كانت سياسة المتجر تمنع البيع فوق المتوفر.
- حفظ بيانات العميل داخل الفاتورة والطلب والحركات.
- إضافة Audit log لعملية الاعتماد والرفض.
- إصلاح قواعد Firestore لرد العميل على الطلبات التي تنتظر موافقته.

فحص ثابت تم قبل التسليم:

- JavaScript syntax check.
- فحص android-update.json.
- فحص app/build.gradle.
- فحص وجود دوال approveOrder / rejectOrder / customerApproveOrder / customerRejectOrder.
- فحص وجود مسارات invoices / customerLedger / stockLedger / auditLogs داخل قواعد Firestore.
