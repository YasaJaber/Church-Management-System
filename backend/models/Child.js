const mongoose = require("mongoose");

const childSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    parentName: {
      type: String,
      required: false, // جعلناه اختياري
      trim: true,
    },
    stage: {
      type: String,
      enum: ["Nursery", "Primary", "Preparatory", "Secondary"],
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

module.exports = mongoose.model("Child", childSchema);
