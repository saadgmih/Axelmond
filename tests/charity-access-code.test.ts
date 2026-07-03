import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  generateCharityAccessCode,
  hashCharityAccessCode,
  normalizeCharityAccessCode,
} from "../src/charity-access-code";

describe("charity access codes", () => {
  it("normalizes and hashes codes consistently", () => {
    const code = " sadaqa-abc123 ";
    assert.equal(normalizeCharityAccessCode(code), "SADAQA-ABC123");
    assert.equal(hashCharityAccessCode(code), hashCharityAccessCode("SADAQA-ABC123"));
  });

  it("generates SADAQA prefixed codes", () => {
    assert.match(generateCharityAccessCode(), /^SADAQA-[0-9A-F]{8}$/);
  });
});
