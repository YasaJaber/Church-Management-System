const mongoose = require("mongoose");

const pointCategorySchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "اسم بند النقاط مطلوب"],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

pointCategorySchema.index({ class: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("PointCategory", pointCategorySchema);
