import net from "node:net";
import tls from "node:tls";
import nodemailer from "nodemailer";
import { buildAbsoluteAppUrl, sanitizeInternalAppPath } from "./internal-url-security";

interface VerificationEmailInput {
  to: string;
  fullName: string;
  code: string;
  expiresInMinutes: number;
}

interface VerificationEmailContentInput {
  fullName: string;
  code: string;
  expiresInMinutes: number;
  verifyUrl?: string;
}

function getEmailDomain(value: string) {
  return value.includes("@") ? value.split("@").pop() : "unknown";
}

function normalizeRecipients(to: unknown) {
  if (Array.isArray(to)) return to.map(String);
  if (to) return [String(to)];
  return [];
}

function getProviderStatus(response: unknown) {
  const value = String(response || "");
  if (value.startsWith("250")) return "QUEUED";
  return "UNKNOWN";
}

export function buildMailDeliveryDetails(
  info: any,
  smtp = getSmtpPublicConfig(),
  mail?: { from?: string; to?: unknown },
) {
  const accepted = Array.isArray(info?.accepted) ? info.accepted : [];
  const rejected = Array.isArray(info?.rejected) ? info.rejected : [];
  const envelopeTo = normalizeRecipients(info?.envelope?.to);
  return {
    smtp,
    emailFrom: mail?.from,
    messageId: info?.messageId,
    accepted,
    rejected,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    acceptedDomains: accepted.map((email: string) => getEmailDomain(email)),
    rejectedDomains: rejected.map((email: string) => getEmailDomain(email)),
    envelope: {
      from: info?.envelope?.from,
      to: envelopeTo,
    },
    response: info?.response,
    providerStatus: getProviderStatus(info?.response),
  };
}

export function isSmtpConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM);
}

export function getSmtpPublicConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    user: env.SMTP_USER,
    from: env.EMAIL_FROM,
    configured: isSmtpConfigured(env),
  };
}

/** Minimal SMTP status for production startup logs (no host/user). */
export function getSmtpStartupSummary(env: NodeJS.ProcessEnv = process.env) {
  return {
    configured: isSmtpConfigured(env),
    secure: Number(env.SMTP_PORT) === 465,
  };
}

function getTransporterPublicOptions(transporter: any, env: NodeJS.ProcessEnv = process.env) {
  const options = transporter?.options || {};
  return {
    host: options.host || env.SMTP_HOST,
    port: Number(options.port || env.SMTP_PORT),
    secure: Boolean(options.secure ?? Number(env.SMTP_PORT) === 465),
    user: options.auth?.user || env.SMTP_USER,
    from: env.EMAIL_FROM,
    configured: isSmtpConfigured(env),
  };
}

function createSmtpTransporter(env: NodeJS.ProcessEnv = process.env) {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: Number(env.SMTP_PORT) === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

async function sendMailWithDiagnostics(mail: any, env: NodeJS.ProcessEnv = process.env) {
  const transporter = createSmtpTransporter(env);
  const info = await transporter.sendMail({
    ...mail,
    envelope: {
      from: env.SMTP_USER,
      to: normalizeRecipients(mail.to),
    },
  });
  return buildMailDeliveryDetails(info, getTransporterPublicOptions(transporter, env), mail);
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "cher utilisateur";
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function getVerificationUrl(env: NodeJS.ProcessEnv = process.env) {
  const url = env.EMAIL_VERIFICATION_URL || env.APP_URL;
  if (!url || url.includes("ton-projet")) return undefined;
  try {
    const hostname = new URL(url).hostname;
    if (["localhost", "127.0.0.1", "::1"].includes(hostname)) return undefined;
  } catch {
    return undefined;
  }
  return url;
}

export function getEmailErrorDetails(err: any) {
  return {
    name: err?.name,
    code: err?.code,
    command: err?.command,
    responseCode: err?.responseCode,
    response: err?.response,
    message: err?.message || String(err),
  };
}

export function buildVerificationEmailContent(input: VerificationEmailContentInput) {
  const name = escapeHtml(firstName(input.fullName));
  const code = escapeHtml(input.code);
  const verifyButton = input.verifyUrl
    ? `
      <tr>
        <td align="center" style="padding: 10px 0 4px;">
          <a href="${escapeHtml(input.verifyUrl)}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:.4px;padding:14px 22px;border-radius:12px;">
            Vérifier mon compte
          </a>
        </td>
      </tr>
    `
    : "";
  const textLines = [
    `Bonjour ${firstName(input.fullName)},`,
    "",
    "Bienvenue sur Axelmond Research Labs.",
    "",
    "Pour activer votre compte universitaire, veuillez utiliser le code de vérification suivant :",
    "",
    "CODE DE VÉRIFICATION",
    input.code,
    "",
    `Ce code est valable pendant ${input.expiresInMinutes} minutes.`,
    ...(input.verifyUrl ? ["", `Vérifier mon compte : ${input.verifyUrl}`] : []),
    "",
    "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.",
    "",
    "---",
    "",
    "Axelmond Research Labs",
    "Research • Innovation • Education",
    "",
    "© Axelmond Research Labs - Tous droits réservés",
  ];

  return {
    text: textLines.join("\n"),
    html: `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Vérification Axelmond Research Labs</title>
    <style>
      @media only screen and (max-width: 620px) {
        .container { width: 100% !important; border-radius: 0 !important; }
        .content { padding: 26px 20px !important; }
        .code { font-size: 34px !important; letter-spacing: 8px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:18px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;background:#111827;border:1px solid #273449;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#111827 0%,#312e81 48%,#be185d 100%);padding:18px 30px;text-align:center;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;letter-spacing:2px;color:#ffffff;text-transform:uppercase;">
                  AXELMOND <span style="color:#ec4899;font-weight:300;">LABS</span>
                </div>
              </td>
            </tr>
            <tr>
              <td class="content" style="padding:34px 38px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size:24px;font-weight:900;color:#ffffff;text-align:center;padding-bottom:14px;line-height:1.3;">Bienvenue sur Axelmond Research Labs, ${name}</td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;line-height:1.7;color:#cbd5e1;text-align:center;padding-bottom:24px;">
                      Pour activer votre compte universitaire, veuillez utiliser le code de vérification suivant.
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#a5b4fc;text-align:center;padding-bottom:10px;">Code de vérification</td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom:22px;">
                      <div style="display:inline-block;background:#020617;border:1px solid #7c3aed;border-radius:18px;padding:22px 28px;box-shadow:0 18px 45px rgba(236,72,153,.16);">
                        <span class="code" style="font-size:42px;line-height:1;font-weight:900;letter-spacing:12px;color:#ffffff;">${code}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;line-height:1.7;color:#cbd5e1;text-align:center;padding-bottom:18px;">
                      Ce code est valable pendant <strong style="color:#ffffff;">${input.expiresInMinutes} minutes</strong>.
                    </td>
                  </tr>
                  ${verifyButton}
                  <tr>
                    <td style="font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;padding-top:22px;">
                      Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#020617;border-top:1px solid #273449;padding:22px 28px;text-align:center;">
                <div style="font-size:14px;font-weight:900;color:#ffffff;">Axelmond Research Labs</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:5px;">Research • Innovation • Education</div>
                <div style="font-size:10px;color:#475569;margin-top:14px;">© Axelmond Research Labs - Tous droits réservés</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

export async function verifySmtpConnection(env: NodeJS.ProcessEnv = process.env) {
  if (!isSmtpConfigured(env)) {
    return {
      ok: false as const,
      configured: false as const,
      details: getSmtpPublicConfig(env),
      error: "SMTP_NOT_CONFIGURED",
    };
  }

  try {
    await createSmtpTransporter(env).verify();
    return { ok: true as const, configured: true as const, details: getSmtpPublicConfig(env) };
  } catch (err: any) {
    return {
      ok: false as const,
      configured: true as const,
      details: getSmtpPublicConfig(env),
      error: getEmailErrorDetails(err),
    };
  }
}

export async function readSmtpBanner(env: NodeJS.ProcessEnv = process.env, timeoutMs = 5000) {
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    return { ok: false as const, details: getSmtpPublicConfig(env), error: "SMTP_NOT_CONFIGURED" };
  }

  const host = env.SMTP_HOST;
  const port = Number(env.SMTP_PORT);
  const secure = Number(env.SMTP_PORT) === 465;

  return new Promise<
    | { ok: true; details: ReturnType<typeof getSmtpPublicConfig>; banner: string }
    | { ok: false; details: ReturnType<typeof getSmtpPublicConfig>; error: unknown }
  >((resolve) => {
    let done = false;
    const socket = secure ? tls.connect({ host, port, servername: host, timeout: timeoutMs }) : net.connect({ host, port });
    const finish = (result: any) => {
      if (done) return;
      done = true;
      try {
        socket?.destroy();
      } catch {
        // ignore socket cleanup errors
      }
      resolve(result);
    };

    socket.setEncoding("utf8");
    socket.setTimeout(timeoutMs);
    socket.on("data", (chunk) => {
      const banner = String(chunk).trim().split(/\r?\n/)[0];
      try {
        socket.write("QUIT\r\n");
      } catch {
        // ignore socket cleanup errors
      }
      finish({ ok: true as const, details: getSmtpPublicConfig(env), banner });
    });
    socket.on("error", (err) => {
      finish({ ok: false as const, details: getSmtpPublicConfig(env), error: getEmailErrorDetails(err) });
    });
    socket.on("timeout", () => {
      finish({ ok: false as const, details: getSmtpPublicConfig(env), error: "SMTP_BANNER_TIMEOUT" });
    });
    socket.on("close", () => {
      finish({ ok: false as const, details: getSmtpPublicConfig(env), error: "SMTP_BANNER_CONNECTION_CLOSED" });
    });
  });
}

export async function sendVerificationEmail(input: VerificationEmailInput, env: NodeJS.ProcessEnv = process.env) {
  if (!isSmtpConfigured(env)) {
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" as const };
  }

  const content = buildVerificationEmailContent({
    fullName: input.fullName,
    code: input.code,
    expiresInMinutes: input.expiresInMinutes,
    verifyUrl: getVerificationUrl(env),
  });

  const delivery = await sendMailWithDiagnostics(
    {
      from: env.EMAIL_FROM,
      to: input.to,
      subject: "Votre code de vérification Axelmond Research Labs",
      text: content.text,
      html: content.html,
    },
    env,
  );

  return { sent: true as const, delivery };
}

export async function sendAdminTestEmail(to: string, env: NodeJS.ProcessEnv = process.env) {
  if (!isSmtpConfigured(env)) {
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" as const };
  }

  const delivery = await sendMailWithDiagnostics(
    {
      from: env.EMAIL_FROM,
      to,
      subject: "Diagnostic SMTP Axelmond Research Labs",
      text: [
        "Bonjour,",
        "",
        "Ceci est un e-mail de diagnostic envoyé depuis l'administration Axelmond Research Labs.",
        "",
        "Si vous recevez ce message, la configuration SMTP Hostinger fonctionne.",
        "",
        "Axelmond Research Labs",
      ].join("\n"),
      html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:18px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:100%;background:#111827;border:1px solid #273449;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#111827 0%,#312e81 48%,#be185d 100%);padding:18px 30px;text-align:center;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;letter-spacing:2px;color:#ffffff;text-transform:uppercase;">
                  AXELMOND <span style="color:#ec4899;font-weight:300;">LABS</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 38px;text-align:center;">
                <div style="display:inline-block;background:#020617;border:1px solid #7c3aed;border-radius:18px;padding:18px 24px;color:#ffffff;font-size:24px;font-weight:900;">OK</div>
                <h1 style="font-size:20px;color:#ffffff;margin:24px 0 8px;">Configuration SMTP validée</h1>
                <p style="font-size:14px;line-height:1.7;color:#cbd5e1;margin:0;">Cet e-mail confirme que le serveur Axelmond Research Labs peut envoyer des messages via Hostinger.</p>
              </td>
            </tr>
            <tr>
              <td style="background:#020617;border-top:1px solid #273449;padding:22px 28px;text-align:center;">
                <div style="font-size:14px;font-weight:900;color:#ffffff;">Axelmond Research Labs</div>
                <div style="font-size:11px;color:#64748b;margin-top:4px;">Research • Innovation • Education</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    },
    env,
  );

  return { sent: true as const, delivery };
}

// Reset Password Email Template
interface ResetPasswordEmailInput {
  to: string;
  fullName: string;
  resetUrl: string;
}

export function buildResetPasswordEmailContent(input: { fullName: string; resetUrl: string }) {
  const name = escapeHtml(firstName(input.fullName));
  const url = escapeHtml(input.resetUrl);
  const textLines = [
    `Bonjour ${firstName(input.fullName)},`,
    "",
    "Vous avez demandé la réinitialisation de votre mot de passe Axelmond Research Labs.",
    "",
    `Pour réinitialiser votre mot de passe, veuillez cliquer sur le lien suivant : ${input.resetUrl}`,
    "",
    "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.",
    "",
    "---",
    "Axelmond Research Labs",
    "Research • Innovation • Education",
    "© Axelmond Research Labs - Tous droits réservés",
  ];
  return {
    text: textLines.join("\n"),
    html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:18px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" style="width:600px;max-width:100%;background:#111827;border:1px solid #273449;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#111827 0%,#312e81 48%,#be185d 100%);padding:18px 30px;text-align:center;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;letter-spacing:2px;color:#ffffff;text-transform:uppercase;">
                  AXELMOND <span style="color:#ec4899;font-weight:300;">LABS</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 38px;text-align:center;font-size:14px;line-height:1.7;color:#cbd5e1;">
                <h1 style="font-size:22px;font-weight:900;color:#ffffff;margin-top:0;margin-bottom:18px;line-height:1.3;">Réinitialisation de mot de passe, ${name}</h1>
                <p>Bonjour ${name},</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe académique.</p>
                <div style="margin:24px 0;">
                  <a href="${url}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;padding:14px 22px;border-radius:12px;">Réinitialiser mon mot de passe</a>
                </div>
                <p style="font-size:12px;color:#94a3b8;">Si le bouton ne fonctionne pas, copiez-collez ce lien : <br/> ${url}</p>
              </td>
            </tr>
            <tr>
              <td style="background:#020617;border-top:1px solid #273449;padding:22px 28px;text-align:center;">
                <div style="font-size:14px;font-weight:900;color:#ffffff;">Axelmond Research Labs</div>
                <div style="font-size:10px;color:#475569;margin-top:14px;">© Axelmond Research Labs - Tous droits réservés</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

export async function sendResetPasswordEmail(input: ResetPasswordEmailInput, env: NodeJS.ProcessEnv = process.env) {
  if (!isSmtpConfigured(env)) return { sent: false, reason: "SMTP_NOT_CONFIGURED" as const };
  const content = buildResetPasswordEmailContent({ fullName: input.fullName, resetUrl: input.resetUrl });
  const delivery = await sendMailWithDiagnostics(
    {
      from: env.EMAIL_FROM,
      to: input.to,
      subject: "Réinitialisation de votre mot de passe - Axelmond Research Labs",
      text: content.text,
      html: content.html,
    },
    env,
  );
  return { sent: true, delivery };
}

// Invitations Email Template
interface InvitationEmailInput {
  to: string;
  fullName: string;
  inviteCode: string;
  inviteUrl: string;
}

export function buildInvitationEmailContent(input: { fullName: string; inviteCode: string; inviteUrl: string }) {
  const name = escapeHtml(firstName(input.fullName));
  const code = escapeHtml(input.inviteCode);
  const url = escapeHtml(input.inviteUrl);
  const textLines = [
    `Bonjour ${firstName(input.fullName)},`,
    "",
    "Vous êtes invité à rejoindre la plateforme académique Axelmond Research Labs.",
    "",
    `Votre code d'invitation est : ${input.inviteCode}`,
    `Rejoignez la plateforme ici : ${input.inviteUrl}`,
    "",
    "---",
    "Axelmond Research Labs",
    "Research • Innovation • Education",
    "© Axelmond Research Labs - Tous droits réservés",
  ];
  return {
    text: textLines.join("\n"),
    html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:18px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" style="width:600px;max-width:100%;background:#111827;border:1px solid #273449;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#111827 0%,#312e81 48%,#be185d 100%);padding:18px 30px;text-align:center;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;letter-spacing:2px;color:#ffffff;text-transform:uppercase;">
                  AXELMOND <span style="color:#ec4899;font-weight:300;">LABS</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 38px;text-align:center;font-size:14px;line-height:1.7;color:#cbd5e1;">
                <h1 style="font-size:22px;font-weight:900;color:#ffffff;margin-top:0;margin-bottom:18px;line-height:1.3;">Invitation Académique, ${name}</h1>
                <p>Bonjour ${name},</p>
                <p>Vous avez été invité à rejoindre la plateforme académique.</p>
                <p>Utilisez le code d'invitation suivant lors de votre inscription :</p>
                <div style="margin:18px 0;background:#020617;border:1px solid #7c3aed;border-radius:12px;padding:12px 18px;display:inline-block;">
                  <span style="font-family:monospace;font-size:18px;font-weight:800;letter-spacing:1px;color:#ffffff;">${code}</span>
                </div>
                <div style="margin:18px 0;">
                  <a href="${url}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;padding:14px 22px;border-radius:12px;">Rejoindre la plateforme</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#020617;border-top:1px solid #273449;padding:22px 28px;text-align:center;">
                <div style="font-size:14px;font-weight:900;color:#ffffff;">Axelmond Research Labs</div>
                <div style="font-size:10px;color:#475569;margin-top:14px;">© Axelmond Research Labs - Tous droits réservés</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

export async function sendInvitationEmail(input: InvitationEmailInput, env: NodeJS.ProcessEnv = process.env) {
  if (!isSmtpConfigured(env)) return { sent: false, reason: "SMTP_NOT_CONFIGURED" as const };
  const content = buildInvitationEmailContent({
    fullName: input.fullName,
    inviteCode: input.inviteCode,
    inviteUrl: input.inviteUrl,
  });
  const delivery = await sendMailWithDiagnostics(
    {
      from: env.EMAIL_FROM,
      to: input.to,
      subject: "Invitation à rejoindre Axelmond Research Labs",
      text: content.text,
      html: content.html,
    },
    env,
  );
  return { sent: true, delivery };
}

// Notifications Email Template
interface NotificationEmailInput {
  to: string;
  fullName: string;
  messageTitle: string;
  messageBody: string;
  actionUrl?: string;
}

export function buildNotificationEmailContent(input: {
  fullName: string;
  messageTitle: string;
  messageBody: string;
  actionUrl?: string;
}) {
  const name = escapeHtml(firstName(input.fullName));
  const title = escapeHtml(input.messageTitle);
  const body = escapeHtml(input.messageBody);
  const safeActionUrl = input.actionUrl
    ? buildAbsoluteAppUrl(sanitizeInternalAppPath(input.actionUrl))
    : undefined;
  const actionButton = safeActionUrl
    ? `
      <div style="margin:24px 0;">
        <a href="${escapeHtml(safeActionUrl)}" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;padding:14px 22px;border-radius:12px;">Accéder à la notification</a>
      </div>
    `
    : "";
  const textLines = [
    `Bonjour ${firstName(input.fullName)},`,
    "",
    `Nouvelle notification de Axelmond Research Labs : ${input.messageTitle}`,
    "",
    input.messageBody,
    ...(safeActionUrl ? ["", `Lien d'action : ${safeActionUrl}`] : []),
    "",
    "---",
    "Axelmond Research Labs",
    "Research • Innovation • Education",
    "© Axelmond Research Labs - Tous droits réservés",
  ];
  return {
    text: textLines.join("\n"),
    html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:18px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" style="width:600px;max-width:100%;background:#111827;border:1px solid #273449;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#111827 0%,#312e81 48%,#be185d 100%);padding:18px 30px;text-align:center;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;letter-spacing:2px;color:#ffffff;text-transform:uppercase;">
                  AXELMOND <span style="color:#ec4899;font-weight:300;">LABS</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 38px;text-align:center;font-size:14px;line-height:1.7;color:#cbd5e1;">
                <h1 style="font-size:22px;font-weight:900;color:#ffffff;margin-top:0;margin-bottom:18px;line-height:1.3;">${title}, ${name}</h1>
                <p>Bonjour ${name},</p>
                <p>${body}</p>
                ${actionButton}
              </td>
            </tr>
            <tr>
              <td style="background:#020617;border-top:1px solid #273449;padding:22px 28px;text-align:center;">
                <div style="font-size:14px;font-weight:900;color:#ffffff;">Axelmond Research Labs</div>
                <div style="font-size:10px;color:#475569;margin-top:14px;">© Axelmond Research Labs - Tous droits réservés</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

export async function sendNotificationEmail(input: NotificationEmailInput, env: NodeJS.ProcessEnv = process.env) {
  if (!isSmtpConfigured(env)) return { sent: false, reason: "SMTP_NOT_CONFIGURED" as const };
  const content = buildNotificationEmailContent({
    fullName: input.fullName,
    messageTitle: input.messageTitle,
    messageBody: input.messageBody,
    actionUrl: input.actionUrl,
  });
  const delivery = await sendMailWithDiagnostics(
    {
      from: env.EMAIL_FROM,
      to: input.to,
      subject: `Notification : ${input.messageTitle} - Axelmond Research Labs`,
      text: content.text,
      html: content.html,
    },
    env,
  );
  return { sent: true, delivery };
}
