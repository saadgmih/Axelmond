// ─── Cache HTTP conditionnel pour les réponses publiques ───────────────────
//
// Les réponses /api sont globalement marquées no-store (create-app.ts) car
// la plupart transportent des données authentifiées. Les GET catalogue
// publics (anonymes) peuvent en revanche être mis en cache par le navigateur
// et le CDN : ETag fort + If-None-Match → 304 sans corps.

import { createHash } from "node:crypto";
import type { Request, Response } from "express";

export function computeEtag(body: string): string {
  return `"${createHash("sha1").update(body, "utf8").digest("base64url")}"`;
}

export interface PublicCacheOptions {
  /** Durée pendant laquelle la réponse peut être servie depuis le cache sans revalidation. */
  maxAgeSeconds?: number;
  /** Durée supplémentaire pendant laquelle une réponse périmée peut être servie pendant la revalidation. */
  staleWhileRevalidateSeconds?: number;
}

/**
 * Envoie un payload JSON public avec ETag + Cache-Control et répond 304
 * si le client présente un If-None-Match correspondant.
 */
export function sendPublicJsonWithEtag(req: Request, res: Response, body: string, options?: PublicCacheOptions): void {
  const etag = computeEtag(body);
  const maxAge = options?.maxAgeSeconds ?? 30;
  const staleWhileRevalidate = options?.staleWhileRevalidateSeconds ?? 60;

  const ifNoneMatch = req.headers["if-none-match"];
  if (typeof ifNoneMatch === "string" && ifNoneMatch.trim() === etag) {
    res.status(304).end();
    return;
  }

  res.setHeader("ETag", etag);
  res.setHeader("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(body);
}
