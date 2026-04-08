const express = require("express");
const Stripe = require("stripe");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

const PRICES = {
  starter: "price_starter_id_here",
  pro: "price_pro_id_here",
};

// Create Stripe Checkout session
router.post("/checkout", auth, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !PRICES[plan]) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [{ price: PRICES[plan], quantity: 1 }],
      success_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/dashboard?upgraded=true`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/pricing`,
      metadata: { userId: user._id.toString(), plan },
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: "Could not create checkout session" });
  }
});

// Stripe webhook
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).send("Webhook signature verification failed");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, plan } = session.metadata;

    await User.findByIdAndUpdate(userId, {
      plan,
      stripeCustomerId: session.customer,
      proposalsUsed: 0,
    });
  }

  res.json({ received: true });
});

module.exports = router;
