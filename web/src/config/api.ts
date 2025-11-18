// Production API configuration
const PRODUCTION_URL = 'https://church-management-system-b6h7.onrender.com/api'
const LOCAL_URL = 'http://localhost:5000/api'

// Use production URL by default, local only in development
const isProduction = process.env.NODE_ENV === 'production' || 
                    process.env.NEXT_PUBLIC_USE_PRODUCTION === 'true' ||
                    (typeof window !== 'undefined' && window.location.hostname !== 'localhost')

export const API_BASE_URL = isProduction ? PRODUCTION_URL : LOCAL_URL

// For critical pages, always use production API when deployed
export const FORCE_PRODUCTION_API = PRODUCTION_URL

