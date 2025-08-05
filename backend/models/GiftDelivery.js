const mongoose = require("mongoose");

const giftDeliverySchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
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
      min: 4, // Minimum 4 weeks to earn a gift
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
giftDeliverySchema.index({ deliveredBy: 1, deliveryDate: -1 });

module.exports = mongoose.model("GiftDelivery", giftDeliverySchema);
