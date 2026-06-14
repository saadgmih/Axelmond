import assert from "node:assert/strict";
import { getClientErrorMessage, sanitizeClientErrorMessage } from "../src/client-errors.ts";

assert.equal(
  sanitizeClientErrorMessage("Module introuvable", "Erreur", 404),
  "Module introuvable",
);
assert.equal(
  sanitizeClientErrorMessage("PayPal SDK failed at https://api.paypal.com/v1/capture", "Erreur", 400),
  "Erreur",
);
assert.equal(
  sanitizeClientErrorMessage("Internal failure", "Erreur interne", 500),
  "Erreur interne",
);

assert.equal(
  getClientErrorMessage({ message: "Inscription requise pour consulter ce contenu", status: 403 }, "Erreur"),
  "Inscription requise pour consulter ce contenu",
);
assert.equal(
  getClientErrorMessage({ message: "Prisma P2021 table missing", status: 400 }, "Erreur"),
  "Erreur",
);

console.log("Client error sanitization tests passed");
