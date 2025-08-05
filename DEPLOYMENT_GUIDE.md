# دليل النشر - نظام إدارة كنيسة مار جرجس

## ✅ حالة المشروع
المشروع **جاهز للنشر** بالكامل! 🚀

## 📦 ما تم إنجازه

### 🔧 الإعدادات التقنية
- ✅ تم إصلاح أخطاء البناء في Next.js
- ✅ تم تحديث إعدادات البيئة للإنتاج
- ✅ تم تكوين ملفات Docker و Render.yaml
- ✅ تم تحديث API للعمل مع الإنتاج
- ✅ تم إعداد CORS للنشر

### 🎯 المميزات المكتملة
- ✅ نظام المصادقة والتسجيل
- ✅ إدارة الأطفال والفصول
- ✅ تسجيل الحضور للأطفال والخدام
- ✅ الإحصائيات الأساسية والمتقدمة
- ✅ تقارير المواظبين (4 أسابيع متتالية)
- ✅ الافتقاد والمتابعة
- ✅ لوحة تحكم أمين الخدمة
- ✅ المتابعة الفردية للأطفال والخدام
- ✅ تصدير PDF و Excel
- ✅ واجهة عربية كاملة مع دعم RTL

## 🚀 خطوات النشر

### 1. النشر على Render.com

#### الباك إند (Backend):
```bash
Repository: https://github.com/YasaJaber/Church-Management-System
Build Command: cd backend && npm install
Start Command: cd backend && node index.js
Environment Variables:
- NODE_ENV=production
- MONGODB_URI=mongodb+srv://yasamasry:Yasa_jaber12345@marygerges.f7mwc5q.mongodb.net/margerges_church?retryWrites=true&w=majority&appName=maryGerges
- JWT_SECRET=mar_gerges_church_jwt_secret_2024
- PORT (will be set automatically by Render)
```

#### الواجهة الأمامية (Frontend):
```bash
Repository: https://github.com/YasaJaber/Church-Management-System
Build Command: cd web && npm install && npm run build
Start Command: cd web && npm start
Environment Variables:
- NODE_ENV=production
- NEXT_PUBLIC_API_URL=https://[your-backend-url]/api
```

### 2. الاستخدام المحلي

#### تشغيل الباك إند:
```bash
cd backend
npm install
npm start
```

#### تشغيل الواجهة الأمامية:
```bash
cd web
npm install
npm run build
npm start
```

## 📋 متطلبات النشر

### ✅ تم التحقق من:
- [x] MongoDB Atlas متصل وجاهز
- [x] متغيرات البيئة مُعدة بشكل صحيح
- [x] CORS مُكون للعمل مع النطاقات المختلفة
- [x] البناء يتم بنجاح بدون أخطاء
- [x] جميع الصفحات تعمل بشكل صحيح
- [x] API endpoints جميعها تعمل
- [x] نظام المصادقة يعمل

### 🔐 أدوار المستخدمين المدعومة:
- **Admin**: كامل الصلاحيات
- **Service Leader (أمين الخدمة)**: إدارة الخدام والإحصائيات المتقدمة
- **Class Teacher**: إدارة فصل محدد
- **Servant**: حضور وإحصائيات أساسية

## 🌐 URLs للإنتاج

### الباك إند:
```
https://church-management-system-b6h7.onrender.com
```

### الواجهة الأمامية:
```
https://church-management-web.onrender.com
```

## 📱 اختبار المشروع

### مستخدمين للاختبار:
```javascript
// Admin
username: "admin"
password: "admin123"

// Service Leader
username: "serviceLeader" 
password: "service123"

// Class Teacher
username: "teacher1"
password: "teacher123"
```

## 🎯 الخطوات التالية بعد النشر:

1. **تحديث URL الواجهة الأمامية** في إعدادات الباك إند
2. **اختبار جميع المميزات** على الإنتاج
3. **إضافة البيانات الفعلية** للكنيسة
4. **تدريب المستخدمين** على النظام
5. **إعداد النسخ الاحتياطية** التلقائية

## 🔧 استكشاف الأخطاء

### إذا واجهت مشاكل:
1. تحقق من متغيرات البيئة
2. تأكد من اتصال MongoDB Atlas
3. راجع logs في Render Dashboard
4. تحقق من CORS settings

---

## 🏆 المشروع مكتمل وجاهز للاستخدام!

تم تطوير نظام شامل لإدارة كنيسة مار جرجس بجميع المميزات المطلوبة. النظام يدعم العربية بالكامل ومُحسّن للاستخدام على جميع الأجهزة.

**استمتع باستخدام النظام! 🎉**
