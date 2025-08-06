# دليل النشر على Render - الفرونت إند

## متطلبات النشر على Render

### 1. إعداد البيئة المحلية
قبل النشر، تأكد من أن المشروع يعمل محلياً:

```bash
cd web
npm install
npm run build
npm start
```

### 2. متغيرات البيئة المطلوبة

يجب ضبط هذه المتغيرات في Render:

- `NODE_ENV`: production
- `NEXT_PUBLIC_API_URL`: رابط الباك إند API (مثل: https://your-backend.onrender.com/api)
- `NEXT_PUBLIC_USE_PRODUCTION`: true

### 3. ملفات النشر المطلوبة

تم إنشاء الملفات التالية للنشر على Render:

- ✅ `render.yaml` - إعدادات Render
- ✅ `.nvmrc` - إصدار Node.js (18.17.0)
- ✅ `package.json` - محدث بسكريبتات النشر

### 4. خطوات النشر على Render

#### الطريقة الأولى: عبر GitHub (الأسهل)

1. **رفع الكود على GitHub:**
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **إنشاء خدمة في Render:**
   - اذهب إلى [render.com](https://render.com)
   - سجل دخول أو أنشئ حساب
   - اضغط "New +" ثم "Web Service"
   - اختر "Connect a repository"
   - اختر المستودع الخاص بك

3. **إعدادات الخدمة:**
   - **Name:** church-management-frontend
   - **Environment:** Node
   - **Region:** اختر الأقرب لك
   - **Branch:** main (أو master)
   - **Root Directory:** web
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

4. **متغيرات البيئة:**
   في قسم Environment Variables، أضف:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
   NEXT_PUBLIC_USE_PRODUCTION=true
   ```

5. **النشر:**
   - اضغط "Create Web Service"
   - انتظر حتى يكتمل البناء والنشر

#### الطريقة الثانية: رفع مباشر من خلال Render CLI

1. **تثبيت Render CLI:**
   ```bash
   npm install -g @render/cli
   ```

2. **تسجيل الدخول:**
   ```bash
   render login
   ```

3. **النشر:**
   ```bash
   cd web
   render deploy
   ```

### 5. التحقق من النشر

بعد اكتمال النشر:

1. **تحقق من الرابط:** ستحصل على رابط مثل `https://church-management-frontend.onrender.com`
2. **اختبر التطبيق:** تأكد من أن جميع الصفحات تعمل
3. **تحقق من الـ API:** تأكد من أن الاتصال مع الباك إند يعمل

### 6. إعدادات إضافية

#### تحسين الأداء:
- تأكد من أن الباك إند يعمل ويمكن الوصول إليه
- تحقق من أن CORS مضبوط بشكل صحيح في الباك إند

#### مراقبة الأخطاء:
- استخدم Render Dashboard لمراقبة اللوغز
- تحقق من الـ Console في المتصفح للأخطاء

### 7. استكشاف الأخطاء

#### مشاكل شائعة:

1. **Build Failed:**
   - تحقق من أن جميع الـ dependencies موجودة
   - تأكد من أن الكود يبنى محلياً بدون أخطاء

2. **Environment Variables:**
   - تأكد من أن جميع متغيرات البيئة مضبوطة
   - تحقق من صحة رابط الـ API

3. **CORS Errors:**
   - تأكد من أن الباك إند يسمح بالطلبات من نطاق الفرونت إند

### 8. تحديث النشر

لتحديث النشر:

```bash
git add .
git commit -m "Update frontend"
git push origin main
```

سيتم إعادة النشر تلقائياً عند الـ push إلى GitHub.

---

## ملاحظات مهمة:

- ✅ تأكد من أن رابط الباك إند API صحيح
- ✅ تأكد من أن الباك إند يعمل ويمكن الوصول إليه
- ✅ تحقق من إعدادات CORS في الباك إند
- ✅ استخدم HTTPS دائماً في الإنتاج

## روابط مفيدة:

- [Render Documentation](https://render.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Render Node.js Guide](https://render.com/docs/deploy-node-express-app)
