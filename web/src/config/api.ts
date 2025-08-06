// Environment-based API configuration with absolute production override
const FORCE_PRODUCTION_URL = 'https://church-management-system-b6h7.onrender.com/api'

// Check if we're in production environment
const isProduction = () => {
  // Multiple checks to ensure we catch all production scenarios
  const isProd = process.env.NODE_ENV === 'production' ||
                 process.env.NEXT_PUBLIC_USE_PRODUCTION === 'true' ||
                 (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))
  
  console.log('🔍 Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    USE_PRODUCTION: process.env.NEXT_PUBLIC_USE_PRODUCTION,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    isProduction: isProd
  })
  
  return isProd
}

// Get the correct API URL based on environment
export const getApiUrl = () => {
  if (isProduction()) {
    console.log('🌐 Production mode detected - using:', FORCE_PRODUCTION_URL)
    return FORCE_PRODUCTION_URL
  }
  
  const localUrl = process.env.NEXT_PUBLIC_API_LOCAL || 'http://localhost:5000/api'
  console.log('🏠 Development mode - using:', localUrl)
  return localUrl
}

// Export the URL directly
export const API_BASE_URL = getApiUrl()

// Force production mode (for critical pages)
export const FORCE_PRODUCTION_API = FORCE_PRODUCTION_URL

console.log('⚙️ API Config loaded:', { API_BASE_URL })
