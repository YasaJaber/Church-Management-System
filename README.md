# St. George Church Management System
## نظام إدارة كنيسة مارجرجس

### 📱 Comprehensive System for Children, Servants, and Attendance Management

---

## 🚀 Key Features

### 👥 Children Management
- Register children data (name, age, class)
- Distribute children across classes
- Track daily attendance
- Detailed attendance statistics

### 👨‍🏫 Servants Management
- Individual servant system (each servant has separate account)
- Phone number registration
- Track servant attendance
- Follow-up reports for consecutive absences

### 📊 Statistics and Reports
- General attendance statistics
- Detailed reports for each class
- Track attendance rates
- Printable PDF reports

### 🔐 Security System
- JWT authentication
- Different permissions (Admin, Teacher, Servant)
- Sensitive data protection

---

## 🛠️ Technologies Used

### Backend

- **Node.js** + **Express.js**
- **MongoDB** with **Mongoose**
- **JWT** for authentication
- **bcryptjs** for password encryption
- **date-fns** for date handling
- **CORS** for cross-origin requests

### Frontend (Mobile App)

- **React Native** + **Expo**
- **React Navigation** for navigation
- **Axios** for API calls
- **AsyncStorage** for local data storage
- **React Native Calendars** for calendar

---

## 🔧 Installation and Setup

### System Requirements

- Node.js (v16 or newer)
- npm or yarn
- MongoDB
- Expo CLI for mobile app

### 1. Backend Setup

```bash
cd backend
npm install
```

#### Environment Variables Setup

Create a `.env` file in the backend folder:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

#### Run the Server

```bash
# For development
npm run dev

# For production
npm start
```

The server will run on port 5000

### 2. Frontend Setup

```bash
cd frontend
npm install
```

#### Run the Application

```bash
# Start Expo
npm start

# For Android
npm run android

# For iOS
npm run ios

# For Web
npm run web
```

---

## 📂 Project Structure

```text
margerges-database/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Middleware functions
│   ├── config/          # Database configuration
│   ├── index-fixed.js   # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── screens/     # Application screens
│   │   ├── services/    # API services
│   │   ├── context/     # React Context
│   │   └── utils/       # Utilities and helpers
│   ├── assets/          # Images and icons
│   ├── App.js          # Main application file
│   └── package.json
└── README.md
```

---

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new account

### Children Management

- `GET /api/children` - Get children list
- `POST /api/children` - Add new child
- `PUT /api/children/:id` - Update child data
- `DELETE /api/children/:id` - Delete child

### Attendance

- `GET /api/attendance` - Get attendance list
- `POST /api/attendance` - Record attendance
- `PUT /api/attendance/:id` - Update attendance

### Servants

- `GET /api/servants` - Get servants list
- `POST /api/servants` - Add new servant
- `GET /api/servants/statistics` - Get servants statistics

### Classes

- `GET /api/classes` - Get classes list
- `POST /api/classes` - Create new class

---

## 👥 Usage

### For Admin

1. Login with admin account
2. Manage children and servants
3. View statistics and reports
4. Manage classes

### For Teacher

1. Login to system
2. Record attendance for children in their class
3. View class statistics

### For Servant

1. Login to system
2. View personal information
3. Record attendance

---

## 🔒 Security

- All passwords encrypted using bcrypt
- Authentication using JWT tokens
- Route protection with middleware
- API-level permission verification

---

## 🌐 Deployment

### Backend Deployment

Backend can be deployed on:

- **Heroku**
- **Railway**
- **DigitalOcean**
- **AWS EC2**

### Frontend Deployment

- Mobile App: **Expo Build Service**
- Web: **Netlify** or **Vercel**

---

## 📝 Contributing

1. Fork the project
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---
