/**
 * Custom Error Classes
 * 
 * هذه الملف يحتوي على custom error classes لتحسين معالجة الأخطاء
 * كل error class له رسالة واضحة ومحددة بدلاً من "حدث خطأ" العامة
 */

/**
 * Base Application Error
 * كل الـ errors الأخرى وارثة منه
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error - 400
 * للأخطاء المتعلقة بـ validation البيانات
 */
class ValidationError extends AppError {
  constructor(message = 'بيانات غير صحيحة') {
    super(message, 400);
  }
}

/**
 * Authentication Error - 401
 * للأخطاء المتعلقة بالمصادقة (login, password incorrect, etc.)
 */
class AuthenticationError extends AppError {
  constructor(message = 'فشل تسجيل الدخول') {
    super(message, 401);
  }
}

/**
 * Authorization Error - 403
 * للأخطاء المتعلقة بالصلاحيات
 */
class AuthorizationError extends AppError {
  constructor(message = 'ليس لديك صلاحية للقيام بهذا الإجراء') {
    super(message, 403);
  }
}

/**
 * Not Found Error - 404
 * عندما لا نجد البيانات المطلوبة
 */
class NotFoundError extends AppError {
  constructor(message = 'لم يتم العثور على البيانات') {
    super(message, 404);
  }
}

/**
 * Conflict Error - 409
 * عندما تكون البيانات موجودة بالفعل (duplicate entries)
 */
class ConflictError extends AppError {
  constructor(message = 'البيانات موجودة بالفعل') {
    super(message, 409);
  }
}

/**
 * Rate Limit Error - 429
 * عندما يتجاوز المستخدم عدد الطلبات المسموح بها
 */
class RateLimitError extends AppError {
  constructor(message = 'لقد تجاوزت عدد المحاولات المسموح بها') {
    super(message, 429);
  }
}

/**
 * Internal Server Error - 500
 * للأخطاء غير المتوقعة في السيرفر
 */
class InternalServerError extends AppError {
  constructor(message = 'حدث خطأ في الخادم') {
    super(message, 500, false); // Not operational - unexpected error
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
};
