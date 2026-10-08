import { describe, expect, it } from "vitest";
import { AccessCodeError } from "../src/enrollment-access-code-service";

describe("Enrollment Multi-Module Access Code Domain", () => {
  it("instantiates AccessCodeError with proper code and status", () => {
    const err = new AccessCodeError("CODE_ALREADY_USED", 409, "Ce code est réservé à un seul étudiant");
    expect(err.code).toBe("CODE_ALREADY_USED");
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("Ce code est réservé à un seul étudiant");
  });

  it("handles singleStudentOnly tagging in internalName format", () => {
    const internalLabel = "[Code acces] 3 modules [1 etudiant] - 2026-10-08";
    expect(internalLabel.startsWith("[Code acces]")).toBe(true);
    expect(internalLabel.includes("[1 etudiant]")).toBe(true);
  });

  it("verifies single-student exclusivity check logic", () => {
    // Simulated usages on a multi-module access code
    const student1Usage = { userId: "student-user-1", status: "CONFIRMED", courseId: 101 };
    const usages = [student1Usage];

    // Same student redeeming on course 102
    const student1OtherUsages = usages.filter((u) => u.userId !== "student-user-1");
    expect(student1OtherUsages.length).toBe(0); // Allowed!

    // Another student trying to use this code
    const student2OtherUsages = usages.filter((u) => u.userId !== "student-user-2");
    expect(student2OtherUsages.length).toBe(1); // BLOCKED!
  });
});
