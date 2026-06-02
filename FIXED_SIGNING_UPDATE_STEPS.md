# تفعيل توقيع ثابت لتحديثات تطبيق حسابي التجاري

هذه الحزمة تضيف مفتاح توقيع ثابت باسم `hesabi-release-key.jks` وتجعل GitHub Actions يبني APK موقّعًا كل مرة.

## الرفع من Termux

```bash
cd /sdcard/Download/hesabi-app
cp -r /sdcard/Download/hesabi-fixed-signing-files/android_files/. .
git status
git add .
git commit -m "fix: use fixed signing key for Android updates"
git push https://attef7474-byte:TOKEN_HERE@github.com/attef7474-byte/hesabi-app.git main
```

استبدل `TOKEN_HERE` بالتوكن الجديد داخل Termux فقط.

## بعد الرفع

- افتح GitHub → Actions → Build Android APK.
- شغل Run workflow على main أو انتظر التشغيل التلقائي.
- حمّل Artifact أو Release: `hesabi-app-latest.apk`.
- ثبّت هذا الإصدار بعد حذف النسخة القديمة مرة واحدة.
- التحديثات القادمة ستثبت فوق هذا الإصدار لأنها ستكون بنفس التوقيع.

## ملاحظة أمان

هذا المفتاح موجود داخل المستودع لتسهيل العمل من الهاتف. عند الوصول لنسخة تجارية نهائية، يفضل نقل بيانات التوقيع إلى GitHub Secrets وإنشاء مفتاح خاص غير منشور.
