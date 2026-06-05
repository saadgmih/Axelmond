const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Deleting all modules and related content...");
  
  // Deleting in order to respect foreign key constraints
  await prisma.enrollment.deleteMany({});
  await prisma.liveAttendance.deleteMany({});
  await prisma.liveMessage.deleteMany({});
  await prisma.liveActionLog.deleteMany({});
  await prisma.liveSession.deleteMany({});
  
  await prisma.quizAnswer.deleteMany({});
  await prisma.quizAttempt.deleteMany({});
  await prisma.quizQuestion.deleteMany({});
  await prisma.quiz.deleteMany({});
  
  await prisma.attachment.deleteMany({});
  await prisma.lessonContent.deleteMany({});
  await prisma.contentSection.deleteMany({});
  await prisma.chapter.deleteMany({});
  
  const result = await prisma.course.deleteMany({});
  
  console.log(`Successfully deleted ${result.count} courses/modules.`);
}

main()
  .catch((e) => {
    console.error("Error deleting modules:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
