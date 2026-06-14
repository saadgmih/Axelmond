import assert from "node:assert/strict";
import { decodeStoredText } from "../src/text.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("text-decoding", () => {
  assert.equal(
    decodeStoredText("Session d&amp;amp;#x27;orientation &amp;amp;amp; échanges académiques"),
    "Session d'orientation & échanges académiques",
  );

  assert.equal(decodeStoredText("Module normal"), "Module normal");
});
