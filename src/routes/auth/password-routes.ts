import type { Express } from "express";
import type { RouteContext } from "../../server/route-context";
import * as api from "../../server/route-deps";

export function registerPasswordRoutes(app: Express, ctx: RouteContext): void {
  const { validateBody } = ctx.middleware;

  // POST /api/auth/forgot-password

  app.post("/api/auth/forgot-password", validateBody(api.forgotPasswordSchema), async (req, res) => {
    const { email } = req.body;

    const user = await api.prisma.user.findUnique({ where: { email } });

    if (!user) {
      api.logEmail("WARN", "Password reset requested for unknown email", { emailDomain: api.getEmailDomain(email) });

      res.json({ message: api.PASSWORD_RESET_GENERIC_MESSAGE });

      return;
    }

    const code = api.generateEmailVerificationCode();

    if (api.isDevVerificationCodeLogEnabled()) {
      console.log(`[DEV] Code de réinitialisation envoyé à ${api.maskEmailForDevLog(user.email)} (userId=${user.id})`);
    }

    await api.createEmailVerificationCode(api.prisma, user.id, code, "PASSWORD_RESET");

    try {
      const delivery = await api.sendVerificationEmail({
        to: user.email,

        fullName: user.fullName,

        code,

        expiresInMinutes: api.EMAIL_VERIFICATION_TTL_MINUTES,
      });

      api.logEmail(
        delivery.sent ? "INFO" : "WARN",
        delivery.sent ? "Reset password email code sent" : "SMTP not configured for reset password email",
        {
          userId: user.id,

          emailDomain: api.getEmailDomain(user.email),

          delivery: delivery.sent ? delivery.delivery : undefined,
        },
      );

      if (delivery.sent && delivery.delivery) {
        await api.recordEmailDeliveryLog("reset_password", user.id, user.email, delivery.delivery);
      } else if (!delivery.sent) {
        await api.recordEmailDeliveryLog(
          "reset_password",
          user.id,
          user.email,
          api.buildFailedEmailDelivery(user.email, delivery.reason || "SMTP_NOT_CONFIGURED"),
        );
      }

      await api.logAudit(
        user.id,

        user.email,

        "FORGOT_PASSWORD_REQUEST",

        "USER",

        user.id,

        { sent: delivery.sent },

        req.ip,
      );

      res.json({ message: api.PASSWORD_RESET_GENERIC_MESSAGE });
    } catch (err) {
      api.logEmail("ERROR", "Failed to send reset password code email", {
        userId: user.id,
        error: api.getEmailErrorDetails(err),
      });

      res.status(500).json({ error: "Une erreur est survenue lors de l'envoi de l'e-mail." });
    }
  });

  // POST /api/auth/reset-password

  app.post("/api/auth/reset-password", validateBody(api.resetPasswordSchema), async (req, res) => {
    const { email, code, newPassword } = req.body;

    const user = await api.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      api.logEmail("WARN", "Password reset submitted for unknown email", { emailDomain: api.getEmailDomain(email) });

      res.status(400).json({ error: "Code de réinitialisation invalide ou expiré." });

      return;
    }

    const verification = await api.prisma.emailVerificationCode.findFirst({
      where: { userId: user.id, purpose: "PASSWORD_RESET", usedAt: null },

      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      res.status(400).json({ error: "Aucun code de réinitialisation actif. Veuillez faire une nouvelle demande." });

      return;
    }

    if (!api.canAttemptEmailVerification(verification.attempts)) {
      api.logEmail("WARN", "Reset password attempts exceeded", { userId: user.id });

      res.status(429).json({ error: "Nombre maximal de tentatives atteint. Demandez un nouveau code." });

      return;
    }

    if (api.isEmailVerificationExpired(verification.expiresAt)) {
      await api.prisma.emailVerificationCode.update({
        where: { id: verification.id },

        data: { attempts: { increment: 1 }, usedAt: new Date() },
      });

      api.logEmail("WARN", "Expired reset password code rejected", { userId: user.id });

      res.status(400).json({ error: "Code expiré" });

      return;
    }

    const codeHash = api.hashEmailVerificationCode(code);

    if (codeHash !== verification.codeHash) {
      const attempts = verification.attempts + 1;

      await api.prisma.emailVerificationCode.update({
        where: { id: verification.id },

        data: { attempts },
      });

      api.logEmail("WARN", "Invalid reset password code rejected", { userId: user.id, attempts });

      res.status(attempts >= api.EMAIL_VERIFICATION_MAX_ATTEMPTS ? 429 : 400).json({
        error:
          attempts >= api.EMAIL_VERIFICATION_MAX_ATTEMPTS
            ? "Nombre maximal de tentatives atteint. Demandez un nouveau code."
            : "Code de vérification incorrect",
      });

      return;
    }

    const passwordHash = await api.bcrypt.hash(newPassword, 10);

    await api.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.update({
        where: { id: verification.id },

        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: user.id },

        data: {
          passwordHash,

          failedLoginAttempts: 0,

          lockoutUntil: null,
        },
      });
    });

    await api.revokeAllUserSessions(user.id);

    await api.logAudit(
      user.id,

      user.email,

      "RESET_PASSWORD_SUCCESS",

      "USER",

      user.id,

      {},

      req.ip,
    );

    res.json({ message: "Votre mot de passe a été réinitialisé avec succès." });
  });
}
