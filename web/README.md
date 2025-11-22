# Church Management System - Web Frontend 🌐

A modern, responsive web application for **Saint George Church (كنيسة الشهيد مار جرجس - بأولاد علي)** Sunday School management. Built with Next.js 14, TypeScript, and Tailwind CSS with full Arabic RTL support.

---

## 🌟 Features Overview

### 🔐 Authentication & User Management
- **Multi-role Support**
  - Admin (مدير النظام)
  - Service Leader (أمين الخدمة)
  - Class Teacher (مدرس الفصل)
  - Servant (خادم)
- JWT-based secure authentication
- Token refresh and session management
- Remember me functionality
- Secure cookie and localStorage handling
- Role-based UI rendering
- Protected routes with middleware

### 🎨 Modern UI/UX Design
- **Responsive Design**
  - Mobile-first approach
  - Tablet and desktop optimized
  - Touch-friendly interfaces
  - Adaptive layouts
- **Arabic Support**
  - Full RTL (Right-to-Left) layout
  - Arabic fonts (Tajawal)
  - Bilingual content (Arabic/English)
  - Arabic date formatting
- **Visual Excellence**
  - Church-themed color scheme
  - Smooth animations and transitions
  - Loading states with spinners
  - Toast notifications (react-hot-toast)
  - Modal dialogs
  - Dropdown menus
  - Form validation feedback

### 👶 Children Management Interface
- **CRUD Operations**
  - Add new children with validation
  - Edit existing records
  - Delete with confirmation
  - Bulk operations support
- **Advanced Features**
  - Search and filtering
  - Class assignment
  - Stage and grade organization
  - Parent information
  - Phone number validation
  - Active/inactive status toggle
  - Notes and comments
- **Data Display**
  - Sortable tables
  - Pagination
  - Quick filters
  - Export capabilities

### 📊 Attendance Management
- **Child Attendance**
  - Daily attendance marking
  - Present/Absent status
  - Class-wise attendance
  - Date picker for easy selection
  - Bulk mark all present/absent
  - Individual notes per record
  - Attendance history view
- **Servant Attendance**
  - Dedicated servant tracking
  - Present/Absent/Excused status
  - Quick marking interface
  - Performance tracking
  - Consecutive attendance streaks
- **Attendance Features**
  - Modal-based marking
  - Real-time updates
  - Duplicate prevention
  - Historical data access
  - Filter by date range
  - Export attendance reports

### 📈 Statistics & Analytics Dashboards
- **Fresh Statistics Dashboard**
  - Real-time data aggregation
  - Class performance comparison
  - Attendance percentage calculations
  - Visual charts (Chart.js)
  - Date range selection
  - Interactive filtering
- **Advanced Statistics**
  - Multi-dimensional analysis
  - Time-series trends
  - Servant performance metrics
  - Customizable date ranges
  - Export capabilities
  - Recharts integration
- **Individual Tracking**
  - Student attendance history
  - Performance metrics
  - Visual progress charts
  - Detailed analytics
  - Personal statistics

### 💝 Pastoral Care System
- **Absence Follow-up**
  - Auto-detection of absent children
  - Pastoral care list generation
  - Call tracking and notes
  - Follow-up workflow
  - Removal reasons tracking
  - Auto-remove on attendance
- **Servants Follow-up**
  - Dedicated servant pastoral care
  - Absence tracking
  - Contact management
  - Notes and history
- **Care Management**
  - Mark as called
  - Add detailed notes
  - Track who called and when
  - Multiple removal reasons
  - Historical records

### 🎁 Gift Delivery Tracking
- **Consecutive Attendance**
  - Track attendance streaks
  - Child consecutive weeks
  - Servant consecutive weeks
  - Gift eligibility (4+ weeks)
  - Visual streak indicators
- **Gift Management**
  - Record delivered gifts
  - Delivery date tracking
  - Gift type customization
  - Notes for special cases
  - Reset streak markers
  - Bulk gift delivery

### 📄 Export & Reporting Features
- **PDF Export System**
  - Beautiful Arabic-formatted PDFs
  - RTL layout support
  - Color-coded status indicators:
    - 🔴 Red: Absent
    - 🟢 Green: Present
    - 🟡 Orange: Late
  - Professional headers and footers
  - Church branding
  - Summary statistics
  - Date range selection
- **Role-based Export**
  - Teachers: Export their class only
  - Service Leaders/Admins: Export any class
  - Smart filtering (absence records)
  - Custom date ranges
- **Export Formats**
  - PDF generation (jsPDF + jspdf-autotable)
  - Excel export (XLSX)
  - HTML to PDF conversion
  - Arabic font support
  - Print-optimized layouts

### 📊 Dashboard Pages
- **Service Leader Dashboard**
  - Overview of all classes
  - Attendance summaries
  - Quick statistics
  - Recent activity
  - Alerts and notifications
- **Teacher Dashboard**
  - Class-specific view
  - Student list
  - Attendance quick access
  - Class statistics
  - Upcoming events
- **Main Dashboard**
  - Role-based content
  - Quick actions
  - Recent updates
  - Navigation shortcuts
  - System notifications

### 🔍 Advanced Search & Filtering
- **Smart Search**
  - Real-time search
  - Multiple field search
  - Fuzzy matching
  - Search history
- **Filtering Options**
  - By class
  - By stage
  - By grade
  - By status
  - By date range
  - Custom filters
- **Sorting**
  - Multiple column sorting
  - Ascending/descending
  - Custom sort orders
  - Save sort preferences

### 🎯 Class Management
- **Class Organization**
  - Educational stages support:
    - Nursery (حضانة)
    - Primary (ابتدائي)
    - Preparatory (إعدادي)
    - Secondary (ثانوي)
    - Coaching (كوتشينج)
  - Grade levels
  - Class descriptions
  - Teacher assignments
  - Student lists
  - Active/inactive status
- **Class Features**
  - Class ordering
  - Capacity management
  - Schedule information
  - Class notes
  - Performance tracking

### 👨‍🏫 Servants Management
- **Servant Profiles**
  - Personal information
  - Contact details
  - Class assignments
  - Role management
  - Performance tracking
- **Servant Features**
  - Attendance tracking
  - Consecutive weeks
  - Gift eligibility
  - Follow-up management
  - Notes and comments

---

## 🏗️ Frontend Architecture

### Application Structure
```
web/
├── src/
│   ├── app/                           # Next.js 14 App Router
│   │   ├── (auth)/                   # Auth group
│   │   │   └── login/                # Login page
│   │   ├── (dashboard)/              # Dashboard group
│   │   │   ├── dashboard/            # Main dashboard
│   │   │   ├── children/             # Children management
│   │   │   ├── classes/              # Class management
│   │   │   ├── attendance/           # Attendance marking
│   │   │   ├── servants/             # Servant management
│   │   │   ├── servants-attendance/  # Servant attendance
│   │   │   ├── pastoral-care/        # Pastoral care
│   │   │   ├── statistics/           # Statistics dashboard
│   │   │   ├── advanced-statistics/  # Advanced analytics
│   │   │   ├── export-attendance/    # PDF export
│   │   │   ├── consecutive-attendance/        # Consecutive tracking
│   │   │   ├── servants-consecutive-attendance/  # Servant streaks
│   │   │   ├── children-tracking/    # Child tracking
│   │   │   ├── individual-tracking/  # Individual stats
│   │   │   ├── servants-tracking/    # Servant tracking
│   │   │   ├── servants-follow-up/   # Servant pastoral care
│   │   │   └── service-leader-dashboard/  # Leader dashboard
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page
│   │   └── globals.css               # Global styles
│   ├── components/                    # React components
│   │   ├── AttendanceModal.tsx       # Attendance marking modal
│   │   ├── ServantsAttendanceModal.tsx  # Servant attendance modal
│   │   ├── ExportAttendanceTeacher.tsx  # Teacher export component
│   │   ├── ExportAttendanceAdmin.tsx    # Admin export component
│   │   ├── Charts.tsx                # Chart components
│   │   ├── AdvancedCharts.tsx        # Advanced charts
│   │   ├── Navbar.tsx                # Navigation bar
│   │   ├── Sidebar.tsx               # Sidebar navigation
│   │   ├── LoadingSpinner.tsx        # Loading component
│   │   └── ui/                       # UI components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── Table.tsx
│   │       └── Card.tsx
│   ├── context/                      # React Context
│   │   ├── AuthContext.tsx           # Authentication context
│   │   ├── AuthContextSimple.tsx     # Simplified auth context
│   │   └── NotificationContext.tsx   # Notification context
│   ├── services/                     # API services
│   │   ├── api.ts                    # Main API client
│   │   ├── attendanceExportService.ts  # Export service
│   │   ├── authService.ts            # Auth service
│   │   ├── childrenService.ts        # Children service
│   │   ├── classesService.ts         # Classes service
│   │   ├── statisticsService.ts      # Statistics service
│   │   └── pastoralCareService.ts    # Pastoral care service
│   ├── utils/                        # Utility functions
│   │   ├── exportToPDF.ts            # PDF generation
│   │   ├── storage.ts                # LocalStorage helpers
│   │   ├── authHelper.ts             # Auth utilities
│   │   ├── dateFormatter.ts          # Date formatting
│   │   └── validators.ts             # Form validators
│   ├── types/                        # TypeScript types
│   │   ├── User.ts                   # User types
│   │   ├── Child.ts                  # Child types
│   │   ├── Class.ts                  # Class types
│   │   ├── Attendance.ts             # Attendance types
│   │   ├── Statistics.ts             # Statistics types
│   │   └── index.ts                  # Type exports
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAuth.ts                # Auth hook
│   │   ├── useLocalStorage.ts        # LocalStorage hook
│   │   ├── useDebounce.ts            # Debounce hook
│   │   └── useFetch.ts               # Data fetching hook
│   └── middleware.ts                 # Next.js middleware
├── public/                           # Static assets
│   ├── favicon.ico                   # Favicon
│   ├── saint-george.png              # Church icon
│   └── images/                       # Image assets
├── .env.local                        # Environment variables
├── next.config.js                    # Next.js configuration
├── tailwind.config.js                # Tailwind CSS config
├── tsconfig.json                     # TypeScript config
└── package.json                      # Dependencies
```

### Component Architecture
- **Atomic Design Pattern**
  - Atoms: Basic UI elements (Button, Input)
  - Molecules: Simple components (SearchBar, DatePicker)
  - Organisms: Complex components (AttendanceModal, DataTable)
  - Templates: Page layouts
  - Pages: Complete views

### State Management
- **React Context API**
  - AuthContext for authentication
  - NotificationContext for toasts
  - Global state management
- **Local State**
  - Component-level state with useState
  - Form state with React Hook Form
- **Server State**
  - SWR for data fetching
  - Automatic revalidation
  - Cache management

---

## 🚀 Technology Stack

### Core Framework
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript

### Styling & UI
- **Tailwind CSS 3.x** - Utility-first CSS framework
- **Tailwind Forms Plugin** - Form styling
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

### UI Components & Icons
- **Headless UI** - Accessible components
- **Hero Icons** - Icon library
- **Lucide React** - Additional icons

### Forms & Validation
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Custom validators** - Phone, email validation

### Charts & Visualization
- **Chart.js 4.x** - Chart library
- **react-chartjs-2** - React wrapper for Chart.js
- **Recharts** - React charts library

### Date Handling
- **date-fns** - Date utility library
- **date-fns-tz** - Timezone support
- **react-datepicker** - Date picker component

### HTTP & API
- **Axios** - HTTP client
- **SWR** - Data fetching and caching

### State Management
- **React Context** - Global state
- **Zustand** - Lightweight state management
- **js-cookie** - Cookie management

### Notifications
- **react-hot-toast** - Toast notifications

### PDF & Export
- **jsPDF** - PDF generation
- **jspdf-autotable** - PDF tables
- **html2canvas** - HTML to canvas
- **html2pdf.js** - HTML to PDF
- **XLSX** - Excel export

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript ESLint** - TS linting

### Real-time (Optional)
- **Socket.io-client** - WebSocket client

---

## 📦 Installation & Setup

### Prerequisites
```bash
# Node.js 18+ required
node --version

# npm or yarn
npm --version
```

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd church-management-system/web
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Environment Setup**
Create `.env.local` file:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NODE_ENV=development
```

4. **Start development server**
```bash
npm run dev
# or
yarn dev
```

5. **Open browser**
```
http://localhost:3000
```

---

## 🛠️ Available Scripts

```bash
# Development server (port 3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

---

## 🔌 Backend Integration

The frontend integrates with the Node.js/Express backend via RESTful API:

### API Endpoints
- **Authentication**: 
  - `POST /api/auth/login` - User login
  - `GET /api/auth/me` - Get current user
  - `POST /api/auth/logout` - User logout

- **Children**: 
  - `GET /api/children` - List children
  - `POST /api/children` - Create child
  - `PUT /api/children/:id` - Update child
  - `DELETE /api/children/:id` - Delete child

- **Attendance**: 
  - `GET /api/attendance` - List attendance
  - `POST /api/attendance` - Mark attendance
  - `PUT /api/attendance/:id` - Update attendance
  - `DELETE /api/attendance/:id` - Delete attendance

- **Statistics**: 
  - `GET /api/statistics` - Get statistics
  - `GET /api/statistics-fresh` - Fresh statistics
  - `GET /api/advanced-statistics` - Advanced analytics

- **Classes**: 
  - `GET /api/classes` - List classes
  - `POST /api/classes` - Create class
  - `PUT /api/classes/:id` - Update class
  - `DELETE /api/classes/:id` - Delete class

- **Servants**: 
  - `GET /api/servants` - List servants
  - `GET /api/servants-attendance` - Servant attendance
  - `POST /api/servants-attendance` - Mark servant attendance

- **Pastoral Care**: 
  - `GET /api/pastoral-care` - List pastoral care
  - `POST /api/pastoral-care` - Add to pastoral care
  - `PUT /api/pastoral-care/:id` - Update pastoral care
  - `DELETE /api/pastoral-care/:id` - Remove from pastoral care

### API Client Configuration
```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## 🚀 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Variables

Create `.env.production`:
```bash
NEXT_PUBLIC_API_URL=https://your-backend-api.com/api
NODE_ENV=production
```

### Deployment Platforms

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### Docker
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### Static Export (Optional)
```bash
# Add to next.config.js
output: 'export'

# Build static files
npm run build
```

---

## 📱 Usage Guide

### User Roles & Access

#### Admin (مدير النظام)
- Full system access
- All features unlocked
- User management
- System configuration

#### Service Leader (أمين الخدمة)
- View all classes
- Export any class
- Advanced statistics
- Pastoral care oversight

#### Class Teacher (مدرس الفصل)
- Manage assigned class
- Mark attendance
- View class statistics
- Export class reports

#### Servant (خادم)
- View assigned class
- Limited attendance marking
- Basic statistics
- Student information

### Common Workflows

#### 1. Login
1. Navigate to `/login`
2. Enter username and password
3. Check "Remember me" (optional)
4. Click "Login"
5. Redirected to dashboard

#### 2. Mark Attendance
1. Go to **Attendance** page
2. Select date with date picker
3. Choose class (if multiple)
4. Click on each student to toggle Present/Absent
5. Add notes if needed
6. Click "Save Attendance"

#### 3. View Statistics
1. Navigate to **Statistics** or **Advanced Statistics**
2. Select date range
3. Filter by class/stage
4. View interactive charts
5. Export data if needed

#### 4. Export PDF Report
1. Go to **Export Attendance**
2. Select date range
3. Choose class (if admin/service leader)
4. Click "Export PDF"
5. Download beautiful Arabic PDF

#### 5. Pastoral Care Follow-up
1. System auto-adds absent children
2. Go to **Pastoral Care** page
3. View list of children needing calls
4. Click "Mark as Called"
5. Add notes about the call
6. System auto-removes when child returns

#### 6. Track Consecutive Attendance
1. Visit **Consecutive Attendance** page
2. View streak for each child/servant
3. Check gift eligibility (4+ weeks)
4. Record gift delivery
5. Reset streaks after delivery

---

## 🎨 UI/UX Features

### Responsive Design
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

### RTL Support
- Automatic RTL layout for Arabic
- Mirrored components
- RTL-aware animations
- Proper text alignment

### Accessibility
- ARIA labels
- Keyboard navigation
- Screen reader support
- Focus management
- Color contrast compliance

### Performance
- Code splitting
- Lazy loading
- Image optimization
- Bundle size optimization
- Server-side rendering
- Static generation where possible

---

## 📊 Development Status



## 🔧 Configuration

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e40af',
        secondary: '#64748b',
        // Church theme colors
      },
      fontFamily: {
        arabic: ['Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
```

### Next.js Configuration
```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  i18n: {
    locales: ['ar', 'en'],
    defaultLocale: 'ar',
  },
  images: {
    domains: ['your-image-domain.com'],
  },
};
```

---

## 📈 Performance Optimization

- **Code Splitting**: Automatic with Next.js
- **Lazy Loading**: Dynamic imports for heavy components
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: webpack-bundle-analyzer
- **Caching**: SWR for API responses
- **Memoization**: React.memo, useMemo, useCallback
- **Virtual Scrolling**: For large lists
- **Debouncing**: Search inputs

---

## 🧪 Testing (Planned)

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards
- Follow TypeScript best practices
- Use ESLint and Prettier
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation

---

## 📄 License

MIT License - Open Source

---

## 📞 Contact

For questions or support regarding this church management system, please contact the development team.

---

**Version**: 1.0  
**Last Updated**: November 2025  
**Status**: Production Ready ✅

---

**نظام إدارة كنيسة الشهيد مار جرجس - بأولاد علي - الواجهة الأمامية**  
**St. George Church Management System - Web Frontend**

**Built with modern web technologies for a modern church management experience.** 🏛️✨
