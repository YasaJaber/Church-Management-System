const mongoose = require("mongoose");

/**
 * نموذج سجل العمليات (Audit Log)
 * يسجل جميع العمليات (إضافة/تعديل/حذف) على البيانات
 */
const auditLogSchema = new mongoose.Schema(
  {
    // نوع العملية
    action: {
      type: String,
      enum: ["create", "update", "delete"],
      required: true,
    },
    // الجدول/Collection اللي اتعدل
    collection: {
      type: String,
      required: true,
      enum: ["children", "users", "classes", "attendance", "servantAttendance", "pastoralCare", "giftDelivery"],
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
