# إصلاح مسح كود الصنف الأصلي

هذا التعديل لا يعتمد على كاميرا WebView الضعيفة. يضيف ماسح Android أصلي عبر ZXing.

## ارفع الملفات التالية إلى جذر المستودع
- app/build.gradle
- app/src/main/java/com/hesabi/app/MainActivity.java
- index.html
- android-update.json

بعد الرفع:
1. Actions -> Build Android APK -> Run workflow
2. حمّل APK الجديد وثبته
3. افتح الأصناف -> إضافة صنف -> ماسح Android الأصلي
