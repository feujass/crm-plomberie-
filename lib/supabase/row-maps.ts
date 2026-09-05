import { mapSupabaseProfile } from "@/lib/supabase/profile-map";
import type {
  BackendClient,
  BackendDevis,
  BackendDevisDetail,
  BackendDevisLine,
  BackendOuvrage,
  BackendProfile,
} from "@/types/backend";

export function mapClientRow(row: Record<string, unknown>): BackendClient {
  return {
    id: String(row.id),
    nom: String(row.nom ?? ""),
    prenom: (row.prenom as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    tel: (row.tel as string) ?? undefined,
    adresse: (row.adresse as string) ?? undefined,
    type: (row.type as string) ?? "particulier",
    siret: (row.siret as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    inactive: Boolean(row.inactive),
    created_at: (row.created_at as string) ?? undefined,
  };
}

export function mapDevisLineRow(row: Record<string, unknown>): BackendDevisLine {
  return {
    section: (row.section as string) ?? undefined,
    designation: String(row.designation ?? ""),
    quantite: row.quantite != null ? Number(row.quantite) : undefined,
    unite: (row.unite as string) ?? undefined,
    prix_ht: row.prix_ht != null ? Number(row.prix_ht) : undefined,
    tva: row.tva != null ? Number(row.tva) : undefined,
    total_ht: row.total_ht != null ? Number(row.total_ht) : undefined,
    ligne_type: (row.ligne_type as string) ?? undefined,
  };
}

export function mapDevisRow(row: Record<string, unknown>, clientNom?: string): BackendDevis {
  return {
    id: String(row.id),
    numero: (row.numero as string) ?? undefined,
    statut: (row.statut as string) ?? undefined,
    client_id: row.client_id ? String(row.client_id) : undefined,
    client_nom: clientNom,
    total_ht: row.total_ht != null ? Number(row.total_ht) : undefined,
    total_ttc: row.total_ttc != null ? Number(row.total_ttc) : undefined,
    created_at: (row.created_at as string) ?? (row.date_creation as string) ?? undefined,
    public_token: row.share_token ? String(row.share_token) : undefined,
    date_envoi: (row.date_envoi as string) ?? undefined,
    derniere_relance_at: (row.derniere_relance_at as string) ?? undefined,
  };
}

export function mapDevisDetailRow(
  row: Record<string, unknown>,
  lignes: BackendDevisLine[],
  internalNotes: string,
  clientNom?: string,
): BackendDevisDetail {
  const remiseType = row.remise_type as string | null | undefined;
  return {
    ...mapDevisRow(row, clientNom),
    lignes,
    notes: (row.notes as string) ?? undefined,
    internal_notes: internalNotes || undefined,
    date_expiration: row.date_expiration ? String(row.date_expiration) : undefined,
    remise_type:
      remiseType === "percent"
        ? "pourcentage"
        : remiseType === "fixed"
          ? "montant"
          : (remiseType as string | undefined),
    remise_valeur: row.remise_value != null ? Number(row.remise_value) : undefined,
    total_ht: row.total_ht != null ? Number(row.total_ht) : undefined,
    total_tva: row.total_tva != null ? Number(row.total_tva) : undefined,
    adresse_chantier: (row.adresse_chantier as string) ?? undefined,
    esign_provider: (row.esign_provider as string) ?? undefined,
    esign_envelope_id: (row.esign_envelope_id as string) ?? undefined,
    esign_status: (row.esign_status as string) ?? undefined,
    esign_signed_at: (row.esign_signed_at as string) ?? undefined,
    esign_proof: row.esign_proof as Record<string, unknown> | undefined,
  };
}

export function mapOuvrageRow(row: Record<string, unknown>): BackendOuvrage {
  return {
    id: String(row.id),
    nom: String(row.nom ?? ""),
    description: (row.description as string) ?? undefined,
    type: (row.type as string) ?? undefined,
    prix_ht: row.prix_ht != null ? Number(row.prix_ht) : undefined,
    unite: (row.unite as string) ?? undefined,
    tva: row.tva != null ? Number(row.tva) : undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : undefined,
    created_at: (row.created_at as string) ?? undefined,
  };
}

export function mapProfileRow(row: Record<string, unknown> | null): BackendProfile {
  return mapSupabaseProfile(row) ?? {};
}

export function calcDevisTotals(lignes: Array<Record<string, unknown>>) {
  let totalHt = 0;
  let totalTva = 0;
  for (const l of lignes) {
    const qty = Number(l.quantite ?? 1);
    const prix = Number(l.prix_ht ?? 0);
    const tva = Number(l.tva ?? 10);
    const lineHt = Math.round(qty * prix * 100) / 100;
    l.total_ht = lineHt;
    totalHt += lineHt;
    totalTva += lineHt * (tva / 100);
  }
  return {
    lignes,
    total_ht: Math.round(totalHt * 100) / 100,
    total_tva: Math.round(totalTva * 100) / 100,
    total_ttc: Math.round((totalHt + totalTva) * 100) / 100,
  };
}

export function remiseTypeToDb(value: unknown): "percent" | "fixed" | null {
  if (value === "percent" || value === "pourcentage") return "percent";
  if (value === "fixed" || value === "montant") return "fixed";
  return null;
}

export async function clientDisplayName(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  clientId: string | null | undefined,
): Promise<string> {
  if (!clientId) return "";
  const { data } = await supabase.from("clients").select("nom, prenom").eq("id", clientId).maybeSingle();
  if (!data) return "";
  const nom = String(data.nom ?? "").trim();
  const prenom = String(data.prenom ?? "").trim();
  return prenom ? `${prenom} ${nom}`.trim() : nom;
}

export async function nextDevisNumero(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("devis")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return `DEV-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export function profileUpdateFromBody(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const map: Record<string, string> = {
    entreprise: "entreprise_nom",
    conditions_paiement: "conditions_paiement_defaut",
    onboarding_step: "onboarding_steps_completed",
  };
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    if (key === "onboarding_complete") continue;
    const col = map[key] ?? key;
    out[col] = value;
  }
  if (body.onboarding_complete === true && out.onboarding_steps_completed == null) {
    out.onboarding_steps_completed = 3;
  }
  return out;
}

export async function nextFactureNumero(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("factures")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return `FACT-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}
