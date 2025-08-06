# كيفية تطبيق التغييرات على رابط النشر

## 🚀 الخطوات المطلوبة

### الخطوة 1: رفع التغييرات إلى GitHub
افتح Terminal في مجلد المشروع وشغل الأوامر دي:

```bash
git add .
git commit -m "Fix API connection - use production URL instead of localhost"
git push origin master
```

### الخطوة 2: إعداد متغيرات البيئة في Vercel
1. ادخل على موقع Vercel: https://vercel.com
2. اختار مشروعك (Church-Management-System)
3. اضغط على Settings
4. اضغط على Environment Variables
5. أضف المتغيرات دي:

**متغير أول:**
- Name: `NEXT_PUBLIC_API_URL`
- Value: `https://church-management-system-b6h7.onrender.com/api`
- Environment: Production, Preview, Development

**متغير تاني:**
- Name: `NEXT_PUBLIC_USE_PRODUCTION`
- Value: `true`
- Environment: Production, Preview, Development

### الخطوة 3: إعادة النشر
بعد ما تعمل push، Vercel هياخد التغييرات تلقائياً ويعمل deploy جديد.

أو ممكن تعمل redeploy يدوي:
1. ادخل على project في Vercel
2. اضغط Deployments
3. اضغط على آخر deployment
4. اضغط Redeploy

## 🎯 النتيجة المتوقعة
بعد النشر:
- صفحة الإحصائيات المتقدمة هتشتغل بدون أخطاء
- مش هتشوف خطأ "ERR_CONNECTION_REFUSED" تاني
- كل API calls هتروح للسيرفر الصح

## 🔍 كيف تتأكد إن كل حاجة تمام؟
1. افتح رابط الموقع بتاعك على Vercel
2. ادخل على صفحة الإحصائيات المتقدمة
3. لو شغالة بدون أخطاء، يبقى كل حاجة تمام ✅

---

**ملحوظة مهمة:** التغييرات دي هتخلي المشروع يستخدم رابط API الإنتاج الصحيح بدلاً من localhost!
