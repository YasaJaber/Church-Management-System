const mongoose = require("mongoose");

const pointEntrySchema = new mongoose.Schema(
  {
    cycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PointCycle",
      required: true,
      index: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PointCategory",
      required: true,
    },
    points: {
      type: Number,
      required: true,
      validate: {
        validator: (value) => Number.isInteger(value) && value !== 0,
        message: "قيمة النقاط يجب أن تكون رقمًا صحيحًا غير صفري",
      },
    },
    note: {
      type: String,
      trim: true,
      maxlength: 250,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

pointEntrySchema.index({ cycle: 1, child: 1, createdAt: -1 });

module.exports = mongoose.model("PointEntry", pointEntrySchema);
