import type { Express } from "express";
import type { RouteContext } from "../../server/route-context";
import { getAuthUser } from "../../server/route-types";
import * as api from "../../server/route-deps";

export function registerSessionRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth } = ctx.middleware;

  // POST /api/auth/refresh

  app.post("/api/auth/refresh", async (req, res) => {
    const refreshToken = api.readRefreshTokenFromRequest(req);

    if (!refreshToken) {
      res.status(401).json({ error: api.PUBLIC_API_ERRORS.refreshTokenRequired });

      return;
    }

    const storedToken = await api.findValidRefreshToken(refreshToken);

    if (!storedToken) {
      api.logSecurity("WARN", "Invalid refresh token attempt", { ip: req.ip });

      res.status(401).json({ error: api.PUBLIC_API_ERRORS.refreshTokenInvalid });

      return;
    }

    if (storedToken.revokedAt) {
      await api.revokeAllUserRefreshTokens(storedToken.userId);

      api.logSecurity("ERROR", "Refresh token reuse detected — all sessions revoked", {
        userId: storedToken.userId,
        ip: req.ip,
      });

      res.status(401).json({ error: "Session compromise détectée. Reconnectez-vous." });

      return;
    }

    if (storedToken.expiresAt < new Date()) {
      res.status(401).json({ error: api.PUBLIC_API_ERRORS.refreshTokenInvalid });

      return;
    }

    const safeUser = api.toAppUser(storedToken.user);

    if (!safeUser.emailVerified) {
      res.status(403).json({ error: "Veuillez vérifier votre e-mail avant d'accéder à l'application" });

      return;
    }

    const newRefreshToken = await api.rotateRefreshToken(storedToken.id, safeUser.id).catch(() => null);

    if (!newRefreshToken) {
      res.status(401).json({ error: api.PUBLIC_API_ERRORS.refreshTokenReused });

      return;
    }

    const token = api.signAuthToken(safeUser);

    const csrfToken = api.setAuthCookies(res, newRefreshToken);

    await api.persistCsrfTokenForRefreshSession(newRefreshToken, csrfToken);

    api.logSecurity("INFO", "Session token refreshed", { userId: safeUser.id, role: safeUser.role });

    res.json(api.withMobileRefreshToken(req, { token, csrfToken }, newRefreshToken));
  });

  // POST /api/auth/logout

  app.post("/api/auth/logout", async (req, res) => {
    const refreshToken = api.readRefreshTokenFromRequest(req);

    if (refreshToken) {
      await api.revokeRefreshToken(refreshToken);
    }

    api.clearAuthCookies(res);

    res.json({ ok: true });
  });

  // GET /api/auth/me

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const authUser = getAuthUser(req);

    res.json(authUser);
  });
}
