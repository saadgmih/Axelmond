import { isTeacherSpaceRole } from "./rbac";

export interface AcademicLinks {
  linkedIn?: string;
  orcid?: string;
  googleScholar?: string;
  website?: string;
}

export interface AcademicProfileInput {
  title?: string | null;
  department?: string | null;
  lab?: string | null;
  speciality?: string | null;
  teachingDomains: string[];
  researchDomains: string[];
  bio?: string | null;
  avatarUrl?: string | null;
  links: AcademicLinks;
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function sanitizeDomainList(value: unknown) {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/)
      : [];
  return rawValues
    .map((item) => cleanText(item, 80))
    .filter((item): item is string => Boolean(item))
    .slice(0, 12);
}

export function sanitizeAcademicLinks(value: unknown): AcademicLinks {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const links: AcademicLinks = {};
  const linkedIn = cleanText(source.linkedIn, 240);
  const orcid = cleanText(source.orcid, 80);
  const googleScholar = cleanText(source.googleScholar, 240);
  const website = cleanText(source.website, 240);
  if (linkedIn) links.linkedIn = linkedIn;
  if (orcid) links.orcid = orcid;
  if (googleScholar) links.googleScholar = googleScholar;
  if (website) links.website = website;
  return links;
}

export function sanitizeAcademicProfileInput(value: unknown): AcademicProfileInput {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    title: cleanText(source.title, 120),
    department: cleanText(source.department, 160),
    lab: cleanText(source.lab, 160),
    speciality: cleanText(source.speciality, 160),
    teachingDomains: sanitizeDomainList(source.teachingDomains),
    researchDomains: sanitizeDomainList(source.researchDomains),
    bio: cleanText(source.bio, 1200),
    avatarUrl: cleanText(source.avatarUrl, 500),
    links: sanitizeAcademicLinks(source.links),
  };
}

export function sanitizeAvatarUrl(value: unknown) {
  return cleanText(value, 500);
}
