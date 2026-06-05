import assert from "node:assert/strict";
import { buildMailDeliveryDetails } from "../src/email.ts";

const details = buildMailDeliveryDetails({
  messageId: "<test@axelmond.com>",
  accepted: ["user@gmail.com"],
  rejected: ["bad@yahoo.com"],
  envelope: {
    from: "verification@axelmond.com",
    to: ["user@gmail.com", "bad@yahoo.com"],
  },
  response: "250 2.0.0 Ok: queued as abc123",
});

assert.equal(details.messageId, "<test@axelmond.com>");
assert.deepEqual(details.accepted, ["user@gmail.com"]);
assert.deepEqual(details.rejected, ["bad@yahoo.com"]);
assert.deepEqual(details.envelope, {
  from: "verification@axelmond.com",
  to: ["user@gmail.com", "bad@yahoo.com"],
});
assert.equal(details.response, "250 2.0.0 Ok: queued as abc123");
assert.equal(details.providerStatus, "QUEUED");

console.log("Email delivery rules passed");
