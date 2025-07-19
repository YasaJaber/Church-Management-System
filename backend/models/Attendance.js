const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["child", "servant"],
      required: true,
    },
    person: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "personModel",
    },
    personModel: {
      type: String,
      required: true,
      enum: ["Child", "User"],
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate attendance records for same person on same date
attendanceSchema.index({ person: 1, date: 1, type: 1 }, { unique: true });

// Index for better query performance
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ class: 1, date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
