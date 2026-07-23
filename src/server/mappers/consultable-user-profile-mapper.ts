import { sanitizeAcademicLinks } from "../../academic-profile";
import { decodeStoredText } from "../../text";

export const consultableUserProfileSelect = {
  id: true,
  fullName: true,
  firstName: true,
  lastName: true,
  role: true,
  avatarUrl: true,
  levelOrTitle: true,
  filiere: true,
  phone: true,
  birthDate: true,
  country: true,
  city: true,
  preferredLanguage: true,
  institution: true,
  studyLevel: true,
  academicYear: true,
  academicProfile: {
    select: {
      title: true,
      department: true,
      lab: true,
      speciality: true,
      teachingDomains: true,
      researchDomains: true,
      bio: true,
      links: true,
    },
  },
  createdCourses: {
    where: { published: true },
    select: { id: true, title: true, level: true, category: true, imageUrl: true },
    orderBy: { updatedAt: "desc" as const },
    take: 8,
  },
} as const;

export function toConsultableUserProfile(user: any) {
  const academic = user.academicProfile;
  const courses = Array.isArray(user.createdCourses) ? user.createdCourses : [];
  const normalizedName = decodeStoredText(user.fullName).trim();
  const [derivedFirstName = "", ...derivedLastNameParts] = normalizedName.split(/\s+/);

  return {
    user: {
      id: user.id,
      fullName: normalizedName,
      firstName: user.firstName || derivedFirstName,
      lastName: user.lastName ?? derivedLastNameParts.join(" "),
      role: user.role,
      avatarUrl: user.avatarUrl || null,
      title: academic?.title || user.levelOrTitle || null,
      filiere: user.filiere || null,
      phone: user.phone || null,
      birthDate: user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : null,
      country: user.country || null,
      city: user.city || null,
      preferredLanguage: user.preferredLanguage || null,
      institution: user.institution || null,
      studyLevel: user.studyLevel || null,
      academicYear: user.academicYear || null,
    },
    academic: academic
      ? {
          department: academic.department || "",
          lab: academic.lab || "",
          speciality: academic.speciality || "",
          teachingDomains: Array.isArray(academic.teachingDomains) ? academic.teachingDomains : [],
          researchDomains: Array.isArray(academic.researchDomains) ? academic.researchDomains : [],
          bio: academic.bio || "",
          links: sanitizeAcademicLinks(academic.links),
        }
      : null,
    courses: courses.map((course: any) => ({
      id: course.id,
      title: decodeStoredText(course.title),
      level: decodeStoredText(course.level),
      category: decodeStoredText(course.category),
      imageUrl: course.imageUrl || null,
    })),
  };
}
