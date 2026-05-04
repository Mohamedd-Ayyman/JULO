/**
 * CircuitBreaker — implements the Circuit Breaker pattern for external dependencies.
 *
 * States:
 *   CLOSED   → requests flow normally; trip to OPEN if failure threshold reached
 *   OPEN     → requests fail-fast with "Service temporarily unavailable"
 *   HALF-OPEN→ allows 1 test request through; close if it succeeds, trip if it fails
 *
 * Usage:
 *   const breaker = new CircuitBreaker("stripe", { failureThreshold: 5, resetTimeout: 30000 });
 *   try {
 *     const result = await breaker.execute(() => stripe.subscriptions.retrieve(id));
 *   } catch (err) { ... }
 */

export class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30000;  // 30s
    this.halfOpenRequests = options.halfOpenRequests ?? 1;

    this.state = "closed";
    this.failures = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  async execute(fn, fallback) {
    if (this.state === "open") {
      if (Date.now() < (this.nextAttemptTime ?? 0)) {
        throw Object.assign(new Error(`Circuit breaker [${this.name}]: OPEN — request blocked`), { statusCode: 503, code: "CIRCUIT_OPEN" });
      }
      // Transition to half-open
      this.state = "half-open";
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      if (fallback) return fallback(err);
      throw err;
    }
  }

  _onSuccess() {
    this.failures = 0;
    this.state = "closed";
  }

  _onFailure() {
    this.failures += 1;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = "open";
      this.nextAttemptTime = Date.now() + this.resetTimeout;
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  reset() {
    this.state = "closed";
    this.failures = 0;
    this.nextAttemptTime = null;
    this.lastFailureTime = null;
  }
}

// Pre-configured circuit breakers for external dependencies
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-11-20.acacia" });

export const circuitBreakers = {
  stripe: new CircuitBreaker("stripe", { failureThreshold: 3, resetTimeout: 60000 }),
  email: new CircuitBreaker("email", { failureThreshold: 5, resetTimeout: 30000 }),
};

/**
 * Wrap Stripe calls with circuit breaker for resilience.
 */
export async function safeStripeCall(fn) {
  return circuitBreakers.stripe.execute(fn, async (err) => {
    const logger = (await import("../utils/logger.js")).default;
    logger.error(`[CircuitBreaker] Stripe call failed: ${err.message}`);
    throw Object.assign(new Error("Payment service temporarily unavailable. Please try again."), { statusCode: 503 });
  });
}

/**
 * Wrap email calls with circuit breaker — failures are non-critical.
 */
export async function safeEmailCall(fn) {
  return circuitBreakers.email.execute(
    fn,
    () => {
      return { sent: false, reason: "email_service_unavailable" }; // Fail-open for non-critical ops
    }
  );
}