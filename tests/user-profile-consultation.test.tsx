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
    updateUserProfile: vi.fn(),
  },
}));

const publicProfile = {
  user: {
    id: "professor-1",
    fullName: "Professeure Nadia",
    firstName: "Nadia",
    lastName: "Bennani",
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

  it("lets the profile owner write student details without select lists", async () => {
    const studentProfile = {
      ...publicProfile,
      user: {
        ...publicProfile.user,
        id: "student-1",
        fullName: "Sara Amrani",
        firstName: "Sara",
        lastName: "Amrani",
        role: "STUDENT",
        title: "Étudiante",
        phone: null,
        birthDate: null,
        country: null,
        city: null,
        preferredLanguage: null,
        institution: null,
        filiere: null,
        studyLevel: null,
        academicYear: null,
      },
      academic: null,
      courses: [],
    };
    const currentUser = {
      id: "student-1",
      email: "sara@example.test",
      fullName: "Sara Amrani",
      role: "STUDENT" as const,
      emailVerified: true,
      levelOrTitle: "Étudiante",
      enrolledCourses: [],
      invoices: [],
    };
    const onCurrentUserUpdated = vi.fn();
    vi.mocked(api.getUserProfile).mockResolvedValue(studentProfile);
    vi.mocked(api.updateUserProfile).mockResolvedValue({
      profile: {
        ...studentProfile,
        user: { ...studentProfile.user, city: "Rabat", institution: "Université Mohammed V" },
      },
      user: { city: "Rabat", institution: "Université Mohammed V" },
      message: "Profil utilisateur mis à jour",
    });

    render(
      <UserProfileViewerProvider currentUser={currentUser} onCurrentUserUpdated={onCurrentUserUpdated}>
        <UserProfileTrigger userId="student-1" userName="Sara Amrani" />
      </UserProfileViewerProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Consulter le profil de Sara Amrani" }));
    fireEvent.change(await screen.findByLabelText("Ville"), { target: { value: "Rabat" } });
    fireEvent.change(screen.getByLabelText("Établissement"), { target: { value: "Université Mohammed V" } });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le profil" }));

    await waitFor(() => expect(api.updateUserProfile).toHaveBeenCalled());
    expect(vi.mocked(api.updateUserProfile).mock.calls[0]?.[0]).toMatchObject({
      firstName: "Sara",
      lastName: "Amrani",
      city: "Rabat",
      institution: "Université Mohammed V",
    });
    expect(onCurrentUserUpdated).toHaveBeenCalledWith(expect.objectContaining({ city: "Rabat" }));
  });

  it("never serializes authentication or account-security fields", () => {
    const result = toConsultableUserProfile({
      id: "student-1",
      fullName: "Étudiante Exemple",
      firstName: "Étudiante",
      lastName: "Exemple",
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
