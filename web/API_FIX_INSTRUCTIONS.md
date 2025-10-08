# إصلاح مشكلة رابط API الخاطئ

## API URL Fix Instructions

## المشكلة / Problem

الموقع يحاول الاتصال برابط خاطئ `church-management-system-1-i51l.onrender.com` بدلاً من الرابط الصحيح `church-management-system-b6h7.onrender.com`

## الحل / Solution

### 1. التحقق من متغيرات البيئة في منصة النشر

**إذا كان الموقع منشور على Vercel:**

1. اذهب إلى لوحة تحكم Vercel
2. اختر المشروع
3. اذهب إلى Settings → Environment Variables
4. تأكد من أن المتغيرات التالية محددة بشكل صحيح:
   ```
   NEXT_PUBLIC_API_URL = https://church-management-system-b6h7.onrender.com/api
   NEXT_PUBLIC_USE_PRODUCTION = true
   NODE_ENV = production
   ```

**إذا كان الموقع منشور على Render:**

1. اذهب إلى لوحة تحكم Render
2. اختر الخدمة (Service)
3. اذهب إلى Environment
4. أضف/عدل المتغيرات التالية:
   ```
   NEXT_PUBLIC_API_URL = https://church-management-system-b6h7.onrender.com/api
   NEXT_PUBLIC_USE_PRODUCTION = true
   NODE_ENV = production
   ```

### 2. إعادة النشر

بعد تحديث متغيرات البيئة، قم بإعادة نشر الموقع:

- في Vercel: سيتم إعادة النشر تلقائياً
- في Render: اضغط على "Manual Deploy" أو ادفع تحديث جديد للكود

### 3. التحقق من الإصلاح

1. افتح الموقع في المتصفح
2. افتح Developer Tools (F12)
3. اذهب إلى Console
4. ابحث عن رسائل مثل:
   ```
   🔧 API Configuration: { API_BASE_URL: "https://church-management-system-b6h7.onrender.com/api" }
   ```
5. تأكد من عدم وجود أخطاء تحتوي على `i51l`

### 4. إذا استمرت المشكلة

إذا كان الموقع لا يزال يستخدم الرابط الخاطئ:

1. **امسح الكاش:**

   - امسح كاش المتصفح
   - امسح كاش CDN إذا كنت تستخدم واحد

2. **تحقق من الكود المحلي:**

   ```bash
   cd web
   npm run build
   npm start
   ```

3. **ابحث عن الرابط الخاطئ في الكود:**
   ```bash
   grep -r "i51l" src/
   grep -r "church-management-system-1" src/
   ```

## الملفات التي تم إصلاحها / Fixed Files

- ✅ `src/config/api.ts` - إعدادات API الأساسية
- ✅ `src/services/api.ts` - خدمة API الرئيسية
- ✅ `vercel.json` - إعدادات النشر على Vercel
- ✅ `src/app/dashboard/page.tsx` - إضافة فحص للرابط الخاطئ

## ملاحظات مهمة / Important Notes

- الرابط الصحيح: `https://church-management-system-b6h7.onrender.com/api`
- الرابط الخاطئ: `https://church-management-system-1-i51l.onrender.com`
- تأكد من أن Backend يعمل على الرابط الصحيح
- إذا كان Backend منشور على رابط مختلف، حدث جميع الملفات بالرابط الجديد

## اختبار الاتصال / Connection Test

يمكنك اختبار الاتصال بـ Backend مباشرة:

```bash
curl https://church-management-system-b6h7.onrender.com/api
```

يجب أن ترى استجابة من الخادم (حتى لو كانت 404، المهم ألا تكون خطأ اتصال).
