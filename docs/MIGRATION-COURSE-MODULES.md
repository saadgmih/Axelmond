# Migration `Course.modules` (JSON) → relationnel

## Contexte

Aujourd'hui, le plan d'apprentissage étudiant (vidéo / PDF / quiz) vit dans `Course.modules` (JSONB).
Le contenu enseignant (UploadThing) vit déjà en relationnel : `Chapter` → `ContentSection` → `LessonContent` → `Attachment`.
La progression étudiant est partiellement migrée vers `ModuleProgress` (plus d'écriture `completed` dans le JSON).

## Objectif

Remplacer le JSON syllabus par la table `CourseModule`, sans casser les IDs entiers utilisés par `ModuleProgress`, `Quiz.moduleId` et `QuizAttempt.moduleId`.

## Modèle cible

```prisma
model CourseModule {
  courseId        Int
  id              Int              // ID syllabus global (legacy JSON)
  sortOrder       Int              @default(0)
  title           String
  type            String           // video | pdf | quiz | image
  duration        String           @default("")
  contentMarkdown String?
  attachmentUrl   String?
  attachmentName  String?
  sectionId       String?
  published       Boolean          @default(true)
  course          Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@id([courseId, id])
  @@index([courseId, sortOrder])
}
```

## Phases

### Phase 0 — Préparation (actuelle)

- [x] Table `CourseModule` créée (vide autorisée)
- [x] Helpers `src/course-syllabus-modules.ts` (lecture relationnelle + fallback JSON)
- [x] Script `scripts/migrate-course-modules-json.mjs` (backfill idempotent)
- [x] Dual-write sur `POST /api/courses/:courseId/modules`

### Phase 1 — Backfill staging

1. Déployer migration Prisma
2. Exécuter : `node scripts/migrate-course-modules-json.mjs`
3. Vérifier comptes : `CourseModule` rows = somme des entrées JSON
4. Activer lecture relationnelle : `COURSE_MODULES_READ_RELATIONAL=true`

### Phase 2 — Bascule API

1. `toCourse()` / `findCourse()` incluent `courseModules` quand le flag est actif
2. `POST .../modules/:moduleId/complete` et quiz valident via relationnel
3. `misc-routes` chat tutor résout le titre depuis `CourseModule`
4. Frontend / mobile : aucun changement (même shape `Course.modules[]`)

### Phase 3 — Arrêt JSON

1. Dual-write → write relationnel only
2. Migration Prisma : `Course.modules` nullable puis suppression
3. Supprimer seed JSON inline dans `startup-db.ts`
4. Tests : étendre `module-progress-ownership.test.ts`

## Rollback

- Désactiver `COURSE_MODULES_READ_RELATIONAL`
- Les données JSON restent intactes tant que la colonne n'est pas supprimée

## Checklist pré-production

- [ ] Backfill exécuté sur copie prod
- [ ] IDs syllabus inchangés (ModuleProgress / Quiz)
- [ ] Sidebar étudiant identique
- [ ] Quiz attempts OK
- [ ] Chat tutor titre module OK
