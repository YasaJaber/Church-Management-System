/**
 * Input Validation Middleware
 * 
 * ميدلوير موحد للتحقق من صحة البيانات المدخلة
 * يوفر حماية من الـ injection attacks ورسائل خطأ واضحة بالعربي
 */

const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * معالج نتائج التحقق
 * يتحقق من وجود أخطاء ويرسل رسالة واضحة
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    
    return res.status(400).json({
      success: false,
      error: errorMessages[0].message, // أول رسالة خطأ
      errors: errorMessages, // كل الأخطاء
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
};

/**
 * تنظيف النصوص من الأكواد الضارة
 */
const sanitizeText = (value) => {
  if (typeof value !== 'string') return value;
  
  // إزالة HTML tags
  value = value.replace(/<[^>]*>/g, '');
  
  // إزالة الأكواد الضارة المحتملة
  value = value.replace(/javascript:/gi, '');
  value = value.replace(/on\w+=/gi, '');
  
  // تنظيف المسافات الزائدة
  value = value.trim();
  
  return value;
};

/**
 * التحقق من صحة ObjectId
 */
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

// ==================== قواعد التحقق للأطفال ====================

const childValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('اسم الطفل مطلوب')
      .isLength({ min: 2, max: 100 }).withMessage('اسم الطفل يجب أن يكون بين 2 و 100 حرف')
      .customSanitizer(sanitizeText),
    
    body('phone')
      .optional()
      .trim()
      .customSanitizer(sanitizeText),
    
    body('parentName')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('اسم ولي الأمر يجب ألا يتجاوز 100 حرف')
      .customSanitizer(sanitizeText),
    
    body('classId')
      .optional()
      .custom(isValidObjectId).withMessage('معرف الفصل غير صحيح'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('الملاحظات يجب ألا تتجاوز 500 حرف')
      .customSanitizer(sanitizeText),
    
    handleValidationErrors
  ],
  
  update: [
    param('id')
      .custom(isValidObjectId).withMessage('معرف الطفل غير صحيح'),
    
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('اسم الطفل يجب أن يكون بين 2 و 100 حرف')
      .customSanitizer(sanitizeText),
    
    body('phone')
      .optional()
      .trim()
      .customSanitizer(sanitizeText),
    
    body('parentName')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('اسم ولي الأمر يجب ألا يتجاوز 100 حرف')
      .customSanitizer(sanitizeText),
    
    body('classId')
      .optional()
      .custom(isValidObjectId).withMessage('معرف الفصل غير صحيح'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('الملاحظات يجب ألا تتجاوز 500 حرف')
      .customSanitizer(sanitizeText),
    
    handleValidationErrors
  ],
  
  getById: [
    param('id')
      .custom(isValidObjectId).withMessage('معرف الطفل غير صحيح'),
    handleValidationErrors
  ]
};

// ==================== قواعد التحقق للحضور ====================

const attendanceValidation = {
  mark: [
    body('childId')
      .notEmpty().withMessage('معرف الطفل مطلوب')
      .custom(isValidObjectId).withMessage('معرف الطفل غير صحيح'),
    
    body('date')
      .notEmpty().withMessage('التاريخ مطلوب')
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('صيغة التاريخ غير صحيحة (YYYY-MM-DD)'),
    
    body('status')
      .notEmpty().withMessage('حالة الحضور مطلوبة')
      .isIn(['present', 'absent', 'late']).withMessage('حالة الحضور يجب أن تكون: present, absent, أو late'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('الملاحظات يجب ألا تتجاوز 500 حرف')
      .customSanitizer(sanitizeText),
    
    handleValidationErrors
  ],
  
  batch: [
    body('date')
      .notEmpty().withMessage('التاريخ مطلوب')
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('صيغة التاريخ غير صحيحة (YYYY-MM-DD)'),
    
    body('attendanceData')
      .isArray({ min: 1 }).withMessage('بيانات الحضور مطلوبة ويجب أن تكون مصفوفة'),
    
    body('attendanceData.*.childId')
      .notEmpty().withMessage('معرف الطفل مطلوب')
      .custom(isValidObjectId).withMessage('معرف الطفل غير صحيح'),
    
    body('attendanceData.*.status')
      .notEmpty().withMessage('حالة الحضور مطلوبة')
      .isIn(['present', 'absent', 'late']).withMessage('حالة الحضور غير صحيحة'),
    
    handleValidationErrors
  ],
  
  delete: [
    param('childId')
      .custom(isValidObjectId).withMessage('معرف الطفل غير صحيح'),
    
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('صيغة التاريخ غير صحيحة (YYYY-MM-DD)'),
    
    handleValidationErrors
  ],
  
  query: [
    query('date')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('صيغة التاريخ غير صحيحة (YYYY-MM-DD)'),
    
    query('classId')
      .optional()
      .custom(isValidObjectId).withMessage('معرف الفصل غير صحيح'),
    
    handleValidationErrors
  ]
};

// ==================== قواعد التحقق للفصول ====================

const classValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('اسم الفصل مطلوب')
      .isLength({ min: 2, max: 100 }).withMessage('اسم الفصل يجب أن يكون بين 2 و 100 حرف')
      .customSanitizer(sanitizeText),
    
    body('stage')
      .optional()
      .trim()
      .isIn(['حضانة', 'ابتدائي', 'إعدادي', 'ثانوي', 'كوتشينج']).withMessage('المرحلة غير صحيحة'),
    
    body('grade')
      .optional()
      .trim()
      .customSanitizer(sanitizeText),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('الوصف يجب ألا يتجاوز 500 حرف')
      .customSanitizer(sanitizeText),
    
    handleValidationErrors
  ],
  
  getById: [
    param('id')
      .custom(isValidObjectId).withMessage('معرف الفصل غير صحيح'),
    handleValidationErrors
  ]
};

// ==================== قواعد التحقق للمستخدمين/الخدام ====================

const userValidation = {
  create: [
    body('username')
      .trim()
      .notEmpty().withMessage('اسم المستخدم مطلوب')
      .isLength({ min: 3, max: 50 }).withMessage('اسم المستخدم يجب أن يكون بين 3 و 50 حرف')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('اسم المستخدم يجب أن يحتوي على حروف إنجليزية وأرقام فقط')
      .customSanitizer(sanitizeText),
    
    body('password')
      .notEmpty().withMessage('كلمة المرور مطلوبة')
      .isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    
    body('name')
      .trim()
      .notEmpty().withMessage('الاسم مطلوب')
      .isLength({ min: 2, max: 100 }).withMessage('الاسم يجب أن يكون بين 2 و 100 حرف')
      .customSanitizer(sanitizeText),
    
    body('phone')
      .optional()
      .trim()
      .customSanitizer(sanitizeText),
    
    body('role')
      .optional()
      .isIn(['admin', 'servant', 'serviceLeader', 'classTeacher']).withMessage('الدور غير صحيح'),
    
    body('assignedClassId')
      .optional()
      .custom(isValidObjectId).withMessage('معرف الفصل غير صحيح'),
    
    handleValidationErrors
  ],
  
  login: [
    body('username')
      .trim()
      .notEmpty().withMessage('اسم المستخدم مطلوب')
      .customSanitizer(sanitizeText),
    
    body('password')
      .notEmpty().withMessage('كلمة المرور مطلوبة'),
    
    handleValidationErrors
  ],
  
  update: [
    param('id')
      .custom(isValidObjectId).withMessage('معرف المستخدم غير صحيح'),
    
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('الاسم يجب أن يكون بين 2 و 100 حرف')
      .customSanitizer(sanitizeText),
    
    body('phone')
      .optional()
      .trim()
      .customSanitizer(sanitizeText),
    
    body('role')
      .optional()
      .isIn(['admin', 'servant', 'serviceLeader', 'classTeacher']).withMessage('الدور غير صحيح'),
    
    handleValidationErrors
  ],
  
  getById: [
    param('id')
      .custom(isValidObjectId).withMessage('معرف المستخدم غير صحيح'),
    handleValidationErrors
  ]
};

// ==================== قواعد التحقق للافتقاد ====================

const pastoralCareValidation = {
  create: [
    body('childId')
      .notEmpty().withMessage('معرف الطفل مطلوب')
      .custom(isValidObjectId).withMessage('معرف الطفل غير صحيح'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('الملاحظات يجب ألا تتجاوز 1000 حرف')
      .customSanitizer(sanitizeText),
    
    handleValidationErrors
  ],
  
  update: [
    param('id')
      .custom(isValidObjectId).withMessage('معرف السجل غير صحيح'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('الملاحظات يجب ألا تتجاوز 1000 حرف')
      .customSanitizer(sanitizeText),
    
    handleValidationErrors
  ]
};

// ==================== قواعد التحقق للإحصائيات ====================

const statisticsValidation = {
  dateRange: [
    query('startDate')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('صيغة تاريخ البداية غير صحيحة (YYYY-MM-DD)'),
    
    query('endDate')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('صيغة تاريخ النهاية غير صحيحة (YYYY-MM-DD)'),
    
    query('classId')
      .optional()
      .custom(isValidObjectId).withMessage('معرف الفصل غير صحيح'),
    
    handleValidationErrors
  ]
};

// ==================== تصدير ====================

module.exports = {
  handleValidationErrors,
  sanitizeText,
  isValidObjectId,
  childValidation,
  attendanceValidation,
  classValidation,
  userValidation,
  pastoralCareValidation,
  statisticsValidation
};
