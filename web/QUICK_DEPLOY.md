# إرشادات النشر السريع

## ✅ تم حل جميع المشاكل!

الآن التطبيق يستخدم API الإنتاج الصحيح:
```
https://church-management-system-b6h7.onrender.com/api
```

## 🔥 مشكلة AuthProvider تم حلها!
تم تحديث جميع الصفحات لتستخدم AuthContextSimple بدلاً من AuthContext القديم.

## طرق تطبيق التغييرات على رابط النشر:

### الطريقة الأولى: رفع التغييرات إلى GitHub
1. اعمل commit و push للتغييرات:
```bash
git add .
git commit -m "Fix API connection errors - use production URL"
git push origin master
```
2. Vercel سيبني المشروع تلقائياً عند الـ push

### الطريقة الثانية: النشر اليدوي من Vercel Dashboard
1. ادخل على [vercel.com](https://vercel.com) 
2. اختار مشروعك
3. اضغط "Deployments" 
4. اضغط "Redeploy" على آخر deployment
5. تأكد من إعدادات البيئة:
   - `NEXT_PUBLIC_API_URL` = `https://church-management-system-b6h7.onrender.com/api`
   - `NEXT_PUBLIC_USE_PRODUCTION` = `true`

## أو شغل المشروع محلياً:
```bash
npm run dev
```

## الصفحات ستعمل الآن بشكل صحيح:
- ✅ صفحة الإحصائيات المتقدمة
- ✅ جميع API calls
- ✅ لا توجد أخطاء connection refused

🎉 تم حل المشكلة بنجاح!
