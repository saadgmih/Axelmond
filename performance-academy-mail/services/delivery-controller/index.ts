/**
 * Performance Academy Mail (PAM) - Delivery Controller
 * Domain-level rate limiting, concurrency management, and circuit breaking.
 */

import type { DomainDeliveryPolicy } from "../../packages/shared-types";

const DEFAULT_POLICIES: Record<string, DomainDeliveryPolicy> = {
  "gmail.com": {
    domain: "gmail.com",
    maxConcurrentConnections: 5,
    rateLimitPerMinute: 60,
    backoffDelayMs: 5000,
  },
  "googlemail.com": {
    domain: "googlemail.com",
    maxConcurrentConnections: 5,
    rateLimitPerMinute: 60,
    backoffDelayMs: 5000,
  },
  "outlook.com": {
    domain: "outlook.com",
    maxConcurrentConnections: 3,
    rateLimitPerMinute: 30,
    backoffDelayMs: 10000,
  },
  "hotmail.com": {
    domain: "hotmail.com",
    maxConcurrentConnections: 3,
    rateLimitPerMinute: 30,
    backoffDelayMs: 10000,
  },
  "yahoo.com": {
    domain: "yahoo.com",
    maxConcurrentConnections: 3,
    rateLimitPerMinute: 30,
    backoffDelayMs: 8000,
  },
};

const DEFAULT_FALLBACK_POLICY: DomainDeliveryPolicy = {
  domain: "*",
  maxConcurrentConnections: 10,
  rateLimitPerMinute: 120,
  backoffDelayMs: 3000,
};

interface CircuitBreakerState {
  failureCount: number;
  trippedUntil: number;
}

export class DeliveryController {
  private static domainWindows = new Map<string, number[]>();
  private static activeConnections = new Map<string, number>();
  private static circuitBreakers = new Map<string, CircuitBreakerState>();

  public static getDomainFromEmail(email: string): string {
    const parts = email.split("@");
    return (parts[1] || "").toLowerCase().trim();
  }

  public static getPolicy(domain: string): DomainDeliveryPolicy {
    return DEFAULT_POLICIES[domain] || { ...DEFAULT_FALLBACK_POLICY, domain };
  }

  /**
   * Check if delivery is permitted right now according to rate limits and circuit breaker.
   */
  public static canDeliver(domain: string): { allowed: boolean; reason?: string; retryAfterMs?: number } {
    const now = Date.now();

    // 1. Check Circuit Breaker
    const breaker = this.circuitBreakers.get(domain);
    if (breaker && breaker.trippedUntil > now) {
      return {
        allowed: false,
        reason: `Circuit breaker actif pour ${domain} en raison d'erreurs temporaires répétées.`,
        retryAfterMs: breaker.trippedUntil - now,
      };
    }

    const policy = this.getPolicy(domain);

    // 2. Check Concurrent Connections
    const active = this.activeConnections.get(domain) || 0;
    if (active >= policy.maxConcurrentConnections) {
      return {
        allowed: false,
        reason: `Nombre maximal de connexions simultanées atteint pour ${domain} (${active}/${policy.maxConcurrentConnections}).`,
        retryAfterMs: 1000,
      };
    }

    // 3. Check Sliding Window Rate Limit
    const timestamps = (this.domainWindows.get(domain) || []).filter((t) => now - t < 60000);
    this.domainWindows.set(domain, timestamps);

    if (timestamps.length >= policy.rateLimitPerMinute) {
      const oldestInWindow = timestamps[0] || now;
      const retryAfter = Math.max(1000, 60000 - (now - oldestInWindow));
      return {
        allowed: false,
        reason: `Quota par minute atteint pour ${domain} (${timestamps.length}/${policy.rateLimitPerMinute}).`,
        retryAfterMs: retryAfter,
      };
    }

    return { allowed: true };
  }

  /**
   * Register start of an active connection.
   */
  public static acquireConnection(domain: string): void {
    const current = this.activeConnections.get(domain) || 0;
    this.activeConnections.set(domain, current + 1);

    const now = Date.now();
    const timestamps = (this.domainWindows.get(domain) || []).filter((t) => now - t < 60000);
    timestamps.push(now);
    this.domainWindows.set(domain, timestamps);
  }

  /**
   * Register completion of an active connection.
   */
  public static releaseConnection(domain: string): void {
    const current = this.activeConnections.get(domain) || 0;
    this.activeConnections.set(domain, Math.max(0, current - 1));
  }

  /**
   * Signal a temporary failure to the circuit breaker.
   */
  public static recordFailure(domain: string): void {
    const breaker = this.circuitBreakers.get(domain) || { failureCount: 0, trippedUntil: 0 };
    breaker.failureCount += 1;

    // If 5 consecutive failures, trip circuit breaker for 30 seconds
    if (breaker.failureCount >= 5) {
      breaker.trippedUntil = Date.now() + 30000;
    }
    this.circuitBreakers.set(domain, breaker);
  }

  /**
   * Signal a successful delivery to clear the circuit breaker.
   */
  public static recordSuccess(domain: string): void {
    const breaker = this.circuitBreakers.get(domain);
    if (breaker) {
      breaker.failureCount = 0;
      breaker.trippedUntil = 0;
    }
  }

  /**
   * Clear all counters (for testing).
   */
  public static reset(): void {
    this.domainWindows.clear();
    this.activeConnections.clear();
    this.circuitBreakers.clear();
  }
}
