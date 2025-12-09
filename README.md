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
  - **Dark Mode Support**: 
    - System preference detection (prefers-color-scheme)
    - Manual toggle with persistent settings (localStorage)
    - Smooth transitions between themes
    - Floating theme toggle button (bottom-left)
    - No flash on page load (SSR-optimized)
    - Context-based theme management (ThemeContext)
    - Tailwind's class-based dark mode
  - **Error Boundary**: 
    - Graceful error recovery (prevents white screen crashes)
    - Arabic error messages with recovery options
    - Reload page and home navigation buttons
    - Error logging for debugging
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

#### Authentication & Authorization
- **JWT Token-based Authentication**
  - Secure token generation with configurable expiry
  - Bearer token validation on protected routes
  - Role-based access control (RBAC)
  - Token refresh mechanism support
- **Password Security**
  - Bcrypt hashing with salt rounds = 10
  - Pre-save middleware for automatic hashing
  - Strong password generation for new servants (12+ characters)
  - No default passwords - each servant gets unique secure password
  - Password validation requirements (uppercase, lowercase, numbers, symbols)

#### HTTP Security Headers (Helmet.js)
- **XSS Protection**: Browser-level cross-site scripting filtering
- **Clickjacking Protection**: X-Frame-Options: DENY prevents iframe embedding
- **MIME Sniffing Protection**: X-Content-Type-Options: nosniff
- **Content Security Policy (CSP)**: Strict policies for trusted content sources
- **HSTS**: HTTP Strict Transport Security enforces HTTPS
- **Referrer Policy**: Controls referrer information leakage
- **DNS Prefetch Control**: Prevents DNS prefetching
- **Hidden Server Info**: X-Powered-By header removed
- **Cross-Domain Policies**: Restricts Flash/PDF cross-domain access

#### Rate Limiting & DDoS Protection
- **General Rate Limiter**: 100 requests per 15 minutes per IP
- **Auth Rate Limiter**: 5 login attempts per 15 minutes (brute force protection)
- **API Rate Limiter**: 200 API requests per 15 minutes
- **Speed Limiter**: Gradual delay after 50 requests (500ms incremental delays)
- **Automatic Lockout**: Temporary IP blocking on limit exceed
- **Smart Headers**: RateLimit-* headers for client awareness

#### Error Handling & Logging
- **Centralized Error Handler**: 
  - Custom error classes (ValidationError, AuthenticationError, NotFoundError, etc.)
  - Clear Arabic error messages for users
  - Secure error logging without sensitive data exposure
  - Environment-specific responses (detailed in dev, generic in prod)
- **Async Error Handler**: Wrapper for async route handlers
- **Mongoose Error Handling**:
  - Duplicate key errors (11000) with field-specific messages
  - Cast errors with clear invalid ID messages
  - Validation errors with Arabic feedback
- **JWT Error Handling**:
  - JsonWebTokenError: "رمز المصادقة غير صحيح"
  - TokenExpiredError: "انتهت صلاحية رمز المصادقة"

#### Advanced Logging System (Winston)
- **Secure Logging**:
  - Automatic data sanitization (passwords, tokens, API keys redacted)
  - Daily log rotation (14-day retention)
  - Separate error and combined logs
  - Log levels: error, warn, info, http, debug
  - Console output only in development mode
  - Structured JSON logging for production
- **HTTP Request Logging**:
  - Request/response tracking with duration
  - IP address and user agent logging
  - Sanitized request body logging
  - No sensitive data in logs
- **Frontend Logging**:
  - Development-only console logs
  - Automatic sensitive data redaction
  - Replaced 190+ unsafe console.log calls in critical files

#### Data Protection
- **CORS Configuration**:
  - Whitelist-only origins (no wildcards in production)
  - Credentials enabled for trusted origins
  - Specific allowed headers: Content-Type, Authorization
  - Methods: GET, POST, PUT, DELETE, OPTIONS
- **Request Validation**:
  - Request size limits (10MB maximum)
  - JSON body parsing with size limits
  - URL-encoded body parsing with limits
- **Input Validation Middleware**:
  - Centralized validation for all API endpoints
  - Arabic error messages for validation failures
  - XSS protection (sanitizes HTML and JavaScript)
  - ObjectId validation before database queries
  - Date format validation (YYYY-MM-DD)
  - Applied to: auth, children, attendance, classes routes
- **Database Security**:
  - Mongoose parameterization prevents basic NoSQL injection
  - Password fields excluded from queries (.select("-password"))
  - Manual password removal from API responses
  - MongoDB connection with authentication

#### Environment & Configuration Security
- **Environment Variables**: Sensitive data in .env (not committed)
- **Secrets Management**: JWT_SECRET, MONGODB_URI stored securely
- **Production Configuration**: 
  - Secure cookies (httpOnly, sameSite)
  - HTTPS enforcement in production
  - Debug mode disabled in production

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
│   ├── auth.js         # JWT verification
│   ├── errorHandler.js # Global error handling
│   ├── helmet.config.js # Security headers configuration
│   ├── rateLimiter.js  # Rate limiting rules
│   ├── httpLogger.js   # HTTP request/response logging
│   └── validator.js    # Input validation & sanitization
├── utils/               # Utility functions
│   ├── logger.js        # Winston logger with sanitization
│   ├── errors.js        # Custom error classes
│   └── passwordGenerator.js # Secure password generation
├── scripts/            # Database utilities
├── logs/               # Application logs (gitignored)
│   ├── error-*.log     # Error logs (daily rotation)
│   └── combined-*.log  # Combined logs (daily rotation)
└── index.js            # Main server file
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
│   │   ├── ErrorBoundary.tsx  # Global error handling component
│   │   └── ui/               # UI components
│   │       └── ThemeToggle.tsx     # Dark mode toggle button
│   ├── context/              # React Context
│   │   ├── AuthContext.tsx
│   │   ├── AuthContextSimple.tsx
│   │   ├── ThemeContext.tsx         # Dark mode theme management
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
- **Security**:
  - helmet (HTTP security headers)
  - express-rate-limit (Rate limiting)
  - express-slow-down (Speed limiting)
  - bcrypt (Password hashing)
  - jsonwebtoken (JWT authentication)
- **Logging**: 
  - winston (Advanced logging)
  - winston-daily-rotate-file (Log rotation)
- **Error Handling**: Custom error classes and middleware
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
- **Response Compression**: Gzip compression for all API responses (60-80% size reduction)

---

## 📝 License

MIT License - Open Source

---

**Version**: 1.0  
**Last Updated**: December 2025  
**Status**: Production Ready ✅

---

**Built with modern web technologies for a modern church management experience.** 🏛️✨
