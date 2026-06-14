import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import type { AppUser } from "../server/route-deps";
import * as api from "../server/route-deps";

export function registerAuthRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, requireAdmin, validateBody } = ctx.middleware;

  app.post("/api/auth/register", validateBody(api.registerSchema), async (req, res) => {
  
    const { email, password, fullName, role, levelOrTitle, filiere, professorInviteCode } = req.body;
  
  
  
    const normalizedRole = api.normalizeRole(role);
  
    if (!normalizedRole) {
  
      res.status(400).json({ error: api.PUBLIC_API_ERRORS.invalidRole });
  
      return;
  
    }
  
    if (normalizedRole === "ADMIN") {
  
      api.logSecurity("WARN", "Public admin registration denied", { email });
  
      res.status(403).json({ error: "La création d'un compte administrateur n'est pas autorisée depuis l'inscription publique" });
  
      return;
  
    }
  
  
  
    const normalizedEmail = email;
  
    const existing = await api.prisma.user.findUnique({ where: { email: normalizedEmail } });
  
    if (existing) {
  
      res.status(409).json({ error: "Impossible de créer le compte avec ces informations. Vérifiez vos données ou connectez-vous." });
  
      return;
  
    }
  
  
  
    const inviteCode = api.normalizeProfessorInviteCode(professorInviteCode);
  
    if (normalizedRole !== "STUDENT" && !inviteCode) {
  
      api.logInvitation("WARN", "Professor registration denied", { email: normalizedEmail, reason: "missing" });
  
      res.status(403).json({ error: "Code d'invitation professeur absent, invalide ou déjà utilisé" });
  
      return;
  
    }
  
  
  
    const finalLevel = normalizedRole === "STUDENT" ? api.DEFAULT_STUDENT_LABEL : levelOrTitle || "Enseignant Docteur";
  
    const availableCourses = await api.prisma.course.findMany({ select: { id: true } });
  
    const enrolledCourseIds = normalizedRole === "STUDENT"
  
      ? (availableCourses.length > 0 ? [availableCourses[0].id] : [])
  
      : [];
  
    const passwordHash = await api.bcrypt.hash(password, 10);
  
  
  
    try {
  
      const user = await api.prisma.$transaction(async (tx) => {
  
        if (normalizedRole !== "STUDENT") {
  
          const invite = await tx.professorInviteCode.findUnique({
  
            where: { code: inviteCode },
  
          });
  
          if (!invite || invite.usedAt || invite.revokedAt) {
  
            api.logInvitation("WARN", "Professor registration denied", { email: normalizedEmail, reason: "invalid_or_used" });
  
            throw new Error("INVALID_PROFESSOR_INVITE");
  
          }
  
          const isExpired = Date.now() - new Date(invite.createdAt).getTime() > 5 * 60 * 1000;
  
          if (isExpired) {
  
            api.logInvitation("WARN", "Professor registration denied", { email: normalizedEmail, reason: "expired" });
  
            throw new Error("EXPIRED_PROFESSOR_INVITE");
  
          }
  
          await tx.professorInviteCode.update({
  
            where: { code: inviteCode },
  
            data: { usedAt: new Date() },
  
          });
  
        }
  
  
  
        const createdUser = await tx.user.create({
  
          data: {
  
            email: normalizedEmail,
  
            passwordHash,
  
            fullName,
  
            role: normalizedRole,
  
            emailVerified: false,
  
            levelOrTitle: finalLevel,
  
            filiere: normalizedRole === "STUDENT" && typeof filiere === "string" ? filiere.trim() || null : null,
  
            invoices: normalizedRole === "STUDENT" ? api.createDefaultStudentInvoices() : [],
  
            enrollments: {
  
              create: enrolledCourseIds.map((courseId) => ({ courseId })),
  
            },
  
          },
  
          include: { enrollments: true },
  
        });
  
  
  
        if (normalizedRole !== "STUDENT") {
  
          await api.ensureAcademicProfileForUser(tx, {
  
            id: createdUser.id,
  
            role: normalizedRole,
  
            levelOrTitle: finalLevel,
  
          });
  
          await tx.professorInviteCode.update({
  
            where: { code: inviteCode },
  
            data: { usedById: createdUser.id },
  
          });
  
          api.logInvitation("INFO", "Professor invitation consumed", { email: normalizedEmail, codeSuffix: inviteCode.slice(-4) });
  
          api.logSecurity("INFO", "Academic profile initialized after registration", { userId: createdUser.id, role: normalizedRole });
  
        }
  
  
  
        return createdUser;
  
      });
  
  
  
      const safeUser = api.toAppUser(user);
  
      const delivery = await api.sendEmailVerificationCode(safeUser);
  
      api.logSecurity("INFO", "User registered pending email verification", { userId: safeUser.id, role: safeUser.role });
  
      res.status(201).json({
  
        verificationRequired: true,
  
        email: safeUser.email,
  
        message: delivery.sent ? "Code envoyé" : "Compte créé. Le service e-mail n'est pas configuré, utilisez la route de renvoi après configuration SMTP.",
  
      });
  
    } catch (err: any) {
  
      if (err?.message === "INVALID_PROFESSOR_INVITE") {
  
        res.status(403).json({ error: "Code d'invitation professeur absent, invalide ou déjà utilisé" });
  
        return;
  
      }
  
      if (err?.message === "EXPIRED_PROFESSOR_INVITE") {
  
        res.status(403).json({ error: "Le code d'accès professeur a expiré (validité de 5 minutes)" });
  
        return;
  
      }
  
      if (err?.code === "P2002") {
  
        res.status(409).json({ error: "Un compte avec cet email existe déjà" });
  
        return;
  
      }
  
      api.logDb("ERROR", "User registration failed", { email: normalizedEmail, error: String(err) });
  
      res.status(500).json({ error: "Création du compte impossible" });
  
    }
  
  });
  
  
  
  // POST /api/auth/login
  
  app.post("/api/auth/login", validateBody(api.loginSchema), async (req, res) => {
  
    const { email, password, role } = req.body;
  
  
  
    const requestedRole = api.normalizeRole(role);
  
    if (!requestedRole) {
  
      res.status(400).json({ error: api.PUBLIC_API_ERRORS.invalidRole });
  
      return;
  
    }
  
  
  
    const user = await api.prisma.user.findUnique({
  
      where: { email },
  
      include: { enrollments: true },
  
    });
  
  
  
    // Pour éviter la fuite d'informations sur l'existence des emails, on simule une comparaison de hash
  
    if (!user) {
  
      await api.bcrypt.compare(password, "$2b$10$abcdefghijklmnopqrstuvwxyzeeeeeeeeeeeeeeeeeeeeeee");
  
      res.status(401).json({ error: "Identifiants incorrects" });
  
      return;
  
    }
  
  
  
    // Vérifier le verrouillage brute-force
  
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
  
      const retryAfter = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 1000);
  
      res.status(429).json({
  
        error: "Compte temporairement verrouillé pour cause de tentatives excessives. Veuillez réessayer plus tard.",
  
        isRateLimit: true,
  
        retryAfter,
  
        code: "AUTH_RATE_LIMIT_EXCEEDED"
  
      });
  
      return;
  
    }
  
  
  
    if (!api.canLoginToRequestedRole(user.role, requestedRole)) {
  
      api.logSecurity("WARN", "Login sector mismatch", { userId: user.id, requestedRole, actualRole: user.role });
  
      res.status(403).json({ error: "Ce compte n'est pas autorisé dans cet espace" });
  
      return;
  
    }
  
  
  
    const isValidPassword = await api.bcrypt.compare(password, user.passwordHash);
  
    if (!isValidPassword) {
  
      const attempts = user.failedLoginAttempts + 1;
  
      const lockoutUntil = attempts >= api.AUTH_MAX_ATTEMPTS ? new Date(Date.now() + api.AUTH_LOCKOUT_WINDOW_MS) : null;
  
      await api.prisma.user.update({
  
        where: { id: user.id },
  
        data: {
  
          failedLoginAttempts: attempts,
  
          lockoutUntil,
  
        },
  
      });
  
      if (lockoutUntil) {
  
        api.logSecurity("WARN", "Auth account lockout applied", { userId: user.id, attempts, maxAttempts: api.AUTH_MAX_ATTEMPTS, lockoutMinutes: Math.round(api.AUTH_LOCKOUT_WINDOW_MS / 60000) });
  
      }
  
      api.alertFailedLogins(user.email, req.ip || "", attempts);
  
      res.status(401).json({ error: "Identifiants incorrects" });
  
      return;
  
    }
  
  
  
    if (!user.emailVerified) {
  
      api.logSecurity("WARN", "Login blocked until email verification", { userId: user.id, role: user.role });
  
      res.status(403).json({
  
        error: "E-mail non vérifié. Saisissez le code reçu par e-mail.",
  
        verificationRequired: true,
  
        email: user.email,
  
      });
  
      return;
  
    }
  
  
  
    // Connexion réussie : Réinitialiser le compteur d'erreurs
  
    await api.prisma.user.update({
  
      where: { id: user.id },
  
      data: {
  
        failedLoginAttempts: 0,
  
        lockoutUntil: null,
  
      },
  
    });
  
  
  
    const safeUser = api.toAppUser(user);
  
    const refreshToken = await api.createRefreshToken(user.id);
  
    const csrfToken = api.setAuthCookies(res, refreshToken);
  
    api.logSecurity("INFO", "User logged in", { userId: user.id, role: user.role });
  
    res.json(api.withMobileRefreshToken(req, { ...safeUser, token: api.signAuthToken(safeUser), csrfToken }, refreshToken));
  
  });
  
  
  
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
  
      api.logSecurity("ERROR", "Refresh token reuse detected — all sessions revoked", { userId: storedToken.userId, ip: req.ip });
  
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
  
  
  
  // POST /api/auth/verify-email
  
  app.post("/api/auth/verify-email", validateBody(api.verifyEmailSchema), async (req, res) => {
  
    const { email, code } = req.body;
  
  
  
    const user = await api.prisma.user.findUnique({
  
      where: { email },
  
      include: { enrollments: true },
  
    });
  
    if (!user) {
  
      res.status(400).json({ error: "Identifiants ou code incorrects" });
  
      return;
  
    }
  
    if (user.emailVerified) {
  
      const safeUser = api.toAppUser(user);
  
      const newRefreshToken = await api.createRefreshToken(safeUser.id);
  
      const csrfToken = api.setAuthCookies(res, newRefreshToken);
  
      res.json(api.withMobileRefreshToken(req, { ...safeUser, token: api.signAuthToken(safeUser), csrfToken, message: "E-mail déjà vérifié" }, newRefreshToken));
  
      return;
  
    }
  
  
  
    const verification = await api.prisma.emailVerificationCode.findFirst({
  
      where: { userId: user.id, usedAt: null },
  
      orderBy: { createdAt: "desc" },
  
    });
  
    if (!verification) {
  
      res.status(400).json({ error: "Aucun code de vérification actif. Demandez un nouveau code." });
  
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
  
        error: attempts >= api.EMAIL_VERIFICATION_MAX_ATTEMPTS
  
          ? "Nombre maximal de tentatives atteint. Demandez un nouveau code."
  
          : "Identifiants ou code incorrects",
  
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
  
        include: { enrollments: true },
  
      });
  
    });
  
  
  
    const safeUser = api.toAppUser(verifiedUser);
  
    const newRefreshToken = await api.createRefreshToken(safeUser.id);
  
    const csrfToken = api.setAuthCookies(res, newRefreshToken);
  
    api.logEmail("INFO", "Email verified", { userId: safeUser.id, role: safeUser.role });
  
    res.json(api.withMobileRefreshToken(req, { ...safeUser, token: api.signAuthToken(safeUser), csrfToken, message: "E-mail vérifié avec succès" }, newRefreshToken));
  
  });
  
  
  
  // POST /api/auth/resend-verification-code
  
  app.post("/api/auth/resend-verification-code", validateBody(api.resendEmailSchema), async (req, res) => {
  
    const { email } = req.body;
  
  
  
    const user = await api.prisma.user.findUnique({ where: { email } });
  
    if (!user) {
  
      // Message générique pour éviter l'énumération
  
      res.json({
  
        message: "Si le compte existe et n'est pas vérifié, un nouveau code a été envoyé.",
  
      });
  
      return;
  
    }
  
    if (user.emailVerified) {
  
      res.json({
  
        message: "Si le compte existe et n'est pas vérifié, un nouveau code a été envoyé.",
  
      });
  
      return;
  
    }
  
  
  
    const delivery = await api.sendEmailVerificationCode(user);
  
    res.json({
  
      message: delivery.sent ? "Code envoyé" : "Si le compte existe et n'est pas vérifié, un nouveau code a été envoyé. Le service e-mail n'est pas configuré.",
  
    });
  
  });
  
  
  
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
  
    if (process.env.NODE_ENV !== "production") {
  
      console.log(`[DEV] Code de réinitialisation pour ${user.email} : ${code}`);
  
    }
  
    await api.createEmailVerificationCode(api.prisma, user.id, code);
  
  
  
    try {
  
      const delivery = await api.sendVerificationEmail({
  
        to: user.email,
  
        fullName: user.fullName,
  
        code,
  
        expiresInMinutes: api.EMAIL_VERIFICATION_TTL_MINUTES,
  
      });
  
  
  
      api.logEmail(delivery.sent ? "INFO" : "WARN", delivery.sent ? "Reset password email code sent" : "SMTP not configured for reset password email", {
  
        userId: user.id,
  
        emailDomain: api.getEmailDomain(user.email),
  
        delivery: delivery.sent ? delivery.delivery : undefined,
  
      });
  
  
  
      if (delivery.sent && delivery.delivery) {
  
        await api.recordEmailDeliveryLog("reset_password", user.id, user.email, delivery.delivery);
  
      } else if (!delivery.sent) {
  
        await api.recordEmailDeliveryLog("reset_password", user.id, user.email, api.buildFailedEmailDelivery(user.email, delivery.reason || "SMTP_NOT_CONFIGURED"));
  
      }
  
  
  
      await api.logAudit(
  
        user.id,
  
        user.email,
  
        "FORGOT_PASSWORD_REQUEST",
  
        "USER",
  
        user.id,
  
        { sent: delivery.sent },
  
        req.ip
  
      );
  
  
  
      res.json({ message: api.PASSWORD_RESET_GENERIC_MESSAGE });
  
    } catch (err) {
  
      api.logEmail("ERROR", "Failed to send reset password code email", { userId: user.id, error: api.getEmailErrorDetails(err) });
  
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
  
      where: { userId: user.id, usedAt: null },
  
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
  
        error: attempts >= api.EMAIL_VERIFICATION_MAX_ATTEMPTS
  
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
  
          lockoutUntil: null
  
        },
  
      });
  
    });
  
  
  
    await api.revokeAllUserRefreshTokens(user.id);
  
  
  
    await api.logAudit(
  
      user.id,
  
      user.email,
  
      "RESET_PASSWORD_SUCCESS",
  
      "USER",
  
      user.id,
  
      {},
  
      req.ip
  
    );
  
  
  
    res.json({ message: "Votre mot de passe a été réinitialisé avec succès." });
  
  });
  
  
  
  // GET /api/auth/me
  
  app.get("/api/auth/me", requireAuth, (req, res) => {
  
    const authUser = (req as any).authUser as AppUser;
  
    res.json(authUser);
  
  });
  
  
  
}
