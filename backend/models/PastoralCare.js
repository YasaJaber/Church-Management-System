const mongoose = require("mongoose");

const pastoralCareSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
    },
    absentDate: {
      type: String, // YYYY-MM-DD format
      required: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    removedDate: {
      type: Date,
      default: null,
    },
    removalReason: {
      type: String,
      enum: ["attended", "contacted", "manual"], // attended = حضر, contacted = تم الاتصال, manual = إزالة يدوية
      default: null,
    },
    // حقول الاتصال
    hasBeenCalled: {
      type: Boolean,
      default: false,
    },
    calledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    calledAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Index for better performance
pastoralCareSchema.index({ child: 1, absentDate: 1 });
pastoralCareSchema.index({ isActive: 1 });
pastoralCareSchema.index({ hasBeenCalled: 1 });
pastoralCareSchema.index({ isActive: 1, hasBeenCalled: 1 }); // للبحث عن الحالات النشطة غير المتصل بها
pastoralCareSchema.index({ child: 1, isActive: 1 }); // للبحث عن حالات طفل معين
pastoralCareSchema.index({ addedBy: 1, createdAt: -1 }); // لمعرفة من أضاف الحالات

module.exports = mongoose.model("PastoralCare", pastoralCareSchema);
