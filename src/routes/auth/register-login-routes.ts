import type { Express } from "express";
import type { RouteContext } from "../../server/route-context";
import * as api from "../../server/route-deps";

export function registerRegisterLoginRoutes(app: Express, ctx: RouteContext): void {
  const { validateBody } = ctx.middleware;

  app.post("/api/auth/register", validateBody(api.registerSchema), async (req, res) => {
    const { email, password, fullName, role, levelOrTitle, filiere, professorInviteCode } = req.body;

    const normalizedRole = api.normalizeRole(role);

    if (!normalizedRole) {
      res.status(400).json({ error: api.PUBLIC_API_ERRORS.invalidRole });

      return;
    }

    if (normalizedRole === "ADMIN") {
      api.logSecurity("WARN", "Public admin registration denied", { email });

      res
        .status(403)
        .json({ error: "La création d'un compte administrateur n'est pas autorisée depuis l'inscription publique" });

      return;
    }

    const normalizedEmail = email;

    const passwordHash = await api.bcrypt.hash(password, api.getBcryptRounds());

    const existing = await api.prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existing) {
      res.status(409).json({ error: api.PUBLIC_API_ERRORS.registrationConflict });

      return;
    }

    const inviteCode = api.normalizeProfessorInviteCode(professorInviteCode);

    if (normalizedRole !== "STUDENT" && !inviteCode) {
      api.logInvitation("WARN", "Professor registration denied", { email: normalizedEmail, reason: "missing" });

      res.status(403).json({ error: "Code d'invitation professeur absent, invalide ou déjà utilisé" });

      return;
    }

    const finalLevel = normalizedRole === "STUDENT" ? api.DEFAULT_STUDENT_LABEL : levelOrTitle || "Enseignant Docteur";

    try {
      const user = await api.prisma.$transaction(async (tx) => {
        if (normalizedRole !== "STUDENT") {
          await api.reserveProfessorInviteCode(tx, inviteCode!);
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
          },

          include: api.APP_USER_BILLING_INCLUDE,
        });

        if (normalizedRole !== "STUDENT") {
          await api.ensureAcademicProfileForUser(tx, {
            id: createdUser.id,

            role: normalizedRole,

            levelOrTitle: finalLevel,
          });

          await api.attachProfessorInviteUsage(tx, inviteCode!, createdUser.id);

          api.logInvitation("INFO", "Professor invitation consumed", {
            email: normalizedEmail,
            codeSuffix: inviteCode.slice(-4),
          });

          api.logSecurity("INFO", "Academic profile initialized after registration", {
            userId: createdUser.id,
            role: normalizedRole,
          });
        }

        return createdUser;
      });

      const safeUser = api.toAppUser(user);

      const delivery = await api.sendEmailVerificationCode(safeUser);

      api.logSecurity("INFO", "User registered pending email verification", {
        userId: safeUser.id,
        role: safeUser.role,
      });

      res.status(201).json({
        verificationRequired: true,

        email: safeUser.email,

        message: delivery.sent
          ? "Code envoyé"
          : "Compte créé. Le service e-mail n'est pas configuré, utilisez la route de renvoi après configuration SMTP.",
      });
    } catch (err: any) {
      if (err instanceof api.ProfessorInviteConsumeError) {
        if (err.code === "EXPIRED") {
          res.status(403).json({ error: "Le code d'accès professeur a expiré (validité de 5 minutes)" });
          return;
        }

        res.status(403).json({ error: "Code d'invitation professeur absent, invalide ou déjà utilisé" });
        return;
      }

      if (err?.code === "P2002") {
        res.status(409).json({ error: api.PUBLIC_API_ERRORS.registrationConflict });

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

      include: api.APP_USER_BILLING_INCLUDE,
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

        code: "AUTH_RATE_LIMIT_EXCEEDED",
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
        api.logSecurity("WARN", "Auth account lockout applied", {
          userId: user.id,
          attempts,
          maxAttempts: api.AUTH_MAX_ATTEMPTS,
          lockoutMinutes: Math.round(api.AUTH_LOCKOUT_WINDOW_MS / 60000),
        });
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

    const { maybeRequireTotpAfterPassword } = await import("./mfa-routes");
    const { issueAuthenticatedSession } = await import("../../auth-session");

    if (await maybeRequireTotpAfterPassword(user, res)) {
      return;
    }

    const body = await issueAuthenticatedSession(req, res, api, user);
    res.json(body);
  });
}
