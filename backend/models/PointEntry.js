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
    entryType: {
      type: String,
      enum: ["category", "bonus"],
      default: "category",
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PointCategory",
      required: function () {
        return this.entryType === "category";
      },
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "تاريخ تسجيل النقاط غير صحيح"],
      index: true,
    },
    points: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return Number.isInteger(value) && value !== 0;
        },
        message: "قيمة حركة النقاط يجب أن تكون عددًا صحيحًا غير صفر",
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
pointEntrySchema.index({ cycle: 1, date: 1, createdAt: -1 });
pointEntrySchema.index({ cycle: 1, date: 1, child: 1, category: 1, entryType: 1 });

module.exports = mongoose.model("PointEntry", pointEntrySchema);
