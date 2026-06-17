import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  try {
    const course = await prisma.course.findFirst({ where: { isLiveNow: false } });
    if (!course) {
      console.log("No non-live course found");
      return;
    }
    
    console.log("Updating course", course.id);
    
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.course.update({
        where: { id: course.id },
        data: { isLiveNow: true, liveSubject: "Test" }
      });
      
      const roomName = `live-course-${course.id}`;
      const session = await tx.liveSession.upsert({
        where: { roomName },
        update: {
          title: "Test",
          isActive: true,
          endTime: null,
          professorId: course.createdById,
          startTime: new Date(),
        },
        create: {
          roomName,
          title: "Test",
          courseId: course.id,
          professorId: course.createdById,
          startTime: new Date(),
        },
      });
      return u;
    });
    console.log("Success", updated.id);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
