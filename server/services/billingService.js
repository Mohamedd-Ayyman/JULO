import Stripe from "stripe";
import Tenant from "../models/tenant.js";
import User from "../models/user.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2024-11-20.acacia",
});

const PLAN_PRICES = {
  free: null,
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
};

const PLAN_TTL_DAYS = { starter: 30, pro: 30, enterprise: 30 };

export class BillingService {
  /**
   * Create a Stripe Checkout session for plan upgrade.
   */
  async createCheckoutSession(userId, tenantId, plan) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw Object.assign(new Error("Workspace not found"), { statusCode: 404 });

    if (!PLAN_PRICES[plan]) throw Object.assign(new Error(`No price configured for plan: ${plan}`), { statusCode: 400 });

    const user = await User.findById(userId).select("email firstname lastname");
    if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      client_reference_id: `${userId}:${tenantId}`,
      line_items: [{ price: PLAN_PRICES[plan], quantity: 1 }],
      success_url: `${config.clientUrl}/settings/billing?success=1`,
      cancel_url: `${config.clientUrl}/settings/billing?canceled=1`,
      metadata: { userId: String(userId), tenantId: String(tenantId), plan },
      subscription_data: {
        metadata: { tenantId: String(tenantId) },
        trial_period_days: plan === "pro" || plan === "enterprise" ? 14 : 0,
      },
      allow_promotion_codes: true,
    });

    logger.info(`[Billing] Checkout session created: ${session.id} for tenant ${tenantId} plan ${plan}`);
    return { sessionId: session.id, url: session.url };
  }

  /**
   * Create a customer portal session for managing subscription.
   */
  async createPortalSession(tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw Object.assign(new Error("Workspace not found"), { statusCode: 404 });
    if (!tenant.stripeCustomerId) throw Object.assign(new Error("No Stripe customer found"), { statusCode: 400 });

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${config.clientUrl}/settings/billing`,
    });

    logger.info(`[Billing] Portal session created: ${session.id} for tenant ${tenantId}`);
    return { url: session.url };
  }

  /**
   * Get current subscription status for a tenant.
   */
  async getSubscriptionStatus(tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw Object.assign(new Error("Workspace not found"), { statusCode: 404 });

    if (!tenant.stripeSubscriptionId) {
      return {
        plan: tenant.plan,
        status: "none",
        trialEndsAt: tenant.trialEndsAt,
        subscriptionEndsAt: null,
        features: tenant.features,
        limits: tenant.limits,
      };
    }

    try {
      const sub = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);
      return {
        plan: tenant.plan,
        stripeStatus: sub.status,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        trialEndsAt: tenant.trialEndsAt,
        subscriptionEndsAt: tenant.subscriptionEndsAt,
        features: tenant.features,
        limits: tenant.limits,
      };
    } catch (err) {
      logger.warn(`[Billing] Could not fetch Stripe subscription: ${err.message}`);
      return { plan: tenant.plan, status: "error", error: err.message };
    }
  }

  /**
   * Get available plans with prices.
   */
  async getPlans() {
    return {
      plans: [
        { id: "free", name: "Free", price: 0, features: ["5 posts/month", "1 workspace member", "Basic support"] },
        { id: "starter", name: "Starter", price: 9, features: ["50 posts/month", "Up to 5 members", "Analytics", "Email support"] },
        { id: "pro", name: "Pro", price: 29, features: ["Unlimited posts", "Up to 20 members", "Analytics", "API Access", "Custom Branding", "Priority support"] },
        { id: "enterprise", name: "Enterprise", price: 99, features: ["Unlimited posts", "Unlimited members", "All Pro features", "Dedicated support", "SLA"] },
      ],
    };
  }
}

export default new BillingService();