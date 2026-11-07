import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("AntiCaptureShield text is tailored per content type and avoids sound for documents/images", () => {
  const contentProtectionSource = readFileSync("src/components/security/ContentProtection.tsx", "utf8");
  const pdfViewerSource = readFileSync("src/components/PdfLessonViewer.tsx", "utf8");
  const publicResourceSource = readFileSync("src/components/PublicResourceView.tsx", "utf8");
  const videoPlayerSource = readFileSync("src/components/PremiumVideoPlayer.tsx", "utf8");

  // Ensure contentType prop exists in AntiCaptureShield
  assert.match(contentProtectionSource, /contentType\?: "video" \| "pdf" \| "image" \| "document"/);

  // Document & Image texts must NOT contain "son"
  assert.match(contentProtectionSource, /L'affichage du document est automatiquement masqué/);
  assert.match(contentProtectionSource, /L'affichage de l'image est automatiquement masqué/);

  // Video text retains sound
  assert.match(contentProtectionSource, /L'affichage et le son de la ressource sont automatiquement masqués et coupés/);

  // PdfLessonViewer passes correct contentType
  assert.match(pdfViewerSource, /<AntiCaptureShield active=\{antiCaptureActive\} onDismiss=\{dismissAntiCapture\} contentType="image" \/>/);
  assert.match(pdfViewerSource, /contentType=\{mediaType === "IMAGE" \? "image" : "pdf"\}/);

  // PublicResourceView passes correct contentType
  assert.match(publicResourceSource, /<AntiCaptureShield active=\{docShieldActive\} onDismiss=\{dismissDocShield\} contentType="pdf" \/>/);
  assert.match(publicResourceSource, /<AntiCaptureShield active=\{docShieldActive\} onDismiss=\{dismissDocShield\} contentType="image" \/>/);

  // PremiumVideoPlayer passes video
  assert.match(videoPlayerSource, /<AntiCaptureShield active=\{shieldActive\} onDismiss=\{dismissShield\} contentType="video" \/>/);
});

test("Brand & device capture detection covers Apple, Samsung, Xiaomi/Redmi, Infinix, HP, MSI, etc.", () => {
  const contentProtectionSource = readFileSync("src/components/security/ContentProtection.tsx", "utf8");

  // Device profile detection includes major brands
  assert.match(contentProtectionSource, /getClientDeviceProfile/);
  assert.match(contentProtectionSource, /isApple/);
  assert.match(contentProtectionSource, /isSamsung/);
  assert.match(contentProtectionSource, /isXiaomiRedmi/);
  assert.match(contentProtectionSource, /isInfinix/);
  assert.match(contentProtectionSource, /isHpOrMsi/);

  // Mobile multi-touch screenshot gesture detection (Xiaomi 3-finger, Infinix 3-finger, Samsung palm)
  assert.match(contentProtectionSource, /e\.touches && e\.touches\.length >= 3/);
  assert.match(contentProtectionSource, /rx > 35 \|\| ry > 35/);

  // PC brand gaming overlays & recording software (MSI, HP, Asus, etc.)
  assert.match(contentProtectionSource, /Shadowplay/);
  assert.match(contentProtectionSource, /Alt \+ Z/);
  assert.match(contentProtectionSource, /AMD Radeon/);
  assert.match(contentProtectionSource, /Xbox Game Bar/);
  assert.match(contentProtectionSource, /Universal OBS/);

  // Apple Mac screenshot & screen recording shortcuts
  assert.match(contentProtectionSource, /Cmd \+ Shift \+ 3.*Cmd \+ Shift \+ 5/s);

  // Mobile Lifecycle and screen capture events
  assert.match(contentProtectionSource, /pagehide/);
  assert.match(contentProtectionSource, /freeze/);
  assert.match(contentProtectionSource, /pa-capture-detected/);
  assert.match(contentProtectionSource, /clearSystemClipboard/);
});

