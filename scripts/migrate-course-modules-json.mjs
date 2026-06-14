import { disconnectDatabase, prisma } from "../src/db.ts";

function parseModules(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw;
}

async function main() {
  const courses = await prisma.course.findMany({ select: { id: true, modules: true } });
  let inserted = 0;
  let skipped = 0;

  for (const course of courses) {
    const modules = parseModules(course.modules);
    for (let index = 0; index < modules.length; index += 1) {
      const item = modules[index];
      if (!item || typeof item.id !== "number") continue;
      try {
        await prisma.courseModule.upsert({
          where: { courseId_id: { courseId: course.id, id: item.id } },
          create: {
            courseId: course.id,
            id: item.id,
            sortOrder: index,
            title: String(item.title || ""),
            type: String(item.type || "video"),
            duration: String(item.duration || ""),
            contentMarkdown: typeof item.contentMarkdown === "string" ? item.contentMarkdown : null,
            attachmentUrl: typeof item.attachmentUrl === "string" ? item.attachmentUrl : null,
            attachmentName: typeof item.attachmentName === "string" ? item.attachmentName : null,
            sectionId: typeof item.sectionId === "string" ? item.sectionId : null,
            published: item.published !== false,
          },
          update: {
            sortOrder: index,
            title: String(item.title || ""),
            type: String(item.type || "video"),
            duration: String(item.duration || ""),
            contentMarkdown: typeof item.contentMarkdown === "string" ? item.contentMarkdown : null,
            attachmentUrl: typeof item.attachmentUrl === "string" ? item.attachmentUrl : null,
            attachmentName: typeof item.attachmentName === "string" ? item.attachmentName : null,
            sectionId: typeof item.sectionId === "string" ? item.sectionId : null,
            published: item.published !== false,
          },
        });
        inserted += 1;
      } catch (err) {
        console.error(`[migrate-course-modules] failed course=${course.id} module=${item.id}`, err);
        skipped += 1;
      }
    }
  }

  console.log(`[migrate-course-modules] upserted=${inserted} skipped=${skipped} courses=${courses.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
