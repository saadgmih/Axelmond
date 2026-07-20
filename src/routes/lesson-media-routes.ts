import type { Express } from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  createLessonMediaTicket,
  LESSON_MEDIA_TICKET_TTL_SECONDS,
  verifyLessonMediaTicket,
} from "../lesson-media-ticket";
import type { RouteContext } from "../server/route-context";
import * as api from "../server/route-deps";
import { getAuthUser } from "../server/route-types";

const LESSON_MEDIA_COOKIE_NAME = "lesson_media";

export function registerLessonMediaRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth } = ctx.middleware;

  app.get("/api/lesson-contents/:contentId/media-source", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);
    try {
      const result = await api.resolveLessonContentMediaSource(req.params.contentId, authUser);
      res.setHeader("Cache-Control", "private, no-store");
      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      const proxySourceUrl = `/api/lesson-contents/${encodeURIComponent(req.params.contentId)}/media`;
      res.cookie(
        LESSON_MEDIA_COOKIE_NAME,
        createLessonMediaTicket({ contentId: req.params.contentId, userId: authUser.id }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: proxySourceUrl,
          maxAge: LESSON_MEDIA_TICKET_TTL_SECONDS * 1000,
        },
      );
      res.json({
        sourceUrl: result.sourceUrl,
        proxySourceUrl,
        mimeType: result.mimeType,
        brandedIntroDuration: result.brandedIntroDuration,
      });
    } catch (err) {
      api.logDb("ERROR", "Lesson media source resolution failed", {
        contentId: req.params.contentId,
        userId: authUser.id,
        error: String(err),
      });
      res.status(502).json({ error: "Impossible de charger la vidéo" });
    }
  });

  app.get("/api/lesson-contents/:contentId/media", async (req, res) => {
    const ticket = req.cookies?.[LESSON_MEDIA_COOKIE_NAME];
    if (!verifyLessonMediaTicket(ticket, req.params.contentId)) {
      res.status(401).json({ error: "Accès vidéo expiré" });
      return;
    }

    try {
      const result = await api.streamLessonContentVideo(req.params.contentId, req.headers.range);
      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      res.status(result.status);
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Accept-Ranges", result.acceptRanges);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Vary", "Cookie, Range");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Accel-Buffering", "no");
      if (result.contentLength) res.setHeader("Content-Length", result.contentLength);
      if (result.contentRange) res.setHeader("Content-Range", result.contentRange);
      if (result.etag) res.setHeader("ETag", result.etag);
      if (result.lastModified) res.setHeader("Last-Modified", result.lastModified);

      await pipeline(Readable.fromWeb(result.body as never), res);
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
      if (res.destroyed || code === "ERR_STREAM_PREMATURE_CLOSE" || code === "ECONNRESET") return;
      api.logDb("ERROR", "Lesson media relay failed", {
        contentId: req.params.contentId,
        error: String(err),
      });
      if (!res.headersSent) res.status(502).json({ error: "Impossible de relayer la vidéo" });
      else res.destroy();
    }
  });
}
