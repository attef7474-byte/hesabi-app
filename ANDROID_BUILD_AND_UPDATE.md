# حسابي التجاري - Android APK وتحديث من داخل التطبيق

## الرفع من Termux

افتح Termux ونفذ من داخل نسخة المستودع:

```bash
cd /sdcard/Download/hesabi-app
cp -r /sdcard/Download/hesabi-android-update-in-app-files/android_files/. .
git status
git add .
git commit -m "feat: add in-app Android update support"
git push https://attef7474-byte:TOKEN_HERE@github.com/attef7474-byte/hesabi-app.git main
```

استبدل `TOKEN_HERE` بالتوكن الجديد داخل Termux فقط.

## بعد الرفع

1. افتح GitHub > Actions > Build Android APK.
2. اضغط Run workflow على فرع main إذا لم يبدأ تلقائيًا.
3. بعد النجاح حمّل artifact أو افتح Release باسم `latest-android`.
4. ثبت APK على الهاتف.

## كيف يعمل التحديث الداخلي؟

- ملف `android-update.json` في جذر الموقع يحتوي آخر رقم إصدار.
- صفحة الإعدادات تفحص هذا الملف.
- إذا كان `latestVersionCode` أكبر من إصدار APK المثبت، يظهر زر تحميل وتثبيت.
- عند الضغط، تطبيق أندرويد يحمل APK من GitHub Release ثم يفتح شاشة تثبيت أندرويد.
- أندرويد سيطلب سماح "Install unknown apps" مرة واحدة.

## عند إصدار نسخة جديدة

عدّل رقم الإصدار في:

- `app/build.gradle`: `versionCode` و `versionName`
- `android-update.json`: `latestVersionCode` و `latestVersionName`

ثم ارفع إلى GitHub وشغل Build Android APK.
