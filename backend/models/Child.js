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
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "الملاحظات لا يجب أن تتجاوز 500 حرف"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
childSchema.index({ class: 1, isActive: 1 }); // للبحث عن أطفال فصل معين
childSchema.index({ isActive: 1, name: 1 }); // للبحث والترتيب بالاسم
childSchema.index({ class: 1, name: 1 }); // للبحث في فصل مع الترتيب
childSchema.index({ stage: 1, grade: 1 }); // للفلترة حسب المرحلة والصف

module.exports = mongoose.model("Child", childSchema);
