/**
 * Performance Academy Mail (PAM) - Bounce Processor
 * Interprets SMTP and DSN status codes (RFC 3463 / RFC 5321).
 */

import type { BounceType } from "../../packages/shared-types";
import { SuppressionService } from "../suppression-service";

export interface ParsedBounceResult {
  isBounce: boolean;
  type: BounceType;
  code?: number;
  enhancedCode?: string;
  description: string;
  action: "SUPPRESS" | "RETRY" | "NONE";
}

export class BounceProcessor {
  /**
   * Parse an SMTP response string or error code.
   */
  public static parse(response: string, statusCode?: number): ParsedBounceResult {
    const text = String(response || "").trim();
    const code = statusCode || parseInt(text.slice(0, 3), 10) || 0;

    // Extract enhanced status code like 5.1.1 or 4.2.2
    const enhancedMatch = text.match(/\b([45]\.\d{1,3}\.\d{1,3})\b/);
    const enhancedCode = enhancedMatch ? enhancedMatch[1] : undefined;

    // 1. Permanent Hard Bounces (5xx)
    if (code >= 500 && code < 600) {
      if (
        enhancedCode === "5.1.1" ||
        enhancedCode === "5.1.2" ||
        enhancedCode === "5.1.3" ||
        /user unknown|no such user|recipient address rejected|does not exist|mailbox not found|invalid recipient/i.test(text)
      ) {
        return {
          isBounce: true,
          type: "HARD",
          code,
          enhancedCode,
          description: "Adresse de destinataire introuvable ou inexistante.",
          action: "SUPPRESS",
        };
      }

      if (
        enhancedCode === "5.7.1" ||
        enhancedCode === "5.7.26" ||
        /spam|blocked|blacklisted|reputation|policy rejection/i.test(text)
      ) {
        return {
          isBounce: true,
          type: "POLICY",
          code,
          enhancedCode,
          description: "Rejet par politique de sécurité ou réputation anti-spam du destinataire.",
          action: "SUPPRESS",
        };
      }

      return {
        isBounce: true,
        type: "HARD",
        code,
        enhancedCode,
        description: text || "Échec permanent de livraison.",
        action: "SUPPRESS",
      };
    }

    // 2. Temporary Soft Bounces (4xx)
    if (code >= 400 && code < 500) {
      return {
        isBounce: true,
        type: "SOFT",
        code,
        enhancedCode,
        description: text || "Échec temporaire (boîte pleine, limitation de débit ou réseau).",
        action: "RETRY",
      };
    }

    // 3. Normal / Success
    return {
      isBounce: false,
      type: "UNKNOWN",
      code,
      description: text,
      action: "NONE",
    };
  }

  /**
   * Process a bounce and update suppression if necessary.
   */
  public static async processBounce(email: string, response: string, statusCode?: number): Promise<ParsedBounceResult> {
    const result = this.parse(response, statusCode);
    if (result.action === "SUPPRESS") {
      await SuppressionService.add(email, result.type, result.description);
    }
    return result;
  }
}
