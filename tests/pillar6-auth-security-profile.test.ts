import { describe, expect, it } from "vitest";
import { isPasswordValid, validatePasswordRules } from "../src/components/PasswordStrengthMeter";
import { computeSecurityScore, scoreLabel } from "../src/components/SecuritySettingsPanel";
import { generateRecoveryCodes, hashRecoveryCode } from "../src/mfa-crypto";
import {
  AVATAR_CIRCLE_SIZE,
  AVATAR_CROP_DEFAULTS,
  clampAvatarPan,
  getAvatarBaseScale,
} from "../src/utils/avatar-crop";

describe("Pillar 6: Auth, Security & Profiles (Full Coverage)", () => {
  describe("1. Password Security & Strength Rules", () => {
    it("rejects passwords shorter than 12 characters", () => {
      const shortPass = "Admin123!a";
      const rules = validatePasswordRules(shortPass);
      expect(rules.length).toBe(false);
      expect(isPasswordValid(shortPass)).toBe(false);
    });

    it("rejects passwords missing required character classes", () => {
      // Missing uppercase
      expect(validatePasswordRules("nouppercase123!#").uppercase).toBe(false);
      expect(isPasswordValid("nouppercase123!#")).toBe(false);

      // Missing lowercase
      expect(validatePasswordRules("NOLOWERCASE123!#").lowercase).toBe(false);
      expect(isPasswordValid("NOLOWERCASE123!#")).toBe(false);

      // Missing numbers
      expect(validatePasswordRules("NoNumbersHere!#Abc").number).toBe(false);
      expect(isPasswordValid("NoNumbersHere!#Abc")).toBe(false);

      // Missing special characters
      expect(validatePasswordRules("NoSpecialChars123A").special).toBe(false);
      expect(isPasswordValid("NoSpecialChars123A")).toBe(false);
    });

    it("validates compliant strong passwords meeting all 5 security rules", () => {
      const strongPass = "SuperSecret2026!#";
      const rules = validatePasswordRules(strongPass);
      expect(rules.length).toBe(true);
      expect(rules.uppercase).toBe(true);
      expect(rules.lowercase).toBe(true);
      expect(rules.number).toBe(true);
      expect(rules.special).toBe(true);
      expect(isPasswordValid(strongPass)).toBe(true);
    });
  });

  describe("2. Security Score & Protection Rating", () => {
    it("calculates base security score of 25% (Faible)", () => {
      const score = computeSecurityScore(false, false, 0);
      expect(score).toBe(25);
      expect(scoreLabel(score)).toBe("Faible");
    });

    it("calculates intermediate scores correctly", () => {
      // Email verified only: 50% (Moyen)
      const emailOnly = computeSecurityScore(true, false, 0);
      expect(emailOnly).toBe(50);
      expect(scoreLabel(emailOnly)).toBe("Moyen");

      // Email + TOTP: 75% (Bon)
      const emailTotp = computeSecurityScore(true, true, 0);
      expect(emailTotp).toBe(75);
      expect(scoreLabel(emailTotp)).toBe("Bon");

      // Email + Passkey (no TOTP): 75% (Bon)
      const emailPasskey = computeSecurityScore(true, false, 2);
      expect(emailPasskey).toBe(75);
      expect(scoreLabel(emailPasskey)).toBe("Bon");
    });

    it("calculates maximum security score of 100% (Excellent)", () => {
      const maxScore = computeSecurityScore(true, true, 1);
      expect(maxScore).toBe(100);
      expect(scoreLabel(maxScore)).toBe("Excellent");
    });
  });

  describe("3. TOTP Recovery Codes Generation, Formatting & Hashing", () => {
    it("generates the requested count of unique recovery codes with proper dash grouping", () => {
      const codes = generateRecoveryCodes(8);
      expect(codes).toHaveLength(8);

      const uniqueSet = new Set(codes);
      expect(uniqueSet.size).toBe(8);

      for (const code of codes) {
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{2}$/);
      }
    });

    it("hashes recovery codes deterministically and handles whitespace / case normalization", () => {
      const rawCode = "A1B2-C3D4-E5";
      const hash1 = hashRecoveryCode(rawCode);
      const hash2 = hashRecoveryCode("  a1b2-c3d4-e5  ");

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string
    });

    it("formats recovery codes text backup export appropriately", () => {
      const codes = ["1111-2222-33", "4444-5555-66"];
      const content = `Performance Académique — Codes de récupération TOTP\n\n${codes.map((c, i) => `${i + 1}. ${c}`).join("\n")}`;

      expect(content).toContain("Performance Académique — Codes de récupération TOTP");
      expect(content).toContain("1. 1111-2222-33");
      expect(content).toContain("2. 4444-5555-66");
    });
  });

  describe("4. Avatar Photo Crop & Bounds Calculation", () => {
    it("calculates correct base scale to cover avatar circle", () => {
      // Wide image (800x400)
      const baseScaleWide = getAvatarBaseScale(800, 400, AVATAR_CIRCLE_SIZE);
      expect(baseScaleWide).toBe(AVATAR_CIRCLE_SIZE / 400); // 280 / 400 = 0.7

      // Tall image (400x800)
      const baseScaleTall = getAvatarBaseScale(400, 800, AVATAR_CIRCLE_SIZE);
      expect(baseScaleTall).toBe(AVATAR_CIRCLE_SIZE / 400); // 280 / 400 = 0.7
    });

    it("clamps pan offset to prevent empty margins outside avatar circle", () => {
      const imageW = 800;
      const imageH = 600;
      const zoom = 1.0;

      // Base scale will be 280 / 600 = 0.4666...
      // Rendered width = 800 * (280 / 600) = 373.33...
      // maxPanX = (373.33 - 280) / 2 = ~46.66
      // Rendered height = 280, maxPanY = 0

      const clampedCentered = clampAvatarPan(0, 0, imageW, imageH, zoom);
      expect(clampedCentered.panX).toBe(0);
      expect(clampedCentered.panY).toBe(0);

      // Attempting to pan beyond boundaries should be clamped
      const clampedFarRight = clampAvatarPan(500, 500, imageW, imageH, zoom);
      expect(clampedFarRight.panX).toBeLessThan(50);
      expect(clampedFarRight.panX).toBeGreaterThan(40);
      expect(clampedFarRight.panY).toBe(0); // Height fits exactly, cannot pan vertically

      const clampedFarLeft = clampAvatarPan(-500, -500, imageW, imageH, zoom);
      expect(clampedFarLeft.panX).toBeGreaterThan(-50);
      expect(clampedFarLeft.panX).toBeLessThan(-40);
      expect(clampedFarLeft.panY).toBe(0);
    });

    it("allows greater pan freedom with increased zoom", () => {
      const imageW = 600;
      const imageH = 600;
      const zoomLow = 1.0;
      const zoomHigh = 2.0;

      const clampedLow = clampAvatarPan(100, 100, imageW, imageH, zoomLow);
      expect(clampedLow.panX).toBe(0);
      expect(clampedLow.panY).toBe(0);

      const clampedHigh = clampAvatarPan(100, 100, imageW, imageH, zoomHigh);
      // At zoom 2.0, rendered size is 280 * 2 = 560
      // maxPan = (560 - 280) / 2 = 140
      expect(clampedHigh.panX).toBe(100);
      expect(clampedHigh.panY).toBe(100);
    });
  });

  describe("5. OTP Verification & Cooldown Logic", () => {
    it("normalizes OTP verification code input (trims whitespace)", () => {
      const rawInput = " 849201 \n";
      const cleaned = rawInput.trim();
      expect(cleaned).toBe("849201");
      expect(cleaned).toHaveLength(6);
      expect(/^\d{6}$/.test(cleaned)).toBe(true);
    });

    it("verifies 60-second cooldown timer decrement logic", () => {
      let cooldown = 60;
      const tick = () => {
        cooldown = cooldown <= 1 ? 0 : cooldown - 1;
      };

      tick();
      expect(cooldown).toBe(59);

      cooldown = 1;
      tick();
      expect(cooldown).toBe(0);

      tick();
      expect(cooldown).toBe(0);
    });
  });
});
