const mongoose = require("mongoose");

const giftDeliverySchema = new mongoose.Schema(
  {
    // يدعم الأطفال والخدام
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: function() { return !this.servant; } // مطلوب إذا لم يكن servant
    },
    servant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function() { return !this.child; } // مطلوب إذا لم يكن child
    },
    deliveredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deliveryDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    consecutiveWeeksEarned: {
      type: Number,
      required: true,
      min: 0, // 0 for reset markers, 4+ for actual gifts
    },
    giftType: {
      type: String,
      default: "مواظبة 4 أسابيع",
    },
    notes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
giftDeliverySchema.index({ child: 1, deliveryDate: -1 });
giftDeliverySchema.index({ servant: 1, deliveryDate: -1 });
giftDeliverySchema.index({ deliveredBy: 1, deliveryDate: -1 });
giftDeliverySchema.index({ isActive: 1, deliveryDate: -1 }); // للبحث عن الهدايا النشطة
giftDeliverySchema.index({ consecutiveWeeksEarned: 1 }); // للفلترة حسب عدد الأسابيع

module.exports = mongoose.model("GiftDelivery", giftDeliverySchema);
