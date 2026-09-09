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
        validator: (value) => value === 1 || value === -1,
        message: "كل بند يسمح بنقطة واحدة فقط: إضافة أو خصم",
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
pointEntrySchema.index({ cycle: 1, date: 1, child: 1, category: 1 });

module.exports = mongoose.model("PointEntry", pointEntrySchema);
