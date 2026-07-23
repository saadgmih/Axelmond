/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../src/api";
import { UserProfileTrigger, UserProfileViewerProvider } from "../src/components/UserProfileViewer";
import { toConsultableUserProfile } from "../src/server/mappers/user-mappers";

vi.mock("../src/api", () => ({
  api: {
    getUserProfile: vi.fn(),
  },
}));

const publicProfile = {
  user: {
    id: "professor-1",
    fullName: "Professeure Nadia",
    role: "PROFESSOR",
    avatarUrl: null,
    title: "Professeure de mathématiques",
    filiere: null,
  },
  academic: {
    department: "Mathématiques",
    lab: "Probabilités",
    speciality: "Statistiques",
    teachingDomains: ["Analyse", "Probabilités"],
    researchDomains: ["Modélisation"],
    bio: "Enseignante et chercheuse.",
    links: {},
  },
  courses: [{ id: 4, title: "Analyse 2", level: "Licence", category: "Mathématiques", imageUrl: null }],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("consultable user profiles", () => {
  it("opens a privacy-safe profile from a clickable user name and closes it", async () => {
    vi.mocked(api.getUserProfile).mockResolvedValue(publicProfile);

    render(
      <UserProfileViewerProvider>
        <UserProfileTrigger userId="professor-1" userName="Professeure Nadia" prefix="Par" />
      </UserProfileViewerProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Consulter le profil de Professeure Nadia" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText("Professeure de mathématiques")).toBeInTheDocument();
    expect(screen.getByText("Enseignante et chercheuse.")).toBeInTheDocument();
    expect(screen.getByText("Analyse 2")).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fermer le profil" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("never serializes private account fields", () => {
    const result = toConsultableUserProfile({
      id: "student-1",
      fullName: "Étudiante Exemple",
      role: "STUDENT",
      email: "prive@example.test",
      passwordHash: "secret-hash",
      authTokenVersion: 9,
      avatarUrl: null,
      levelOrTitle: "Licence",
      filiere: "Mathématiques",
      academicProfile: null,
      createdCourses: [],
    });

    expect(result.user.fullName).toBe("Étudiante Exemple");
    expect(result.user.filiere).toBe("Mathématiques");
    expect(result).not.toHaveProperty("user.email");
    expect(result).not.toHaveProperty("user.passwordHash");
    expect(result).not.toHaveProperty("user.authTokenVersion");
  });
});
