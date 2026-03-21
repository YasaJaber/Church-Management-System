const mongoose = require("mongoose");

const kidSchema = new mongoose.Schema(
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
          if (!v) return true;
          return /^[\d\+\-\(\)\s]*$/.test(v) && v.length <= 20;
        },
        message: "رقم الهاتف يحتوي على أحرف غير صحيحة أو طوله أكثر من 20 حرف",
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
kidSchema.virtual('thumbnail').get(function() {
  if (!this.image) return null;
  return this.image.replace('/upload/', '/upload/c_fill,w_80,h_80,f_auto,q_auto/');
});

// Virtual for optimized full image URL
kidSchema.virtual('optimizedImage').get(function() {
  if (!this.image) return null;
  return this.image.replace('/upload/', '/upload/f_auto,q_auto/');
});

// Index for better query performance
kidSchema.index({ isActive: 1, name: 1 });
kidSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Kid", kidSchema);
