import { Prisma } from "@prisma/client";

/** Accès sûr aux champs d'erreur hétérogènes (Prisma, HTTP, génériques). */
function errorFields(err: unknown): { code?: string; status?: number; message?: string } {
  if (err instanceof Prisma.PrismaClientValidationError) return { message: err.message };
  if (typeof err === "object" && err !== null) {
    const { code, status, message } = err as { code?: unknown; status?: unknown; message?: unknown };
    return {
      code: typeof code === "string" ? code : undefined,
      status: Number.isInteger(status) ? (status as number) : undefined,
      message: typeof message === "string" ? message : undefined,
    };
  }
  return {};
}

export function apiErrorStatus(err: unknown): number {
  const dbUnavailableCodes = new Set(["P1000", "P1001", "P1002", "P1003", "P1008", "P1017", "P2021", "P2022"]);
  const { code, status } = errorFields(err);
  if (dbUnavailableCodes.has(code)) return 503;
  if (code === "P2002") return 409;
  if (code === "P2025") return 404;
  if (err instanceof Prisma.PrismaClientValidationError) return 400;
  return Number.isInteger(status) ? status : 500;
}

export function apiErrorMessage(err: unknown): string {
  const dbUnavailableCodes = new Set(["P1000", "P1001", "P1002", "P1003", "P1008", "P1017", "P2021", "P2022"]);
  const { code, status, message } = errorFields(err);
  if (dbUnavailableCodes.has(code)) {
    return "Service temporairement indisponible. Réessayez dans quelques minutes.";
  }
  if (code === "P2002") return "Cette action entre en conflit avec une donnée existante";
  if (code === "P2025") return "Ressource introuvable";
  if (err instanceof Prisma.PrismaClientValidationError) return "Requête invalide";

  if (apiErrorStatus(err) >= 500) {
    return "Une erreur interne est survenue";
  }
  return message || "Erreur serveur";
}
