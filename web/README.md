# Church Management System - Web Application

نظام إدارة كنيسة الشهيد مار جرجس - بأولاد علي - الإصدار الويب

## Overview / نظرة عامة

This is a complete web-based church management system built with Next.js 14, TypeScript, and Tailwind CSS. It provides comprehensive tools for managing church members, attendance tracking, statistics, and administrative functions.

هذا نظام شامل لإدارة الكنيسة مبني بتقنيات Next.js 14 و TypeScript و Tailwind CSS. يوفر أدوات شاملة لإدارة أعضاء الكنيسة وتتبع الحضور والإحصائيات والوظائف الإدارية.

## Features / المميزات

### ✅ Completed Features / المميزات المكتملة

- **🔐 Authentication System / نظام المصادقة**
  - User login/logout / تسجيل الدخول والخروج
  - Token-based authentication / مصادقة مبنية على الرمز المميز
  - Remember me functionality / خاصية تذكر المستخدم
  - Secure cookie and localStorage management / إدارة آمنة للكوكيز والتخزين المحلي

- **🎨 Modern UI/UX / واجهة مستخدم عصرية**
  - Responsive design with Tailwind CSS / تصميم متجاوب مع Tailwind CSS
  - RTL (Right-to-Left) support for Arabic / دعم الكتابة من اليمين لليسار للعربية
  - Toast notifications / إشعارات منبثقة
  - Loading states and error handling / حالات التحميل ومعالجة الأخطاء

- **📱 Web-First Architecture / هندسة معمارية تركز على الويب**
  - Next.js 14 with App Router / Next.js 14 مع App Router
  - TypeScript for type safety / TypeScript لأمان الأنواع
  - Server-side rendering / عرض من جانب الخادم
  - Optimized build and deployment / بناء ونشر محسن

### 🚧 In Development / تحت التطوير

- **👥 Children Management / إدارة الأطفال**
  - Add, edit, delete children records / إضافة وتعديل وحذف سجلات الأطفال
  - Class assignment / تخصيص الفصول
  - Search and filtering / البحث والتصفية

- **✅ Attendance Tracking / تتبع الحضور**
  - Daily attendance recording / تسجيل الحضور اليومي
  - Bulk attendance operations / عمليات الحضور المجمعة
  - Attendance history / تاريخ الحضور

- **📊 Statistics & Reports / الإحصائيات والتقارير**
  - Attendance statistics / إحصائيات الحضور
  - PDF export functionality / وظيفة تصدير PDF
  - Excel export functionality / وظيفة تصدير Excel

- **👨‍🏫 Servants Management / إدارة الخدام**
  - Servant profiles and assignments / ملفات الخدام والتكليفات
  - Performance tracking / تتبع الأداء

- **📚 Classes Management / إدارة الفصول**
  - Class creation and organization / إنشاء وتنظيم الفصول
  - Student-teacher assignments / تكليفات الطالب-المعلم

- **❤️ Pastoral Care / الرعاية الرعوية**
  - Special cases tracking / تتبع الحالات الخاصة
  - Care notes and follow-ups / ملاحظات الرعاية والمتابعة

## Tech Stack / المكدس التقني

### Frontend / الواجهة الأمامية
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React Hook Form** - Form management
- **React Hot Toast** - Notifications
- **Heroicons** - Icon library
- **js-cookie** - Cookie management

### Backend Integration / تكامل الخادم
- **Axios** - HTTP client
- **JWT Token Authentication** - Secure API access
- **RESTful API** - Backend communication

### Export & Reports / التصدير والتقارير
- **jsPDF** - PDF generation
- **xlsx** - Excel export
- **Custom PDF templates** - Arabic-supported reports

### Development Tools / أدوات التطوير
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## Installation & Setup / التثبيت والإعداد

### Prerequisites / المتطلبات المسبقة

```bash
# Node.js 18+ 
# npm or yarn
```

### Installation Steps / خطوات التثبيت

1. **Clone the repository / نسخ المستودع**
```bash
git clone <repository-url>
cd church-management-web
```

2. **Install dependencies / تثبيت التبعيات**
```bash
npm install
```

3. **Environment Setup / إعداد البيئة**
```bash
# Create .env.local file
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NODE_ENV=development
```

4. **Start development server / تشغيل خادم التطوير**
```bash
npm run dev
```

5. **Open browser / فتح المتصفح**
```
http://localhost:3000
```

## Project Structure / هيكل المشروع

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard page
│   ├── login/            # Login page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/            # Reusable components
│   └── ui/               # UI components
├── context/              # React Context providers
│   ├── AuthContext.tsx   # Authentication context
│   └── NotificationContext.tsx
├── services/             # API services
│   └── api.ts           # API client
├── types/               # TypeScript type definitions
│   └── User.ts          # User types
└── utils/               # Utility functions
```

## Available Scripts / الأوامر المتاحة

```bash
# Development server / خادم التطوير
npm run dev

# Production build / بناء الإنتاج
npm run build

# Start production server / تشغيل خادم الإنتاج
npm start

# Type checking / فحص الأنواع
npm run type-check

# Linting / فحص الكود
npm run lint
```

## Backend Integration / تكامل الخادم

The application integrates with the existing Node.js/Express backend:

- **Authentication**: `/api/auth/login`, `/api/auth/me`
- **Children**: `/api/children/*`
- **Attendance**: `/api/attendance/*`
- **Statistics**: `/api/statistics/*`
- **Classes**: `/api/classes/*`
- **Servants**: `/api/servants/*`
- **Pastoral Care**: `/api/pastoral-care/*`

## Deployment / النشر

### Production Build / بناء الإنتاج

```bash
npm run build
npm start
```

### Environment Variables / متغيرات البيئة

```bash
NEXT_PUBLIC_API_URL=https://your-backend-api.com/api
NODE_ENV=production
```

## Development Status / حالة التطوير

### Phase 1: Foundation ✅ Completed
- [x] Project setup with Next.js 14
- [x] TypeScript configuration  
- [x] Tailwind CSS setup
- [x] Authentication system
- [x] API client configuration
- [x] Basic routing structure
- [x] Toast notifications
- [x] Loading components

### Phase 2: Core Features 🚧 In Progress
- [ ] Login page refinement
- [ ] Dashboard implementation
- [ ] Children management pages
- [ ] Attendance recording interface
- [ ] Statistics dashboard

### Phase 3: Advanced Features 📋 Planned
- [ ] PDF report generation
- [ ] Excel export functionality
- [ ] Advanced search and filtering
- [ ] Bulk operations
- [ ] User management
- [ ] Settings page

## Contributing / المساهمة

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License / الترخيص

This project is developed for Church Management purposes.

## Contact / التواصل

For questions or support regarding this church management system, please contact the development team.

---

**نظام إدارة كنيسة الشهيد مار جرجس - بأولاد علي - الإصدار 1.0**
**St. George Church Management System - Version 1.0**
