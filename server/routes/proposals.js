const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const Proposal = require("../models/Proposal");
const User = require("../models/User");
const { generateProposal, refineSection } = require("../services/ai");
const { sendProposalEmail } = require("../services/email");

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.userId || req.ip,
  message: { error: "Too many AI requests. Please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate a new proposal with AI
router.post("/generate", auth, aiLimiter, async (req, res) => {
  try {
    const { projectDescription, clientName, clientEmail, clientCompany, currency } = req.body;
    if (!projectDescription || !clientName) {
      return res.status(400).json({ error: "Project description and client name are required" });
    }

    const PLAN_LIMITS_MAP = { free: 5, starter: 50, pro: 9999 };

    // Atomic check-and-increment to prevent race conditions
    const user = await User.findOneAndUpdate(
      {
        _id: req.userId,
        $expr: {
          $lt: [
            "$proposalsUsed",
            {
              $switch: {
                branches: [
                  { case: { $eq: ["$plan", "starter"] }, then: PLAN_LIMITS_MAP.starter },
                  { case: { $eq: ["$plan", "pro"] }, then: PLAN_LIMITS_MAP.pro },
                ],
                default: PLAN_LIMITS_MAP.free,
              },
            },
          ],
        },
      },
      { $inc: { proposalsUsed: 1 } },
      { new: false }
    );

    if (!user) {
      const exists = await User.exists({ _id: req.userId });
      if (!exists) return res.status(404).json({ error: "User not found" });
      return res.status(403).json({ error: "Proposal limit reached. Upgrade your plan." });
    }

    // Call AI to generate proposal
    const generated = await generateProposal(projectDescription, clientName, clientCompany, currency || "USD");

    // Save to database
    const proposal = await Proposal.create({
      user: user._id,
      title: generated.title,
      clientName,
      clientEmail: clientEmail || "",
      clientCompany: clientCompany || "",
      projectDescription,
      sections: generated.sections,
      milestones: generated.milestones,
      totalAmount: generated.totalAmount,
      currency: currency || "USD",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json(proposal);
  } catch (err) {
    console.error("Generate proposal error:", err);
    res.status(500).json({ error: "Failed to generate proposal" });
  }
});

// Refine a section with AI
router.post("/:id/refine", auth, aiLimiter, async (req, res) => {
  try {
    const proposal = await Proposal.findOne({ _id: req.params.id, user: req.userId });
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });

    const { sectionId, instruction } = req.body;
    if (!sectionId || !instruction) {
      return res.status(400).json({ error: "Section ID and instruction are required" });
    }

    const section = proposal.sections.id(sectionId);
    if (!section) return res.status(404).json({ error: "Section not found" });

    const refined = await refineSection(section.title, section.content, instruction);

    section.title = refined.title || section.title;
    section.content = refined.content;
    await proposal.save();

    res.json(proposal);
  } catch (err) {
    console.error("Refine section error:", err);
    res.status(500).json({ error: "Failed to refine section" });
  }
});

// Get all proposals for the current user (paginated)
router.get("/", auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [proposals, total] = await Promise.all([
      Proposal.find({ user: req.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-projectDescription -sections"),
      Proposal.countDocuments({ user: req.userId }),
    ]);

    res.json({
      proposals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get a single proposal
router.get("/:id", auth, async (req, res) => {
  try {
    const proposal = await Proposal.findOne({ _id: req.params.id, user: req.userId });
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });
    res.json(proposal);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update a proposal (manual edits)
router.put("/:id", auth, async (req, res) => {
  try {
    const { title, sections, milestones, totalAmount, clientName, clientEmail, clientCompany, currency } = req.body;

    const proposal = await Proposal.findOne({ _id: req.params.id, user: req.userId });
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });

    if (title) proposal.title = title;
    if (sections) proposal.sections = sections;
    if (milestones) proposal.milestones = milestones;
    if (totalAmount !== undefined) proposal.totalAmount = totalAmount;
    if (clientName) proposal.clientName = clientName;
    if (clientEmail) proposal.clientEmail = clientEmail;
    if (clientCompany) proposal.clientCompany = clientCompany;
    if (currency) proposal.currency = currency;

    await proposal.save();
    res.json(proposal);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Send proposal to client via email
router.post("/:id/send", auth, async (req, res) => {
  try {
    const proposal = await Proposal.findOne({ _id: req.params.id, user: req.userId });
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });

    if (!proposal.clientEmail) {
      return res.status(400).json({ error: "Client email is required to send" });
    }

    const user = await User.findById(req.userId);

    await sendProposalEmail(proposal, user.name);

    proposal.status = "sent";
    proposal.sentAt = new Date();
    await proposal.save();

    res.json({ message: "Proposal sent successfully", proposal });
  } catch (err) {
    console.error("Send proposal error:", err);
    res.status(500).json({ error: "Failed to send proposal" });
  }
});

// Delete a proposal
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await Proposal.deleteOne({ _id: req.params.id, user: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Proposal not found" });
    res.json({ message: "Proposal deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
