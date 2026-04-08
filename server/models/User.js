const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    name: { type: String, required: true, trim: true },
    businessName: { type: String, trim: true, default: "" },
    plan: { type: String, enum: ["free", "starter", "pro"], default: "free" },
    proposalsUsed: { type: Number, default: 0 },
    stripeCustomerId: { type: String },
  },
  { timestamps: true }
);

userSchema.index({ plan: 1 });
userSchema.index({ stripeCustomerId: 1 }, { sparse: true });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", userSchema);
