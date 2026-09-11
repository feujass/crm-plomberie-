import type { BackendFactureDetail, BackendProfile } from "@/types/backend";

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const d = iso.slice(0, 10);
  return d.includes("-") ? d.split("-").reverse().join("/") : d;
}

function fecDate(iso?: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10).replace(/-/g, "");
}

function escCsv(value: unknown): string {
  const s = String(value ?? "");
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** CSV compatible Pennylane, Indy et la plupart des cabinets (séparateur ;). */
export function buildFacturesComptaCsv(factures: BackendFactureDetail[]): string {
  const header = [
    "Date facture",
    "Numéro",
    "Client",
    "Libellé",
    "Montant HT",
    "Montant TVA",
    "Montant TTC",
    "Statut",
    "Date échéance",
  ];
  const lines = [header.join(";")];

  for (const f of factures) {
    const ht = round2(Number(f.total_ht ?? 0));
    const tva = round2(Number(f.total_tva ?? 0));
    const ttc = round2(Number(f.total_ttc ?? ht + tva));
    lines.push(
      [
        fmtDate(f.date_emission ?? f.created_at),
        f.numero ?? "",
        f.client_nom ?? "",
        `Facture ${f.numero ?? ""}`.trim(),
        ht.toFixed(2).replace(".", ","),
        tva.toFixed(2).replace(".", ","),
        ttc.toFixed(2).replace(".", ","),
        f.statut ?? "",
        fmtDate(f.date_echeance),
      ]
        .map(escCsv)
        .join(";"),
    );
  }

  return lines.join("\n");
}

/** Écritures comptables ventes (format FEC simplifié, pipe). */
export function buildFacturesFec(factures: BackendFactureDetail[], profile: BackendProfile | null | undefined): string {
  const siren = (profile?.siren ?? profile?.siret?.slice(0, 9) ?? "000000000").replace(/\D/g, "").slice(0, 9);
  const now = new Date();
  const fileDate = fecDate(now.toISOString());
  const lines: string[] = [
    `#FEC Flowo — SIREN ${siren} — généré le ${fmtDate(now.toISOString())}`,
    "JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise",
  ];

  let ecritureNum = 1;
  for (const f of factures) {
    const ht = round2(Number(f.total_ht ?? 0));
    const tva = round2(Number(f.total_tva ?? 0));
    const ttc = round2(Number(f.total_ttc ?? ht + tva));
    if (ttc <= 0 && ht <= 0) continue;

    const date = fecDate(f.date_emission ?? f.created_at) || fileDate;
    const piece = f.numero ?? `F-${f.id.slice(0, 8)}`;
    const lib = `Facture ${piece} — ${f.client_nom ?? "Client"}`.slice(0, 120);
    const num = String(ecritureNum++).padStart(6, "0");

    const row = (compte: string, compteLib: string, debit: number, credit: number) =>
      ["VE", "Journal des ventes", num, date, compte, compteLib, "", "", piece, date, lib, debit.toFixed(2), credit.toFixed(2), "", "", date, "", "EUR"].join("|");

    lines.push(row("411000", "Clients", ttc, 0));
    if (ht > 0) lines.push(row("706000", "Prestations de services", 0, ht));
    if (tva > 0) lines.push(row("445710", "TVA collectée", 0, tva));
  }

  return lines.join("\n");
}
