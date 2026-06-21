import assert from "node:assert/strict";
import {
  generateProfessorInviteCode,
  normalizeProfessorInviteCode,
  parseProfessorInviteCodes,
} from "../src/invitations.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("invitations", () => {
  assert.equal(normalizeProfessorInviteCode(" prof-one "), "PROF-ONE");
  assert.equal(normalizeProfessorInviteCode(undefined), "");

  assert.deepEqual(parseProfessorInviteCodes("PROF-A, PROF-B\nPROF-C"), ["PROF-A", "PROF-B", "PROF-C"]);
  assert.deepEqual(parseProfessorInviteCodes(""), []);

  assert.match(generateProfessorInviteCode(), /^PROF-[0-9A-F]{8}$/);
  assert.match(generateProfessorInviteCode(true), /^\d{6}$/);
});
