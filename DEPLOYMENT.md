# Church Management System - Backend Deployment

## 🚀 Deploy to Render

### Prerequisites
1. GitHub repository with the code
2. MongoDB Atlas database
3. Render account

### Step-by-Step Deployment

#### 1. **Create MongoDB Atlas Database**
- Go to [MongoDB Atlas](https://cloud.mongodb.com/)
- Create a new cluster (free tier available)
- Create a database user with read/write access
- Get your connection string (MONGODB_URI)

#### 2. **Deploy on Render**

1. **Go to [Render Dashboard](https://dashboard.render.com/)**

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `https://github.com/YasaJaber/Church-Management-System`
   - Repository: `Church-Management-System`

3. **Configure Service Settings:**
   ```
   Name: church-management-api
   Environment: Node
   Region: Frankfurt (EU Central) - or closest to your location
   Branch: master
   Root Directory: backend
   Build Command: npm install
   Start Command: npm start
   ```

4. **Set Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/church_management?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_complex
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment to complete (5-10 minutes)

#### 3. **After Deployment**

Your API will be available at:
```
https://church-management-system-b6h7.onrender.com
```

**Test the deployment:**
- Health check: `https://church-management-system-b6h7.onrender.com/api/health`
- API base: `https://church-management-system-b6h7.onrender.com/api`

#### 4. **Environment Variables Setup**

**Required Environment Variables:**
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/church_management?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_should_be_very_long_and_secure
```

### 📱 Frontend Configuration

Update your frontend API base URL to point to the deployed backend:

```javascript
// In frontend/src/services/api.js
const API_BASE_URL = 'https://church-management-system-b6h7.onrender.com/api';
```

### 🔧 Troubleshooting

**Common Issues:**

1. **503 Service Unavailable**
   - Check if MongoDB URI is correct
   - Verify environment variables are set

2. **CORS Errors**
   - Update CORS configuration in backend
   - Add your frontend domain to allowed origins

3. **Database Connection Issues**
   - Check MongoDB Atlas network access settings
   - Ensure 0.0.0.0/0 is allowed (for Render deployment)

### 📊 Monitoring

- **Render Dashboard**: Monitor deployment status and logs
- **Health Endpoints**: 
  - `/health` - Basic server health
  - `/api/health` - API and database health

### 💰 Cost

- **Render Free Tier**: 
  - 750 hours/month free
  - Sleeps after 15 minutes of inactivity
  - Automatic wake-up on requests

### 🔄 Auto-Deploy

- Automatic deployment on git push to master branch
- Monitor deployment in Render dashboard
- Check logs for any deployment issues

---

**Note**: Replace placeholder values with your actual configuration values.
