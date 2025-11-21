/**
 * Error Handler Middleware
 * 
 * معالج الأخطاء المركزي للتطبيق
 * يتعامل مع جميع الأخطاء ويرسل رسائل واضحة ومحددة بدلاً من "حدث خطأ"
 */

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Error Handler Middleware
 * يتم استدعاؤه تلقائياً عند حدوث أي خطأ في التطبيق
 */
const errorHandler = (err, req, res, next) => {
  // Log error details (for debugging)
  logger.error('خطأ حدث في التطبيق', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.username,
    body: logger.sanitize(req.body),
  });

  // Set default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'حدث خطأ في الخادم';
  let isOperational = err.isOperational || false;

  // Handle specific Mongoose errors
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map(e => e.message);
    message = errors.length > 0 ? errors[0] : 'بيانات غير صحيحة';
    isOperational = true;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0];
    
    // رسائل واضحة حسب الحقل
    if (field === 'username') {
      message = 'اسم المستخدم موجود بالفعل';
    } else if (field === 'phone') {
      message = 'رقم الهاتف موجود بالفعل';
    } else if (field === 'name') {
      message = 'الاسم موجود بالفعل';
    } else {
      message = `${field} موجود بالفعل`;
    }
    isOperational = true;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    
    // رسائل واضحة حسب نوع الحقل
    if (err.path === '_id') {
      message = 'معرف غير صحيح';
    } else if (err.path === 'classId') {
      message = 'معرف الفصل غير صحيح';
    } else if (err.path === 'childId') {
      message = 'معرف الطفل غير صحيح';
    } else if (err.path === 'servantId') {
      message = 'معرف الخادم غير صحيح';
    } else {
      message = `${err.path} غير صحيح`;
    }
    isOperational = true;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'رمز المصادقة غير صحيح';
    isOperational = true;
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'انتهت صلاحية رمز المصادقة. يرجى تسجيل الدخول مرة أخرى';
    isOperational = true;
  }

  // Determine response based on environment
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Build error response
  const errorResponse = {
    success: false,
    error: isOperational || isDevelopment 
      ? message 
      : 'حدث خطأ. يرجى المحاولة مرة أخرى لاحقاً',
  };

  // Add additional info in development
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    errorResponse.details = {
      name: err.name,
      statusCode: statusCode,
      isOperational: isOperational,
    };
  }

  // Send response
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware to catch 404 errors
 * يتم استدعاؤه عندما لا يتم العثور على المسار المطلوب
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`المسار ${req.originalUrl} غير موجود`, 404);
  next(error);
};

/**
 * Async error handler wrapper
 * يتم استخدامه لتغليف async functions وتمرير الأخطاء إلى error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
