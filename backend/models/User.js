const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "servant", "serviceLeader", "classTeacher"],
      required: true,
    },
    assignedClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
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

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Indexes for better query performance
userSchema.index({ role: 1, isActive: 1 }); // للبحث عن خدام نشطين حسب الدور
userSchema.index({ assignedClass: 1 }); // للبحث عن خدام فصل معين
userSchema.index({ isActive: 1, name: 1 }); // للبحث والترتيب بالاسم

module.exports = mongoose.model("User", userSchema);
