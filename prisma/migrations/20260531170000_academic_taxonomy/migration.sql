CREATE TABLE "FacultyDomain" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "iconName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyDomain_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Discipline" (
    "id" INTEGER NOT NULL,
    "domainId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacultyDomain_name_key" ON "FacultyDomain"("name");
CREATE UNIQUE INDEX "FacultyDomain_slug_key" ON "FacultyDomain"("slug");
CREATE UNIQUE INDEX "Discipline_slug_key" ON "Discipline"("slug");
CREATE INDEX "Discipline_domainId_order_idx" ON "Discipline"("domainId", "order");

INSERT INTO "FacultyDomain" ("id", "name", "slug", "iconName", "color", "description", "order", "updatedAt") VALUES
(1, 'Mathématiques', 'mathematiques', 'Calculator', 'from-indigo-600 to-blue-600', 'Fondements théoriques, modélisation et méthodes quantitatives.', 1, CURRENT_TIMESTAMP),
(2, 'Physique', 'physique', 'Atom', 'from-cyan-600 to-sky-600', 'Matière, énergie, interactions et phénomènes fondamentaux.', 2, CURRENT_TIMESTAMP),
(3, 'Chimie', 'chimie', 'FlaskConical', 'from-emerald-600 to-teal-600', 'Structure, transformation et analyse de la matière.', 3, CURRENT_TIMESTAMP),
(4, 'Sciences de la Vie', 'sciences-de-la-vie', 'Dna', 'from-green-600 to-lime-600', 'Organismes vivants, génétique, écologie et biotechnologies.', 4, CURRENT_TIMESTAMP),
(5, 'Médecine et Pharmacie', 'medecine-pharmacie', 'HeartPulse', 'from-rose-600 to-red-600', 'Santé, corps humain, médicaments et pratiques cliniques.', 5, CURRENT_TIMESTAMP),
(6, 'Informatique et Intelligence Artificielle', 'informatique-intelligence-artificielle', 'BrainCircuit', 'from-violet-600 to-fuchsia-600', 'Logiciel, données, sécurité, apprentissage automatique et IA.', 6, CURRENT_TIMESTAMP),
(7, 'Architecture et Génie Civil', 'architecture-genie-civil', 'Building2', 'from-slate-700 to-zinc-600', 'Espaces bâtis, urbanisme, construction et maquettes BIM.', 7, CURRENT_TIMESTAMP),
(8, 'Économie et Management', 'economie-management', 'BriefcaseBusiness', 'from-amber-600 to-orange-600', 'Organisation, finance, marchés, gestion et entrepreneuriat.', 8, CURRENT_TIMESTAMP),
(9, 'Génie Électrique et Électronique', 'genie-electrique-electronique', 'CircuitBoard', 'from-blue-700 to-indigo-700', 'Électronique, contrôle, télécommunications et systèmes embarqués.', 9, CURRENT_TIMESTAMP),
(10, 'Recherche et Innovation', 'recherche-innovation', 'Lightbulb', 'from-pink-600 to-purple-600', 'Production scientifique, laboratoires, événements et transfert.', 10, CURRENT_TIMESTAMP);

INSERT INTO "Discipline" ("id", "domainId", "name", "slug", "order", "updatedAt") VALUES
(101, 1, 'Algèbre', 'algebre', 1, CURRENT_TIMESTAMP),
(102, 1, 'Analyse', 'analyse', 2, CURRENT_TIMESTAMP),
(103, 1, 'Probabilités et Statistiques', 'probabilites-statistiques', 3, CURRENT_TIMESTAMP),
(104, 1, 'Géométrie', 'geometrie', 4, CURRENT_TIMESTAMP),
(105, 1, 'Mathématiques Appliquées', 'mathematiques-appliquees', 5, CURRENT_TIMESTAMP),
(201, 2, 'Mécanique', 'mecanique', 1, CURRENT_TIMESTAMP),
(202, 2, 'Électromagnétisme', 'electromagnetisme', 2, CURRENT_TIMESTAMP),
(203, 2, 'Thermodynamique', 'thermodynamique', 3, CURRENT_TIMESTAMP),
(204, 2, 'Physique Quantique', 'physique-quantique', 4, CURRENT_TIMESTAMP),
(205, 2, 'Physique Nucléaire', 'physique-nucleaire', 5, CURRENT_TIMESTAMP),
(301, 3, 'Chimie Générale', 'chimie-generale', 1, CURRENT_TIMESTAMP),
(302, 3, 'Chimie Organique', 'chimie-organique', 2, CURRENT_TIMESTAMP),
(303, 3, 'Chimie Minérale', 'chimie-minerale', 3, CURRENT_TIMESTAMP),
(304, 3, 'Chimie Analytique', 'chimie-analytique', 4, CURRENT_TIMESTAMP),
(305, 3, 'Biochimie', 'biochimie', 5, CURRENT_TIMESTAMP),
(401, 4, 'Biologie Cellulaire', 'biologie-cellulaire', 1, CURRENT_TIMESTAMP),
(402, 4, 'Génétique', 'genetique', 2, CURRENT_TIMESTAMP),
(403, 4, 'Microbiologie', 'microbiologie', 3, CURRENT_TIMESTAMP),
(404, 4, 'Écologie', 'ecologie', 4, CURRENT_TIMESTAMP),
(405, 4, 'Biotechnologies', 'biotechnologies', 5, CURRENT_TIMESTAMP),
(501, 5, 'Anatomie', 'anatomie', 1, CURRENT_TIMESTAMP),
(502, 5, 'Physiologie', 'physiologie', 2, CURRENT_TIMESTAMP),
(503, 5, 'Pharmacologie', 'pharmacologie', 3, CURRENT_TIMESTAMP),
(504, 5, 'Pathologie', 'pathologie', 4, CURRENT_TIMESTAMP),
(505, 5, 'Médecine Clinique', 'medecine-clinique', 5, CURRENT_TIMESTAMP),
(601, 6, 'Programmation', 'programmation', 1, CURRENT_TIMESTAMP),
(602, 6, 'Développement Web', 'developpement-web', 2, CURRENT_TIMESTAMP),
(603, 6, 'Bases de Données', 'bases-de-donnees', 3, CURRENT_TIMESTAMP),
(604, 6, 'Cybersécurité', 'cybersecurite', 4, CURRENT_TIMESTAMP),
(605, 6, 'Intelligence Artificielle', 'intelligence-artificielle', 5, CURRENT_TIMESTAMP),
(606, 6, 'Machine Learning', 'machine-learning', 6, CURRENT_TIMESTAMP),
(607, 6, 'Data Science', 'data-science', 7, CURRENT_TIMESTAMP),
(701, 7, 'Architecture', 'architecture', 1, CURRENT_TIMESTAMP),
(702, 7, 'Urbanisme', 'urbanisme', 2, CURRENT_TIMESTAMP),
(703, 7, 'Construction', 'construction', 3, CURRENT_TIMESTAMP),
(704, 7, 'Génie Civil', 'genie-civil', 4, CURRENT_TIMESTAMP),
(705, 7, 'BIM', 'bim', 5, CURRENT_TIMESTAMP),
(801, 8, 'Économie', 'economie', 1, CURRENT_TIMESTAMP),
(802, 8, 'Comptabilité', 'comptabilite', 2, CURRENT_TIMESTAMP),
(803, 8, 'Finance', 'finance', 3, CURRENT_TIMESTAMP),
(804, 8, 'Marketing', 'marketing', 4, CURRENT_TIMESTAMP),
(805, 8, 'Management', 'management', 5, CURRENT_TIMESTAMP),
(806, 8, 'Entrepreneuriat', 'entrepreneuriat', 6, CURRENT_TIMESTAMP),
(901, 9, 'Électronique', 'electronique', 1, CURRENT_TIMESTAMP),
(902, 9, 'Automatique', 'automatique', 2, CURRENT_TIMESTAMP),
(903, 9, 'Télécommunications', 'telecommunications', 3, CURRENT_TIMESTAMP),
(904, 9, 'Systèmes Embarqués', 'systemes-embarques', 4, CURRENT_TIMESTAMP),
(1001, 10, 'Publications', 'publications', 1, CURRENT_TIMESTAMP),
(1002, 10, 'Projets de Recherche', 'projets-de-recherche', 2, CURRENT_TIMESTAMP),
(1003, 10, 'Laboratoires', 'laboratoires', 3, CURRENT_TIMESTAMP),
(1004, 10, 'Conférences', 'conferences', 4, CURRENT_TIMESTAMP),
(1005, 10, 'Innovation', 'innovation', 5, CURRENT_TIMESTAMP);

ALTER TABLE "Course" ADD COLUMN "disciplineId" INTEGER;

UPDATE "Course"
SET "disciplineId" = CASE
    WHEN LOWER("title") LIKE '%base%' OR LOWER("title") LIKE '%sql%' OR LOWER("category") LIKE '%donnée%' THEN 603
    WHEN LOWER("title") LIKE '%machine learning%' OR LOWER("category") = 'ia' THEN 606
    WHEN LOWER("title") LIKE '%intelligence artificielle%' THEN 605
    WHEN LOWER("title") LIKE '%linux%' OR LOWER("title") LIKE '%système%' OR LOWER("category") LIKE '%système%' THEN 604
    ELSE 601
END;

ALTER TABLE "Course" ALTER COLUMN "disciplineId" SET NOT NULL;
CREATE INDEX "Course_disciplineId_idx" ON "Course"("disciplineId");

ALTER TABLE "Discipline" ADD CONSTRAINT "Discipline_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "FacultyDomain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
