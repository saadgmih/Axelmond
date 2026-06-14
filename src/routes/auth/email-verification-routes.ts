import type { Express } from "express";
import type { RouteContext } from "../../server/route-context";
import * as api from "../../server/route-deps";

export function registerEmailVerificationRoutes(app: Express, ctx: RouteContext): void {
  const { validateBody } = ctx.middleware;

  // POST /api/auth/verify-email

  app.post("/api/auth/verify-email", validateBody(api.verifyEmailSchema), async (req, res) => {
    const { email, code } = req.body;

    const user = await api.prisma.user.findUnique({
      where: { email },

      include: api.APP_USER_BILLING_INCLUDE,
    });

    if (!user) {
      res.status(400).json({ error: api.PUBLIC_API_ERRORS.emailVerificationFailed });

      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: api.PUBLIC_API_ERRORS.emailVerificationFailed });

      return;
    }

    const verification = await api.prisma.emailVerificationCode.findFirst({
      where: { userId: user.id, usedAt: null },

      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      res.status(400).json({ error: api.PUBLIC_API_ERRORS.emailVerificationFailed });

      return;
    }

    if (!api.canAttemptEmailVerification(verification.attempts)) {
      api.logEmail("WARN", "Verification attempts exceeded", { userId: user.id });

      res.status(429).json({ error: "Nombre maximal de tentatives atteint. Demandez un nouveau code." });

      return;
    }

    if (api.isEmailVerificationExpired(verification.expiresAt)) {
      await api.prisma.emailVerificationCode.update({
        where: { id: verification.id },

        data: { attempts: { increment: 1 }, usedAt: new Date() },
      });

      api.logEmail("WARN", "Expired verification code rejected", { userId: user.id });

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

      api.logEmail("WARN", "Invalid verification code rejected", { userId: user.id, attempts });

      res.status(attempts >= api.EMAIL_VERIFICATION_MAX_ATTEMPTS ? 429 : 400).json({
        error:
          attempts >= api.EMAIL_VERIFICATION_MAX_ATTEMPTS
            ? "Nombre maximal de tentatives atteint. Demandez un nouveau code."
            : api.PUBLIC_API_ERRORS.emailVerificationFailed,
      });

      return;
    }

    const verifiedUser = await api.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.update({
        where: { id: verification.id },

        data: { usedAt: new Date() },
      });

      return tx.user.update({
        where: { id: user.id },

        data: { emailVerified: true },

        include: api.APP_USER_BILLING_INCLUDE,
      });
    });

    const safeUser = api.toAppUser(verifiedUser);

    const newRefreshToken = await api.createRefreshToken(safeUser.id);

    const csrfToken = api.setAuthCookies(res, newRefreshToken);

    api.logEmail("INFO", "Email verified", { userId: safeUser.id, role: safeUser.role });

    res.json(
      api.withMobileRefreshToken(
        req,
        { ...safeUser, token: api.signAuthToken(safeUser), csrfToken, message: "E-mail vérifié avec succès" },
        newRefreshToken,
      ),
    );
  });

  // POST /api/auth/resend-verification-code

  app.post("/api/auth/resend-verification-code", validateBody(api.resendEmailSchema), async (req, res) => {
    const { email } = req.body;

    const user = await api.prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.json({ message: api.PUBLIC_API_ERRORS.resendVerificationGeneric });

      return;
    }

    if (user.emailVerified) {
      res.json({ message: api.PUBLIC_API_ERRORS.resendVerificationGeneric });

      return;
    }

    await api.sendEmailVerificationCode(user);

    res.json({ message: api.PUBLIC_API_ERRORS.resendVerificationGeneric });
  });
}
