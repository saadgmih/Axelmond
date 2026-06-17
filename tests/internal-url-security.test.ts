import assert from "node:assert/strict";
import {
  buildAbsoluteAppUrl,
  sanitizeInternalAppPath,
  sanitizeInternalAppPathForOrigin,
} from "../src/internal-url-security.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("internal-url-security", () => {
  assert.equal(sanitizeInternalAppPath("/student/course?id=1"), "/student/course?id=1");
  assert.equal(sanitizeInternalAppPath("https://evil.com/phish"), "/");
  assert.equal(sanitizeInternalAppPath("//evil.com/phish"), "/");
  assert.equal(sanitizeInternalAppPath("javascript:alert(1)"), "/");
  assert.equal(sanitizeInternalAppPath(""), "/");
  assert.equal(sanitizeInternalAppPath(null), "/");

  assert.equal(sanitizeInternalAppPathForOrigin("https://axelmond.com/messages", "https://axelmond.com"), "/messages");
  assert.equal(sanitizeInternalAppPathForOrigin("https://evil.com/messages", "https://axelmond.com"), "/");

  assert.equal(
    buildAbsoluteAppUrl("/notifications", { APP_URL: "https://axelmond.com" }),
    "https://axelmond.com/notifications",
  );
  assert.equal(
    buildAbsoluteAppUrl("https://evil.com/phish", { APP_URL: "https://axelmond.com" }),
    "https://axelmond.com/",
  );
});
