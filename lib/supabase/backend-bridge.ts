import { createClient } from "@/lib/supabase/server";
import { buildMeResponse } from "@/lib/supabase/profile-map";
import { handleSupabaseDataRoute } from "@/lib/supabase/data-routes";
import type { BackendFetchOptions } from "@/lib/backend/server";
import type { BackendDashboardStats, BackendDevis } from "@/types/backend";

function mapDevisRow(row: Record<string, unknown>): BackendDevis {
  return {
    id: String(row.id),
    numero: row.numero as string | undefined,
    statut: row.statut as string | undefined,
    client_id: row.client_id as string | undefined,
    total_ht: row.total_ht != null ? Number(row.total_ht) : undefined,
    total_ttc: row.total_ttc != null ? Number(row.total_ttc) : undefined,
    created_at: (row.created_at as string) ?? (row.date_creation as string),
    public_token: row.share_token as string | undefined,
    date_envoi: row.date_envoi as string | undefined,
    derniere_relance_at: row.derniere_relance_at as string | undefined,
  };
}

async function fetchDashboardStats(userId: string): Promise<BackendDashboardStats> {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [{ data: allDevis }, { count: clientCount }, { data: factures }] = await Promise.all([
    supabase.from("devis").select("*").eq("user_id", userId),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("factures")
      .select("total_ttc, statut")
      .eq("user_id", userId)
      .in("statut", ["emise", "partielle", "retard"]),
  ]);

  const devis = (allDevis ?? []) as Record<string, unknown>[];
  const monthDevis = devis.filter((d) => {
    const raw = (d.created_at ?? d.date_creation) as string | undefined;
    if (!raw) return false;
    return new Date(raw) >= monthStart;
  });
  const sentWaiting = devis.filter((d) => d.statut === "envoye");
  const statutsAcceptes = new Set(["accepte", "facture"]);
  const statutsTaux = new Set(["envoye", "accepte", "refuse", "facture"]);
  const totalAccepted = devis.filter((d) => statutsAcceptes.has(String(d.statut))).length;
  const totalTaux = devis.filter((d) => statutsTaux.has(String(d.statut))).length;
  const caMois = monthDevis
    .filter((d) => statutsAcceptes.has(String(d.statut)))
    .reduce((s, d) => s + Number(d.total_ttc ?? 0), 0);
  const montantAttente = sentWaiting.reduce((s, d) => s + Number(d.total_ttc ?? 0), 0);
  const montantImpaye = (factures ?? []).reduce((s, f) => s + Number(f.total_ttc ?? 0), 0);
  const recent = [...devis]
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, 3)
    .map(mapDevisRow);

  return {
    devis_du_mois: monthDevis.length,
    taux_acceptation: totalTaux > 0 ? Math.round((totalAccepted / totalTaux) * 1000) / 10 : 0,
    ca_mois: Math.round(caMois * 100) / 100,
    montant_attente: Math.round(montantAttente * 100) / 100,
    montant_impaye: Math.round(montantImpaye * 100) / 100,
    client_count: clientCount ?? 0,
    recent_devis: recent,
    relances: sentWaiting.slice(0, 5).map(mapDevisRow),
  };
}

export async function supabaseBackendFetch(path: string, opts: BackendFetchOptions = {}): Promise<unknown> {
  const normalized = path.replace(/\?.*$/, "");

  if (normalized.startsWith("/api/public/")) {
    return handleSupabaseDataRoute(path, opts, null);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (normalized === "/api/dashboard/stats") {
    if (!user) throw new Error("Non authentifié");
    return fetchDashboardStats(user.id);
  }

  if (normalized === "/api/auth/me") {
    if (!user) throw new Error("Non authentifié");
    const method = (opts.method ?? "GET").toUpperCase();
    if (method === "GET") {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return buildMeResponse(user, profile);
    }
    return handleSupabaseDataRoute(path, opts, user);
  }

  if (opts.auth === false) {
    return handleSupabaseDataRoute(path, opts, null);
  }

  return handleSupabaseDataRoute(path, opts, user);
}
