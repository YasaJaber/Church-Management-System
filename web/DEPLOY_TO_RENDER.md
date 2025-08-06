# نشر الفرونت إند على Render

## الخطوات السريعة

### 1. رفع على GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. إعداد Render
1. اذهب إلى [render.com](https://render.com)
2. أنشئ **Web Service**
3. اربط بـ GitHub repository
4. اختر مجلد `web` كـ **Root Directory**

### 3. إعدادات البناء
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment:** Node

### 4. متغيرات البيئة
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
NEXT_PUBLIC_USE_PRODUCTION=true
```

### 5. النشر
اضغط **Create Web Service** وانتظر!

---

## اختبار محلي قبل النشر

### Windows (PowerShell):
```powershell
.\test-deploy.ps1
```

### Linux/Mac:
```bash
chmod +x test-deploy.sh
./test-deploy.sh
```

---

## مشاكل شائعة وحلولها

### البناء يفشل
- تأكد من أن `npm run build` يعمل محلياً
- تحقق من أن جميع التبعيات موجودة في `package.json`

### API لا يعمل
- تأكد من رابط الباك إند في متغيرات البيئة
- تحقق من إعدادات CORS في الباك إند

### الصفحة فارغة
- تحقق من Console في المتصفح للأخطاء
- تأكد من أن متغيرات البيئة مضبوطة بشكل صحيح

---

لمزيد من التفاصيل، راجع `RENDER_DEPLOYMENT_GUIDE.md`
