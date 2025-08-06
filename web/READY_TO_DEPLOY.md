# ✅ جاهز للنشر على Render!

تم إعداد جميع الملفات المطلوبة للنشر على Render:

## الملفات المُنشأة:
- ✅ `render.yaml` - إعدادات Render
- ✅ `.nvmrc` - إصدار Node.js
- ✅ `.env.example` - مثال متغيرات البيئة
- ✅ `test-deploy.ps1` - اختبار النشر (Windows)
- ✅ `test-deploy.sh` - اختبار النشر (Linux/Mac)
- ✅ `RENDER_DEPLOYMENT_GUIDE.md` - دليل مفصل
- ✅ `DEPLOY_TO_RENDER.md` - خطوات سريعة

## الملفات المُحدثة:
- ✅ `package.json` - أضيفت سكريبتات النشر
- ✅ `next.config.js` - محسن للنشر على Render

## الخطوات القادمة:

### 1. اختبار محلي (اختياري):
```powershell
cd web
.\test-deploy.ps1
```

### 2. رفع على GitHub:
```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### 3. النشر على Render:
1. اذهب إلى [render.com](https://render.com)
2. أنشئ **Web Service**
3. اربط بـ GitHub repository
4. Root Directory: `web`
5. Build Command: `npm install && npm run build`
6. Start Command: `npm start`
7. متغيرات البيئة:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://church-management-system-b6h7.onrender.com/api
   NEXT_PUBLIC_USE_PRODUCTION=true
   ```
8. اضغط **Create Web Service**

## ملاحظات مهمة:
- 🔗 تأكد من أن رابط الباك إند صحيح
- 🔧 تأكد من إعدادات CORS في الباك إند
- 📱 اختبر التطبيق بعد النشر

## دعم:
راجع `RENDER_DEPLOYMENT_GUIDE.md` للتفاصيل الكاملة ومعالجة المشاكل.
