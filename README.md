# Church Management System 🏛️

**🌐 Live Demo**: [https://church-management-system-1-i51l.onrender.com/](https://church-management-system-1-i51l.onrender.com/)

A comprehensive church management system for Sunday Schools (مدارس الأحد) with robust attendance tracking, pastoral care, and advanced analytics features. Built for **Saint George Church (كنيسة الشهيد مار جرجس - بأولاد علي)** with full support for Arabic content and RTL layout.

---

## 🌟 Features Overview

### 👥 User Management
- **Multi-role Authentication System**
  - Admin (مدير النظام)
  - Service Leader (أمين الخدمة)
  - Class Teacher (مدرس الفصل)
  - Servant (خادم)
- JWT-based authentication with secure password hashing (bcrypt)
- Role-based access control (RBAC)
- User profile management with phone and class assignments

### 📚 Class Management
- **Educational Stages Support**
  - Nursery (حضانة)
  - Primary (ابتدائي)
  - Preparatory (إعدادي)
  - Secondary (ثانوي)
  - Coaching (كوتشينج)
- Class organization with grade levels
- Teacher/servant assignment to classes
- Class ordering and descriptions
- Active/inactive status management

### 👶 Children Management
- Complete child records with:
  - Name, phone, parent name
  - Stage and grade
  - Class assignment
  - Notes and status
- Validation for data integrity
- Phone number format validation
- Active/inactive child status tracking

### 📊 Attendance System
- **Child Attendance Tracking**
  - Present/Absent status recording
  - Date-based attendance logs
  - Class-wise attendance tracking
  - Notes for each attendance record
- **Servant Attendance Tracking**
  - Present/Absent/Excused status
  - Individual servant tracking
  - Marked by user tracking
  - Date-indexed records
- Duplicate prevention with compound indexes
- Historical attendance data
- Quick filtering by date and status

### 📈 Advanced Statistics & Analytics
- **Comprehensive Dashboards**
  - Service Leader Dashboard (لوحة أمين الخدمة)
  - Teacher Dashboard (لوحة المدرس)
- **Attendance Analytics**
  - Overall attendance rates
  - Class-wise comparisons
  - Trend analysis over time
  - Individual student tracking
- **Consecutive Attendance Tracking**
  - Child consecutive weeks tracking
  - Servant consecutive weeks tracking
  - Gift eligibility monitoring (4 consecutive weeks)
  - Attendance streak calculations
- **Individual Tracking Pages**
  - Detailed student attendance history
  - Performance metrics
  - Visual charts and graphs (Chart.js)
  - Export capabilities

### 💝 Pastoral Care System
- **Absence Follow-up Management**
  - Automatic detection of absent children
  - Pastoral care list generation
  - Call tracking and notes
  - Multiple removal reasons:
    - Child attended (حضر)
    - Family contacted (تم الاتصال)
    - Manual removal (إزالة يدوية)
- **Follow-up Workflow**
  - Add to pastoral care on absence
  - Mark as called with notes
  - Track who called and when
  - Auto-remove on attendance
- **Servants Follow-up**
  - Dedicated servant pastoral care
  - Absence tracking for servants
  - Contact management

### 🎁 Gift Delivery System
- **Attendance Rewards**
  - Track consecutive attendance weeks
  - Gift delivery records for children
  - Gift delivery records for servants
  - Minimum 4 consecutive weeks for gift eligibility
- **Gift Management**
  - Record delivered gifts
  - Delivery date tracking
  - Gift type customization
  - Notes for special cases
  - Reset markers (0 weeks for streak resets)

### 📄 Advanced Export Features
- **PDF Export System**
  - Beautiful Arabic-formatted PDFs
  - Right-to-left (RTL) layout
  - Color-coded status indicators:
    - 🔴 Red: Absent
    - 🟢 Green: Present
    - 🟡 Orange: Late
  - Professional header and footer
  - Summary statistics in PDF
- **Role-based Export Access**
  - Teachers: Export their class only
  - Service Leaders/Admins: Export any class
  - Date range selection
  - Smart filtering (shows only absence records)
- **Export Capabilities**
  - Excel export (ExcelJS)
  - PDF generation with custom styling
  - Arabic font support in exports
  - Date formatting in Arabic locale

### 📊 Statistics Pages
- **Fresh Statistics Dashboard**
  - Real-time data aggregation
  - Class performance comparison
  - Attendance percentage calculations
  - Visual charts with Recharts & Chart.js
- **Advanced Statistics**
  - Multi-dimensional data analysis
  - Time-series attendance trends
  - Servant performance metrics
  - Customizable date ranges
  - Interactive filtering

### 🎨 Modern UI/UX
- **Tech Stack**
  - Next.js 14 with App Router
  - React 18 with TypeScript
  - Tailwind CSS for styling
  - Headless UI components
  - Hero Icons
  - Lucide React icons
- **Features**
  - Fully responsive design
  - Dark mode support (church theme)
  - Toast notifications (react-hot-toast)
  - Loading states with spinners
  - Form validation with React Hook Form + Zod
  - Date pickers for easy date selection
- **Arabic Support**
  - Full RTL layout support
  - Arabic fonts (Tajawal)
  - Arabic date formatting (date-fns)
  - Bilingual content support

### 🔒 Security Features
- JWT token-based authentication
- Password hashing with bcrypt
- Secure HTTP headers configuration
- CORS with whitelist origins
- XSS protection headers
- Request size limits (10MB)
- Protected by Mongoose parameterization
- Environment variable management

---

## 🏗️ Architecture

### Backend (Node.js + Express)
```
backend/
├── config/               # Database & environment configs
├── models/              # Mongoose data models
│   ├── User.js         # User accounts
│   ├── Child.js        # Children records
│   ├── Class.js        # Class information
│   ├── Attendance.js   # Attendance records
│   ├── ServantAttendance.js  # Servant attendance
│   ├── PastoralCare.js # Pastoral care tracking
│   └── GiftDelivery.js # Gift delivery records
├── routes/             # API endpoints
│   ├── auth.js        # Authentication
│   ├── children.js    # Children CRUD
│   ├── classes.js     # Classes CRUD
│   ├── attendance.js  # Attendance management
│   ├── servants.js    # Servant management
│   ├── servants-attendance.js  # Servant attendance
│   ├── pastoral-care.js        # Pastoral care
│   ├── statistics.js           # Statistics API
│   ├── statistics-fresh.js     # Fresh stats API
│   └── advanced-statistics.js  # Advanced analytics
├── middleware/
│   └── auth.js        # JWT verification
├── scripts/           # Database utilities
└── index.js           # Main server file
```

### Frontend (Next.js + React)
```
web/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── login/             # Login page
│   │   ├── dashboard/         # Main dashboard
│   │   ├── children/          # Children management
│   │   ├── classes/           # Class management
│   │   ├── attendance/        # Attendance marking
│   │   ├── servants/          # Servant management
│   │   ├── servants-attendance/     # Servant attendance
│   │   ├── pastoral-care/           # Pastoral care
│   │   ├── statistics/              # Statistics dashboard
│   │   ├── advanced-statistics/     # Advanced analytics
│   │   ├── export-attendance/       # PDF export
│   │   ├── consecutive-attendance/  # Consecutive tracking
│   │   ├── servants-consecutive-attendance/  # Servant streaks
│   │   ├── children-tracking/       # Child tracking
│   │   ├── individual-tracking/     # Individual stats
│   │   ├── servants-tracking/       # Servant tracking
│   │   ├── servants-follow-up/      # Servant pastoral care
│   │   └── service-leader-dashboard/  # Leader dashboard
│   ├── components/            # React components
│   │   ├── AttendanceModal.tsx
│   │   ├── ServantsAttendanceModal.tsx
│   │   ├── ExportAttendanceTeacher.tsx
│   │   ├── ExportAttendanceAdmin.tsx
│   │   ├── Charts.tsx
│   │   ├── AdvancedCharts.tsx
│   │   └── ui/               # UI components
│   ├── context/              # React Context
│   │   ├── AuthContext.tsx
│   │   ├── AuthContextSimple.tsx
│   │   └── NotificationContext.tsx
│   ├── services/             # API services
│   │   ├── api.ts
│   │   └── attendanceExportService.ts
│   ├── utils/                # Utility functions
│   │   ├── exportToPDF.ts   # PDF generation
│   │   ├── storage.ts       # LocalStorage helpers
│   │   └── authHelper.ts    # Auth utilities
│   ├── types/                # TypeScript types
│   └── hooks/                # Custom React hooks
└── public/                   # Static assets
    ├── favicon.ico
    └── saint-george.png      # Church icon
```

---

## 🚀 Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Validation**: express-validator
- **File Processing**: 
  - ExcelJS (Excel generation)
  - PDFKit & PDFMake (PDF generation)
  - XLSX (Excel parsing)
  - Multer (File uploads)
- **Date Handling**: date-fns & date-fns-tz
- **HTTP Client**: Axios
- **CORS**: cors middleware

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.x
- **UI Components**:
  - Headless UI (accessible components)
  - Tailwind Forms plugin
  - Hero Icons
  - Lucide React
- **Charts**: 
  - Chart.js 4.x
  - react-chartjs-2
  - Recharts
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: date-fns & react-datepicker
- **State Management**: 
  - Zustand (lightweight state)
  - SWR (data fetching)
  - React Context
- **HTTP Client**: Axios
- **Notifications**: react-hot-toast
- **PDF Generation**: 
  - html2canvas
  - html2pdf.js
  - jsPDF + jspdf-autotable
- **Excel**: XLSX
- **Real-time**: Socket.io-client
- **Storage**: js-cookie

---

## 📱 Usage Guide

### User Roles & Permissions

#### Admin (مدير النظام)
- Full system access
- User management (create, edit, delete)
- All class management
- All statistics and reports
- System configuration

#### Service Leader (أمين الخدمة)
- View all classes and students
- Export any class attendance
- Advanced statistics for all classes
- Pastoral care oversight
- Gift delivery tracking

#### Class Teacher (مدرس الفصل)
- Manage assigned class only
- Mark attendance for class
- View class statistics
- Export class reports
- Access student records

#### Servant (خادم)
- View assigned class
- Limited attendance marking
- Basic statistics
- Student information access

### Common Workflows

#### 1. Mark Attendance
1. Navigate to **Attendance** page
2. Select date
3. Choose class (if multiple)
4. Mark each student as Present/Absent
5. Add notes if needed
6. Save attendance

#### 2. Pastoral Care Follow-up
1. System auto-adds absent children
2. Go to **Pastoral Care** page
3. View list of children needing calls
4. Mark as called and add notes
5. System auto-removes when child returns

#### 3. Generate Reports
1. Go to **Export Attendance** page
2. Select date range
3. Choose class (if admin/service leader)
4. Click **Export PDF**
5. Download beautiful Arabic PDF

#### 4. Track Consecutive Attendance
1. Visit **Consecutive Attendance** page
2. View streak for each child/servant
3. Check gift eligibility (4+ weeks)
4. Record gift delivery
5. Reset streaks after gift delivery

#### 5. View Statistics
1. Go to **Statistics** or **Advanced Statistics**
2. Select date range
3. Filter by class/stage
4. View charts and metrics
5. Export data if needed

---

## 🎯 Key Features Explained

### Gift Eligibility System
- Tracks consecutive weeks of attendance
- Automatically calculates streaks
- Highlights children/servants eligible for gifts (4+ weeks)
- Records gift delivery with date and type
- Allows manual reset of streaks (0 weeks marker)

### Smart Pastoral Care
- **Auto-addition**: Absent children automatically added to list
- **Auto-removal**: Children removed when they attend
- **Call tracking**: Record who called, when, and outcome
- **Notes system**: Store detailed follow-up information
- **Multi-stage**: Track multiple absences per child

### Advanced Analytics
- **Trend Analysis**: Week-over-week attendance trends
- **Class Comparison**: Compare performance across classes
- **Individual Tracking**: Deep dive into each student's history
- **Servant Performance**: Track servant attendance patterns
- **Visual Charts**: Interactive graphs with Chart.js & Recharts
- **Date Filtering**: Custom date range selection

### PDF Export Features
- **Beautiful Design**: Professional Arabic formatting
- **Color Coding**: Red (absent), Green (present), Orange (late)
- **Smart Filtering**: Shows only days with absences
- **Summary Stats**: Total records, absences, late arrivals
- **Church Branding**: Custom header with church name
- **Date Formatting**: Arabic locale dates

---

## 📊 Database Schema

### Collections Overview
- **users**: System users with roles
- **children**: Student records
- **classes**: Class organization
- **attendances**: Attendance records (children & servants)
- **servantattendances**: Dedicated servant attendance
- **pastoralcares**: Pastoral care follow-up list
- **giftdeliveries**: Gift delivery tracking

### Key Indexes
- `{ person: 1, date: 1, type: 1 }` - Attendance uniqueness
- `{ child: 1, absentDate: 1 }` - Pastoral care lookup
- `{ servantId: 1, date: 1 }` - Servant attendance uniqueness
- `{ stage: 1, grade: 1 }` - Class uniqueness

---

## 📈 Performance Optimization

- Database indexes on frequently queried fields
- Pagination for large lists
- Lazy loading of components
- Image optimization with Next.js
- API response caching with SWR
- MongoDB aggregation pipelines for statistics
- Efficient date filtering with indexed queries

---

## 📝 License

MIT License - Open Source

---

**Version**: 1.0  
**Last Updated**: November 2025  
**Status**: Production Ready ✅

---

**Built with modern web technologies for a modern church management experience.** 🏛️✨
