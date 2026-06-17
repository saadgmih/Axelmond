import net from "node:net";
import tls from "node:tls";
import nodemailer from "nodemailer";
import { buildAbsoluteAppUrl, sanitizeInternalAppPath } from "./internal-url-security";

// ─── Interfaces ──────────────────────────────────────────────────────────────

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

// ─── Utilities ───────────────────────────────────────────────────────────────

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

// ─── Shared Email Design System ───────────────────────────────────────────────

/**
 * Table-based logo badge — works in all email clients (Gmail, Outlook, Apple Mail).
 * SVG is stripped by Gmail and ignored by Outlook, so we use styled text instead.
 */
const AXELMOND_LOGO_BADGE = `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
    <tr>
      <td style="width:72px;height:72px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#be185d 100%);border-radius:50%;text-align:center;vertical-align:middle;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
          <tr>
            <td align="center" style="padding-top:2px;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-1px;line-height:1;">A</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;line-height:1;margin-top:3px;">LABS</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

/**
 * Formats a Date as a human-readable French datetime string in Morocco time.
 */
function formatDateTime(date = new Date()): string {
  // Morocco uses Africa/Casablanca (UTC+1 year-round since 2018)
  const formatted = date.toLocaleString("fr-FR", {
    timeZone: "Africa/Casablanca",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatted + " (Maroc)";
}

interface BaseEmailOptions {
  /** Page-level <title> */
  title: string;
  /** Greeting headline shown in the body */
  headline: string;
  /** One or more paragraphs of body text (raw HTML allowed) */
  bodyHtml: string;
  /** Primary call-to-action button. Omit if not needed. */
  ctaButton?: {
    href: string;
    label: string;
  };

  /** Metadata row: e.g. "Valide pendant 15 minutes" */
  validityNote?: string;
  /** If true, shows the "si vous n'êtes pas à l'origine" security alert banner */
  showSecurityAlert?: boolean;
  /** Extra detail inside the security alert, e.g. "Votre mot de passe reste inchangé." */
  securityAlertDetail?: string;
  /** Timestamp of the request (defaults to now) */
  requestedAt?: Date;
}

/**
 * Builds the unified, enterprise-quality Axelmond email HTML shell.
 * All security emails should use this function for consistency.
 */
export function buildBaseEmailHtml(opts: BaseEmailOptions): string {
  const {
    title,
    headline,
    bodyHtml,
    ctaButton,
    validityNote,
    showSecurityAlert = false,
    securityAlertDetail = "",
    requestedAt = new Date(),
  } = opts;

  const requestedAtStr = escapeHtml(formatDateTime(requestedAt));
  const year = requestedAt.getFullYear();

  const ctaSection = ctaButton
    ? `
      <tr>
        <td align="center" style="padding:24px 0 8px;">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(ctaButton.href)}" style="height:52px;v-text-anchor:middle;width:260px;" arcsize="24%" fillcolor="#ec4899"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;">${escapeHtml(ctaButton.label)}</center></v:roundrect><![endif]-->
          <!--[if !mso]><!-->
          <a href="${escapeHtml(ctaButton.href)}"
             style="display:inline-block;background:linear-gradient(135deg,#8b5cf6 0%,#ec4899 100%);color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;letter-spacing:.5px;padding:16px 36px;border-radius:14px;box-shadow:0 8px 32px rgba(236,72,153,.35);mso-hide:all;">
            ${escapeHtml(ctaButton.label)}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    `
    : "";

  const validitySection = validityNote
    ? `
      <tr>
        <td style="padding:22px 0 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="background:#0c1228;border:1px solid #1e3a5f;border-radius:12px;padding:14px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:20px;vertical-align:top;padding-top:1px;">
                      <span style="font-size:16px;">&#x23F1;</span>
                    </td>
                    <td style="padding-left:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#93c5fd;line-height:1.6;">
                      <strong style="color:#bfdbfe;">Validité :</strong> ${escapeHtml(validityNote)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    : "";

  const metaSection = `
    <tr>
      <td style="padding:20px 0 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background:#080d1c;border:1px solid #1e293b;border-radius:12px;padding:14px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:20px;vertical-align:top;padding-top:1px;">
                    <span style="font-size:15px;">&#x1F4C5;</span>
                  </td>
                  <td style="padding-left:8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;line-height:1.6;">
                    <strong style="color:#94a3b8;">Demande enregistrée le :</strong><br/>
                    <span style="color:#cbd5e1;">${requestedAtStr}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const securityAlertSection = showSecurityAlert
    ? `
      <tr>
        <td style="padding:20px 0 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="background:#1a0a0a;border:1px solid #7f1d1d;border-left:4px solid #ef4444;border-radius:12px;padding:14px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:22px;vertical-align:top;padding-top:1px;">
                      <span style="font-size:16px;">&#x26A0;&#xFE0F;</span>
                    </td>
                    <td style="padding-left:10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#fca5a5;line-height:1.7;">
                      <strong style="color:#fecaca;display:block;margin-bottom:3px;">Vous n'êtes pas à l'origine de cette demande ?</strong>
                      Ignorez cet e-mail en toute sécurité.${securityAlertDetail ? " " + escapeHtml(securityAlertDetail) : ""}
                      Si vous pensez que votre compte est compromis, <strong>changez immédiatement votre mot de passe</strong> et contactez notre support.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    : "";

  return `<!doctype html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
    <!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
    <title>${escapeHtml(title)}</title>
    <style>
      @media only screen and (max-width: 640px) {
        .email-wrapper { padding: 12px 8px !important; }
        .email-card   { width: 100% !important; border-radius: 0 !important; }
        .email-body   { padding: 28px 22px !important; }
        .code-display { font-size: 36px !important; letter-spacing: 8px !important; }
        .header-logo-text { font-size: 17px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#060c1a;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

    <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#060c1a;"><tr><td><![endif]-->

    <table class="email-wrapper" role="presentation" width="100%" cellspacing="0" cellpadding="0"
           style="background-color:#060c1a;padding:32px 16px;">
      <tr>
        <td align="center">

          <!-- ═══ EMAIL CARD ═══ -->
          <table class="email-card" role="presentation" width="600" cellspacing="0" cellpadding="0"
                 style="width:600px;max-width:100%;background:#0e1628;border:1px solid #1e2d4a;border-radius:24px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.6);">

            <!-- ── HEADER ── -->
            <tr>
              <td style="background:linear-gradient(135deg,#0d1b35 0%,#1e1b4b 40%,#2d1155 70%,#3b0764 100%);padding:0;">
                <!-- Top accent line -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="height:3px;background:linear-gradient(90deg,#6366f1 0%,#8b5cf6 35%,#ec4899 70%,#f97316 100%);font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                </table>
                <!-- Logo + Brand name -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="padding:28px 30px 24px;">
                      <!-- Logo badge (table-based, compatible all email clients) -->
                      ${AXELMOND_LOGO_BADGE}
                      <!-- Brand name -->
                      <div class="header-logo-text"
                           style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;letter-spacing:3px;color:#ffffff;text-transform:uppercase;line-height:1;margin-top:14px;">
                        AXELMOND
                        <span style="color:#ec4899;font-weight:300;letter-spacing:1px;">RESEARCH LABS</span>
                      </div>
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#7c8fa6;letter-spacing:2px;text-transform:uppercase;margin-top:5px;">
                        Research &nbsp;•&nbsp; Innovation &nbsp;•&nbsp; Education
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ── BODY ── -->
            <tr>
              <td class="email-body" style="padding:38px 44px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">

                  <!-- Headline -->
                  <tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#f1f5f9;text-align:center;padding-bottom:18px;line-height:1.25;">
                      ${escapeHtml(headline)}
                    </td>
                  </tr>

                  <!-- Divider -->
                  <tr>
                    <td style="padding-bottom:22px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="height:1px;background:linear-gradient(90deg,transparent,#2d3f60 30%,#3d2f70 60%,transparent);font-size:0;line-height:0;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Body content -->
                  <tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.8;color:#94a3b8;text-align:left;">
                      ${bodyHtml}
                    </td>
                  </tr>

                  <!-- CTA Button -->
                  ${ctaSection}

                  <!-- Validity note -->
                  ${validitySection}

                  <!-- Request metadata -->
                  ${metaSection}

                  <!-- Security alert -->
                  ${securityAlertSection}

                </table>
              </td>
            </tr>

            <!-- ── FOOTER ── -->
            <tr>
              <td style="background:#070d1c;border-top:1px solid #1a2640;padding:26px 36px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:900;color:#e2e8f0;letter-spacing:.5px;">
                        Axelmond Research Labs
                      </div>
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#475569;margin-top:6px;letter-spacing:1px;text-transform:uppercase;">
                        Research &nbsp;•&nbsp; Innovation &nbsp;•&nbsp; Education
                      </div>
                      <div style="height:1px;background:linear-gradient(90deg,transparent,#1e2d4a 30%,#1e2d4a 70%,transparent);margin:14px 0;font-size:0;line-height:0;">&nbsp;</div>
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#2d3f5a;line-height:1.6;">
                        &copy; ${year} Axelmond Research Labs — Tous droits réservés.
                      </div>
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1e3047;margin-top:5px;">
                        &#x1F4E7; Ceci est un message automatique — merci de ne pas répondre à cet e-mail.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
          <!-- ═══ END CARD ═══ -->

        </td>
      </tr>
    </table>

    <!--[if mso | IE]></td></tr></table><![endif]-->

  </body>
</html>`;
}

// ─── SMTP Diagnostics ─────────────────────────────────────────────────────────

export async function verifySmtpConnection(env: NodeJS.ProcessEnv = process.env, timeoutMs = 8000) {
  if (!isSmtpConfigured(env)) {
    return {
      ok: false as const,
      configured: false as const,
      details: getSmtpPublicConfig(env),
      error: "SMTP_NOT_CONFIGURED",
    };
  }

  try {
    await Promise.race([
      createSmtpTransporter(env).verify(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("SMTP_VERIFY_TIMEOUT")), timeoutMs);
      }),
    ]);
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
    const socket = secure
      ? tls.connect({ host, port, servername: host, timeout: timeoutMs })
      : net.connect({ host, port });
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

// ─── 1. VÉRIFICATION DE COMPTE ───────────────────────────────────────────────

export function buildVerificationEmailContent(input: VerificationEmailContentInput) {
  const name = firstName(input.fullName);
  const code = escapeHtml(input.code);
  const now = new Date();

  const codeBlock = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;">
      <tr>
        <td align="center">
          <div style="display:inline-block;background:#020617;border:1px solid #4c1d95;border-radius:18px;padding:24px 32px;box-shadow:0 0 40px rgba(139,92,246,.2);">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:#a78bfa;margin-bottom:10px;">
              Code de vérification
            </div>
            <div class="code-display"
                 style="font-family:'Courier New',Courier,monospace;font-size:46px;font-weight:900;letter-spacing:14px;color:#ffffff;line-height:1;">
              ${code}
            </div>
          </div>
        </td>
      </tr>
    </table>`;

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;text-align:center;">
      Bonjour <strong style="color:#f1f5f9;">${escapeHtml(name)}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#94a3b8;text-align:center;line-height:1.8;">
      Bienvenue sur <strong style="color:#e2e8f0;">Axelmond Research Labs</strong>.<br/>
      Pour activer complètement votre compte universitaire, veuillez entrer le code de vérification ci-dessous.
    </p>
    ${codeBlock}
    <p style="margin:0;color:#64748b;font-size:13px;text-align:center;line-height:1.7;">
      La vérification de votre compte est <strong style="color:#94a3b8;">obligatoire</strong> pour accéder à l'ensemble des fonctionnalités de la plateforme.
    </p>`;

  const textLines = [
    `Bonjour ${name},`,
    "",
    "Bienvenue sur Axelmond Research Labs.",
    "",
    "Pour activer votre compte universitaire, veuillez utiliser le code de vérification suivant :",
    "",
    `CODE DE VÉRIFICATION : ${input.code}`,
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
    `© ${now.getFullYear()} Axelmond Research Labs - Tous droits réservés`,
    "Ceci est un message automatique — merci de ne pas répondre à cet e-mail.",
  ];

  return {
    text: textLines.join("\n"),
    html: buildBaseEmailHtml({
      title: "Vérification de compte — Axelmond Research Labs",
      headline: "Vérification de votre compte",
      bodyHtml,
      ctaButton: input.verifyUrl
        ? { href: input.verifyUrl, label: "Vérifier mon compte" }
        : undefined,
      validityNote: `Ce code est valable pendant ${input.expiresInMinutes} minutes à compter de sa génération.`,
      showSecurityAlert: true,
      securityAlertDetail: "Aucune action n'est requise de votre part.",
      requestedAt: now,
    }),
  };
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
      subject: "Votre code de vérification — Axelmond Research Labs",
      text: content.text,
      html: content.html,
    },
    env,
  );

  return { sent: true as const, delivery };
}

// ─── 2. RÉINITIALISATION DU MOT DE PASSE ─────────────────────────────────────

interface ResetPasswordEmailInput {
  to: string;
  fullName: string;
  code: string;
  resetUrl?: string;
  expiresInMinutes?: number;
}

export function buildResetPasswordEmailContent(input: {
  fullName: string;
  code: string;
  resetUrl?: string;
  expiresInMinutes?: number;
}) {
  const name = firstName(input.fullName);
  const code = escapeHtml(input.code);
  const now = new Date();
  const validity = input.expiresInMinutes ?? 60;

  const codeBlock = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;">
      <tr>
        <td align="center">
          <div style="display:inline-block;background:#020617;border:1px solid #9d174d;border-radius:18px;padding:24px 32px;box-shadow:0 0 40px rgba(244,63,94,.15);">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:#f472b6;margin-bottom:10px;">
              Code de réinitialisation
            </div>
            <div class="code-display"
                 style="font-family:'Courier New',Courier,monospace;font-size:46px;font-weight:900;letter-spacing:14px;color:#ffffff;line-height:1;">
              ${code}
            </div>
          </div>
        </td>
      </tr>
    </table>`;

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;text-align:center;">
      Bonjour <strong style="color:#f1f5f9;">${escapeHtml(name)}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#94a3b8;text-align:center;line-height:1.8;">
      Vous avez demandé la réinitialisation de votre mot de passe académique sur
      <strong style="color:#e2e8f0;">Axelmond Research Labs</strong>.<br/>
      Saisissez le code de réinitialisation ci-dessous dans l'interface de connexion pour choisir un nouveau mot de passe.
    </p>
    ${codeBlock}
    <p style="margin:0;color:#64748b;font-size:13px;text-align:center;line-height:1.7;">
      Pour votre sécurité, ce code est à usage unique et expirera automatiquement.
    </p>`;

  const textLines = [
    `Bonjour ${name},`,
    "",
    "Vous avez demandé la réinitialisation de votre mot de passe Axelmond Research Labs.",
    "",
    "Veuillez utiliser le code de réinitialisation suivant :",
    "",
    `CODE DE RÉINITIALISATION : ${input.code}`,
    "",
    `Ce code est valable pendant ${validity} minutes.`,
    ...(input.resetUrl ? ["", `Réinitialiser mon mot de passe : ${input.resetUrl}`] : []),
    "",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail. Votre mot de passe reste sécurisé et aucun changement ne sera effectué.",
    "",
    "---",
    "",
    "Axelmond Research Labs",
    "Research • Innovation • Education",
    "",
    `© ${now.getFullYear()} Axelmond Research Labs - Tous droits réservés`,
    "Ceci est un message automatique — merci de ne pas répondre à cet e-mail.",
  ];

  return {
    text: textLines.join("\n"),
    html: buildBaseEmailHtml({
      title: "Réinitialisation de votre mot de passe — Axelmond Research Labs",
      headline: "Réinitialisation de votre mot de passe",
      bodyHtml,
      ctaButton: input.resetUrl ? { href: input.resetUrl, label: "Réinitialiser mon mot de passe" } : undefined,
      validityNote: `Ce code de réinitialisation expire dans ${validity} minutes et est à usage unique.`,
      showSecurityAlert: true,
      securityAlertDetail: "Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer ce message ou contacter notre équipe de support.",
      requestedAt: now,
    }),
  };
}

export async function sendResetPasswordEmail(input: ResetPasswordEmailInput, env: NodeJS.ProcessEnv = process.env) {
  if (!isSmtpConfigured(env)) return { sent: false, reason: "SMTP_NOT_CONFIGURED" as const };
  const resetUrl = input.resetUrl || getVerificationUrl(env);
  const content = buildResetPasswordEmailContent({
    fullName: input.fullName,
    code: input.code,
    resetUrl,
    expiresInMinutes: input.expiresInMinutes,
  });
  const delivery = await sendMailWithDiagnostics(
    {
      from: env.EMAIL_FROM,
      to: input.to,
      subject: "Réinitialisation de votre mot de passe — Axelmond Research Labs",
      text: content.text,
      html: content.html,
    },
    env,
  );
  return { sent: true, delivery };
}

// ─── 3. CHANGEMENT D'EMAIL ────────────────────────────────────────────────────

interface EmailChangeEmailInput {
  to: string;
  fullName: string;
  newEmail: string;
  confirmUrl: string;
  expiresInMinutes?: number;
}

export function buildEmailChangeContent(input: {
  fullName: string;
  newEmail: string;
  confirmUrl: string;
  expiresInMinutes?: number;
}) {
  const name = firstName(input.fullName);
  const now = new Date();
  const validity = input.expiresInMinutes ?? 30;

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;text-align:center;">
      Bonjour <strong style="color:#f1f5f9;">${escapeHtml(name)}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#94a3b8;text-align:center;line-height:1.8;">
      Une demande de changement d'adresse e-mail a été initiée pour votre compte
      <strong style="color:#e2e8f0;">Axelmond Research Labs</strong>.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;">
      <tr>
        <td align="center">
          <div style="display:inline-block;background:#080d1c;border:1px solid #1e3a5f;border-radius:12px;padding:14px 24px;max-width:340px;word-break:break-all;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#7c8fa6;margin-bottom:6px;">
              Nouvelle adresse e-mail
            </div>
            <div style="font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:700;color:#93c5fd;">
              ${escapeHtml(input.newEmail)}
            </div>
          </div>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#64748b;font-size:13px;text-align:center;line-height:1.7;">
      Confirmez cette modification en cliquant sur le bouton ci-dessous.
      Si vous n'avez pas initié cette demande, ignorez cet e-mail et sécurisez votre compte.
    </p>`;

  const textLines = [
    `Bonjour ${name},`,
    "",
    "Une demande de changement d'adresse e-mail a été initiée pour votre compte Axelmond Research Labs.",
    "",
    `Nouvelle adresse e-mail : ${input.newEmail}`,
    "",
    `Pour confirmer ce changement, cliquez sur le lien suivant :`,
    input.confirmUrl,
    "",
    `Ce lien est valable pendant ${validity} minutes.`,
    "",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail. Votre adresse actuelle reste inchangée.",
    "",
    "---",
    "",
    "Axelmond Research Labs",
    "Research • Innovation • Education",
    "",
    `© ${now.getFullYear()} Axelmond Research Labs - Tous droits réservés`,
    "Ceci est un message automatique — merci de ne pas répondre à cet e-mail.",
  ];

  return {
    text: textLines.join("\n"),
    html: buildBaseEmailHtml({
      title: "Changement d'adresse e-mail — Axelmond Research Labs",
      headline: "Confirmation du changement d'e-mail",
      bodyHtml,
      ctaButton: { href: input.confirmUrl, label: "Confirmer mon nouvel e-mail" },
      validityNote: `Ce lien expire dans ${validity} minutes.`,
      showSecurityAlert: true,
      securityAlertDetail: "Votre adresse e-mail actuelle reste inchangée tant que vous n'avez pas confirmé.",
      requestedAt: now,
    }),
  };
}

export async function sendEmailChangeEmail(input: EmailChangeEmailInput, env: NodeJS.ProcessEnv = process.env) {
  if (!isSmtpConfigured(env)) return { sent: false, reason: "SMTP_NOT_CONFIGURED" as const };
  const content = buildEmailChangeContent({
    fullName: input.fullName,
    newEmail: input.newEmail,
    confirmUrl: input.confirmUrl,
    expiresInMinutes: input.expiresInMinutes,
  });
  const delivery = await sendMailWithDiagnostics(
    {
      from: env.EMAIL_FROM,
      to: input.to,
      subject: "Confirmation du changement d'e-mail — Axelmond Research Labs",
      text: content.text,
      html: content.html,
    },
    env,
  );
  return { sent: true, delivery };
}

// ─── 4. INVITATION ────────────────────────────────────────────────────────────

interface InvitationEmailInput {
  to: string;
  fullName: string;
  inviteCode: string;
  inviteUrl: string;
}

export function buildInvitationEmailContent(input: { fullName: string; inviteCode: string; inviteUrl: string }) {
  const name = firstName(input.fullName);
  const code = escapeHtml(input.inviteCode);
  const now = new Date();

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;text-align:center;">
      Bonjour <strong style="color:#f1f5f9;">${escapeHtml(name)}</strong>,
    </p>
    <p style="margin:0 0 20px;color:#94a3b8;text-align:center;line-height:1.8;">
      Vous avez été invité à rejoindre la plateforme académique
      <strong style="color:#e2e8f0;">Axelmond Research Labs</strong>.<br/>
      Utilisez le code ci-dessous lors de votre inscription.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;">
      <tr>
        <td align="center">
          <div style="display:inline-block;background:#020617;border:1px solid #4c1d95;border-radius:14px;padding:18px 28px;box-shadow:0 0 30px rgba(139,92,246,.15);">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:#a78bfa;margin-bottom:8px;">
              Code d'invitation
            </div>
            <div style="font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:800;letter-spacing:4px;color:#ffffff;">
              ${code}
            </div>
          </div>
        </td>
      </tr>
    </table>`;

  const textLines = [
    `Bonjour ${name},`,
    "",
    "Vous êtes invité à rejoindre la plateforme académique Axelmond Research Labs.",
    "",
    `Votre code d'invitation est : ${input.inviteCode}`,
    `Rejoignez la plateforme ici : ${input.inviteUrl}`,
    "",
    "---",
    "",
    "Axelmond Research Labs",
    "Research • Innovation • Education",
    "",
    `© ${now.getFullYear()} Axelmond Research Labs - Tous droits réservés`,
    "Ceci est un message automatique — merci de ne pas répondre à cet e-mail.",
  ];

  return {
    text: textLines.join("\n"),
    html: buildBaseEmailHtml({
      title: "Invitation académique — Axelmond Research Labs",
      headline: "Invitation à rejoindre la plateforme",
      bodyHtml,
      ctaButton: { href: input.inviteUrl, label: "Rejoindre la plateforme" },
      requestedAt: now,
    }),
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

// ─── 5. NOTIFICATION ─────────────────────────────────────────────────────────

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
  const name = firstName(input.fullName);
  const safeActionUrl = input.actionUrl ? buildAbsoluteAppUrl(sanitizeInternalAppPath(input.actionUrl)) : undefined;
  const now = new Date();

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;text-align:center;">
      Bonjour <strong style="color:#f1f5f9;">${escapeHtml(name)}</strong>,
    </p>
    <p style="margin:0 0 8px;color:#94a3b8;text-align:center;line-height:1.8;">
      Vous avez une nouvelle notification de <strong style="color:#e2e8f0;">Axelmond Research Labs</strong>&nbsp;:
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;">
      <tr>
        <td style="background:#0c1228;border-left:4px solid #6366f1;border-radius:0 10px 10px 0;padding:16px 20px;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:800;color:#e2e8f0;margin-bottom:8px;">
            ${escapeHtml(input.messageTitle)}
          </div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#94a3b8;line-height:1.7;">
            ${escapeHtml(input.messageBody)}
          </div>
        </td>
      </tr>
    </table>`;

  const textLines = [
    `Bonjour ${name},`,
    "",
    `Nouvelle notification de Axelmond Research Labs : ${input.messageTitle}`,
    "",
    input.messageBody,
    ...(safeActionUrl ? ["", `Lien d'action : ${safeActionUrl}`] : []),
    "",
    "---",
    "",
    "Axelmond Research Labs",
    "Research • Innovation • Education",
    "",
    `© ${now.getFullYear()} Axelmond Research Labs - Tous droits réservés`,
    "Ceci est un message automatique — merci de ne pas répondre à cet e-mail.",
  ];

  return {
    text: textLines.join("\n"),
    html: buildBaseEmailHtml({
      title: `${input.messageTitle} — Axelmond Research Labs`,
      headline: input.messageTitle,
      bodyHtml,
      ctaButton: safeActionUrl ? { href: safeActionUrl, label: "Accéder à la notification" } : undefined,
      requestedAt: now,
    }),
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
      subject: `Notification : ${input.messageTitle} — Axelmond Research Labs`,
      text: content.text,
      html: content.html,
    },
    env,
  );
  return { sent: true, delivery };
}

// ─── 6. EMAIL DIAGNOSTIC ADMIN ────────────────────────────────────────────────

export async function sendAdminTestEmail(to: string, env: NodeJS.ProcessEnv = process.env) {
  if (!isSmtpConfigured(env)) {
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" as const };
  }

  const now = new Date();

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#94a3b8;text-align:center;line-height:1.8;">
      Ceci est un e-mail de diagnostic envoyé depuis le panneau d'administration.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;">
      <tr>
        <td align="center">
          <div style="display:inline-block;background:#020617;border:1px solid #14532d;border-radius:14px;padding:18px 28px;box-shadow:0 0 30px rgba(34,197,94,.1);">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:32px;text-align:center;">&#x2705;</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:800;color:#4ade80;margin-top:8px;letter-spacing:.5px;">
              Configuration SMTP validée
            </div>
          </div>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#64748b;font-size:13px;text-align:center;line-height:1.7;">
      Si vous recevez cet e-mail, le serveur <strong style="color:#94a3b8;">Axelmond Research Labs</strong>
      peut envoyer des messages via Hostinger SMTP.
    </p>`;

  const delivery = await sendMailWithDiagnostics(
    {
      from: env.EMAIL_FROM,
      to,
      subject: "Diagnostic SMTP — Axelmond Research Labs",
      text: [
        "Bonjour,",
        "",
        "Ceci est un e-mail de diagnostic envoyé depuis l'administration Axelmond Research Labs.",
        "",
        "Si vous recevez ce message, la configuration SMTP Hostinger fonctionne.",
        "",
        "Axelmond Research Labs",
        "Ceci est un message automatique — merci de ne pas répondre à cet e-mail.",
      ].join("\n"),
      html: buildBaseEmailHtml({
        title: "Diagnostic SMTP — Axelmond Research Labs",
        headline: "Test de configuration SMTP",
        bodyHtml,
        requestedAt: now,
      }),
    },
    env,
  );

  return { sent: true as const, delivery };
}
