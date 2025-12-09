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
};

/**
 * أسماء العمليات بالعربي
 */
const actionNamesAr = {
  create: "إضافة",
  update: "تعديل",
  delete: "حذف",
};

/**
 * تسجيل عملية في سجل المراجعة
 * @param {Object} options - خيارات التسجيل
 * @param {string} options.action - نوع العملية (create/update/delete)
 * @param {string} options.collection - اسم الجدول
 * @param {string} options.documentId - ID السجل
 * @param {string} options.documentName - اسم السجل (للعرض)
 * @param {Object} options.user - المستخدم اللي عمل العملية
 * @param {string} options.classId - ID الفصل (اختياري)
 * @param {string} options.className - اسم الفصل (اختياري)
 * @param {Object} options.before - البيانات قبل التعديل
 * @param {Object} options.after - البيانات بعد التعديل
 * @param {string} options.ipAddress - IP Address (اختياري)
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
    const description = `${actionAr} ${documentName || "سجل"} في ${collectionAr}`;

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
    });

    await auditLog.save();
    
    logger.debug("تم تسجيل العملية في سجل المراجعة", {
      action,
      collection,
      documentName,
      userName: user.name || user.username,
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
  collectionNamesAr,
  actionNamesAr,
};
