export type DevisClientEmailCta = {
  label: string;
  href: string;
  style?: "primary" | "success" | "neutral";
};

export function devisClientPublicUrl(site: string, publicToken: string): string {
  return `${site.replace(/\/+$/, "")}/devis/public/${encodeURIComponent(publicToken)}`;
}

export function devisClientEmailCtas(publicUrl: string): DevisClientEmailCta[] {
  const base = publicUrl.split("#")[0]!.split("?")[0]!;
  return [
    { label: "Accepter le devis", href: `${base}?intent=accepte`, style: "success" },
    { label: "Refuser", href: `${base}?intent=refuse`, style: "neutral" },
    { label: "Voir le détail", href: base, style: "primary" },
  ];
}

export function renderDevisClientEmailCtas(buttons: DevisClientEmailCta[]): string {
  const styles: Record<NonNullable<DevisClientEmailCta["style"]>, string> = {
    primary: "background:#2563eb;color:#ffffff;",
    success: "background:#059669;color:#ffffff;",
    neutral: "background:#ffffff;color:#334155;border:1px solid #cbd5e1;",
  };

  const cells = buttons
    .map((btn) => {
      const style = styles[btn.style ?? "primary"];
      return `<a href="${btn.href}" style="display:inline-block;${style}font-weight:600;font-size:14px;line-height:1;padding:12px 18px;border-radius:10px;text-decoration:none;margin:4px 6px 4px 0;">${btn.label}</a>`;
    })
    .join("");

  const mainLink = buttons.find((b) => b.style === "primary")?.href ?? buttons[0]?.href ?? "";

  return `<div style="margin:28px 0 0;">${cells}</div>
    ${
      mainLink
        ? `<p style="margin:16px 0 0;font-size:12px;color:#64748b;word-break:break-all;">
            Lien du devis : <a href="${mainLink}" style="color:#2563eb;">${mainLink}</a>
          </p>`
        : ""
    }`;
}
