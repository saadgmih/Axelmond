import { describe, expect, it } from "vitest";
import { userProfileDetailsSchema } from "../src/server/route-schemas";

describe("user profile details", () => {
  it("accepts free text profile fields for a student", () => {
    const result = userProfileDetailsSchema.safeParse({
      firstName: "Sara",
      lastName: "Amrani",
      phone: "+212 600 000 000",
      birthDate: "2002-05-18",
      country: "Maroc",
      city: "Rabat",
      preferredLanguage: "Français",
      institution: "Université Mohammed V",
      filiere: "Mathématiques",
      studyLevel: "Licence 2",
      academicYear: "2026–2027",
    });

    expect(result.success).toBe(true);
  });

  it("requires both first and last names and rejects future dates", () => {
    expect(userProfileDetailsSchema.safeParse({ firstName: "", lastName: "" }).success).toBe(false);
    expect(
      userProfileDetailsSchema.safeParse({ firstName: "Sara", lastName: "Amrani", birthDate: "2999-01-01" }).success,
    ).toBe(false);
  });
});
