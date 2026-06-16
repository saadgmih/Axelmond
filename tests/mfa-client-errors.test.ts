import assert from "node:assert/strict";
import fs from "node:fs";
import { getClientErrorMessage, isMfaSetupRequiredError } from "../src/client-errors.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("mfa-client-errors", () => {
  const mfaError = {
    message: "L'authentification multi-facteurs est obligatoire pour ce compte.",
    code: "MFA_SETUP_REQUIRED",
    mfaSetupRequired: true,
    status: 403,
  };

  assert.equal(isMfaSetupRequiredError(mfaError), true);
  assert.equal(getClientErrorMessage(mfaError, "Erreur"), "");

  const catalogSource = fs.readFileSync("src/app/hooks/usePlatformCatalogData.ts", "utf8");
  const layoutSource = fs.readFileSync("src/app/AuthenticatedPlatformLayout.tsx", "utf8");
  const bannerSource = fs.readFileSync("src/components/PrivilegedMfaSetupBanner.tsx", "utf8");

  assert.match(catalogSource, /isMfaSetupRequiredError/);
  assert.match(layoutSource, /usePrivilegedMfaSetupRedirect/);
  assert.match(bannerSource, /fetchPrivilegedMfaSetupRequired/);
  assert.doesNotMatch(layoutSource, /multi-facteurs/);

  console.log("MFA client error suppression tests passed");
});
