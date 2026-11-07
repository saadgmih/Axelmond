/**
 * Performance Academy Mail (PAM) - Suppression Service
 * Manages blocked / bounced / unsubscribed recipients to protect domain reputation.
 */

import type { BounceType, SuppressionRecord } from "../../packages/shared-types";
import { normalizeEmail } from "../../packages/validation";

export class SuppressionService {
  private static inMemoryStore = new Map<string, SuppressionRecord>();

  /**
   * Check if an email address is suppressed (blocked from sending).
   */
  public static async isSuppressed(email: string): Promise<boolean> {
    const clean = normalizeEmail(email);
    return this.inMemoryStore.has(clean);
  }

  /**
   * Add an email address to the suppression list.
   */
  public static async add(email: string, reason: BounceType = "HARD", details?: string): Promise<SuppressionRecord> {
    const clean = normalizeEmail(email);
    const record: SuppressionRecord = {
      email: clean,
      reason,
      details,
      createdAt: new Date(),
    };
    this.inMemoryStore.set(clean, record);
    return record;
  }

  /**
   * Remove an email from the suppression list (admin override / unblock).
   */
  public static async remove(email: string): Promise<boolean> {
    const clean = normalizeEmail(email);
    return this.inMemoryStore.delete(clean);
  }

  /**
   * Get suppression details for an email.
   */
  public static async get(email: string): Promise<SuppressionRecord | null> {
    const clean = normalizeEmail(email);
    return this.inMemoryStore.get(clean) || null;
  }

  /**
   * List all current suppressions.
   */
  public static async list(): Promise<SuppressionRecord[]> {
    return Array.from(this.inMemoryStore.values());
  }

  /**
   * Reset store (for testing purposes).
   */
  public static clear(): void {
    this.inMemoryStore.clear();
  }
}
