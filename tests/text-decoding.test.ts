import assert from "node:assert/strict";
import { decodeStoredText } from "../src/text.ts";

assert.equal(
  decodeStoredText("Session d&amp;amp;#x27;orientation &amp;amp;amp; échanges académiques"),
  "Session d'orientation & échanges académiques",
);

assert.equal(decodeStoredText("Module normal"), "Module normal");

console.log("Text decoding rules passed");
