# 1.0.100 - Remove Page Explanations

## الهدف
إلغاء الشروحات والتوضيحات العامة في جميع الصفحات، مع إبقاء العناوين والجداول والأزرار والبيانات كما هي.

## ما تم
- إضافة `js/modules/39_remove_page_explanations.js`.
- تعديل `pageHead` ليعرض عنوان الصفحة فقط.
- إخفاء `page-help` و `phase-note` و `safe-placeholder` و `mini-help` و direct `p.muted` داخل البطاقات.
- إضافة CSS حماية في `css/app.css`.
- ربط الفحص الذاتي `window.hesabiRemovePageExplanationsSelfCheck()`.
- رفع الإصدار إلى `1.0.100 / 100`.

## ما لم يتم تغييره
- لم يتم تعديل Firestore.
- لم يتم تعديل الطلبات أو السداد أو الفواتير.
- لم يتم حذف أي بيانات أو إجراءات.

## الفحص
- `node --check js/index_script.js`
- `node --check js/modules/39_remove_page_explanations.js`
- فحص JSON للـ manifest و android-update.
