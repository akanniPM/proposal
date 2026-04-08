const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    dueDate: { type: String, default: "" },
    amount: { type: Number, default: 0 },
  },
  { _id: true }
);

const proposalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "accepted", "declined"],
      default: "draft",
    },

    // Client info
    clientName: { type: String, required: true },
    clientEmail: { type: String, default: "" },
    clientCompany: { type: String, default: "" },

    // Original input from the freelancer
    projectDescription: { type: String, required: true },

    // AI-generated content
    sections: [sectionSchema],
    milestones: [milestoneSchema],

    // Pricing
    currency: { type: String, default: "USD" },
    totalAmount: { type: Number, default: 0 },
    validUntil: { type: Date },

    // Tracking
    viewedAt: { type: Date },
    respondedAt: { type: Date },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

proposalSchema.index({ user: 1, createdAt: -1 });
proposalSchema.index({ user: 1, status: 1 });
proposalSchema.index({ status: 1 });

module.exports = mongoose.model("Proposal", proposalSchema);
