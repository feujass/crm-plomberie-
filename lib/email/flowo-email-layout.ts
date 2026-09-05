import { APP_NAME } from "@/lib/app-branding";
import { publicSiteUrl } from "@/lib/supabase/env";

type FlowoEmailLayoutOpts = {
  title: string;
  preview?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Bloc HTML de boutons (prioritaire sur ctaLabel/ctaHref). */
  ctaHtml?: string;
  /** Nom affiché en en-tête (ex. entreprise artisan). Par défaut : Flowo. */
  brandName?: string;
  /** Pied de page personnalisé (e-mails client). */
  footerHtml?: string;
};

export function flowoEmailLayout(opts: FlowoEmailLayoutOpts): string {
  const site = publicSiteUrl();
  const brand = opts.brandName?.trim() || APP_NAME;
  const isArtisanBrand = Boolean(opts.brandName?.trim());
  const logoUrl = isArtisanBrand ? null : `${site}/flowo-logo-mark.png`;
  const preview = opts.preview ?? opts.title;

  const headerBlock = logoUrl
    ? `<img src="${logoUrl}" alt="${brand}" width="56" height="56" style="display:block;margin:0 auto 12px;border-radius:14px;" />
              <p style="margin:0;font-size:22px;font-weight:700;color:#1d4ed8;letter-spacing:-0.02em;">${brand}</p>`
    : `<p style="margin:0;font-size:22px;font-weight:700;color:#1d4ed8;letter-spacing:-0.02em;">${brand}</p>`;

  const footer =
    opts.footerHtml ??
    (isArtisanBrand
      ? `Cet e-mail vous a été envoyé par <strong>${brand}</strong>. Si vous n&apos;êtes pas concerné(e), vous pouvez l&apos;ignorer.`
      : `Cet e-mail a été envoyé par ${APP_NAME}. Si tu n’es pas à l’origine de cette demande, tu peux l’ignorer en toute sécurité.`);


  const ctaBlock =
    opts.ctaHtml ??
    (opts.ctaHref && opts.ctaLabel
      ? `<p style="margin:28px 0 0;">
          <a href="${opts.ctaHref}" style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:600;font-size:15px;line-height:1;padding:14px 28px;border-radius:10px;text-decoration:none;">
            ${opts.ctaLabel}
          </a>
        </p>
        <p style="margin:16px 0 0;font-size:12px;color:#64748b;word-break:break-all;">
          Ou copie ce lien : <a href="${opts.ctaHref}" style="color:#2563eb;">${opts.ctaHref}</a>
        </p>`
      : "");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <span style="display:none;max-height:0;overflow:hidden;">${preview}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 16px;text-align:center;background:linear-gradient(180deg,#eff6ff 0%,#ffffff 100%);">
              ${headerBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-size:15px;line-height:1.6;color:#334155;">
              ${opts.bodyHtml}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
