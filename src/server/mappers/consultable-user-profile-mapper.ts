import { sanitizeAcademicLinks } from "../../academic-profile";
import { decodeStoredText } from "../../text";

export function toConsultableUserProfile(user: any) {
  const academic = user.academicProfile;
  const courses = Array.isArray(user.createdCourses) ? user.createdCourses : [];

  return {
    user: {
      id: user.id,
      fullName: decodeStoredText(user.fullName),
      role: user.role,
      avatarUrl: user.avatarUrl || null,
      title: academic?.title || user.levelOrTitle || null,
      filiere: user.filiere || null,
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
