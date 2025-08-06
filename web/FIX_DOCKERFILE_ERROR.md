# حل مشكلة Dockerfile في Render

## المشكلة:
```
error: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
```

## السبب:
Render يحاول بناء المشروع كـ Docker container بدلاً من Node.js application.

## الحل:

### 1. تأكد من الإعدادات الصحيحة في Render Dashboard:

#### إعدادات الخدمة:
- **Service Type**: `Web Service`
- **Environment**: `Node` (ليس Docker)
- **Runtime**: `Node.js`
- **Root Directory**: `web`

#### أوامر البناء:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

#### متغيرات البيئة:
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://church-management-system-b6h7.onrender.com/api
NEXT_PUBLIC_USE_PRODUCTION=true
```

### 2. تأكد من عدم وجود Dockerfile في مجلد web:
```bash
# احذف أي Dockerfile موجود في مجلد web
rm web/Dockerfile
```

### 3. إعادة النشر:
1. اذهب إلى Render Dashboard
2. اختر الخدمة
3. اذهب إلى Settings
4. تأكد من أن Environment مضبوط على `Node`
5. اضغط "Manual Deploy" -> "Deploy latest commit"

### 4. إذا استمرت المشكلة:
1. احذف الخدمة من Render
2. أنشئ خدمة جديدة
3. تأكد من اختيار `Node` وليس `Docker`

### 5. التحقق من package.json:
تأكد من وجود هذه السكريبتات في `web/package.json`:
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

## ملاحظة مهمة:
هذا المشروع **Next.js** يجب أن يُنشر كـ **Node.js application** وليس Docker container.
