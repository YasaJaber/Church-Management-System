const AuditLog = require("../models/AuditLog");
const logger = require("./logger");

/**
 * أسماء الجداول بالعربي
 */
const collectionNamesAr = {
  children: "الأطفال",
  users: "المستخدمين",
  classes: "الفصول",
  attendance: "الحضور",
  servantAttendance: "حضور الخدام",
  pastoralCare: "الافتقاد",
  giftDelivery: "تسليم الهدايا",
  auth: "تسجيل الدخول",
};

/**
 * أسماء العمليات بالعربي
 */
const actionNamesAr = {
  create: "إضافة",
  update: "تعديل",
  delete: "حذف",
  login: "تسجيل دخول",
};

/**
 * استخراج موديل الجهاز من User Agent
 */
const extractDeviceModelFromUA = (userAgent) => {
  if (!userAgent) return "غير معروف";
  
  const ua = userAgent;
  
  // Samsung devices
  const samsungMatch = ua.match(/SM-([A-Z0-9]+)/i);
  if (samsungMatch) {
    const model = samsungMatch[1];
    const samsungModels = {
      'A346B': 'Samsung Galaxy A34', 'A346': 'Samsung Galaxy A34',
      'A536B': 'Samsung Galaxy A53', 'A536': 'Samsung Galaxy A53',
      'A546B': 'Samsung Galaxy A54', 'A546': 'Samsung Galaxy A54',
      'S911B': 'Samsung Galaxy S23', 'S916B': 'Samsung Galaxy S23+',
      'S918B': 'Samsung Galaxy S23 Ultra', 'S921B': 'Samsung Galaxy S24',
      'S926B': 'Samsung Galaxy S24+', 'S928B': 'Samsung Galaxy S24 Ultra',
      'A325F': 'Samsung Galaxy A32', 'A525F': 'Samsung Galaxy A52',
      'A725F': 'Samsung Galaxy A72', 'A135F': 'Samsung Galaxy A13',
    };
    return samsungModels[model] || `Samsung ${model}`;
  }
  
  // iPhone
  if (ua.includes('iPhone')) {
    if (ua.includes('iPhone15,2')) return 'iPhone 14 Pro';
    if (ua.includes('iPhone15,3')) return 'iPhone 14 Pro Max';
    if (ua.includes('iPhone14,7')) return 'iPhone 14';
    if (ua.includes('iPhone14,2')) return 'iPhone 13 Pro';
    if (ua.includes('iPhone14,5')) return 'iPhone 13';
    if (ua.includes('iPhone16,1')) return 'iPhone 15 Pro';
    if (ua.includes('iPhone16,2')) return 'iPhone 15 Pro Max';
    return 'iPhone';
  }
  
  // iPad
  if (ua.includes('iPad')) return 'iPad';
  
  // Xiaomi/Redmi
  const xiaomiMatch = ua.match(/(Redmi[^;\/\)]+|Mi\s*\d+[^;\/\)]*|POCO[^;\/\)]+)/i);
  if (xiaomiMatch) return `Xiaomi ${xiaomiMatch[1].trim()}`;
  
  // Huawei
  const huaweiMatch = ua.match(/(HUAWEI[^;\/\)]+|Honor[^;\/\)]+)/i);
  if (huaweiMatch) return huaweiMatch[1].trim();
  
  // OPPO
  const oppoMatch = ua.match(/OPPO\s*([^;\/\)]+)/i);
  if (oppoMatch) return `OPPO ${oppoMatch[1].trim()}`;
  
  // Google Pixel
  const pixelMatch = ua.match(/Pixel\s*(\d+[^;\/\)]*)/i);
  if (pixelMatch) return `Google Pixel ${pixelMatch[1].trim()}`;
  
  // Generic Android
  const androidMatch = ua.match(/Android[^;]*;\s*([^;\/\)]+)/i);
  if (androidMatch) {
    const model = androidMatch[1].trim();
    if (!model.match(/^(Linux|U|Mobile|wv|Build)/i) && model.length > 2) {
      return model;
    }
  }
  
  // Windows
  if (ua.includes('Windows')) return 'Windows PC';
  
  // Mac
  if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'Mac';
  
  // Linux
  if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux PC';
  
  return "غير معروف";
};

/**
 * تحليل User Agent لمعرفة نوع الجهاز والمتصفح
 */
const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return {
      deviceType: "غير معروف",
      browser: "غير معروف",
      os: "غير معروف",
      isMobile: false,
    };
  }

  const ua = userAgent.toLowerCase();
  
  // تحديد نوع الجهاز
  let deviceType = "كمبيوتر";
  let isMobile = false;
  
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    deviceType = "موبايل";
    isMobile = true;
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    deviceType = "تابلت";
    isMobile = true;
  }
  
  // تحديد المتصفح
  let browser = "غير معروف";
  if (ua.includes("edg/") || ua.includes("edge")) {
    browser = "Microsoft Edge";
  } else if (ua.includes("chrome") && !ua.includes("edg")) {
    browser = "Google Chrome";
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "Safari";
  } else if (ua.includes("firefox")) {
    browser = "Firefox";
  } else if (ua.includes("opera") || ua.includes("opr")) {
    browser = "Opera";
  } else if (ua.includes("msie") || ua.includes("trident")) {
    browser = "Internet Explorer";
  }
  
  // تحديد نظام التشغيل
  let os = "غير معروف";
  if (ua.includes("windows")) {
    os = "Windows";
  } else if (ua.includes("mac os") || ua.includes("macintosh")) {
    os = "macOS";
  } else if (ua.includes("linux") && !ua.includes("android")) {
    os = "Linux";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) {
    os = "iOS";
  }
  
  return {
    deviceType,
    browser,
    os,
    isMobile,
  };
};

/**
 * تسجيل عملية في سجل المراجعة
 * @param {Object} options - خيارات التسجيل
 * @param {string} options.action - نوع العملية (create/update/delete/login)
 * @param {string} options.collection - اسم الجدول
 * @param {string} options.documentId - ID السجل
 * @param {string} options.documentName - اسم السجل (للعرض)
 * @param {Object} options.user - المستخدم اللي عمل العملية
 * @param {string} options.classId - ID الفصل (اختياري)
 * @param {string} options.className - اسم الفصل (اختياري)
 * @param {Object} options.before - البيانات قبل التعديل
 * @param {Object} options.after - البيانات بعد التعديل
 * @param {string} options.ipAddress - IP Address (اختياري)
 * @param {string} options.userAgent - User Agent (اختياري)
 * @param {Object} options.deviceInfo - معلومات الجهاز من الـ Frontend (اختياري)
 */
const logAudit = async (options) => {
  try {
    const {
      action,
      collection,
      documentId,
      documentName = "",
      user,
      classId = null,
      className = "",
      before = null,
      after = null,
      ipAddress = "",
      userAgent = "",
      deviceInfo = null,
    } = options;

    // التحقق من البيانات المطلوبة
    if (!action || !collection || !documentId || !user) {
      logger.warn("بيانات ناقصة لتسجيل العملية في سجل المراجعة", {
        action,
        collection,
        documentId,
        hasUser: !!user,
      });
      return null;
    }

    // إنشاء وصف العملية
    const actionAr = actionNamesAr[action] || action;
    const collectionAr = collectionNamesAr[collection] || collection;
    
    // وصف مخصص لعملية تسجيل الدخول
    let description;
    if (action === "login") {
      description = `تسجيل دخول ${documentName || user.name || user.username}`;
    } else {
      description = `${actionAr} ${documentName || "سجل"} في ${collectionAr}`;
    }

    // تحليل User Agent للحصول على معلومات الجهاز الأساسية
    const basicDeviceInfo = parseUserAgent(userAgent);

    // دمج معلومات الجهاز من الـ Frontend مع المعلومات الأساسية
    const loginDetails = {
      // معلومات أساسية من User Agent
      deviceType: deviceInfo?.deviceType || basicDeviceInfo.deviceType,
      deviceModel: deviceInfo?.deviceModel || extractDeviceModelFromUA(userAgent),
      browser: deviceInfo?.browser || basicDeviceInfo.browser,
      os: deviceInfo?.os || basicDeviceInfo.os,
      isMobile: deviceInfo?.isMobile ?? basicDeviceInfo.isMobile,
      
      // معلومات إضافية من الـ Frontend
      screenResolution: deviceInfo?.screenResolution || "",
      windowSize: deviceInfo?.windowSize || "",
      timezone: deviceInfo?.timezone || "",
      language: deviceInfo?.language || "",
      connectionType: deviceInfo?.connectionType || "",
      batteryLevel: deviceInfo?.batteryLevel ?? null,
      batteryCharging: deviceInfo?.batteryCharging ?? null,
      cpuCores: deviceInfo?.cpuCores ?? null,
      deviceMemory: deviceInfo?.deviceMemory ?? null,
      touchSupport: deviceInfo?.touchSupport ?? false,
      online: deviceInfo?.online ?? true,
      platform: deviceInfo?.platform || "",
      // الموقع الجغرافي
      location: deviceInfo?.location ? {
        city: deviceInfo.location.city || "",
        country: deviceInfo.location.country || "",
        latitude: deviceInfo.location.latitude || null,
        longitude: deviceInfo.location.longitude || null,
      } : null,
    };

    // إنشاء سجل المراجعة
    const auditLog = new AuditLog({
      action,
      collection,
      collectionNameAr: collectionAr,
      documentId,
      documentName,
      userId: user._id || user.userId,
      userName: user.name || user.username,
      userRole: user.role,
      classId,
      className,
      changes: {
        before: sanitizeData(before),
        after: sanitizeData(after),
      },
      description,
      ipAddress,
      userAgent,
      loginDetails,
    });

    await auditLog.save();
    
    logger.debug("تم تسجيل العملية في سجل المراجعة", {
      action,
      collection,
      documentName,
      userName: user.name || user.username,
      ipAddress: ipAddress || "N/A",
    });

    return auditLog;
  } catch (error) {
    logger.error("خطأ في تسجيل العملية في سجل المراجعة", {
      error: error.message,
      options,
    });
    return null;
  }
};

/**
 * تنظيف البيانات قبل التخزين (إزالة البيانات الحساسة)
 */
const sanitizeData = (data) => {
  if (!data) return null;
  
  const sanitized = { ...data };
  
  // إزالة الحقول الحساسة
  const sensitiveFields = ["password", "token", "refreshToken", "__v"];
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      delete sanitized[field];
    }
  });
  
  // تحويل ObjectId لـ string
  if (sanitized._id) {
    sanitized._id = sanitized._id.toString();
  }
  
  return sanitized;
};

/**
 * الحصول على التغييرات بين كائنين
 */
const getChanges = (before, after) => {
  if (!before || !after) return { before, after };
  
  const changes = {
    before: {},
    after: {},
  };
  
  // الحقول اللي اتغيرت
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  allKeys.forEach((key) => {
    // تجاهل الحقول الخاصة
    if (key.startsWith("_") || key === "updatedAt" || key === "createdAt") {
      return;
    }
    
    const beforeVal = JSON.stringify(before[key]);
    const afterVal = JSON.stringify(after[key]);
    
    if (beforeVal !== afterVal) {
      changes.before[key] = before[key];
      changes.after[key] = after[key];
    }
  });
  
  return changes;
};

module.exports = {
  logAudit,
  sanitizeData,
  getChanges,
  parseUserAgent,
  collectionNamesAr,
  actionNamesAr,
};
