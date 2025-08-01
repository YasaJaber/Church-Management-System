# 🏛️ نظام إدارة كنيسة مار جرجس

نظام إدارة شامل لإدارة أنشطة الكنيسة والأطفال والحضور - موقع ويب متكامل.

## 🚀 المميزات

- **إدارة المستخدمين**: نظام مصادقة متقدم مع أدوار مختلفة
- **إدارة الأطفال**: تسجيل ومتابعة الأطفال في الفصول المختلفة  
- **إدارة الفصول**: تنظيم الفصول وتعيين المدرسين
- **تتبع الحضور**: نظام تسجيل حضور شامل مع إحصائيات
- **الرعاية الرعوية**: متابعة الرعاية الرعوية للأطفال
- **إحصائيات متقدمة**: تقارير وإحصائيات شاملة

## 🛠️ التقنيات المستخدمة

### Frontend (الموقع)

- **Next.js 14**: إطار عمل React للويب
- **TypeScript**: للكتابة الآمنة
- **Tailwind CSS**: للتصميم الحديث والاستجابة
- **React Hot Toast**: للإشعارات التفاعلية
- **Heroicons**: للأيقونات

### Backend (الخادم)

- **Node.js**: بيئة تشغيل JavaScript
- **Express.js**: إطار عمل الخادم السريع
- **MongoDB Atlas**: قاعدة البيانات السحابية
- **Mongoose**: للتعامل مع MongoDB
- **JWT**: للمصادقة والحماية
- **bcrypt**: لتشفير كلمات المرور
- **CORS**: للسماح بطلبات متعددة المصادر

## 🏃‍♂️ تشغيل المشروع

### 1. تشغيل الخادم (Backend)

```bash
cd backend
npm install
npm start
```

### 2. تشغيل الموقع (Frontend)

```bash
cd web
npm install
npm run dev
```

## 📋 الأدوار والصلاحيات

- **الإداري (admin)**: صلاحيات كاملة على النظام
- **أمين الخدمة (serviceLeader)**: إدارة الأطفال والفصول والإحصائيات
- **مدرس الفصل (classTeacher)**: إدارة أطفال فصله المخصص
- **الخادم (servant)**: عرض أطفال فصله فقط

## 🌐 الوصول للنظام

- **الموقع**: `http://localhost:3000`
- **API**: `http://localhost:5000`

## 📱 مميزات تقنية

- واجهة مستخدم حديثة ومتجاوبة مع جميع الأجهزة
- دعم كامل للغة العربية مع النصوص من اليمين إلى اليسار
- نظام حماية متقدم مع JWT tokens
- تشفير كلمات المرور بـ bcrypt
- قاعدة بيانات MongoDB Atlas السحابية
- نظام إشعارات تفاعلي
- تصميم Material Design مع Tailwind CSS

## 🚀 النشر والإنتاج

المشروع مُعد للنشر على منصات مثل:

- **Vercel** (للموقع)
- **Render** (للخادم)
- **MongoDB Atlas** (قاعدة البيانات)

## 📁 هيكل المشروع

```text
📁 Church-Management-System/
├── 📁 backend/          # Node.js API Server
│   ├── 📁 models/       # MongoDB Models
│   ├── 📁 routes/       # API Routes
│   ├── 📁 middleware/   # Authentication & CORS
│   └── 📄 index-fixed.js # Main Server File
├── 📁 web/             # Next.js Website
│   ├── 📁 src/app/     # App Router Pages
│   ├── 📁 src/components/ # React Components
│   ├── 📁 src/context/ # React Context
│   └── 📁 src/services/ # API Services
└── 📄 README.md        # Documentation
```

---

**تم تطوير هذا النظام لخدمة كنيسة مار جرجس** 🏛️

**نوع المشروع**: موقع ويب متكامل | **التقنية**: Next.js + Node.js + MongoDB
