// Always use production API
const PRODUCTION_URL = 'https://church-management-system-b6h7.onrender.com/api'

// Export the production URL directly
export const API_BASE_URL = PRODUCTION_URL

// Force production mode (for critical pages)
export const FORCE_PRODUCTION_API = PRODUCTION_URL

console.log('⚙️ API Config loaded - ALWAYS PRODUCTION:', { API_BASE_URL })
