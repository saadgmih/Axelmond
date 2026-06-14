import { prisma, getActivePgSchema } from "../db";
import { Course, DEFAULT_MODULE_CLASSIFICATION } from "../types";
import { ACADEMIC_DOMAINS, getDisciplineIdForCourse } from "../academic-taxonomy";
import { shouldSkipStartupSeed } from "../startup-seed";
import { Prisma } from "@prisma/client";
import { parseProfessorInviteCodes } from "../invitations";
import { canAccessAcademicProfile } from "../rbac";

import { DEFAULT_LIVE_SUBJECT } from "../livekit";

function logDb(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [db] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}

async function ensureAcademicProfileForUser(
  client: typeof prisma,
  user: { id: string; role: string; levelOrTitle?: string | null },
) {
  if (!canAccessAcademicProfile(user.role as any)) return null;
  return client.academicProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      title: user.levelOrTitle || "Enseignant Chercheur",
      teachingDomains: [],
      researchDomains: [],
      links: {},
    },
  });
}

export const seedCourses: Course[] = [
  {
    id: 1,
    title: "Algorithmique et Structures de Données",
    level: DEFAULT_MODULE_CLASSIFICATION,
    credits: 6,
    duration: "40 heures",
    category: "Programmation",
    disciplineId: 601,
    price: 160,
    iconName: "Code",
    color: "bg-blue-100",
    instructor: "Équipe académique Axelmond",
    description:
      "Les fondements de l'informatique. Apprenez à concevoir des algorithmes robustes, efficaces et à utiliser les structures de données majeures (piles, files, arbres binaires et graphes).",
    progress: 45,
    isLiveNow: true,
    liveSubject: DEFAULT_LIVE_SUBJECT,
    modules: [
      {
        id: 101,
        title: "Chapitre 1 : Introduction à la complexité algorithmique",
        type: "video",
        duration: "45 min",
        completed: true,
      },
      {
        id: 1011,
        title: "Support en synthèse - Notes de Chapitre 1",
        type: "pdf",
        duration: "12 pages",
        completed: true,
        contentMarkdown:
          "### Chapitre 1 : Introduction à la Complexité Algorithmique\n\nLa complexité permet d'évaluer la quantité de ressources (temps requis ou mémoire utilisée) nécessaire pour exécuter un algorithme en fonction de la taille $n$ des informations en entrée.\n\n#### 1. Notations Grand-O (Asymptotique)\nLa notation $O(f(n))$ décrit la limite supérieure du pire des cas :\n- **$O(1)$** : Temps Constant. Exemple : Accéder à un élément de tableau par son indice.\n- **$O(\\log n)$** : Temps Logarithmique. Exemple : Recherche dichotomique dans un tableau déjà trié.\n- **$O(n)$** : Temps Linéaire. Exemple : Recherche séquentielle élément par élément.\n- **$O(n \\log n)$** : Tri efficace. Exemple : Tri Fusion (`MergeSort`), Tri Rapide moyen (`QuickSort`).\n- **$O(n^2)$** : Temps Quadratique. Exemple : Boucles imbriquées simples (tri à bulles).\n\n#### 2. Exemple d'Analyse en C\n```c\n// Recherche linéaire : complexité O(n)\nint rechercherElement(int arr[], int size, int cible) {\n    for (int i = 0; i < size; i++) {\n        if (arr[i] == cible) return i;\n    }\n    return -1;\n}\n```\nEn moyenne et au pire, nous devons évaluer $n$ cases mémoire pour localiser notre cible.",
      },
      {
        id: 1012,
        title: "Quiz officiel : Calculs de complexité O(n)",
        type: "quiz",
        duration: "3 questions",
        completed: true,
        score: "2/3",
      },
      {
        id: 102,
        title: "Chapitre 2 : Les tableaux dynamiques et listes chaînées",
        type: "video",
        duration: "1h 20 min",
        completed: false,
      },
      {
        id: 1021,
        title: "TD : Implémentation complète de listes chaînées en C",
        type: "pdf",
        duration: "4 pages",
        completed: false,
        contentMarkdown:
          "### Travaux Dirigés (TD 1) : Les structures dynamiques\n\n#### Objectif\nManipuler la mémoire manuellement à l'aide des allocateurs en C (`malloc`, `free`).\n\n#### Structure de nœud de liste chaînée simple :\n```c\n#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct Node {\n    int data;\n    struct Node* next;\n} Node;\n\nNode* createNode(int value) {\n    Node* newNode = (Node*)malloc(sizeof(Node));\n    if (newNode == NULL) {\n        perror(\"Problème d'allocation mémoire !\");\n        exit(1);\n    }\n    newNode->data = value;\n    newNode->next = NULL;\n    return newNode;\n}\n\nvoid freeList(Node* head) {\n    Node* current = head;\n    while (current != NULL) {\n        Node* nextNode = current->next;\n        free(current);\n        current = nextNode;\n    }\n}\n```",
      },
      {
        id: 103,
        title: "Chapitre 3 : Structures de Piles (Stack) et Files (Queue)",
        type: "video",
        duration: "55 min",
        completed: false,
      },
    ],
  },
  {
    id: 2,
    title: "Bases de Données Relationnelles (SQL)",
    level: DEFAULT_MODULE_CLASSIFICATION,
    credits: 4,
    duration: "30 heures",
    category: "Données",
    disciplineId: 603,
    price: 125,
    iconName: "Database",
    color: "bg-emerald-100",
    instructor: "Dr. Sophie Laurent",
    description:
      "Conception de modèles par entités relationnelles. Maîtrisez l'algèbre relationnelle, la normalisation, et l'art des requêtes SQL complexes.",
    progress: 0,
    isLiveNow: false,
    modules: [
      {
        id: 201,
        title: "Chapitre 1 : Modélisation conceptuelle (Modèle Entité-Association & MERISE)",
        type: "video",
        duration: "1h 15 min",
        completed: false,
      },
      {
        id: 2011,
        title: "Support en synthèse - Notes de Modélisation",
        type: "pdf",
        duration: "5 pages",
        completed: false,
        contentMarkdown:
          "### Modélisation Conceptuelle Merise (MCD)\n\nLe Modèle Conceptuel des Données (MCD) est la représentation graphique des entités et de leurs liaisons sémantiques.\n\n#### 1. Règle d'or de Merise\nChaque entité possède :\n- Un identifiant unique (Ex: `id_etudiant`).\n- Des propriétés décrivant l'entité.\n\nLes relations portent des **cardinalités** minimales et maximales :\n- **0,N** : L'étudiant peut s'inscrire à 0 ou plusieurs modules de l'université.\n- **1,1** : Un abonnement de paiement appartient à précisément 1 étudiant.\n\n#### 2. Passage au Modèle Physique\n- Les cardinalités **(1,1)-(0,N)** déplacent la clé primaire de l'entité \"parent\" comme clé étrangère dans l'entité \"enfant\".\n- Les cardinalités de type **(0,N)-(0,N)** créent une table d'association pivot intermédiaire.",
      },
      {
        id: 202,
        title: "Quiz : Algèbre relationnelle et Sélections SQL",
        type: "quiz",
        duration: "3 questions",
        completed: false,
      },
    ],
  },
  {
    id: 3,
    title: "Systèmes d'Exploitation (Linux)",
    level: DEFAULT_MODULE_CLASSIFICATION,
    credits: 5,
    duration: "35 heures",
    category: "Système",
    disciplineId: 604,
    price: 200,
    iconName: "Terminal",
    color: "bg-purple-100",
    instructor: "Équipe académique Axelmond",
    description:
      "Comprendre le fonctionnement intime du noyau Linux : scheduling de processus, gestion partagée de la mémoire vive et communication POSIX (sémaphores, tuyaux).",
    progress: 100,
    isLiveNow: false,
    modules: [
      {
        id: 301,
        title: "Chapitre 1 : Historique, rôles du noyau et architecture interne",
        type: "video",
        duration: "45 min",
        completed: true,
      },
      {
        id: 302,
        title: "Chapitre 2 : Ordonnancement de processus, fils d'exécution (pthreads)",
        type: "video",
        duration: "2h 30 min",
        completed: true,
      },
      {
        id: 3021,
        title: "Travail Pratique : Programmation des sémaphores d'exclusion mutuelle",
        type: "pdf",
        duration: "8 pages",
        completed: true,
        contentMarkdown:
          "### TP : Synchronisation de Processus avec Threads & Mutex\n\nL'exclusion mutuelle permet d'isoler une section critique afin d'éviter les situations de concurrence incontrôlée.\n\n#### Exemple complet d'implémentation d'un Mutex en C :\n```c\n#include <stdio.h>\n#include <pthread.h>\n\nint compteur_global = 0;\npthread_mutex_t verrou;\n\nvoid* incremental(void* arg) {\n    for (int i = 0; i < 10000; i++) {\n        pthread_mutex_lock(&verrou);\n        compteur_global++;\n        pthread_mutex_unlock(&verrou);\n    }\n    return NULL;\n}\n\nint main() {\n    pthread_t thread1, thread2;\n    pthread_mutex_init(&verrou, NULL);\n    pthread_create(&thread1, NULL, incremental, NULL);\n    pthread_create(&thread2, NULL, incremental, NULL);\n    pthread_join(thread1, NULL);\n    pthread_join(thread2, NULL);\n    printf(\"Valeur finale du compteur : %d\\n\", compteur_global);\n    pthread_mutex_destroy(&verrou);\n    return 0;\n}\n```",
      },
      {
        id: 303,
        title: "Quiz d'Évaluation Finale : Concurrence et Sémaphores",
        type: "quiz",
        duration: "3 questions",
        completed: true,
        score: "3/3",
      },
    ],
  },
  {
    id: 6,
    title: "Intelligence Artificielle & Machine Learning",
    level: DEFAULT_MODULE_CLASSIFICATION,
    credits: 6,
    duration: "50 heures",
    category: "IA",
    disciplineId: 606,
    price: 250,
    iconName: "Brain",
    color: "bg-pink-100",
    instructor: "Dr. Nadia Rahmani",
    description:
      "Maîtrisez les concepts pivots de l'apprentissage automatique : descente de gradient, réseaux de neurones denses, convolutions géométriques et architecture Transformers.",
    progress: 10,
    isLiveNow: false,
    modules: [
      {
        id: 601,
        title: "Chapitre 1 : Introduction à l'apprentissage supervisé et manipulation de tenseurs",
        type: "video",
        duration: "2h 00 min",
        completed: true,
      },
      {
        id: 6011,
        title: "Notes de module : Mathématiques du Deep Learning",
        type: "pdf",
        duration: "3 pages",
        completed: true,
        contentMarkdown:
          "### Mathématiques Théoriques du Machine Learning\n\nL'entraînement d'un réseau de neurones artificiels repose sur trois concepts principaux :\n\n1. **La propagation avant (Forward Pass)** : Calcul de la sortie du réseau $y_{pred} = \\sigma(W \\cdot X + b)$.\n2. **Le calcul de la perte (Loss Function)** : Quantification de l'erreur, par exemple l'erreur quadratique moyenne ($MSE$) :\n   $$MSE = \\frac{1}{n} \\sum_{i=1}^{n} (y_i - y_{pred})^2$$\n3. **La rétropropagation du gradient (Backpropagation)** : Calcul de la dérivée partielle de l'erreur par rapport à chaque poids de matrice afin d'ajuster ces derniers par la méthode de la descente de gradient :\n   $$W := W - \\alpha \\frac{\\partial Loss}{\\partial W}$$\n\nOù $\\alpha$ désigne le taux d'apprentissage (_learning rate_).",
      },
      {
        id: 602,
        title: "Chapitre 2 : La classification par régression logistique et réseaux multicouches",
        type: "video",
        duration: "2h 30 min",
        completed: false,
      },
      {
        id: 6021,
        title: "Quiz : Descente de gradient et réseaux de neurones",
        type: "quiz",
        duration: "3 questions",
        completed: false,
      },
    ],
  },
];

export const seedQuizzes: Record<
  number,
  { question: string; options: string[]; answer: string; explanation: string }[]
> = {
  1012: [
    {
      question:
        "Quelle est la pire complexité temporelle pour le Tri Rapide (QuickSort) dans sa forme la plus standard ?",
      options: ["O(n log n)", "O(n)", "O(n²)", "O(2^n)"],
      answer: "O(n²)",
      explanation:
        "Si le pivot est choisi de manière constante de façon à découper le tableau à chaque fois en 0 et n-1 éléments (par exemple sur un tableau déjà trié), l'arbre de récursion a une hauteur n, d'où une complexité quadratique O(n²).",
    },
    {
      question: "Quel est l'espace mémoire nécessaire pour stocker un tableau dynamique de taille n ?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
      answer: "O(n)",
      explanation:
        "Chaque élément prend une place mémoire élémentaire. Pour n éléments, l'espace mémoire est directement proportionnel à n, soit la notation complexité linéaire O(n).",
    },
    {
      question: "La recherche dichotomique (Binary Search) suppose quel prérequis majeur sur le tableau ?",
      options: [
        "Que tous les éléments soient égaux",
        "Que le tableau soit déjà trié",
        "Que la taille soit impaire",
        "Que les éléments soient tous positifs",
      ],
      answer: "Que le tableau soit déjà trié",
      explanation:
        "La recherche dichotomique se base sur la division par 2 de l'index de recherche selon si l'élément central est plus petit ou plus grand que la cible. Cela n'est mathématiquement valide que si le tableau est pré-trié.",
    },
  ],
  202: [
    {
      question: "Laquelle de ces syntaxes permet d'éliminer les doublons de lignes dans un SELECT SQL ?",
      options: ["SELECT DISTINCT", "SELECT UNIQUE", "SELECT REMOVE_DUPLICATES", "SELECT GROUP BY ALL"],
      answer: "SELECT DISTINCT",
      explanation:
        "Le mot-clé standard ANSI SQL est 'SELECT DISTINCT'. Il supprime de l'affichage les doublons stricts basés sur les colonnes projetées.",
    },
    {
      question: "Quelle est la différence fondamentale entre les clauses WHERE et HAVING ?",
      options: [
        "WHERE trie, HAVING regroupe",
        "WHERE filtre les lignes individuelles avant regroupement, et HAVING filtre les groupes agrégés après GROUP BY",
        "WHERE s'utilise sur PostgreSQL, HAVING uniquement sur Oracle",
        "Il n'y a absolument aucune différence",
      ],
      answer:
        "WHERE filtre les lignes individuelles avant regroupement, et HAVING filtre les groupes agrégés après GROUP BY",
      explanation:
        "WHERE filtre les lignes en entrée du moteur de base de données. HAVING est appliqué comme filtre final sur les valeurs calculées d'agrégation (ex: COUNT, SUM) générées par la clause GROUP BY.",
    },
    {
      question:
        "Dans le modèle MERISE, une relation avec les cardinalités (1,1) d'un côté et (0,N) de l'autre engendre structurellement :",
      options: [
        "La création d'une table d'association pivot",
        "La migration de l'identifiant du côté (0,N) comme clé étrangère dans la table liée du côté (1,1)",
        "Une erreur de modélisation bloquante",
        "La fusion immédiate des deux tables",
      ],
      answer: "La migration de l'identifiant du côté (0,N) comme clé étrangère dans la table liée du côté (1,1)",
      explanation:
        "Puisque chaque entité du côté (1,1) n'a qu'un et un seul parent, on stocke la clé étrangère directement chez elle de manière à ce que l'intégrité de la liaison soit respectée sans nécessiter de table intermédiaire.",
    },
  ],
  303: [
    {
      question: "Quel est l'appel système en langage C qui permet de cloner un processus sous Unix/Linux ?",
      options: ["cloner()", "fork()", "exec()", "spawn()"],
      answer: "fork()",
      explanation:
        "L'appel système de bas niveau sous UNIX pour instancier un processus enfant est fork(). Il renvoie le PID de l'enfant au parent, et 0 à l'enfant.",
    },
    {
      question: "Quel mécanisme assure qu'un seul fil d'exécution (thread) n'exécute une section critique à la fois ?",
      options: ["Un bus PCI", "Un Mutex (Exclusion mutuelle)", "Un pointeur de fichier", "Une variable volatile"],
      answer: "Un Mutex (Exclusion mutuelle)",
      explanation:
        "Un verrou mutex de type pthread_mutex_t verrouille l'accès. Le premier thread arrivant obtient le verrou, les autres sont bloqués jusqu'à la libération.",
    },
    {
      question: "Que fait le planificateur (Scheduler) du noyau Linux ?",
      options: [
        "Il trie les fichiers texte par ordre alphabétique",
        "Il alloue le temps d'utilisation du CPU entre les différents processus prêts",
        "Il formate les disques en cas d'erreur",
        "Il gère la vitesse des ventilateurs",
      ],
      answer: "Il alloue le temps d'utilisation du CPU entre les différents processus prêts",
      explanation:
        "L'ordonnanceur (Scheduler) distribue de petites tranches de temps d'utilisation des cœurs processeur physique aux tâches prêtes de manière équitable et selon les priorités (nice levels).",
    },
  ],
  6021: [
    {
      question:
        "Dans la descente de gradient, que représente le paramètre de Learning Rate (ou taux d'apprentissage) ?",
      options: [
        "La vitesse de calcul matérielle de votre carte graphique GPU",
        "La taille du pas de correction appliqué aux poids à chaque itération",
        "Le nombre total d'images parcourues par seconde",
        "La précision finale attendue de l'intelligence artificielle",
      ],
      answer: "La taille du pas de correction appliqué aux poids à chaque itération",
      explanation:
        "Le learning rate (souvent noté alpha) définit l'amplitude du pas effectué dans le sens inverse du gradient de la fonction de coût. S'il est trop grand, l'algorithme diverge. S'il est trop petit, l'apprentissage prend un temps infini.",
    },
    {
      question: "Quelle fonction d'activation s'écrit mathématiquement f(x) = max(0, x) ?",
      options: ["Sigmoïde", "Tangente Hyperbolique (tanh)", "ReLU (Rectified Linear Unit)", "Softmax"],
      answer: "ReLU (Rectified Linear Unit)",
      explanation:
        "La fonction ReLU renvoie directement $x$ pour toute valeur positive, et 0 sinon. Cela permet d'introduire des non-linéarités tout en évitant le problème de disparition du gradient.",
    },
    {
      question: "Qu'est-ce qu'une époque (epoch) dans l'apprentissage automatique ?",
      options: [
        "La date historique de conception du modèle",
        "Un balayage complet de l'ensemble des données d'entraînement par l'algorithme",
        "Le temps d'exécution requis pour compiler le script",
        "La période d'évaluation d'un stagiaire de recherche",
      ],
      answer: "Un balayage complet de l'ensemble des données d'entraînement par l'algorithme",
      explanation:
        "Une époque désigne le fait que le réseau de neurones a vu et traité une fois l'intégralité du dataset d'entraînement lors de la propagation avant/arrière.",
    },
  ],
};

export const seedQuizModuleCourseMap: Record<number, number> = {};
for (const course of seedCourses) {
  for (const module of course.modules) {
    if (module.type === "quiz" && seedQuizzes[module.id]) {
      seedQuizModuleCourseMap[module.id] = course.id;
    }
  }
}

export const quizzes = seedQuizzes;

export async function seedDatabase() {
  if (shouldSkipStartupSeed()) {
    logDb("INFO", "Startup seed skipped", {
      nodeEnv: process.env.NODE_ENV || "development",
      runStartupSeed: process.env.RUN_STARTUP_SEED || "(unset)",
    });
    return;
  }

  for (const domain of ACADEMIC_DOMAINS) {
    await prisma.facultyDomain.upsert({
      where: { id: domain.id },
      update: {
        name: domain.name,
        slug: domain.slug,
        iconName: domain.iconName,
        color: domain.color,
        description: domain.description,
        order: domain.order,
      },
      create: {
        id: domain.id,
        name: domain.name,
        slug: domain.slug,
        iconName: domain.iconName,
        color: domain.color,
        description: domain.description,
        order: domain.order,
      },
    });
    for (const discipline of domain.disciplines) {
      await prisma.discipline.upsert({
        where: { id: discipline.id },
        update: {
          domainId: domain.id,
          name: discipline.name,
          slug: discipline.slug,
          order: discipline.order,
        },
        create: {
          id: discipline.id,
          domainId: domain.id,
          name: discipline.name,
          slug: discipline.slug,
          order: discipline.order,
        },
      });
    }
  }

  for (const course of seedCourses) {
    const disciplineId = course.disciplineId || getDisciplineIdForCourse(course);
    await prisma.course.upsert({
      where: { id: course.id },
      update: {
        title: course.title,
        level: course.level,
        credits: course.credits,
        duration: course.duration,
        category: course.category,
        disciplineId,
        iconName: course.iconName,
        color: course.color,
        instructor: course.instructor,
        description: course.description,
      },
      create: {
        id: course.id,
        title: course.title,
        level: course.level,
        credits: course.credits,
        duration: course.duration,
        category: course.category,
        disciplineId,
        price: course.price,
        iconName: course.iconName,
        color: course.color,
        instructor: course.instructor,
        description: course.description,
        progress: course.progress,
        isLiveNow: course.isLiveNow,
        liveSubject: course.liveSubject,
        modules: course.modules as unknown as Prisma.InputJsonValue,
      },
    });
  }

  for (const course of seedCourses) {
    for (const module of course.modules.filter((module) => module.type === "quiz")) {
      const questions = seedQuizzes[module.id];
      if (!questions?.length) continue;

      const existingQuiz = await prisma.quiz.findFirst({
        where: { courseId: course.id, moduleId: module.id },
        orderBy: { createdAt: "asc" },
      });
      const quiz = existingQuiz
        ? await prisma.quiz.update({ where: { id: existingQuiz.id }, data: { title: module.title } })
        : await prisma.quiz.create({
            data: {
              courseId: course.id,
              moduleId: module.id,
              title: module.title,
              published: true,
            },
          });
      await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
      await prisma.quizQuestion.createMany({
        data: questions.map((question, index) => ({
          quizId: quiz.id,
          question: question.question,
          options: question.options as unknown as Prisma.InputJsonValue,
          answer: question.answer,
          explanation: question.explanation,
          order: index,
        })),
      });
    }
  }

  const inviteCodes = parseProfessorInviteCodes(process.env.PROFESSOR_INVITE_CODES);
  for (const code of inviteCodes) {
    await prisma.professorInviteCode.upsert({
      where: { code },
      update: {},
      create: { code },
    });
  }

  const availableProfessorInviteCodes = await prisma.professorInviteCode.count({
    where: { usedAt: null, revokedAt: null },
  });

  const academicUsers = await prisma.user.findMany({
    where: { role: { in: ["PROFESSOR", "RESEARCHER", "ADMIN"] } },
    select: { id: true, role: true, levelOrTitle: true },
  });
  for (const user of academicUsers) {
    await ensureAcademicProfileForUser(prisma, user);
  }

  logDb("INFO", "Database seed synchronized", {
    courses: seedCourses.length,
    domains: ACADEMIC_DOMAINS.length,
    disciplines: ACADEMIC_DOMAINS.reduce((sum, domain) => sum + domain.disciplines.length, 0),
    professorInviteCodes: inviteCodes.length,
    availableProfessorInviteCodes,
    academicProfiles: academicUsers.length,
  });
}

export async function synchronizePostgresSequences() {
  const targetSchema = getActivePgSchema();
  const tables = await prisma.$queryRaw<Array<{ table_schema: string }>>`
    SELECT table_schema
    FROM information_schema.tables
    WHERE table_name = 'Course'
      AND table_schema = ${targetSchema}
      AND table_type = 'BASE TABLE'
    LIMIT 1
  `;
  const tableSchema = tables[0]?.table_schema;
  if (!tableSchema) {
    logDb("WARN", "Course table not found while synchronizing PostgreSQL sequences");
    return;
  }
  const quotedSchema = `"${tableSchema.replace(/"/g, '""')}"`;
  const qualifiedCourseTable = `${quotedSchema}."Course"`;
  const sequenceLookup = qualifiedCourseTable.replace(/'/g, "''");
  const result = await prisma.$queryRawUnsafe<Array<{ last_value: bigint | number }>>(
    `SELECT setval(pg_get_serial_sequence('${sequenceLookup}', 'id'), COALESCE((SELECT MAX("id") FROM ${qualifiedCourseTable}), 1), true) AS last_value`,
  );
  logDb("INFO", "PostgreSQL sequences synchronized", { courseIdSequence: String(result[0]?.last_value || "") });
}
