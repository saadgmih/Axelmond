import type { Express } from "express";
import type { RouteContext } from "../../server/route-context";
import * as api from "../../server/route-deps";
import { getClientIp } from "../../client-ip";

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
    const [firstName = "", ...lastNameParts] = fullName.trim().split(/\s+/);
    const lastName = lastNameParts.join(" ");

    const passwordHash = await api.bcrypt.hash(password, api.getBcryptRounds());

    const existing = await api.prisma.user.findUnique({ where: { email: normalizedEmail } });

    // ── Cas 3 : email existant ET déjà vérifié → bloquer avec message clair ──
    if (existing && existing.emailVerified) {
      res.status(409).json({ error: api.PUBLIC_API_ERRORS.registrationConflictVerified });
      return;
    }

    // ── Cas 2 : email existant MAIS non vérifié → reprendre le tunnel ─────────
    if (existing && !existing.emailVerified) {
      // Mettre à jour les informations saisies (mot de passe potentiellement changé, nom corrigé)
      await api.prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          fullName,
          firstName,
          lastName,
          filiere:
            existing.role === "STUDENT" && typeof filiere === "string" ? filiere.trim() || null : existing.filiere,
        },
      });

      const safeExisting = api.toAppUser({ ...existing, passwordHash, fullName, firstName, lastName });
      const delivery = await api.sendEmailVerificationCode(safeExisting);

      api.logSecurity("INFO", "Unverified account re-registration: new code issued", {
        userId: existing.id,
        role: existing.role,
      });

      res.status(200).json({
        verificationRequired: true,
        email: existing.email,
        message: delivery.sent
          ? api.PUBLIC_API_ERRORS.unverifiedAccountResent
          : "Compte en attente de vérification. Le service e-mail n'est pas encore disponible ; utilisez « Renvoyer le code » une fois l'envoi activé.",
      });
      return;
    }

    // ── Cas 1 : nouvel email → création du compte (flux existant) ─────────────

    const inviteCode = api.normalizeProfessorInviteCode(professorInviteCode);

    if (normalizedRole !== "STUDENT" && !inviteCode) {
      api.logInvitation("WARN", "Academic registration denied", {
        email: normalizedEmail,
        reason: "missing_access_key",
      });

      res.status(403).json({ error: "Clé d'accès absente, invalide ou déjà utilisée" });

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

            firstName,

            lastName,

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

          api.logInvitation("INFO", "Access key consumed", {
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
          : "Compte créé. Le service e-mail n'est pas encore disponible ; utilisez « Renvoyer le code » une fois l'envoi activé.",
      });
    } catch (err: any) {
      if (err instanceof api.ProfessorInviteConsumeError) {
        if (err.code === "EXPIRED") {
          res.status(403).json({ error: "La clé d'accès a expiré" });
          return;
        }

        res.status(403).json({ error: "Clé d'accès absente, invalide ou déjà utilisée" });
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

    if (!api.canLoginToRequestedRole(user.role, requestedRole)) {
      api.logSecurity("WARN", "Login sector mismatch", { userId: user.id, requestedRole, actualRole: user.role });

      res.status(403).json({ error: "Ce compte n'est pas autorisé dans cet espace" });

      return;
    }

    const isValidPassword = await api.bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;

      await api.prisma.user.update({
        where: { id: user.id },

        data: {
          failedLoginAttempts,
        },
      });

      api.alertFailedLogins(user.email, getClientIp(req), failedLoginAttempts);

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
