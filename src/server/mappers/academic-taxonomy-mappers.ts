import { decodeStoredText } from "../../text";

export function toDomain(domain: any) {
  return {
    id: domain.id,
    name: domain.name,
    slug: domain.slug,
    iconName: domain.iconName,
    color: domain.color,
    description: domain.description,
    order: domain.order,
    courseCount: domain.courseCount,
    disciplines: Array.isArray(domain.disciplines) ? domain.disciplines.map(toDiscipline) : [],
  };
}

export function toDiscipline(discipline: any) {
  return {
    id: discipline.id,
    domainId: discipline.domainId,
    name: decodeStoredText(discipline.name),
    slug: discipline.slug,
    order: discipline.order,
    courseCount: discipline.courseCount,
    domain: discipline.domain
      ? {
          id: discipline.domain.id,
          name: decodeStoredText(discipline.domain.name),
          slug: discipline.domain.slug,
          iconName: discipline.domain.iconName,
          color: discipline.domain.color,
          description: decodeStoredText(discipline.domain.description),
          order: discipline.domain.order,
        }
      : undefined,
  };
}
