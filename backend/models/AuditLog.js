const mongoose = require("mongoose");

/**
 * نموذج سجل العمليات (Audit Log)
 * يسجل جميع العمليات (إضافة/تعديل/حذف/تسجيل دخول) على البيانات
 */
const auditLogSchema = new mongoose.Schema(
  {
    // نوع العملية
    action: {
      type: String,
      enum: ["create", "update", "delete", "login"],
      required: true,
    },
    // الجدول/Collection اللي اتعدل
    collection: {
      type: String,
      required: true,
      enum: ["children", "users", "classes", "attendance", "servantAttendance", "pastoralCare", "giftDelivery", "auth"],
    },
    // اسم الجدول بالعربي للعرض
    collectionNameAr: {
      type: String,
      required: true,
    },
    // ID السجل اللي اتعدل
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // اسم السجل اللي اتعدل (للعرض)
    documentName: {
      type: String,
      default: "",
    },
    // المستخدم اللي عمل العملية
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // اسم المستخدم (للعرض السريع)
    userName: {
      type: String,
      required: true,
    },
    // دور المستخدم
    userRole: {
      type: String,
      required: true,
    },
    // الفصل المرتبط بالعملية (لو موجود)
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    // اسم الفصل (للعرض السريع)
    className: {
      type: String,
      default: "",
    },
    // التغييرات اللي حصلت
    changes: {
      before: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      after: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },
    // وصف العملية بالعربي
    description: {
      type: String,
      default: "",
    },
    // IP Address (اختياري)
    ipAddress: {
      type: String,
      default: "",
    },
    // نوع الجهاز/المتصفح (User Agent)
    userAgent: {
      type: String,
      default: "",
    },
    // معلومات تسجيل الدخول الإضافية
    loginDetails: {
      // نوع الجهاز (mobile/tablet/desktop)
      deviceType: {
        type: String,
        default: "",
      },
      // موديل الجهاز (Samsung Galaxy A34, iPhone 15, etc.)
      deviceModel: {
        type: String,
        default: "",
      },
      // اسم المتصفح
      browser: {
        type: String,
        default: "",
      },
      // نظام التشغيل
      os: {
        type: String,
        default: "",
      },
      // هل الجهاز موبايل؟
      isMobile: {
        type: Boolean,
        default: false,
      },
      // دقة الشاشة
      screenResolution: {
        type: String,
        default: "",
      },
      // أبعاد النافذة
      windowSize: {
        type: String,
        default: "",
      },
      // المنطقة الزمنية
      timezone: {
        type: String,
        default: "",
      },
      // لغة المتصفح
      language: {
        type: String,
        default: "",
      },
      // نوع الاتصال (WiFi/4G/etc)
      connectionType: {
        type: String,
        default: "",
      },
      // مستوى البطارية
      batteryLevel: {
        type: Number,
        default: null,
      },
      // هل البطارية في الشحن؟
      batteryCharging: {
        type: Boolean,
        default: null,
      },
      // عدد أنوية المعالج
      cpuCores: {
        type: Number,
        default: null,
      },
      // ذاكرة الجهاز (GB)
      deviceMemory: {
        type: Number,
        default: null,
      },
      // هل الجهاز يدعم اللمس؟
      touchSupport: {
        type: Boolean,
        default: false,
      },
      // هل الجهاز متصل بالإنترنت؟
      online: {
        type: Boolean,
        default: true,
      },
      // platform
      platform: {
        type: String,
        default: "",
      },
      // الموقع الجغرافي
      location: {
        // المدينة
        city: {
          type: String,
          default: "",
        },
        // الدولة
        country: {
          type: String,
          default: "",
        },
        // خط العرض
        latitude: {
          type: Number,
          default: null,
        },
        // خط الطول
        longitude: {
          type: Number,
          default: null,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes للبحث السريع
auditLogSchema.index({ createdAt: -1 }); // للترتيب بالتاريخ
auditLogSchema.index({ classId: 1, createdAt: -1 }); // للبحث حسب الفصل
auditLogSchema.index({ userId: 1, createdAt: -1 }); // للبحث حسب المستخدم
auditLogSchema.index({ collection: 1, createdAt: -1 }); // للبحث حسب نوع البيانات
auditLogSchema.index({ action: 1, createdAt: -1 }); // للبحث حسب نوع العملية

module.exports = mongoose.model("AuditLog", auditLogSchema);
