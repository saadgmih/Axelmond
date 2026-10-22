import { Prisma } from "@prisma/client";

/** Accès sûr aux champs d'erreur hétérogènes (Prisma, HTTP, génériques). */
function errorFields(err: unknown): { code?: string; status?: number; message?: string } {
  if (err instanceof Prisma.PrismaClientValidationError) return { message: err.message };
  if (typeof err === "object" && err !== null) {
    const obj = err as {
      code?: unknown;
      status?: unknown;
      message?: unknown;
      cause?: { code?: unknown; originalCode?: unknown; message?: unknown };
    };
    const code =
      typeof obj.code === "string"
        ? obj.code
        : typeof obj.cause?.code === "string"
          ? obj.cause.code
          : typeof obj.cause?.originalCode === "string"
            ? obj.cause.originalCode
            : undefined;
    const message =
      typeof obj.message === "string"
        ? obj.message
        : typeof obj.cause?.message === "string"
          ? obj.cause.message
          : undefined;
    return {
      code,
      status: Number.isInteger(obj.status) ? (obj.status as number) : undefined,
      message,
    };
  }
  return {};
}

const DB_UNAVAILABLE_CODES = new Set(["P1000", "P1001", "P1002", "P1003", "P1008", "P1017", "P2021", "P2022", "53000"]);

export function apiErrorStatus(err: unknown): number {
  const { code, status, message } = errorFields(err);
  if ((code && DB_UNAVAILABLE_CODES.has(code)) || (message && message.includes("quota"))) return 503;
  if (code === "P2002") return 409;
  if (code === "P2025") return 404;
  if (err instanceof Prisma.PrismaClientValidationError) return 400;
  return typeof status === "number" && Number.isInteger(status) ? status : 500;
}

export function apiErrorMessage(err: unknown): string {
  const { code, message } = errorFields(err);
  if ((code && DB_UNAVAILABLE_CODES.has(code)) || (message && message.includes("quota"))) {
    return "Service temporairement indisponible (base de données inaccessible ou quota atteint). Réessayez dans quelques minutes.";
  }
  if (code === "P2002") return "Cette action entre en conflit avec une donnée existante";
  if (code === "P2025") return "Ressource introuvable";
  if (err instanceof Prisma.PrismaClientValidationError) return "Requête invalide";

  if (apiErrorStatus(err) >= 500) {
    return "Une erreur interne est survenue";
  }
  return message || "Erreur serveur";
}
