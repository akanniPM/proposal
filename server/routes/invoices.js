const express = require("express");
const auth = require("../middleware/auth");
const Invoice = require("../models/Invoice");
const Proposal = require("../models/Proposal");
const User = require("../models/User");
const { sendInvoiceEmail } = require("../services/email");

const router = express.Router();

// Generate a unique invoice number (retries on collision)
async function generateInvoiceNumber() {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, "0");

  for (let attempt = 0; attempt < 5; attempt++) {
    const rand = Math.floor(10000 + Math.random() * 90000);
    const candidate = `INV-${y}${m}-${rand}`;
    const exists = await Invoice.exists({ invoiceNumber: candidate });
    if (!exists) return candidate;
  }

  // Fallback: timestamp-based (virtually collision-free)
  return `INV-${y}${m}-${Date.now().toString(36).toUpperCase()}`;
}

// Create invoice from a proposal
router.post("/from-proposal/:proposalId", auth, async (req, res) => {
  try {
    const proposal = await Proposal.findOne({ _id: req.params.proposalId, user: req.userId });
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });

    // Convert milestones to line items
    const lineItems = proposal.milestones.map((m) => ({
      description: `${m.title}${m.description ? " — " + m.description : ""}`,
      quantity: 1,
      unitPrice: m.amount,
      total: m.amount,
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = req.body.taxRate || 0;
    const tax = Math.round(subtotal * (taxRate / 100));

    const invoice = await Invoice.create({
      user: req.userId,
      proposal: proposal._id,
      invoiceNumber: await generateInvoiceNumber(),
      clientName: proposal.clientName,
      clientEmail: proposal.clientEmail,
      clientCompany: proposal.clientCompany,
      lineItems,
      currency: proposal.currency,
      subtotal,
      taxRate,
      tax,
      total: subtotal + tax,
      dueDate: req.body.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      notes: req.body.notes || "",
    });

    // Update proposal status
    proposal.status = "accepted";
    proposal.respondedAt = new Date();
    await proposal.save();

    res.status(201).json(invoice);
  } catch (err) {
    console.error("Create invoice error:", err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// Create a standalone invoice
router.post("/", auth, async (req, res) => {
  try {
    const { clientName, clientEmail, clientCompany, lineItems, currency, taxRate, dueDate, notes } = req.body;

    if (!clientName || !lineItems || !lineItems.length) {
      return res.status(400).json({ error: "Client name and line items are required" });
    }

    const items = lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice,
      total: (item.quantity || 1) * item.unitPrice,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const rate = taxRate || 0;
    const tax = Math.round(subtotal * (rate / 100));

    const invoice = await Invoice.create({
      user: req.userId,
      invoiceNumber: await generateInvoiceNumber(),
      clientName,
      clientEmail: clientEmail || "",
      clientCompany: clientCompany || "",
      lineItems: items,
      currency: currency || "USD",
      subtotal,
      taxRate: rate,
      tax,
      total: subtotal + tax,
      dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      notes: notes || "",
    });

    res.status(201).json(invoice);
  } catch (err) {
    console.error("Create invoice error:", err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// Get all invoices (paginated)
router.get("/", auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find({ user: req.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments({ user: req.userId }),
    ]);

    res.json({
      invoices,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get a single invoice
router.get("/:id", auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.userId });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update invoice
router.put("/:id", auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.userId });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const { lineItems, taxRate, dueDate, notes, status } = req.body;

    if (lineItems) {
      invoice.lineItems = lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice,
        total: (item.quantity || 1) * item.unitPrice,
      }));
      invoice.subtotal = invoice.lineItems.reduce((sum, item) => sum + item.total, 0);
      invoice.taxRate = taxRate !== undefined ? taxRate : invoice.taxRate;
      invoice.tax = Math.round(invoice.subtotal * (invoice.taxRate / 100));
      invoice.total = invoice.subtotal + invoice.tax;
    }

    if (dueDate) invoice.dueDate = dueDate;
    if (notes !== undefined) invoice.notes = notes;
    if (status) {
      invoice.status = status;
      if (status === "paid") invoice.paidAt = new Date();
    }

    await invoice.save();
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Send invoice via email
router.post("/:id/send", auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.userId });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    if (!invoice.clientEmail) {
      return res.status(400).json({ error: "Client email is required to send" });
    }

    const user = await User.findById(req.userId);
    await sendInvoiceEmail(invoice, user.name);

    invoice.status = "sent";
    invoice.sentAt = new Date();
    await invoice.save();

    res.json({ message: "Invoice sent successfully", invoice });
  } catch (err) {
    console.error("Send invoice error:", err);
    res.status(500).json({ error: "Failed to send invoice" });
  }
});

module.exports = router;
