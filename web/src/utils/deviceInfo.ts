/**
 * Device Information Collector
 * Collects detailed information about the user's device and browser
 */

/**
 * Extract device model from User Agent string
 */
const extractDeviceModel = (userAgent: string): string => {
  const ua = userAgent
  
  // Samsung devices - SM-XXXX pattern
  const samsungMatch = ua.match(/SM-([A-Z0-9]+)/i)
  if (samsungMatch) {
    const model = samsungMatch[1]
    // Map common Samsung models
    const samsungModels: Record<string, string> = {
      'A346B': 'Samsung Galaxy A34',
      'A346': 'Samsung Galaxy A34',
      'A536B': 'Samsung Galaxy A53',
      'A536': 'Samsung Galaxy A53',
      'A546B': 'Samsung Galaxy A54',
      'A546': 'Samsung Galaxy A54',
      'A556B': 'Samsung Galaxy A55',
      'A556': 'Samsung Galaxy A55',
      'S911B': 'Samsung Galaxy S23',
      'S911': 'Samsung Galaxy S23',
      'S916B': 'Samsung Galaxy S23+',
      'S918B': 'Samsung Galaxy S23 Ultra',
      'S921B': 'Samsung Galaxy S24',
      'S926B': 'Samsung Galaxy S24+',
      'S928B': 'Samsung Galaxy S24 Ultra',
      'G991B': 'Samsung Galaxy S21',
      'G996B': 'Samsung Galaxy S21+',
      'G998B': 'Samsung Galaxy S21 Ultra',
      'A325F': 'Samsung Galaxy A32',
      'A525F': 'Samsung Galaxy A52',
      'A725F': 'Samsung Galaxy A72',
      'A135F': 'Samsung Galaxy A13',
      'A235F': 'Samsung Galaxy A23',
      'A047F': 'Samsung Galaxy A04s',
      'M135F': 'Samsung Galaxy M13',
      'F127G': 'Samsung Galaxy F12',
      'N986B': 'Samsung Galaxy Note 20 Ultra',
      'F711B': 'Samsung Galaxy Z Flip 3',
      'F721B': 'Samsung Galaxy Z Flip 4',
      'F731B': 'Samsung Galaxy Z Flip 5',
      'F926B': 'Samsung Galaxy Z Fold 3',
      'F936B': 'Samsung Galaxy Z Fold 4',
      'F946B': 'Samsung Galaxy Z Fold 5',
    }
    return samsungModels[model] || `Samsung ${model}`
  }
  
  // iPhone models
  const iphoneMatch = ua.match(/iPhone(?:\s*(\d+),(\d+))?/i)
  if (iphoneMatch || ua.includes('iPhone')) {
    // Try to get iPhone model from platform
    if (ua.includes('iPhone14,2')) return 'iPhone 13 Pro'
    if (ua.includes('iPhone14,3')) return 'iPhone 13 Pro Max'
    if (ua.includes('iPhone14,4')) return 'iPhone 13 Mini'
    if (ua.includes('iPhone14,5')) return 'iPhone 13'
    if (ua.includes('iPhone15,2')) return 'iPhone 14 Pro'
    if (ua.includes('iPhone15,3')) return 'iPhone 14 Pro Max'
    if (ua.includes('iPhone14,7')) return 'iPhone 14'
    if (ua.includes('iPhone14,8')) return 'iPhone 14 Plus'
    if (ua.includes('iPhone15,4')) return 'iPhone 15'
    if (ua.includes('iPhone15,5')) return 'iPhone 15 Plus'
    if (ua.includes('iPhone16,1')) return 'iPhone 15 Pro'
    if (ua.includes('iPhone16,2')) return 'iPhone 15 Pro Max'
    if (ua.includes('iPhone13,1')) return 'iPhone 12 Mini'
    if (ua.includes('iPhone13,2')) return 'iPhone 12'
    if (ua.includes('iPhone13,3')) return 'iPhone 12 Pro'
    if (ua.includes('iPhone13,4')) return 'iPhone 12 Pro Max'
    return 'iPhone'
  }
  
  // iPad models
  if (ua.includes('iPad')) {
    if (ua.includes('iPad13')) return 'iPad Pro'
    if (ua.includes('iPad14')) return 'iPad Pro M2'
    if (ua.includes('iPad12')) return 'iPad (9th gen)'
    if (ua.includes('iPad11')) return 'iPad Air'
    return 'iPad'
  }
  
  // Xiaomi/Redmi devices
  const xiaomiMatch = ua.match(/(Redmi[^;\/\)]+|Mi\s*\d+[^;\/\)]*|POCO[^;\/\)]+)/i)
  if (xiaomiMatch) {
    return `Xiaomi ${xiaomiMatch[1].trim()}`
  }
  
  // Huawei devices
  const huaweiMatch = ua.match(/(HUAWEI[^;\/\)]+|Honor[^;\/\)]+)/i)
  if (huaweiMatch) {
    return huaweiMatch[1].trim()
  }
  
  // OPPO devices
  const oppoMatch = ua.match(/OPPO\s*([^;\/\)]+)/i)
  if (oppoMatch) {
    return `OPPO ${oppoMatch[1].trim()}`
  }
  
  // Vivo devices
  const vivoMatch = ua.match(/vivo\s*([^;\/\)]+)/i)
  if (vivoMatch) {
    return `Vivo ${vivoMatch[1].trim()}`
  }
  
  // Realme devices
  const realmeMatch = ua.match(/RMX(\d+)/i)
  if (realmeMatch) {
    return `Realme ${realmeMatch[1]}`
  }
  
  // OnePlus devices
  const oneplusMatch = ua.match(/(OnePlus[^;\/\)]+|IN20\d+|LE2\d+|KB2\d+)/i)
  if (oneplusMatch) {
    const model = oneplusMatch[1]
    if (model.startsWith('IN20')) return 'OnePlus Nord'
    if (model.startsWith('LE2')) return 'OnePlus 9'
    if (model.startsWith('KB2')) return 'OnePlus 8T'
    return model.includes('OnePlus') ? model : `OnePlus ${model}`
  }
  
  // Google Pixel devices
  const pixelMatch = ua.match(/Pixel\s*(\d+[^;\/\)]*)/i)
  if (pixelMatch) {
    return `Google Pixel ${pixelMatch[1].trim()}`
  }
  
  // Generic Android device - try to extract model
  const androidMatch = ua.match(/Android[^;]*;\s*([^;\/\)]+)/i)
  if (androidMatch) {
    const model = androidMatch[1].trim()
    // Filter out generic strings
    if (!model.match(/^(Linux|U|Mobile|wv|Build)/i) && model.length > 2) {
      return model
    }
  }
  
  // Windows PC
  if (ua.includes('Windows')) {
    if (ua.includes('Windows NT 10.0')) return 'Windows 10/11 PC'
    if (ua.includes('Windows NT 6.3')) return 'Windows 8.1 PC'
    if (ua.includes('Windows NT 6.2')) return 'Windows 8 PC'
    if (ua.includes('Windows NT 6.1')) return 'Windows 7 PC'
    return 'Windows PC'
  }
  
  // Mac
  if (ua.includes('Macintosh') || ua.includes('Mac OS')) {
    return 'Mac'
  }
  
  // Linux
  if (ua.includes('Linux') && !ua.includes('Android')) {
    return 'Linux PC'
  }
  
  return 'غير معروف'
}

export interface DeviceInfo {
  // Screen Info
  screenWidth: number
  screenHeight: number
  screenColorDepth: number
  windowWidth: number
  windowHeight: number
  pixelRatio: number
  
  // Browser/Platform Info
  userAgent: string
  language: string
  languages: string[]
  platform: string
  vendor: string
  cookiesEnabled: boolean
  doNotTrack: string | null
  
  // Device Model Info
  deviceModel: string
  
  // Connection Info
  connectionType: string
  connectionEffectiveType: string
  connectionDownlink: number | null
  connectionRtt: number | null
  
  // Hardware Info
  hardwareConcurrency: number | null
  deviceMemory: number | null
  maxTouchPoints: number
  
  // Time Info
  timezone: string
  timezoneOffset: number
  
  // Battery Info (if available)
  batteryLevel: number | null
  batteryCharging: boolean | null
  
  // Additional Info
  online: boolean
  pdfViewerEnabled: boolean
  
  // Location Info (if available)
  location?: {
    latitude: number
    longitude: number
    accuracy: number
    city?: string
    country?: string
  }
}

/**
 * Get location from IP address (approximate location - city/country)
 */
const getLocationFromIP = async (): Promise<{
  city: string
  country: string
  countryCode: string
  region: string
  lat: number
  lon: number
} | null> => {
  try {
    // Using ip-api.com (free, no API key needed, 45 requests/minute)
    const response = await fetch('http://ip-api.com/json/?fields=status,country,countryCode,region,city,lat,lon', {
      method: 'GET',
      // Short timeout to not delay login
      signal: AbortSignal.timeout(3000),
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.status === 'success') {
        return {
          city: data.city || '',
          country: data.country || '',
          countryCode: data.countryCode || '',
          region: data.region || '',
          lat: data.lat || 0,
          lon: data.lon || 0,
        }
      }
    }
  } catch {
    // IP location service unavailable - continue without it
  }
  return null
}

/**
 * Get precise location from browser (requires user permission)
 */
const getBrowserLocation = (): Promise<{
  latitude: number
  longitude: number
  accuracy: number
} | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    
    // Try to get location with short timeout
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      () => {
        // User denied or error - continue without location
        resolve(null)
      },
      {
        enableHighAccuracy: false,
        timeout: 3000, // Short timeout to not delay login
        maximumAge: 300000, // Accept cached position up to 5 minutes old
      }
    )
  })
}

/**
 * Get battery information if available
 */
const getBatteryInfo = async (): Promise<{ level: number | null; charging: boolean | null }> => {
  try {
    if ('getBattery' in navigator) {
      // @ts-expect-error - getBattery is not in TypeScript types
      const battery = await navigator.getBattery()
      return {
        level: Math.round(battery.level * 100),
        charging: battery.charging,
      }
    }
  } catch {
    // Battery API not available or blocked
  }
  return { level: null, charging: null }
}

/**
 * Get network connection information
 */
const getConnectionInfo = (): {
  type: string
  effectiveType: string
  downlink: number | null
  rtt: number | null
} => {
  try {
    // @ts-expect-error - connection is not in TypeScript types
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection) {
      return {
        type: connection.type || 'غير معروف',
        effectiveType: connection.effectiveType || 'غير معروف',
        downlink: connection.downlink || null,
        rtt: connection.rtt || null,
      }
    }
  } catch {
    // Connection API not available
  }
  return {
    type: 'غير معروف',
    effectiveType: 'غير معروف',
    downlink: null,
    rtt: null,
  }
}

/**
 * Collect all device information
 */
export const collectDeviceInfo = async (): Promise<DeviceInfo> => {
  // Collect all info in parallel for speed
  const [batteryInfo, ipLocation, browserLocation] = await Promise.all([
    getBatteryInfo(),
    getLocationFromIP(),
    getBrowserLocation(),
  ])
  
  const connectionInfo = getConnectionInfo()
  const userAgent = navigator.userAgent
  
  // Combine location info
  let location: DeviceInfo['location'] = undefined
  if (browserLocation) {
    location = {
      latitude: browserLocation.latitude,
      longitude: browserLocation.longitude,
      accuracy: browserLocation.accuracy,
      city: ipLocation?.city,
      country: ipLocation?.country,
    }
  } else if (ipLocation) {
    location = {
      latitude: ipLocation.lat,
      longitude: ipLocation.lon,
      accuracy: 10000, // IP location is approximate (city level ~10km)
      city: ipLocation.city,
      country: ipLocation.country,
    }
  }
  
  return {
    // Screen Info
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    screenColorDepth: window.screen.colorDepth,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    
    // Browser/Platform Info
    userAgent: userAgent,
    language: navigator.language,
    languages: [...(navigator.languages || [navigator.language])],
    platform: navigator.platform,
    vendor: navigator.vendor || '',
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    
    // Device Model
    deviceModel: extractDeviceModel(userAgent),
    
    // Connection Info
    connectionType: connectionInfo.type,
    connectionEffectiveType: connectionInfo.effectiveType,
    connectionDownlink: connectionInfo.downlink,
    connectionRtt: connectionInfo.rtt,
    
    // Hardware Info
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory || null,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    
    // Time Info
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    
    // Battery Info
    batteryLevel: batteryInfo.level,
    batteryCharging: batteryInfo.charging,
    
    // Additional Info
    online: navigator.onLine,
    pdfViewerEnabled: navigator.pdfViewerEnabled ?? false,
    
    // Location Info
    location,
  }
}

/**
 * Get a summary of device info for display
 */
export const getDeviceInfoSummary = (info: DeviceInfo): {
  deviceType: string
  deviceModel: string
  browser: string
  os: string
  screenResolution: string
  connection: string
  language: string
  timezone: string
  battery: string | null
} => {
  const ua = info.userAgent.toLowerCase()
  
  // Device Type
  let deviceType = 'كمبيوتر'
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceType = 'موبايل'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'تابلت'
  }
  
  // Browser
  let browser = 'غير معروف'
  if (ua.includes('edg/') || ua.includes('edge')) {
    browser = 'Microsoft Edge'
  } else if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Google Chrome'
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari'
  } else if (ua.includes('firefox')) {
    browser = 'Firefox'
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera'
  }
  
  // OS
  let os = 'غير معروف'
  if (ua.includes('windows')) {
    os = 'Windows'
  } else if (ua.includes('mac os') || ua.includes('macintosh')) {
    os = 'macOS'
  } else if (ua.includes('linux') && !ua.includes('android')) {
    os = 'Linux'
  } else if (ua.includes('android')) {
    os = 'Android'
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
    os = 'iOS'
  }
  
  // Connection type translation
  const connectionTypes: Record<string, string> = {
    'wifi': 'واي فاي',
    'cellular': 'شبكة موبايل',
    '4g': '4G',
    '3g': '3G',
    '2g': '2G',
    'slow-2g': '2G بطيء',
    'ethernet': 'سلكي',
    'none': 'بدون اتصال',
    'unknown': 'غير معروف',
    'غير معروف': 'غير معروف',
  }
  
  return {
    deviceType,
    deviceModel: info.deviceModel,
    browser,
    os,
    screenResolution: `${info.screenWidth}×${info.screenHeight}`,
    connection: connectionTypes[info.connectionEffectiveType] || info.connectionEffectiveType,
    language: info.language,
    timezone: info.timezone,
    battery: info.batteryLevel !== null ? `${info.batteryLevel}%${info.batteryCharging ? ' (شحن)' : ''}` : null,
  }
}

