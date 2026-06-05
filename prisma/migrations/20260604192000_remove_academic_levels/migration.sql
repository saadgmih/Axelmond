UPDATE "Course"
SET "level" = 'Module académique'
WHERE "level" ~* '^(Licence|Master)\s*[0-9]';

UPDATE "User"
SET "levelOrTitle" = 'Étudiant'
WHERE "role" = 'STUDENT';
