/**
 * Device Information Collector
 * Collects detailed information about the user's device and browser
 */

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
  const batteryInfo = await getBatteryInfo()
  const connectionInfo = getConnectionInfo()
  
  return {
    // Screen Info
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    screenColorDepth: window.screen.colorDepth,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    
    // Browser/Platform Info
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: [...(navigator.languages || [navigator.language])],
    platform: navigator.platform,
    vendor: navigator.vendor || '',
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    
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
  }
}

/**
 * Get a summary of device info for display
 */
export const getDeviceInfoSummary = (info: DeviceInfo): {
  deviceType: string
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
    browser,
    os,
    screenResolution: `${info.screenWidth}×${info.screenHeight}`,
    connection: connectionTypes[info.connectionEffectiveType] || info.connectionEffectiveType,
    language: info.language,
    timezone: info.timezone,
    battery: info.batteryLevel !== null ? `${info.batteryLevel}%${info.batteryCharging ? ' (شحن)' : ''}` : null,
  }
}

