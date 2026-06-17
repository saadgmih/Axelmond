import { prisma } from "../../db";

export function toAttachment(attachment: any) {
  return {
    id: attachment.id,
    type: attachment.type,
    fileName: attachment.fileName,
    fileKey: attachment.fileKey,
    url: attachment.url,
    mimeType: attachment.mimeType || undefined,
    size: attachment.size,
  };
}

export function toLessonContent(content: any) {
  return {
    id: content.id,
    courseId: content.courseId,
    sectionId: content.sectionId || undefined,
    type: content.type,
    title: content.title,
    body: content.body || undefined,
    published: content.published,
    attachments: Array.isArray(content.attachments) ? content.attachments.map(toAttachment) : [],
  };
}

export function buildContentTree(sections: any[]) {
  const nodes = sections.map((section) => ({
    id: section.id,
    courseId: section.courseId,
    chapterId: section.chapterId || undefined,
    parentId: section.parentId || undefined,
    title: section.title,
    description: section.description || undefined,
    order: section.order,
    published: section.published,
    contents: Array.isArray(section.contents) ? section.contents.map(toLessonContent) : [],
    children: [] as any[],
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots: any[] = [];

  nodes.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNode = (node: any) => {
    node.children.sort((a: any, b: any) => a.order - b.order || a.title.localeCompare(b.title));
    node.contents.sort((a: any, b: any) => a.title.localeCompare(b.title));
    node.children.forEach(sortNode);
  };

  roots.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  roots.forEach(sortNode);
  return roots;
}

export async function getCourseContentTree(courseId: number, includeDrafts: boolean) {
  const sections = await prisma.contentSection.findMany({
    where: {
      courseId,
      ...(includeDrafts ? {} : { published: true }),
    },
    include: {
      contents: {
        where: includeDrafts ? {} : { published: true },
        include: { attachments: true },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return buildContentTree(sections);
}
export function collectDescendantSectionIds(
  rootId: string,
  sections: Array<{ id: string; parentId: string | null }>,
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const section of sections) {
    if (!section.parentId) continue;
    const siblings = childrenByParent.get(section.parentId) ?? [];
    siblings.push(section.id);
    childrenByParent.set(section.parentId, siblings);
  }

  const ids = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const children = childrenByParent.get(parentId) ?? [];
    ids.push(...children);
    queue.push(...children);
  }
  return ids;
}

export async function getSectionAndDescendantIds(client: typeof prisma = prisma, sectionId: string) {
  const root = await client.contentSection.findUnique({
    where: { id: sectionId },
    select: { id: true, courseId: true },
  });
  if (!root) return [sectionId];

  const sections = await client.contentSection.findMany({
    where: { courseId: root.courseId },
    select: { id: true, parentId: true },
  });
  return collectDescendantSectionIds(sectionId, sections);
}

export async function deleteContentSectionTree(tx: any, sectionId: string) {
  const sectionIds = await getSectionAndDescendantIds(tx, sectionId);
  const contents = await tx.lessonContent.findMany({
    where: { sectionId: { in: sectionIds } },
    select: { id: true },
  });
  const contentIds = contents.map((content: any) => content.id);

  let fileKeys: string[] = [];
  if (contentIds.length > 0) {
    const attachments = await tx.attachment.findMany({
      where: { contentId: { in: contentIds } },
      select: { fileKey: true },
    });
    fileKeys = attachments.map((a: any) => a.fileKey);
    await tx.attachment.deleteMany({ where: { contentId: { in: contentIds } } });
    await tx.lessonContent.deleteMany({ where: { id: { in: contentIds } } });
  }
  await tx.contentSection.deleteMany({ where: { id: { in: sectionIds } } });
  return { sectionCount: sectionIds.length, contentCount: contentIds.length, fileKeys };
}
