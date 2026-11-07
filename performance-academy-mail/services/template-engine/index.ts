/**
 * Performance Academy Mail (PAM) - Template Engine
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export type TemplateRenderer = (variables: Record<string, any>) => RenderedEmail;

function escapeHtml(val: any): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const templateRegistry: Record<string, TemplateRenderer> = {
  'email-verification': (vars) => {
    const code = escapeHtml(vars.code || '------');
    const name = escapeHtml(vars.name || 'Étudiant');
    const validity = vars.expiresInMinutes || 15;
    const verifyUrl = vars.verifyUrl ? String(vars.verifyUrl) : null;

    return {
      subject: `Code de vérification : ${code} — Performance Académique`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #031512; color: #ecfdfa; padding: 32px 16px;">
          <div style="max-width: 600px; margin: 0 auto; background: #06231f; border: 1px solid #075F52; border-radius: 20px; padding: 32px;">
            <h1 style="color: #05C2A5; font-size: 24px; text-align: center; margin-bottom: 20px;">Vérification de votre compte</h1>
            <p style="font-size: 15px; line-height: 1.6; color: #d6f7f1;">Bonjour <strong>${name}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #8fbdb5;">Voici votre code personnel à 6 chiffres pour valider votre adresse e-mail sur Performance Académique :</p>
            <div style="text-align: center; margin: 28px 0;">
              <span style="font-family: monospace; font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #ffffff; background: #02110f; padding: 16px 28px; border-radius: 12px; border: 1px solid #05C2A5; display: inline-block;">
                ${code}
              </span>
            </div>
            <p style="font-size: 12px; color: #5c8d84; text-align: center;">Ce code est valable pendant <strong>${validity} minutes</strong>. Ne le partagez jamais.</p>
            ${verifyUrl ? `<div style="text-align: center; margin-top: 24px;"><a href="${escapeHtml(verifyUrl)}" style="background: #05C2A5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Confirmer mon compte</a></div>` : ''}
          </div>
        </div>
      `,
      text: `Bonjour ${name},\n\nVotre code de vérification Performance Académique est : ${code}\nCe code est valable pendant ${validity} minutes.\n\nNe partagez jamais ce code.`,
    };
  },

  'password-reset': (vars) => {
    const code = escapeHtml(vars.code || '------');
    const name = escapeHtml(vars.name || 'Étudiant');
    const validity = vars.expiresInMinutes || 60;
    const resetUrl = vars.resetUrl ? String(vars.resetUrl) : null;

    return {
      subject: `Réinitialisation de votre mot de passe : ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #031512; color: #ecfdfa; padding: 32px 16px;">
          <div style="max-width: 600px; margin: 0 auto; background: #06231f; border: 1px solid #075F52; border-radius: 20px; padding: 32px;">
            <h1 style="color: #05C2A5; font-size: 24px; text-align: center; margin-bottom: 20px;">Réinitialisation de mot de passe</h1>
            <p style="font-size: 15px; color: #d6f7f1;">Bonjour <strong>${name}</strong>,</p>
            <p style="font-size: 14px; color: #8fbdb5;">Utilisez le code suivant pour réinitialiser le mot de passe de votre compte :</p>
            <div style="text-align: center; margin: 28px 0;">
              <span style="font-family: monospace; font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #ffffff; background: #02110f; padding: 16px 28px; border-radius: 12px; border: 1px solid #05C2A5; display: inline-block;">
                ${code}
              </span>
            </div>
            <p style="font-size: 12px; color: #5c8d84; text-align: center;">Ce code expire dans <strong>${validity} minutes</strong>.</p>
            ${resetUrl ? `<div style="text-align: center; margin-top: 24px;"><a href="${escapeHtml(resetUrl)}" style="background: #05C2A5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Changer mon mot de passe</a></div>` : ''}
          </div>
        </div>
      `,
      text: `Bonjour ${name},\n\nVotre code de réinitialisation de mot de passe est : ${code}\nCe code expire dans ${validity} minutes.`,
    };
  },
};

export class TemplateEngine {
  public static render(templateName: string, variables: Record<string, any> = {}): RenderedEmail {
    const renderer = templateRegistry[templateName];
    if (!renderer) {
      throw new Error(`Modèle de message introuvable : '${templateName}'`);
    }
    return renderer(variables);
  }

  public static register(templateName: string, renderer: TemplateRenderer): void {
    templateRegistry[templateName] = renderer;
  }

  public static has(templateName: string): boolean {
    return Boolean(templateRegistry[templateName]);
  }
}
