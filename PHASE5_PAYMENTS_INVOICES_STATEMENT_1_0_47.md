# hesabi-app 1.0.47 - Phase 5 Payments, Invoices, Statement Stability

تم تنفيذ المرحلة الخامسة فوق 1.0.46 بشكل تراكمي.

## نطاق الفحص والإصلاح
- إرسال طلب السداد من العميل.
- منع تكرار رقم مرجع السداد.
- رفع إيصال السداد بصيغة مضغوطة داخل Firestore عند الحجم المسموح.
- اعتماد السداد من التاجر.
- رفض السداد مع سبب.
- تحديث رصيد العميل عند الاعتماد.
- إضافة حركة كشف حساب دائنة عند اعتماد السداد.
- مشاركة الفاتورة.
- فتح إيصال السداد.
- إضافة confirmDialog آمن بدل الاعتماد على دالة غير موجودة.

## الفحص
- فحص JavaScript syntax.
- فحص وجود دوال sendPayment / approvePayment / rejectPayment / openReceipt / shareInvoiceText / confirmDialog.
- فحص android-update.json.
- فحص versionCode/versionName.
