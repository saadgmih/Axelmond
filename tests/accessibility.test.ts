import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync("src/App.tsx", "utf8");
const authSource = fs.readFileSync("src/components/AuthScreen.tsx", "utf8");
const topbarSource = fs.readFileSync("src/components/Topbar.tsx", "utf8");
const paymentSource = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");
const helpSource = fs.readFileSync("src/components/KeyboardShortcutsHelp.tsx", "utf8");
const chatSource = fs.readFileSync("src/components/AITutorChat.tsx", "utf8");
const sidebarSource = fs.readFileSync("src/components/Sidebar.tsx", "utf8");
const cssSource = fs.readFileSync("src/index.css", "utf8");
const mainSource = fs.readFileSync("src/main.tsx", "utf8");
const packageSource = fs.readFileSync("package.json", "utf8");

assert.match(mainSource, /AccessibilityPreferencesProvider/);
assert.match(fs.readFileSync("src/hooks/useAccessibilityPreferences.tsx", "utf8"), /export function useAccessibilityPreferences/);
assert.match(fs.readFileSync("src/hooks/useFocusTrap.ts", "utf8"), /export function useFocusTrap/);
assert.match(fs.readFileSync("src/components/AccessibilityControls.tsx", "utf8"), /Contraste élevé/);
assert.match(fs.readFileSync("src/components/AccessibilityControls.tsx", "utf8"), /createPortal/);
assert.match(fs.readFileSync("src/components/AccessibilityControls.tsx", "utf8"), /computeFloatingPanelPosition/);
assert.match(fs.readFileSync("src/components/AccessibilityControls.tsx", "utf8"), /useFocusTrap/);
assert.match(fs.readFileSync("src/components/SkipLink.tsx", "utf8"), /Aller au contenu principal/);

assert.match(appSource, /SkipLink/);
assert.match(appSource, /id="main-content"/);
assert.match(authSource, /SkipLink/);
assert.match(authSource, /id="auth-main"/);
assert.match(authSource, /role="alert"/);
assert.match(authSource, /htmlFor=/);
assert.match(topbarSource, /AccessibilityControls/);
assert.match(topbarSource, /useVoiceSearch/);
assert.match(paymentSource, /useFocusTrap/);
assert.match(helpSource, /useFocusTrap/);
assert.match(chatSource, /role="log"/);
assert.match(chatSource, /aria-label="Envoyer la question au tuteur IA"/);
assert.match(sidebarSource, /aria-label="Navigation principale"/);

assert.match(cssSource, /\.skip-link/);
assert.match(cssSource, /\.a11y-high-contrast/);
assert.match(cssSource, /prefers-reduced-motion/);
assert.match(cssSource, /\.a11y-reduce-motion/);
assert.match(cssSource, /focus-visible/);
assert.match(cssSource, /--scroll-thumb/);
assert.match(cssSource, /scrollbar-color:\s*var\(--scroll-thumb\)/);
assert.match(cssSource, /::-webkit-scrollbar-thumb:hover/);
assert.match(cssSource, /\.hide-scrollbar/);

assert.match(packageSource, /accessibility\.test\.ts/);

console.log("Accessibility WCAG rules passed");
