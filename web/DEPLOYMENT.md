# دليل النشر - Church Management System

## خطوات النشر

### 1. إعداد المشروع محلياً:
```bash
npm install
npm run build
```

### 2. متغيرات البيئة المطلوبة:
- `NEXT_PUBLIC_API_URL`: https://church-management-system-b6h7.onrender.com/api
- `NEXT_PUBLIC_USE_PRODUCTION`: true

### 3. النشر على Vercel:
1. ادخل على [vercel.com](https://vercel.com)
2. اربط المشروع بـ GitHub repository
3. تأكد من ضبط متغيرات البيئة في إعدادات Vercel
4. اضغط Deploy

### 4. النشر على Render:
1. ادخل على [render.com](https://render.com)
2. أنشئ Web Service جديد
3. اربطه بـ GitHub repository
4. استخدم الإعدادات التالية:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Environment: Node.js

## الملفات المهمة:
- `next.config.js`: إعدادات Next.js
- `vercel.json`: إعدادات Vercel
- `.env.local`: متغيرات البيئة المحلية
- `.env.production`: متغيرات البيئة للإنتاج

## استكشاف الأخطاء:
1. تأكد من أن Backend يعمل على: https://church-management-system-b6h7.onrender.com/api
2. تأكد من ضبط متغيرات البيئة بشكل صحيح
3. اتحقق من أن جميع الصفحات تستخدم AuthContextSimple

## للمطورين:
- البيئة المحلية: http://localhost:3000
- API المحلي: http://localhost:5000 (للتطوير)
- API الإنتاج: https://church-management-system-b6h7.onrender.com/api
