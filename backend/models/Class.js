const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: ["Nursery", "Primary", "Preparatory", "Secondary", "Coaching"],
      required: true,
    },
    grade: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    servants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique stage+grade combination
classSchema.index({ stage: 1, grade: 1 }, { unique: true });

// Additional indexes for better query performance
classSchema.index({ isActive: 1, order: 1 }); // للترتيب حسب الـ order
classSchema.index({ stage: 1, isActive: 1 }); // للفلترة حسب المرحلة

// Virtual for getting children count
classSchema.virtual("childrenCount", {
  ref: "Child",
  localField: "_id",
  foreignField: "class",
  count: true,
});

module.exports = mongoose.model("Class", classSchema);
