import assert from "node:assert/strict";
import {
  canManageContent,
  canAccessAcademicProfile,
  canAccessApiRoute,
  canLoginToRequestedRole,
  getAllowedUiRole,
  getRedirectPathForRole,
  normalizeRole,
  getRoleLabel,
  getTeacherLoginTabLabel,
  getTeacherLoginSectorLabel,
  getTeacherSpaceTitle,
  getTeacherRoleBadgeTone,
} from "../src/rbac.ts";

assert.equal(normalizeRole("student"), "STUDENT");
assert.equal(normalizeRole("teacher"), "PROFESSOR");
assert.equal(normalizeRole("researcher"), "RESEARCHER");
assert.equal(normalizeRole("admin"), "ADMIN");

assert.equal(getAllowedUiRole("STUDENT"), "student");
assert.equal(getAllowedUiRole("PROFESSOR"), "teacher");
assert.equal(getAllowedUiRole("RESEARCHER"), "teacher");
assert.equal(getAllowedUiRole("ADMIN"), "teacher");
assert.equal(canManageContent("STUDENT"), false);
assert.equal(canManageContent("PROFESSOR"), true);
assert.equal(canManageContent("RESEARCHER"), true);
assert.equal(canManageContent("ADMIN"), true);
assert.equal(canAccessAcademicProfile("STUDENT"), false);
assert.equal(canAccessAcademicProfile("PROFESSOR"), true);
assert.equal(canAccessAcademicProfile("RESEARCHER"), true);
assert.equal(canAccessAcademicProfile("ADMIN"), true);
assert.equal(canLoginToRequestedRole("STUDENT", "STUDENT"), true);
assert.equal(canLoginToRequestedRole("ADMIN", "PROFESSOR"), true);
assert.equal(canLoginToRequestedRole("RESEARCHER", "PROFESSOR"), true);
assert.equal(canLoginToRequestedRole("PROFESSOR", "PROFESSOR"), true);
assert.equal(canLoginToRequestedRole("ADMIN", "STUDENT"), false);
assert.equal(canLoginToRequestedRole("STUDENT", "PROFESSOR"), false);

assert.equal(getRedirectPathForRole("STUDENT", "/teacher"), "/student");
assert.equal(getRedirectPathForRole("STUDENT", "/admin/modules"), "/student");
assert.equal(getRedirectPathForRole("PROFESSOR", "/student/courses"), "/teacher");
assert.equal(getRedirectPathForRole("RESEARCHER", "/catalog"), "/teacher");
assert.equal(getRedirectPathForRole("ADMIN", "/dashboard"), "/teacher");

assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/courses/1/modules/101/complete"), true);
assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/courses/1/modules/101/complete"), false);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/courses/1/modules/101/quiz-attempts"), true);
assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/courses/1/modules/101/quiz-attempts"), false);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/courses/1/modules"), false);
assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/courses/1/modules"), true);
assert.equal(canAccessApiRoute("RESEARCHER", "POST", "/api/courses/1/modules"), true);
assert.equal(canAccessApiRoute("ADMIN", "POST", "/api/courses/1/modules"), true);
assert.equal(canAccessApiRoute("STUDENT", "PATCH", "/api/courses/1"), false);
assert.equal(canAccessApiRoute("PROFESSOR", "PATCH", "/api/courses/1"), true);
assert.equal(canAccessApiRoute("STUDENT", "PUT", "/api/courses/1"), false);
assert.equal(canAccessApiRoute("PROFESSOR", "PUT", "/api/courses/1"), true);
assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/courses/1"), false);
assert.equal(canAccessApiRoute("ADMIN", "DELETE", "/api/courses/1"), true);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/courses"), false);
assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/courses"), true);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/courses/1/chapters"), false);
assert.equal(canAccessApiRoute("RESEARCHER", "POST", "/api/courses/1/chapters"), true);
assert.equal(canAccessApiRoute("STUDENT", "PUT", "/api/chapters/ch_1"), false);
assert.equal(canAccessApiRoute("PROFESSOR", "PUT", "/api/chapters/ch_1"), true);
assert.equal(canAccessApiRoute("STUDENT", "PATCH", "/api/chapters/ch_1"), false);
assert.equal(canAccessApiRoute("ADMIN", "PATCH", "/api/chapters/ch_1"), true);
assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/chapters/ch_1"), false);
assert.equal(canAccessApiRoute("RESEARCHER", "DELETE", "/api/chapters/ch_1"), true);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/courses/1/sections"), false);
assert.equal(canAccessApiRoute("ADMIN", "POST", "/api/courses/1/sections"), true);
assert.equal(canAccessApiRoute("STUDENT", "PUT", "/api/content-sections/abc"), false);
assert.equal(canAccessApiRoute("PROFESSOR", "PUT", "/api/content-sections/abc"), true);
assert.equal(canAccessApiRoute("STUDENT", "PATCH", "/api/content-sections/abc"), false);
assert.equal(canAccessApiRoute("PROFESSOR", "PATCH", "/api/content-sections/abc"), true);
assert.equal(canAccessApiRoute("STUDENT", "PUT", "/api/lesson-contents/abc"), false);
assert.equal(canAccessApiRoute("ADMIN", "PUT", "/api/lesson-contents/abc"), true);
assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/lesson-contents/abc"), false);
assert.equal(canAccessApiRoute("ADMIN", "DELETE", "/api/lesson-contents/abc"), true);
assert.equal(canAccessApiRoute("STUDENT", "GET", "/api/me/profile"), false);
assert.equal(canAccessApiRoute("PROFESSOR", "GET", "/api/me/profile"), true);
assert.equal(canAccessApiRoute("RESEARCHER", "PUT", "/api/me/profile"), true);
assert.equal(canAccessApiRoute("ADMIN", "POST", "/api/me/avatar"), true);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/me/avatar"), true);
assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/me/avatar"), true);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/me/password"), false);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/livekit/moderation"), false);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/livekit/sync"), true);
assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/livekit/sync"), true);
assert.equal(canAccessApiRoute("PROFESSOR", "POST", "/api/livekit/moderation"), true);
assert.equal(canAccessApiRoute("RESEARCHER", "POST", "/api/livekit/moderation"), true);
assert.equal(canAccessApiRoute("ADMIN", "POST", "/api/livekit/moderation"), true);
assert.equal(canAccessApiRoute("STUDENT", "POST", "/api/livekit/events"), true);
assert.equal(canAccessApiRoute("STUDENT", "GET", "/api/livekit/attendance/1"), true);
assert.equal(canAccessApiRoute("STUDENT", "DELETE", "/api/admin/secret-backdoor"), false);

assert.equal(getRoleLabel("STUDENT"), "Étudiant");
assert.equal(getRoleLabel("PROFESSOR"), "Professeur");
assert.equal(getRoleLabel("RESEARCHER"), "Chercheur");
assert.equal(getRoleLabel("ADMIN"), "Administrateur");

assert.equal(getTeacherLoginTabLabel(), "Espace Professeur / Chercheur / Admin");
assert.equal(getTeacherLoginSectorLabel(), "Professeurs, Chercheurs & Administration");
assert.equal(getTeacherSpaceTitle("ADMIN"), "Espace Administrateur");
assert.equal(getTeacherSpaceTitle("RESEARCHER"), "Espace Chercheur");
assert.equal(getTeacherSpaceTitle("PROFESSOR"), "Espace Professeur");
assert.equal(getTeacherRoleBadgeTone("ADMIN"), "admin");
assert.equal(getTeacherRoleBadgeTone("RESEARCHER"), "researcher");
assert.equal(getTeacherRoleBadgeTone("PROFESSOR"), "professor");

console.log("RBAC rules passed");
