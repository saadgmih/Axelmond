import assert from "node:assert/strict";
import fs from "node:fs";
import { readAppSources } from "./helpers/app-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("accessibility", () => {
  const appSource = readAppSources();
  const authSource = fs.readFileSync("src/components/AuthScreen.tsx", "utf8");
  const catalogSource = fs.readFileSync("src/views/student/StudentCatalogView.tsx", "utf8");
  const paymentSource = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");
  const helpSource = fs.readFileSync("src/components/KeyboardShortcutsHelp.tsx", "utf8");
  const coachSource = fs.readFileSync("src/components/SuccessCoachPanel.tsx", "utf8");
  const sidebarSource = fs.readFileSync("src/components/Sidebar.tsx", "utf8");
  const cssSource = fs.readFileSync("src/index.css", "utf8");
  const appRootSource = fs.readFileSync("src/app/PlatformAppRoot.tsx", "utf8");
  const mainSource = fs.readFileSync("src/main.tsx", "utf8");
  const packageSource = fs.readFileSync("package.json", "utf8");

  assert.match(mainSource, /AccessibilityPreferencesProvider/);
  assert.match(
    fs.readFileSync("src/hooks/useAccessibilityPreferences.tsx", "utf8"),
    /export function useAccessibilityPreferences/,
  );
  assert.match(fs.readFileSync("src/hooks/useFocusTrap.ts", "utf8"), /export function useFocusTrap/);
  const accessibilityControlsSource = fs.readFileSync("src/components/AccessibilityControls.tsx", "utf8");
  assert.match(accessibilityControlsSource, /Contraste élevé/);
  assert.match(accessibilityControlsSource, /Préférences visuelles/);
  assert.match(accessibilityControlsSource, /Accès rapides/);
  assert.match(accessibilityControlsSource, /Navigation clavier/);
  assert.match(accessibilityControlsSource, /role="switch"/);
  assert.match(accessibilityControlsSource, /aria-checked=/);
  assert.match(accessibilityControlsSource, /createPortal/);
  assert.match(accessibilityControlsSource, /computeFloatingPanelPosition/);
  assert.match(accessibilityControlsSource, /useFocusTrap/);
  assert.match(fs.readFileSync("src/components/SkipLink.tsx", "utf8"), /Aller au contenu principal/);

  assert.match(appSource, /SkipLink/);
  assert.match(appSource, /id="main-content"/);
  assert.match(authSource, /SkipLink/);
  assert.match(authSource, /id="auth-main"/);
  assert.match(authSource, /role="alert"/);
  assert.match(authSource, /htmlFor=/);
  assert.match(sidebarSource, /AccessibilityControls/);
  assert.match(sidebarSource, /data-onboarding="platform-settings"/);
  assert.match(catalogSource, /useVoiceSearch/);
  assert.match(paymentSource, /useFocusTrap/);
  assert.match(helpSource, /useFocusTrap/);
  assert.match(coachSource, /aria-label="Coach de réussite"/);
  assert.match(coachSource, /role="tablist"/);
  assert.match(coachSource, /aria-selected=/);
  assert.match(coachSource, /aria-label="Fermer le coach de réussite"/);
  assert.match(sidebarSource, /aria-label="Navigation principale"/);

  assert.match(cssSource, /\.skip-link/);
  assert.match(cssSource, /\.a11y-high-contrast/);
  assert.match(cssSource, /prefers-reduced-motion/);
  assert.match(cssSource, /\.a11y-reduce-motion/);
  assert.match(appRootSource, /data-testid="session-refresh-spinner"/);
  assert.match(appRootSource, /<animateTransform/);
  assert.match(appRootSource, /dur="0\.45s"/);
  assert.match(appRootSource, /repeatCount="1"/);
  assert.match(appRootSource, /from="0 12 12"/);
  assert.match(appRootSource, /to="360 12 12"/);
  assert.match(appRootSource, /performance-logo-003a24a4-192\.png/);
  assert.doesNotMatch(appRootSource, /L’excellence est en mouvement/);
  assert.doesNotMatch(appRootSource, /Session sécurisée/);
  assert.doesNotMatch(appRootSource, /right-\[0\.55rem\]/);
  assert.doesNotMatch(appRootSource, /animate-pulse/);
  assert.match(cssSource, /focus-visible/);
  assert.match(cssSource, /--scroll-thumb/);
  assert.match(cssSource, /scrollbar-color:\s*var\(--scroll-thumb\)/);
  assert.match(cssSource, /::-webkit-scrollbar-thumb:hover/);
  assert.match(cssSource, /\.hide-scrollbar/);

  assert.match(packageSource, /"test":\s*"vitest run"/);
  assert.match(fs.readFileSync("vitest.config.ts", "utf8"), /tests\/\*\*\/\*\.test\.ts/);
});
