# Hesabi App 1.0.44 - Phase 2 Auth and Linking Stability

تمت هذه المرحلة فوق 1.0.43 وبشكل تراكمي.

## نطاق الفحص
- تسجيل الدخول برقم موثق SMS أو الحساب القديم.
- استرجاع ملف المستخدم من users/{uid}.
- إنشاء تاجر بدون تكرار متجر لنفس رقم الهاتف.
- استرجاع متجر التاجر من shopPhones عند وجوده.
- إنشاء عميل وربطه بمتجر واحد أو عدة متاجر.
- استرجاع روابط العميل من customerPhoneLinks.
- إصلاح customerUidLinks تلقائياً عند الدخول حتى لا تظهر مشكلة الصلاحيات.
- ضمان أن نموذج الشراء لا يرسل إلا إذا كان العميل مربوطاً فعلياً بمتجر.

## فحوصات ثابتة تمت قبل التسليم
- فحص JavaScript syntax.
- فحص android-update.json.
- فحص versionCode/versionName.
- فحص وجود قواعد Firestore الأساسية للمسارات:
  shopPhones, customerPhoneLinks, phoneUidLinks, customerUidLinks, customers.
