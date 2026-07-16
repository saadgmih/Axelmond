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
      api.clearAuthCookies(res);
      res.status(401).json({ error: api.PUBLIC_API_ERRORS.refreshTokenRequired, code: "REFRESH_TOKEN_REQUIRED" });

      return;
    }

    const storedToken = await api.findRefreshTokenRecord(refreshToken);

    if (!storedToken) {
      api.logSecurity("WARN", "Invalid refresh token attempt", { ip: req.ip });
      api.clearAuthCookies(res);

      res.status(401).json({ error: api.PUBLIC_API_ERRORS.refreshTokenInvalid, code: "REFRESH_TOKEN_INVALID" });

      return;
    }

    if (storedToken.revokedAt) {
      await api.revokeAllUserSessions(storedToken.userId);

      api.logSecurity("ERROR", "Refresh token reuse detected — all sessions revoked", {
        userId: storedToken.userId,
        ip: req.ip,
      });
      api.clearAuthCookies(res);

      res.status(401).json({ error: "Session compromise détectée. Reconnectez-vous.", code: "REFRESH_TOKEN_REVOKED" });

      return;
    }

    if (storedToken.expiresAt < new Date()) {
      api.clearAuthCookies(res);
      res.status(401).json({ error: api.PUBLIC_API_ERRORS.refreshTokenInvalid, code: "REFRESH_TOKEN_EXPIRED" });

      return;
    }

    const safeUser = api.toAppUser(storedToken.user);

    if (!safeUser.emailVerified) {
      res.status(403).json({
        error: "Veuillez vérifier votre e-mail avant d'accéder à l'application",
        code: "EMAIL_NOT_VERIFIED",
      });

      return;
    }

    const csrfToken = api.generateCsrfToken();
    const rotation = await api.rotateRefreshToken(storedToken.id, safeUser.id, csrfToken).catch(() => null);

    if (!rotation) {
      api.clearAuthCookies(res);
      res.status(401).json({ error: api.PUBLIC_API_ERRORS.refreshTokenReused, code: "REFRESH_TOKEN_REUSED" });

      return;
    }

    const token = api.signAuthToken({
      id: safeUser.id,
      role: safeUser.role,
      authTokenVersion: rotation.authTokenVersion,
    });

    const newRefreshToken = rotation.token;
    api.setAuthCookies(res, newRefreshToken, csrfToken);
    api.invalidateAuthUserCache(safeUser.id);

    api.logSecurity("INFO", "Session token refreshed", { userId: safeUser.id, role: safeUser.role });

    res.json(api.withMobileRefreshToken(req, { ...safeUser, token, csrfToken }, newRefreshToken));
  });

  // POST /api/auth/logout

  app.post("/api/auth/logout", async (req, res) => {
    const refreshToken = api.readRefreshTokenFromRequest(req);

    if (refreshToken) {
      const userId = await api.logoutRefreshSession(refreshToken);
      if (userId) {
        api.invalidateAuthUserCache(userId);
        api.logSecurity("INFO", "User logged out — access tokens invalidated", { userId });
      }
    }

    api.clearAuthCookies(res);

    res.json({ ok: true });
  });

  // POST /api/auth/sessions/revoke-all

  app.post("/api/auth/sessions/revoke-all", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);

    await api.revokeAllUserSessions(authUser.id);
    api.clearAuthCookies(res);
    api.logSecurity("INFO", "All user sessions revoked", { userId: authUser.id });

    res.json({ ok: true });
  });

  // GET /api/auth/me

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const authUser = getAuthUser(req);

    res.json(authUser);
  });
}
