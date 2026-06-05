import assert from "node:assert/strict";
import { ACADEMIC_DOMAINS, getDisciplineIdForCourse } from "../src/academic-taxonomy";

assert.equal(ACADEMIC_DOMAINS.length, 10);

const domains = new Map(ACADEMIC_DOMAINS.map((domain) => [domain.name, domain]));

assert.deepEqual(
  domains.get("Mathématiques")?.disciplines.map((discipline) => discipline.name),
  ["Algèbre", "Analyse", "Probabilités et Statistiques", "Géométrie", "Mathématiques Appliquées"],
);
assert.deepEqual(
  domains.get("Informatique et Intelligence Artificielle")?.disciplines.map((discipline) => discipline.name),
  ["Programmation", "Développement Web", "Bases de Données", "Cybersécurité", "Intelligence Artificielle", "Machine Learning", "Data Science"],
);
assert.deepEqual(
  domains.get("Recherche et Innovation")?.disciplines.map((discipline) => discipline.name),
  ["Publications", "Projets de Recherche", "Laboratoires", "Conférences", "Innovation"],
);

assert.equal(
  getDisciplineIdForCourse({ title: "Algorithmique et Structures de Données", category: "Programmation" }),
  601,
);
assert.equal(
  getDisciplineIdForCourse({ title: "Bases de Données Relationnelles (SQL)", category: "Données" }),
  603,
);
assert.equal(
  getDisciplineIdForCourse({ title: "Intelligence Artificielle & Machine Learning", category: "IA" }),
  606,
);

console.log("Academic taxonomy rules passed");
