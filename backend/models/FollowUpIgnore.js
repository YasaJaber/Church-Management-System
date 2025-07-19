const mongoose = require("mongoose");

const FollowUpIgnoreSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
    },
    // Who ignored this child
    ignoredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // We can add an expiry for the ignore if needed later
    // expiresAt: { type: Date },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Create a compound index to prevent duplicate entries for the same child
FollowUpIgnoreSchema.index({ child: 1 }, { unique: true });

module.exports = mongoose.model("FollowUpIgnore", FollowUpIgnoreSchema);
