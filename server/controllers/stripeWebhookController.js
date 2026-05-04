import Stripe from "stripe";
import Tenant from "../models/tenant.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2024-11-20.acacia",
});

// Idempotency guard — prevents double-processing of the same Stripe event
async function isEventProcessed(eventId) {
  const { redis } = await import("../config/redis.js");
  const key = `stripe_event:${eventId}`;
  const exists = await redis.get(key);
  if (exists) return true;
  await redis.set(key, "1", 86400); // 24h TTL
  return false;
}

/**
 * Verify Stripe webhook signature and parse event.
 * req.body is a Buffer when express.raw() is used.
 */
export function verifyWebhook(req) {
  const sig = req.headers["stripe-signature"];
  if (!sig) throw Object.assign(new Error("Missing Stripe signature"), { statusCode: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // Buffer from express.raw()
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || "whsec_placeholder"
    );
  } catch (err) {
    logger.error("[Stripe] Webhook signature verification failed", { error: err.message });
    throw Object.assign(new Error(`Webhook Error: ${err.message}`), { statusCode: 400 });
  }
  return event;
}

// ── Event handlers ─────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(event) {
  const session = event.data.object;
  const { userId, tenantId, plan } = session.metadata;
  if (!userId || !tenantId) {
    logger.warn("[Stripe] checkout.session.completed missing metadata", { sessionId: session.id });
    return;
  }

  const customerId = session.customer;
  const subscriptionId = session.subscription;

  await Tenant.findByIdAndUpdate(tenantId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    plan: plan || "starter",
    status: "active",
    trialEndsAt: null,
  });

  logger.info(`[Stripe] Checkout complete: tenant=${tenantId} plan=${plan} customer=${customerId}`);
}

async function handleSubscriptionUpdated(event) {
  const sub = event.data.object;
  const tenantId = sub.metadata?.tenantId;
  if (!tenantId) {
    // Look up by customer ID
    const tenant = await Tenant.findOne({ stripeCustomerId: sub.customer });
    if (!tenant) { logger.warn("[Stripe] No tenant for subscription update", { subId: sub.id }); return; }
    await tenant.updateOne({
      stripeSubscriptionId: sub.id,
      plan: getPlanFromPrice(sub.items?.data?.[0]?.price?.id),
      status: sub.status === "active" ? "active" : sub.status === "past_due" ? "active" : "suspended",
      subscriptionEndsAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
    });
    return;
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) return;

  await tenant.updateOne({
    stripeSubscriptionId: sub.id,
    plan: getPlanFromPrice(sub.items?.data?.[0]?.price?.id),
    status: sub.status === "active" ? "active" : sub.status === "past_due" ? "active" : "suspended",
    subscriptionEndsAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
  });

  logger.info(`[Stripe] Subscription updated: tenant=${tenantId} status=${sub.status}`);
}

async function handleSubscriptionDeleted(event) {
  const sub = event.data.object;
  const tenant = await Tenant.findOne({ stripeSubscriptionId: sub.id });
  if (!tenant) { logger.warn("[Stripe] No tenant for deleted subscription", { subId: sub.id }); return; }

  await tenant.updateOne({
    plan: "free",
    stripeSubscriptionId: null,
    status: "active",
    subscriptionEndsAt: null,
  });
  logger.info(`[Stripe] Subscription deleted: tenant=${tenant._id} → downgraded to free`);
}

async function handleInvoicePaymentFailed(event) {
  const invoice = event.data.object;
  const tenant = await Tenant.findOne({ stripeCustomerId: invoice.customer });
  if (!tenant) return;

  // Mark as past_due but don't suspend immediately — give 7 day grace
  await tenant.updateOne({ status: "active" }); // stripe handles grace via webhook
  logger.warn(`[Stripe] Payment failed: tenant=${tenant._id} invoice=${invoice.id}`);
}

function getPlanFromPrice(priceId) {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return "enterprise";
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter";
  return "free";
}

// ── Controller ──────────────────────────────────────────────────────────────────

export const stripeWebhookController = async (req, res) => {
  let event;
  try {
    event = verifyWebhook(req);
  } catch (err) {
    return res.status(err.statusCode || 400).send({ success: false, message: err.message });
  }

  // Idempotency guard
  if (await isEventProcessed(event.id)) {
    logger.info(`[Stripe] Duplicate event skipped: ${event.id} type=${event.type}`);
    return res.send({ success: true, message: "Event already processed", statusCode: 200 });
  }

  logger.info(`[Stripe] Processing event: ${event.type} id=${event.id}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;
      default:
        logger.debug(`[Stripe] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    logger.error(`[Stripe] Handler error for ${event.type}: ${err.message}`, { eventId: event.id });
    // Return 200 to avoid Stripe retry storms — log and handle manually
    // In production: push to DLQ and alert
  }

  res.send({ success: true, statusCode: 200 });
};