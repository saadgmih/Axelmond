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
  private domainWindows = new Map<string, number[]>();
  private customRateLimits = new Map<string, number>(); // per-second custom limit
  private activeConnections = new Map<string, number>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();

  private static globalDomainWindows = new Map<string, number[]>();
  private static globalCustomRateLimits = new Map<string, number>();
  private static globalActiveConnections = new Map<string, number>();
  private static globalCircuitBreakers = new Map<string, CircuitBreakerState>();

  public getDomainFromEmail(email: string): string {
    return DeliveryController.getDomainFromEmail(email);
  }

  public static getDomainFromEmail(email: string): string {
    const parts = email.split("@");
    return (parts[1] || "").toLowerCase().trim();
  }

  public getPolicy(domain: string): DomainDeliveryPolicy {
    return DeliveryController.getPolicy(domain);
  }

  public static getPolicy(domain: string): DomainDeliveryPolicy {
    return DEFAULT_POLICIES[domain] || { ...DEFAULT_FALLBACK_POLICY, domain };
  }

  /**
   * Set custom rate limit for a domain (in requests per second).
   */
  public setDomainRateLimit(domain: string, maxPerSecond: number): void {
    this.customRateLimits.set(domain.toLowerCase(), maxPerSecond);
    DeliveryController.globalCustomRateLimits.set(domain.toLowerCase(), maxPerSecond);
  }

  public static setDomainRateLimit(domain: string, maxPerSecond: number): void {
    DeliveryController.globalCustomRateLimits.set(domain.toLowerCase(), maxPerSecond);
  }

  /**
   * Check if sending to a domain is currently permitted.
   */
  public canSend(domain: string): boolean {
    const d = domain.toLowerCase();
    if (this.isCircuitOpen(d)) {
      return false;
    }

    const customLimit = this.customRateLimits.get(d) ?? DeliveryController.globalCustomRateLimits.get(d);
    if (customLimit !== undefined) {
      const now = Date.now();
      const timestamps = (this.domainWindows.get(d) || []).filter((t) => now - t < 1000);
      if (timestamps.length >= customLimit) {
        return false;
      }
      timestamps.push(now);
      this.domainWindows.set(d, timestamps);
      return true;
    }

    const { allowed } = this.canDeliver(d);
    return allowed;
  }

  public static canSend(domain: string): boolean {
    const d = domain.toLowerCase();
    if (DeliveryController.isCircuitOpen(d)) {
      return false;
    }
    const customLimit = DeliveryController.globalCustomRateLimits.get(d);
    if (customLimit !== undefined) {
      const now = Date.now();
      const timestamps = (DeliveryController.globalDomainWindows.get(d) || []).filter((t) => now - t < 1000);
      if (timestamps.length >= customLimit) {
        return false;
      }
      timestamps.push(now);
      DeliveryController.globalDomainWindows.set(d, timestamps);
      return true;
    }
    return DeliveryController.canDeliver(d).allowed;
  }

  /**
   * Check if circuit breaker is open for this domain.
   */
  public isCircuitOpen(domain: string): boolean {
    const d = domain.toLowerCase();
    const breaker = this.circuitBreakers.get(d) || DeliveryController.globalCircuitBreakers.get(d);
    if (!breaker) return false;
    return breaker.trippedUntil > Date.now();
  }

  public static isCircuitOpen(domain: string): boolean {
    const breaker = DeliveryController.globalCircuitBreakers.get(domain.toLowerCase());
    if (!breaker) return false;
    return breaker.trippedUntil > Date.now();
  }

  /**
   * Record a temporary error or delivery failure for circuit breaking.
   */
  public recordError(domain: string): void {
    this.recordFailure(domain);
  }

  public static recordError(domain: string): void {
    DeliveryController.recordFailure(domain);
  }

  public recordFailure(domain: string): void {
    const d = domain.toLowerCase();
    const breaker = this.circuitBreakers.get(d) || { failureCount: 0, trippedUntil: 0 };
    breaker.failureCount += 1;
    if (breaker.failureCount >= 5) {
      breaker.trippedUntil = Date.now() + 30000;
    }
    this.circuitBreakers.set(d, breaker);
    DeliveryController.globalCircuitBreakers.set(d, breaker);
  }

  public static recordFailure(domain: string): void {
    const d = domain.toLowerCase();
    const breaker = DeliveryController.globalCircuitBreakers.get(d) || { failureCount: 0, trippedUntil: 0 };
    breaker.failureCount += 1;
    if (breaker.failureCount >= 5) {
      breaker.trippedUntil = Date.now() + 30000;
    }
    DeliveryController.globalCircuitBreakers.set(d, breaker);
  }

  public recordSuccess(domain: string): void {
    const d = domain.toLowerCase();
    const breaker = this.circuitBreakers.get(d);
    if (breaker) {
      breaker.failureCount = 0;
      breaker.trippedUntil = 0;
    }
    const gBreaker = DeliveryController.globalCircuitBreakers.get(d);
    if (gBreaker) {
      gBreaker.failureCount = 0;
      gBreaker.trippedUntil = 0;
    }
  }

  public static recordSuccess(domain: string): void {
    const breaker = DeliveryController.globalCircuitBreakers.get(domain.toLowerCase());
    if (breaker) {
      breaker.failureCount = 0;
      breaker.trippedUntil = 0;
    }
  }

  public getBackoffDelay(domain: string): number {
    return this.getPolicy(domain).backoffDelayMs;
  }

  public static getBackoffDelay(domain: string): number {
    return DeliveryController.getPolicy(domain).backoffDelayMs;
  }

  /**
   * Check if delivery is permitted right now according to rate limits and circuit breaker.
   */
  public canDeliver(domain: string): { allowed: boolean; reason?: string; retryAfterMs?: number } {
    const d = domain.toLowerCase();
    const now = Date.now();

    if (this.isCircuitOpen(d)) {
      const breaker = this.circuitBreakers.get(d) || DeliveryController.globalCircuitBreakers.get(d);
      return {
        allowed: false,
        reason: `Circuit breaker actif pour ${d} en raison d'erreurs temporaires répétées.`,
        retryAfterMs: Math.max(1000, (breaker?.trippedUntil || now) - now),
      };
    }

    const policy = this.getPolicy(d);
    const active = this.activeConnections.get(d) || 0;
    if (active >= policy.maxConcurrentConnections) {
      return {
        allowed: false,
        reason: `Nombre maximal de connexions simultanées atteint pour ${d} (${active}/${policy.maxConcurrentConnections}).`,
        retryAfterMs: 1000,
      };
    }

    const timestamps = (this.domainWindows.get(d) || []).filter((t) => now - t < 60000);
    this.domainWindows.set(d, timestamps);

    if (timestamps.length >= policy.rateLimitPerMinute) {
      const oldestInWindow = timestamps[0] || now;
      const retryAfter = Math.max(1000, 60000 - (now - oldestInWindow));
      return {
        allowed: false,
        reason: `Quota par minute atteint pour ${d} (${timestamps.length}/${policy.rateLimitPerMinute}).`,
        retryAfterMs: retryAfter,
      };
    }

    return { allowed: true };
  }

  public static canDeliver(domain: string): { allowed: boolean; reason?: string; retryAfterMs?: number } {
    const d = domain.toLowerCase();
    const now = Date.now();

    if (DeliveryController.isCircuitOpen(d)) {
      const breaker = DeliveryController.globalCircuitBreakers.get(d);
      return {
        allowed: false,
        reason: `Circuit breaker actif pour ${d} en raison d'erreurs temporaires répétées.`,
        retryAfterMs: Math.max(1000, (breaker?.trippedUntil || now) - now),
      };
    }

    const policy = DeliveryController.getPolicy(d);
    const active = DeliveryController.globalActiveConnections.get(d) || 0;
    if (active >= policy.maxConcurrentConnections) {
      return {
        allowed: false,
        reason: `Nombre maximal de connexions simultanées atteint pour ${d} (${active}/${policy.maxConcurrentConnections}).`,
        retryAfterMs: 1000,
      };
    }

    const timestamps = (DeliveryController.globalDomainWindows.get(d) || []).filter((t) => now - t < 60000);
    DeliveryController.globalDomainWindows.set(d, timestamps);

    if (timestamps.length >= policy.rateLimitPerMinute) {
      const oldestInWindow = timestamps[0] || now;
      const retryAfter = Math.max(1000, 60000 - (now - oldestInWindow));
      return {
        allowed: false,
        reason: `Quota par minute atteint pour ${d} (${timestamps.length}/${policy.rateLimitPerMinute}).`,
        retryAfterMs: retryAfter,
      };
    }

    return { allowed: true };
  }

  public acquireConnection(domain: string): void {
    const d = domain.toLowerCase();
    const current = this.activeConnections.get(d) || 0;
    this.activeConnections.set(d, current + 1);

    const now = Date.now();
    const timestamps = (this.domainWindows.get(d) || []).filter((t) => now - t < 60000);
    timestamps.push(now);
    this.domainWindows.set(d, timestamps);
  }

  public static acquireConnection(domain: string): void {
    const d = domain.toLowerCase();
    const current = DeliveryController.globalActiveConnections.get(d) || 0;
    DeliveryController.globalActiveConnections.set(d, current + 1);

    const now = Date.now();
    const timestamps = (DeliveryController.globalDomainWindows.get(d) || []).filter((t) => now - t < 60000);
    timestamps.push(now);
    DeliveryController.globalDomainWindows.set(d, timestamps);
  }

  public releaseConnection(domain: string): void {
    const d = domain.toLowerCase();
    const current = this.activeConnections.get(d) || 0;
    this.activeConnections.set(d, Math.max(0, current - 1));
  }

  public static releaseConnection(domain: string): void {
    const d = domain.toLowerCase();
    const current = DeliveryController.globalActiveConnections.get(d) || 0;
    DeliveryController.globalActiveConnections.set(d, Math.max(0, current - 1));
  }

  public reset(): void {
    this.domainWindows.clear();
    this.customRateLimits.clear();
    this.activeConnections.clear();
    this.circuitBreakers.clear();
    DeliveryController.reset();
  }

  public static reset(): void {
    DeliveryController.globalDomainWindows.clear();
    DeliveryController.globalCustomRateLimits.clear();
    DeliveryController.globalActiveConnections.clear();
    DeliveryController.globalCircuitBreakers.clear();
  }
}
