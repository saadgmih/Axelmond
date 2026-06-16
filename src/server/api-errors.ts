import { Prisma } from "@prisma/client";

export function apiErrorStatus(err: any): number {
  const dbUnavailableCodes = new Set(["P1000", "P1001", "P1002", "P1003", "P1008", "P1017", "P2021", "P2022"]);
  if (dbUnavailableCodes.has(err?.code)) return 503;
  if (err?.code === "P2002") return 409;
  if (err?.code === "P2025") return 404;
  if (err instanceof Prisma.PrismaClientValidationError) return 400;
  return Number.isInteger(err?.status) ? err.status : 500;
}

export function apiErrorMessage(err: any): string {
  const dbUnavailableCodes = new Set(["P1000", "P1001", "P1002", "P1003", "P1008", "P1017", "P2021", "P2022"]);
  if (dbUnavailableCodes.has(err?.code)) {
    return "Service temporairement indisponible. Réessayez dans quelques minutes.";
  }
  if (err?.code === "P2002") return "Cette action entre en conflit avec une donnée existante";
  if (err?.code === "P2025") return "Ressource introuvable";
  if (err instanceof Prisma.PrismaClientValidationError) return "Requête invalide";

  const status = apiErrorStatus(err);
  if (status >= 500) {
    return "Une erreur interne est survenue";
  }
  return err?.message || "Erreur serveur";
}
