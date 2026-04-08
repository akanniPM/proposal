const mongoose = require("mongoose");

const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    proposal: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal" },
    invoiceNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      default: "draft",
    },

    // Client info
    clientName: { type: String, required: true },
    clientEmail: { type: String, default: "" },
    clientCompany: { type: String, default: "" },

    // Line items
    lineItems: [lineItemSchema],
    currency: { type: String, default: "USD" },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    // Dates
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date },

    // Payment
    paidAt: { type: Date },
    sentAt: { type: Date },

    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

invoiceSchema.index({ user: 1, createdAt: -1 });
invoiceSchema.index({ user: 1, status: 1 });
invoiceSchema.index({ proposal: 1 }, { sparse: true });
invoiceSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
