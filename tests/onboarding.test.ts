import assert from "node:assert/strict";
import fs from "node:fs";
import { canAccessApiRoute } from "../src/rbac.ts";
import { getOnboardingSteps } from "../src/onboarding/onboarding-config.ts";
import { getOnboardingFlow, ONBOARDING_VERSION } from "../src/onboarding/onboarding-types.ts";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { matchAppRouteWithMiddleware } from "./helpers/source-patterns.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("onboarding", () => {
  assert.equal(ONBOARDING_VERSION, 1);
  assert.equal(getOnboardingFlow("STUDENT"), "STUDENT");
  assert.equal(getOnboardingFlow("PROFESSOR"), "TEACHER");
  assert.equal(getOnboardingFlow("RESEARCHER"), "TEACHER");
  assert.equal(getOnboardingFlow("ADMIN"), "ADMIN");

  assert.deepEqual(
    getOnboardingSteps("STUDENT").map((step) => step.title),
    [
      "Tableau de bord",
      "Catalogue des cours",
      "Mes cours",
      "Progression",
      "Lives",
      "Messagerie",
      "Notifications",
      "Profil et paramètres",
    ],
  );
  assert.deepEqual(
    getOnboardingSteps("TEACHER").map((step) => step.title),
    [
      "Tableau de bord",
      "Gestion des cours",
      "Gestion des étudiants",
      "Création de contenu",
      "Lives",
      "Messagerie",
      "Statistiques",
      "Profil et paramètres",
    ],
  );
  assert.deepEqual(
    getOnboardingSteps("ADMIN").map((step) => step.title),
    [
      "Tableau de bord",
      "Gestion des utilisateurs",
      "Gestion des cours",
      "Paramètres de la plateforme",
      "Statistiques",
      "Profil et paramètres",
    ],
  );

  for (const flow of ["STUDENT", "TEACHER", "ADMIN"] as const) {
    const steps = getOnboardingSteps(flow);
    assert.equal(new Set(steps.map((step) => step.id)).size, steps.length);
    assert.ok(steps.every((step) => step.targetSelectors.length > 0));
  }

  for (const role of ["STUDENT", "PROFESSOR", "RESEARCHER", "ADMIN"] as const) {
    assert.equal(canAccessApiRoute(role, "GET", "/api/onboarding"), true);
    assert.equal(canAccessApiRoute(role, "PUT", "/api/onboarding"), true);
    assert.equal(canAccessApiRoute(role, "POST", "/api/onboarding/restart"), true);
  }

  const routes = readApiRouteSources();
  assert.ok(matchAppRouteWithMiddleware(routes, "get", "/api/onboarding", ["requireAuth", "requireRbac"]));
  assert.ok(
    matchAppRouteWithMiddleware(routes, "put", "/api/onboarding", ["requireAuth", "requireRbac", "validateBody"]),
  );
  assert.ok(matchAppRouteWithMiddleware(routes, "post", "/api/onboarding/restart", ["requireAuth", "requireRbac"]));

  const provider = fs.readFileSync("src/onboarding/OnboardingProvider.tsx", "utf8");
  const tour = fs.readFileSync("src/onboarding/OnboardingTour.tsx", "utf8");
  const settings = fs.readFileSync("src/components/AccessibilityControls.tsx", "utf8");
  const topbar = fs.readFileSync("src/components/Topbar.tsx", "utf8");
  const css = fs.readFileSync("src/index.css", "utf8");
  assert.match(provider, /status === "COMPLETED" \|\| status === "DISMISSED"/);
  assert.match(provider, /api\.restartOnboarding/);
  assert.match(tour, /aria-modal="true"/);
  assert.match(tour, /event\.key === "Escape"/);
  assert.match(tour, /event\.key === "ArrowRight"/);
  assert.match(tour, /window\.innerWidth < 640/);
  assert.match(tour, /MutationObserver/);
  assert.match(settings, /Relancer le tutoriel/);
  assert.match(topbar, /onRestartTutorial=\{onboarding\.restart\}/);
  assert.match(settings, /Relancer le tutoriel interactif/);
  assert.match(css, /\.dark \.onboarding-card/);
  assert.match(fs.readFileSync("prisma/schema.prisma", "utf8"), /@@unique\(\[userId, flow, version\]\)/);
});
