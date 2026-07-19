import { describe, expect, it } from "vitest";
import { createLessonMediaTicket, verifyLessonMediaTicket } from "../src/lesson-media-ticket";

const TEST_SECRET = "lesson-media-test-secret-with-sufficient-entropy";

describe("lesson media tickets", () => {
  it("accepts a scoped ticket only for its lesson content", () => {
    const ticket = createLessonMediaTicket({ contentId: "content-1", userId: "student-1" }, TEST_SECRET);

    expect(verifyLessonMediaTicket(ticket, "content-1", TEST_SECRET)).toEqual({ userId: "student-1" });
    expect(verifyLessonMediaTicket(ticket, "content-2", TEST_SECRET)).toBeNull();
  });

  it("rejects missing, tampered and differently signed tickets", () => {
    const ticket = createLessonMediaTicket({ contentId: "content-1", userId: "student-1" }, TEST_SECRET);
    const tampered = `${ticket.slice(0, -1)}${ticket.endsWith("a") ? "b" : "a"}`;

    expect(verifyLessonMediaTicket(undefined, "content-1", TEST_SECRET)).toBeNull();
    expect(verifyLessonMediaTicket(tampered, "content-1", TEST_SECRET)).toBeNull();
    expect(verifyLessonMediaTicket(ticket, "content-1", `${TEST_SECRET}-other`)).toBeNull();
  });
});
