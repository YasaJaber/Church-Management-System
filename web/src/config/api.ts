// Local development configuration
const LOCAL_URL = 'http://localhost:5000/api'

// Use local URL for development
export const API_BASE_URL = LOCAL_URL

// For critical pages, also use local during development
export const FORCE_PRODUCTION_API = LOCAL_URL

console.log('⚙️ API Config loaded - LOCAL DEVELOPMENT:', { API_BASE_URL })
