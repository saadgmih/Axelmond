/**
 * Performance Academy Mail (PAM) - Suppression Service
 * Manages blocked / bounced / unsubscribed recipients to protect domain reputation.
 */

import type { BounceType, SuppressionRecord } from "../../packages/shared-types";
import { normalizeEmail } from "../../packages/validation";

export class SuppressionService {
  private inMemoryStore = new Map<string, SuppressionRecord>();
  private static globalStore = new Map<string, SuppressionRecord>();

  /**
   * Check if an email address is suppressed (blocked from sending).
   * Supports both instance and static calls.
   */
  public isSuppressed(email: string): boolean {
    const clean = normalizeEmail(email);
    return this.inMemoryStore.has(clean) || SuppressionService.globalStore.has(clean);
  }

  public static isSuppressed(email: string): boolean {
    const clean = normalizeEmail(email);
    return SuppressionService.globalStore.has(clean);
  }

  /**
   * Add an email address to the suppression list.
   */
  public add(email: string, reason: BounceType = "HARD", details?: string): SuppressionRecord {
    const clean = normalizeEmail(email);
    const record: SuppressionRecord = {
      email: clean,
      reason,
      details,
      createdAt: new Date(),
    };
    this.inMemoryStore.set(clean, record);
    SuppressionService.globalStore.set(clean, record);
    return record;
  }

  public static add(email: string, reason: BounceType = "HARD", details?: string): SuppressionRecord {
    const clean = normalizeEmail(email);
    const record: SuppressionRecord = {
      email: clean,
      reason,
      details,
      createdAt: new Date(),
    };
    SuppressionService.globalStore.set(clean, record);
    return record;
  }

  /**
   * Remove an email from the suppression list (admin override / unblock).
   */
  public remove(email: string): boolean {
    const clean = normalizeEmail(email);
    const inst = this.inMemoryStore.delete(clean);
    const glob = SuppressionService.globalStore.delete(clean);
    return inst || glob;
  }

  public static remove(email: string): boolean {
    const clean = normalizeEmail(email);
    return SuppressionService.globalStore.delete(clean);
  }

  /**
   * Get suppression details for an email.
   */
  public get(email: string): SuppressionRecord | null {
    const clean = normalizeEmail(email);
    return this.inMemoryStore.get(clean) || SuppressionService.globalStore.get(clean) || null;
  }

  public static get(email: string): SuppressionRecord | null {
    const clean = normalizeEmail(email);
    return SuppressionService.globalStore.get(clean) || null;
  }

  /**
   * Return all currently suppressed addresses.
   */
  public getAllSuppressed(): SuppressionRecord[] {
    const combined = new Map<string, SuppressionRecord>();
    for (const [k, v] of SuppressionService.globalStore) combined.set(k, v);
    for (const [k, v] of this.inMemoryStore) combined.set(k, v);
    return Array.from(combined.values());
  }

  public list(): SuppressionRecord[] {
    return this.getAllSuppressed();
  }

  public static getAllSuppressed(): SuppressionRecord[] {
    return Array.from(SuppressionService.globalStore.values());
  }

  public static list(): SuppressionRecord[] {
    return Array.from(SuppressionService.globalStore.values());
  }

  /**
   * Reset store (for testing purposes).
   */
  public clear(): void {
    this.inMemoryStore.clear();
    SuppressionService.globalStore.clear();
  }

  public static clear(): void {
    SuppressionService.globalStore.clear();
  }
}
