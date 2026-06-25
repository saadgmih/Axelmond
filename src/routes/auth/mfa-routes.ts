import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { RouteContext } from "../../server/route-context";
import type { AppUser } from "../../server/route-types";
import * as api from "../../server/route-deps";
import { issueAuthenticatedSession } from "../../auth-session";
import { clearEmailLoginLockout } from "../../auth-login-lockout";
import { createSecurityChallenge, consumeSecurityChallenge } from "../../mfa-challenge";
import { encryptMfaSecret, decryptMfaSecret } from "../../mfa-crypto";
import { signMfaPendingToken, verifyMfaPendingToken } from "../../mfa-pending-token";
import { strongPasswordField } from "../../password-policy";
import {
  buildTotpQrDataUrl,
  disableTotpForUser,
  enableTotpForUser,
  generateTotpSecret,
  getUserMfaStatus,
  userHasPasskeys,
  verifyTotpCode,
  verifyUserTotp,
} from "../../mfa-totp";
import {
  beginWebAuthnLogin,
  beginWebAuthnRegistration,
  deleteWebAuthnCredential,
  finishWebAuthnLogin,
  finishWebAuthnRegistration,
  listWebAuthnCredentials,
} from "../../mfa-webauthn";

const totpVerifyLoginSchema = z.object({
  mfaToken: z.string().min(10),
  code: z.string().min(6).max(16),
});

const totpEnableSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().length(6),
});

const totpDisableSchema = z.object({
  password: strongPasswordField,
  code: z.string().min(6).max(16),
});

const passkeyRegisterVerifySchema = z.object({
  challengeId: z.string().uuid(),
  response: z.record(z.string(), z.unknown()),
  deviceName: z.string().max(120).optional(),
});

const passkeyLoginOptionsSchema = z.object({
  email: z.string().email().optional(),
});

const passkeyLoginVerifySchema = z.object({
  challengeId: z.string().uuid(),
  response: z.record(z.string(), z.unknown()),
  role: z.enum(["STUDENT", "PROFESSOR"]).optional(),
});

const passkeyDeleteSchema = z.object({
  password: strongPasswordField,
});

async function loadAuthUser(req: Request): Promise<AppUser | null> {
  return (req as Request & { authUser?: AppUser }).authUser ?? null;
}

async function verifyPassword(userId: string, password: string): Promise<boolean> {
  const user = await api.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) return false;
  return api.bcrypt.compare(password, user.passwordHash);
}

export function registerMfaRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, validateBody } = ctx.middleware;

  app.get("/api/auth/mfa/status", requireAuth, async (req, res) => {
    const authUser = await loadAuthUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    const status = await getUserMfaStatus(authUser.id);
    const passkeys = await listWebAuthnCredentials(authUser.id);
    res.json({ ...status, passkeys });
  });

  app.post("/api/auth/mfa/totp/setup", requireAuth, async (req, res) => {
    const authUser = await loadAuthUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    const status = await getUserMfaStatus(authUser.id);
    if (status.totpEnabled) {
      res.status(409).json({ error: "L'authentification TOTP est déjà activée." });
      return;
    }

    const secret = generateTotpSecret();
    const challengeId = await createSecurityChallenge({
      userId: authUser.id,
      kind: "TOTP_SETUP",
      payload: { secretEnc: encryptMfaSecret(secret) },
    });
    const qrDataUrl = await buildTotpQrDataUrl(authUser.email, secret);

    res.json({
      challengeId,
      qrDataUrl,
      manualEntryKey: secret,
      issuer: "Performance Académique",
    });
  });

  app.post("/api/auth/mfa/totp/enable", requireAuth, validateBody(totpEnableSchema), async (req, res) => {
    const authUser = await loadAuthUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const stored = await consumeSecurityChallenge<{ secretEnc: string }>(req.body.challengeId, "TOTP_SETUP");
    if (!stored?.secretEnc) {
      res.status(400).json({ error: "Configuration TOTP expirée. Recommencez l'activation." });
      return;
    }

    const secret = decryptMfaSecret(stored.secretEnc);
    if (!verifyTotpCode(secret, req.body.code)) {
      res.status(400).json({ error: "Code authenticator invalide." });
      return;
    }

    const recoveryCodes = await enableTotpForUser(authUser.id, secret);
    await api.revokeAllUserSessions(authUser.id);
    api.logAudit(authUser.id, authUser.email, "MFA_TOTP_ENABLED", "User", authUser.id, {}, req.ip);

    res.json({
      ok: true,
      recoveryCodes,
      message: "Authentification à deux facteurs activée. Conservez vos codes de secours.",
    });
  });

  app.post("/api/auth/mfa/totp/disable", requireAuth, validateBody(totpDisableSchema), async (req, res) => {
    const authUser = await loadAuthUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const validPassword = await verifyPassword(authUser.id, req.body.password);
    if (!validPassword) {
      res.status(401).json({ error: "Mot de passe incorrect." });
      return;
    }

    const validTotp = await verifyUserTotp(authUser.id, req.body.code);
    if (!validTotp) {
      res.status(401).json({ error: "Code authenticator invalide." });
      return;
    }

    await disableTotpForUser(authUser.id);
    await api.revokeAllUserSessions(authUser.id);
    api.logAudit(authUser.id, authUser.email, "MFA_TOTP_DISABLED", "User", authUser.id, {}, req.ip);
    res.json({ ok: true, message: "Authentification TOTP désactivée." });
  });

  app.post("/api/auth/mfa/totp/verify", validateBody(totpVerifyLoginSchema), async (req, res) => {
    const claims = verifyMfaPendingToken(req.body.mfaToken);
    if (!claims) {
      res.status(401).json({ error: "Session MFA expirée. Reconnectez-vous.", code: "MFA_TOKEN_INVALID" });
      return;
    }

    const valid = await verifyUserTotp(claims.userId, req.body.code);
    if (!valid) {
      api.logSecurity("WARN", "MFA TOTP verification failed", { userId: claims.userId });
      res.status(401).json({ error: "Code authenticator invalide.", code: "MFA_CODE_INVALID" });
      return;
    }

    const user = await api.prisma.user.findUnique({
      where: { id: claims.userId },
      include: api.APP_USER_BILLING_INCLUDE,
    });
    if (!user?.emailVerified) {
      res.status(403).json({ error: "Compte non vérifié." });
      return;
    }

    const body = await issueAuthenticatedSession(req, res, api, user, "User logged in with TOTP MFA");
    res.json(body);
  });

  app.post("/api/auth/mfa/passkey/register/options", requireAuth, async (req, res) => {
    const authUser = await loadAuthUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const deviceName = typeof req.body?.deviceName === "string" ? req.body.deviceName : undefined;
    const result = await beginWebAuthnRegistration(authUser.id, authUser.email, deviceName);
    res.json(result);
  });

  app.post(
    "/api/auth/mfa/passkey/register/verify",
    requireAuth,
    validateBody(passkeyRegisterVerifySchema),
    async (req, res) => {
      const authUser = await loadAuthUser(req);
      if (!authUser) {
        res.status(401).json({ error: "Non authentifié" });
        return;
      }

      const result = await finishWebAuthnRegistration(
        authUser.id,
        req.body.challengeId,
        req.body.response as any,
        req.body.deviceName,
      );

      if (!result.ok) {
        res.status(400).json({ error: "Enregistrement Passkey refusé.", code: result.reason });
        return;
      }

      api.logAudit(authUser.id, authUser.email, "WEBAUTHN_REGISTERED", "User", authUser.id, {}, req.ip);
      res.json({ ok: true, message: "Passkey enregistrée." });
    },
  );

  app.delete("/api/auth/mfa/passkeys/:id", requireAuth, validateBody(passkeyDeleteSchema), async (req, res) => {
    const authUser = await loadAuthUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const validPassword = await verifyPassword(authUser.id, req.body.password);
    if (!validPassword) {
      res.status(401).json({ error: "Mot de passe incorrect." });
      return;
    }

    const deleted = await deleteWebAuthnCredential(authUser.id, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Passkey introuvable." });
      return;
    }

    api.logAudit(
      authUser.id,
      authUser.email,
      "WEBAUTHN_REMOVED",
      "User",
      authUser.id,
      { credentialId: req.params.id },
      req.ip,
    );
    res.json({ ok: true });
  });

  app.post("/api/auth/mfa/passkey/login/options", validateBody(passkeyLoginOptionsSchema), async (req, res) => {
    const result = await beginWebAuthnLogin({ email: req.body.email });
    if (!result.ok) {
      res.status(400).json({ error: "Aucune Passkey disponible pour ce compte.", code: result.reason });
      return;
    }
    res.json({ options: result.options, challengeId: result.challengeId });
  });

  app.post("/api/auth/mfa/passkey/login/verify", validateBody(passkeyLoginVerifySchema), async (req, res) => {
    const result = await finishWebAuthnLogin(req.body.challengeId, req.body.response as any);
    if (!result.ok || !result.user) {
      api.logSecurity("WARN", "Passkey login failed", { reason: result.reason });
      res.status(401).json({ error: "Connexion Passkey refusée.", code: result.reason });
      return;
    }

    const requestedRole = req.body.role ? api.normalizeRole(req.body.role) : null;
    if (requestedRole && !api.canLoginToRequestedRole(result.user.role, requestedRole)) {
      res.status(403).json({ error: "Ce compte n'est pas autorisé dans cet espace" });
      return;
    }

    clearEmailLoginLockout(result.user.email);
    await api.prisma.user.update({
      where: { id: result.user.id },
      data: { failedLoginAttempts: 0, lockoutUntil: null },
    });

    const body = await issueAuthenticatedSession(req, res, api, result.user, "User logged in with passkey");
    res.json(body);
  });
}

export async function maybeRequireTotpAfterPassword(
  user: { id: string; email: string; totpEnabled?: boolean },
  res: Response,
): Promise<boolean> {
  if (!user.totpEnabled) return false;

  const passkeysAvailable = await userHasPasskeys(user.id);
  const mfaToken = signMfaPendingToken(user.id);

  res.json({
    mfaRequired: true,
    mfaToken,
    methods: ["totp"],
    passkeysAvailable,
    email: user.email,
  });
  return true;
}
