const mongoose = require("mongoose");

const childSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم الطفل مطلوب"],
      trim: true,
      minlength: [2, "اسم الطفل يجب أن يكون على الأقل حرفين"],
      maxlength: [100, "اسم الطفل لا يجب أن يتجاوز 100 حرف"],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          // إذا كان الحقل فارغ فهو صحيح
          if (!v) return true;
          // التحقق من أن الرقم لا يحتوي على أحرف غير مرغوب فيها
          // وأن طوله لا يتجاوز 20 حرف
          return /^[\d\+\-\(\)\s]*$/.test(v) && v.length <= 20;
        },
        message: "رقم الهاتف يحتوي على أحرف غير صحيحة أو طوله أكثر من 20 حرف",
      },
    },
    parentName: {
      type: String,
      required: false, // جعلناه اختياري
      trim: true,
    },
    stage: {
      type: String,
      enum: ["Nursery", "Primary", "Preparatory", "Secondary", "Coaching"],
    },
    grade: {
      type: String,
      trim: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    birthDate: {
      type: String, // Format: YYYY-MM-DD
      default: null,
      validate: {
        validator: function (v) {
          if (!v) return true;
          // التحقق من صيغة التاريخ YYYY-MM-DD
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: "تاريخ الميلاد يجب أن يكون بصيغة YYYY-MM-DD",
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "الملاحظات لا يجب أن تتجاوز 500 حرف"],
    },
    image: {
      type: String, // Cloudinary URL
      default: null,
    },
    imagePublicId: {
      type: String, // Cloudinary public_id for deletion
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for thumbnail URL (80x80, cropped)
childSchema.virtual('thumbnail').get(function() {
  if (!this.image) return null;
  return this.image.replace('/upload/', '/upload/c_fill,w_80,h_80,f_auto,q_auto/');
});

// Virtual for optimized full image URL
childSchema.virtual('optimizedImage').get(function() {
  if (!this.image) return null;
  return this.image.replace('/upload/', '/upload/f_auto,q_auto/');
});

// Indexes for better query performance
childSchema.index({ class: 1, isActive: 1 }); // للبحث عن أطفال فصل معين
childSchema.index({ isActive: 1, name: 1 }); // للبحث والترتيب بالاسم
childSchema.index({ class: 1, name: 1 }); // للبحث في فصل مع الترتيب
childSchema.index({ stage: 1, grade: 1 }); // للفلترة حسب المرحلة والصف
childSchema.index({ birthDate: 1, isActive: 1 }); // للبحث عن أعياد الميلاد

module.exports = mongoose.model("Child", childSchema);
