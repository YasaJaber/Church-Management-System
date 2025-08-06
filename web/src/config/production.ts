// Production API Configuration
// This file ensures all API calls use the production backend URL

const PRODUCTION_API_URL = 'https://church-management-system-b6h7.onrender.com/api'

export const getProductionApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || PRODUCTION_API_URL
  console.log('🌐 Using API URL:', url)
  return url
}

export const PRODUCTION_API_BASE_URL = getProductionApiUrl()

// Force production mode detection
export const isProductionMode = () => {
  return process.env.NEXT_PUBLIC_USE_PRODUCTION === 'true' || 
         process.env.NODE_ENV === 'production' ||
         typeof window !== 'undefined' && window.location.hostname !== 'localhost'
}

export const getApiUrl = () => {
  if (isProductionMode()) {
    return PRODUCTION_API_BASE_URL
  }
  return process.env.NEXT_PUBLIC_API_LOCAL || 'http://localhost:5000/api'
}
