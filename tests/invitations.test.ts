import assert from "node:assert/strict";
import {
  generateProfessorInviteCode,
  normalizeProfessorInviteCode,
  parseProfessorInviteCodes,
  isValidProfessorInviteCodeFormat,
} from "../src/invitations.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("invitations", () => {
  assert.equal(normalizeProfessorInviteCode(" prof-one "), "PROF-ONE");
  assert.equal(normalizeProfessorInviteCode(undefined), "");

  assert.deepEqual(
    parseProfessorInviteCodes(
      "A3F9C1E4B8D2F0AA7D4C91E2AB34FF10, 8E2B54C91F03A7D6E4B1892C50F73A12\n3F4E5D6C7B8A90123456789ABCDEF012",
    ),
    ["A3F9C1E4B8D2F0AA7D4C91E2AB34FF10", "8E2B54C91F03A7D6E4B1892C50F73A12", "3F4E5D6C7B8A90123456789ABCDEF012"],
  );
  assert.deepEqual(parseProfessorInviteCodes(""), []);

  assert.equal(isValidProfessorInviteCodeFormat("PROF-INVITE-001"), false);
  assert.equal(isValidProfessorInviteCodeFormat("SHORT"), false);
  assert.equal(isValidProfessorInviteCodeFormat("A3F9C1E4B8D2F0AA7D4C91E2AB34FF10"), true);

  const generated = generateProfessorInviteCode();
  assert.match(generated, /^[0-9A-F]{32}$/);
  assert.equal(isValidProfessorInviteCodeFormat(generated), true);
  assert.match(generateProfessorInviteCode(true), /^\d{6}$/);
});
