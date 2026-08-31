import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

import type { BackendFetchOptions } from "@/lib/backend/server";
import { devisRelanceEcheances, factureRelanceEcheances, isRelanceDue } from "@/lib/relances/schedule";
import { relanceEcheancesFromProfile } from "@/lib/relances/save-settings";
import { mapProfileArtisanFields } from "@/lib/relances/cron-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMeResponse } from "@/lib/supabase/profile-map";
import {
  clientDisplayName,
  mapDevisDetailRow,
  mapDevisLineRow,
  nextFactureNumero,
} from "@/lib/supabase/row-maps";
import { fetchDevisLignesHelper } from "@/lib/supabase/routes-shared";

function asObject(body: unknown): Record<string, unknown> {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

function parsePath(path: string) {
  const [pathname, queryString] = path.split("?");
  const query = new URLSearchParams(queryString ?? "");
  const segments = pathname.split("/").filter(Boolean);
  return { query, segments };
}

function parseBody(opts: BackendFetchOptions): unknown {
  if (!opts.body) return {};
  if (typeof opts.body === "string") {
    try {
      return JSON.parse(opts.body);
    } catch {
      return {};
    }
  }
  return opts.body;
}

function verifyCronSecret(opts: BackendFetchOptions) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) throw new Error("CRON_SECRET manquant");
  const auth = opts.headers?.Authorization ?? opts.headers?.authorization;
  if (auth !== `Bearer ${secret}`) throw new Error("Non autorisé (cron)");
}

function verifyInternalSecret(opts: BackendFetchOptions) {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) throw new Error("INTERNAL_API_SECRET manquant");
  const auth = opts.headers?.Authorization ?? opts.headers?.authorization;
  if (auth !== `Bearer ${secret}`) throw new Error("Non autorisé (internal)");
}

async function auditLog(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown> = {},
) {
  await supabase.from("compliance_audit_events").insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    payload,
  });
}

async function createDefaultTransmissions(
  supabase: SupabaseClient,
  userId: string,
  factureId: string,
  branche: string,
) {
  const kinds =
    branche === "public"
      ? ["chorus_pro"]
      : branche === "pro_ue"
        ? ["pdp", "ereporting"]
        : ["pdp"];
  for (const kind of kinds) {
    await supabase.from("compliance_transmissions").insert({
      user_id: userId,
      facture_id: factureId,
      kind,
      status: "pending",
      detail: "En attente de transmission",
    });
  }
}

export async function handlePublicRoute(path: string, opts: BackendFetchOptions = {}): Promise<unknown> {
  const admin = createAdminClient();
  const method = (opts.method ?? "GET").toUpperCase();
  const body = asObject(parseBody(opts));
  const { segments } = parsePath(path);
  const token = segments[3];

  if (segments[2] === "devis" && token && segments[4] === "decision" && method === "POST") {
    const decision = String(body.decision ?? "").trim();
    if (decision !== "accepte" && decision !== "refuse") {
      throw new Error("Décision invalide (accepte ou refuse).");
    }

    const { data, error } = await admin.from("devis").select("*").eq("share_token", token).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Devis introuvable");
    if (data.statut !== "envoye") {
      throw new Error("Ce devis ne peut plus être accepté ou refusé en ligne.");
    }

    const { data: updated, error: upErr } = await admin
      .from("devis")
      .update({ statut: decision })
      .eq("id", data.id)
      .select("*")
      .single();
    if (upErr) throw new Error(upErr.message);

    const userId = String(data.user_id);
    await auditLog(
      admin,
      userId,
      decision === "accepte" ? "devis.accepted_public" : "devis.refused_public",
      "devis",
      String(data.id),
      { numero: data.numero, share_token: token },
    );

    const clientNom = await clientDisplayName(admin, updated.client_id as string | null);
    return {
      ok: true,
      statut: decision,
      numero: updated.numero,
      client_nom: clientNom,
      owner_user_id: userId,
    };
  }

  if (segments[2] === "devis" && token && method === "GET") {
    const { data, error } = await admin
      .from("devis")
      .select("*")
      .eq("share_token", token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Devis introuvable");
    const { data: lignes } = await admin
      .from("devis_lignes")
      .select("*")
      .eq("devis_id", data.id)
      .order("ordre", { ascending: true });
    const clientNom = await clientDisplayName(admin, data.client_id as string | null);
    const mapped = (lignes ?? []).map((l) => mapDevisLineRow(l as Record<string, unknown>));
    return {
      numero: data.numero,
      client_nom: clientNom,
      statut: data.statut,
      peut_repondre: data.statut === "envoye",
      lignes: mapped,
      total_ht: Number(data.total_ht ?? 0),
      total_tva: Number(data.total_tva ?? 0),
      total_ttc: Number(data.total_ttc ?? 0),
      notes: data.notes,
      date_creation: data.date_creation ?? data.created_at,
    };
  }

  if (segments[2] === "factures" && token) {
    const { data, error } = await admin
      .from("factures")
      .select("*")
      .eq("share_token", token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Facture introuvable");
    const { data: lignes } = await admin.from("facture_lignes").select("*").eq("facture_id", data.id);
    const clientNom = await clientDisplayName(admin, data.client_id as string | null);
    return {
      numero: data.numero,
      client_nom: clientNom,
      statut: data.statut,
      lignes: (lignes ?? []).map((l) => ({
        designation: l.designation,
        quantite: Number(l.quantite ?? 1),
        prix_ht: Number(l.prix_ht ?? 0),
        tva: Number(l.tva ?? 10),
        total_ht: Number(l.total_ht ?? 0),
      })),
      total_ht: Number(data.total_ht ?? 0),
      total_tva: Number(data.total_tva ?? 0),
      total_ttc: Number(data.total_ttc ?? 0),
      notes: data.notes,
      date_emission: data.date_emission,
      date_echeance: data.date_echeance,
    };
  }

  throw new Error(`Route publique inconnue : ${path}`);
}

export async function handleCronRoute(path: string, opts: BackendFetchOptions): Promise<unknown> {
  verifyCronSecret(opts);
  const admin = createAdminClient();
  const method = (opts.method ?? "GET").toUpperCase();
  const { segments } = parsePath(path);

  if (method === "GET" && segments[2] === "devis-a-relancer") {
    const { data: devisRows } = await admin.from("devis").select("*").eq("statut", "envoye");
    const items = [];
    const profileCache = new Map<string, Record<string, unknown>>();
    const emailCache = new Map<string, string | null>();

    for (const d of devisRows ?? []) {
      const sentAt = d.date_envoi ? String(d.date_envoi) : "";
      if (!sentAt) continue;
      const count = Number(d.relance_count ?? 0);

      let prof = profileCache.get(String(d.user_id));
      if (!prof) {
        const { data } = await admin.from("profiles").select("*").eq("id", d.user_id).maybeSingle();
        prof = (data ?? {}) as Record<string, unknown>;
        profileCache.set(String(d.user_id), prof);
      }
      const echeances = devisRelanceEcheances(relanceEcheancesFromProfile(prof));
      if (count >= echeances.length) continue;
      if (!isRelanceDue(sentAt, echeances, count)) continue;

      let clientEmail: string | null = null;
      let clientNom: string | null = null;
      if (d.client_id) {
        const { data: c } = await admin
          .from("clients")
          .select("email, nom, prenom")
          .eq("id", d.client_id)
          .maybeSingle();
        clientEmail = c?.email ? String(c.email).trim() : null;
        const parts = [c?.prenom, c?.nom].map((s) => String(s ?? "").trim()).filter(Boolean);
        clientNom = parts.length ? parts.join(" ") : null;
      }

      let authEmail = emailCache.get(String(d.user_id));
      if (authEmail === undefined) {
        const { data: authUser } = await admin.auth.admin.getUserById(String(d.user_id));
        authEmail = authUser?.user?.email ?? null;
        emailCache.set(String(d.user_id), authEmail);
      }
      const artisan = mapProfileArtisanFields(prof, authEmail);

      items.push({
        id: String(d.id),
        user_id: String(d.user_id),
        numero: d.numero,
        public_token: String(d.share_token),
        client_email: clientEmail,
        client_nom: clientNom,
        entreprise: String(prof.entreprise_nom ?? "").trim() || null,
        email_facturation: String(prof.email_facturation ?? "").trim() || null,
        relance_index: count,
        relance_total: echeances.length,
        days_after_send: echeances[count]!,
        ...artisan,
      });
    }
    return { items };
  }

  if (method === "POST" && segments[2] === "devis" && segments[4] === "relance-envoyee") {
    const devisId = segments[3];
    const { data: current, error: readErr } = await admin
      .from("devis")
      .select("relance_count")
      .eq("id", devisId)
      .eq("statut", "envoye")
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current) throw new Error("Devis introuvable");
    const nextCount = Number(current.relance_count ?? 0) + 1;
    const { error, count } = await admin
      .from("devis")
      .update({ relance_count: nextCount, derniere_relance_at: new Date().toISOString() })
      .eq("id", devisId)
      .eq("statut", "envoye");
    if (error && error.message.toLowerCase().includes("relance_count")) {
      const { error: fbErr, count: fbCount } = await admin
        .from("devis")
        .update({ derniere_relance_at: new Date().toISOString() })
        .eq("id", devisId)
        .eq("statut", "envoye");
      if (fbErr) throw new Error(fbErr.message);
      if (!fbCount) throw new Error("Devis introuvable");
      return { ok: true, relance_count: 1 };
    }
    if (error) throw new Error(error.message);
    if (!count) throw new Error("Devis introuvable");
    return { ok: true, relance_count: nextCount };
  }

  if (method === "GET" && segments[2] === "factures-a-relancer") {
    const { data: factures } = await admin
      .from("factures")
      .select("*")
      .in("statut", ["emise", "partielle", "retard"]);
    const items = [];
    const profileCache = new Map<string, Record<string, unknown>>();
    const emailCache = new Map<string, string | null>();

    for (const f of factures ?? []) {
      const dueDate = f.date_echeance ? String(f.date_echeance) : "";
      if (!dueDate) continue;
      const baseIso = `${dueDate}T00:00:00.000Z`;
      const count = Number(f.relance_count ?? 0);

      let prof = profileCache.get(String(f.user_id));
      if (!prof) {
        const { data } = await admin.from("profiles").select("*").eq("id", f.user_id).maybeSingle();
        prof = (data ?? {}) as Record<string, unknown>;
        profileCache.set(String(f.user_id), prof);
      }
      const echeances = factureRelanceEcheances(relanceEcheancesFromProfile(prof));
      if (count >= echeances.length) continue;
      if (!isRelanceDue(baseIso, echeances, count)) continue;

      let clientEmail: string | null = null;
      let clientNom: string | null = null;
      if (f.client_id) {
        const { data: c } = await admin
          .from("clients")
          .select("email, nom, prenom")
          .eq("id", f.client_id)
          .maybeSingle();
        clientEmail = c?.email ? String(c.email).trim() : null;
        const parts = [c?.prenom, c?.nom].map((s) => String(s ?? "").trim()).filter(Boolean);
        clientNom = parts.length ? parts.join(" ") : null;
      }

      let authEmail = emailCache.get(String(f.user_id));
      if (authEmail === undefined) {
        const { data: authUser } = await admin.auth.admin.getUserById(String(f.user_id));
        authEmail = authUser?.user?.email ?? null;
        emailCache.set(String(f.user_id), authEmail);
      }
      const artisan = mapProfileArtisanFields(prof, authEmail);

      items.push({
        id: String(f.id),
        user_id: String(f.user_id),
        numero: f.numero,
        public_token: String(f.share_token),
        client_email: clientEmail,
        client_nom: clientNom,
        relance_index: count,
        relance_total: echeances.length,
        days_after_due: echeances[count]!,
        ...artisan,
      });
    }
    return { items };
  }

  if (method === "POST" && segments[2] === "factures" && segments[4] === "relance-envoyee") {
    const factureId = segments[3];
    const { data: current, error: readErr } = await admin
      .from("factures")
      .select("relance_count")
      .eq("id", factureId)
      .in("statut", ["emise", "partielle", "retard"])
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current) throw new Error("Facture introuvable");
    const nextCount = Number(current.relance_count ?? 0) + 1;
    const { error, count } = await admin
      .from("factures")
      .update({
        relance_count: nextCount,
        derniere_relance_at: new Date().toISOString(),
        statut: "retard",
      })
      .eq("id", factureId)
      .in("statut", ["emise", "partielle", "retard"]);
    if (error && error.message.toLowerCase().includes("relance_count")) {
      const { error: fbErr, count: fbCount } = await admin
        .from("factures")
        .update({ derniere_relance_at: new Date().toISOString(), statut: "retard" })
        .eq("id", factureId)
        .in("statut", ["emise", "partielle", "retard"]);
      if (fbErr) throw new Error(fbErr.message);
      if (!fbCount) throw new Error("Facture introuvable");
      return { ok: true, relance_count: 1 };
    }
    if (error) throw new Error(error.message);
    if (!count) throw new Error("Facture introuvable");
    return { ok: true, relance_count: nextCount };
  }

  throw new Error(`Route cron inconnue : ${path}`);
}

export async function handleInternalRoute(path: string, opts: BackendFetchOptions): Promise<unknown> {
  verifyInternalSecret(opts);
  const admin = createAdminClient();
  const b = asObject(parseBody(opts));
  const allowed = new Set(["free", "pro", "pro_plus", "pme"]);
  const plan = allowed.has(String(b.subscription_plan)) ? String(b.subscription_plan) : "pro";
  const update = {
    stripe_customer_id: b.stripe_customer_id,
    subscription_plan: plan,
    subscription_status: b.subscription_status,
  };
  if (b.user_id) {
    const { error, count } = await admin
      .from("profiles")
      .update(update)
      .eq("id", String(b.user_id));
    if (error) throw new Error(error.message);
    if (!count) throw new Error("Profil introuvable");
  } else if (b.stripe_customer_id) {
    const { error, count } = await admin
      .from("profiles")
      .update(update)
      .eq("stripe_customer_id", String(b.stripe_customer_id));
    if (error) throw new Error(error.message);
    if (!count) throw new Error("Profil introuvable pour ce client Stripe");
  }
  return { ok: true };
}

export async function handleDashboardRentabilite(supabase: SupabaseClient, userId: string) {
  const { data: allDevis } = await supabase.from("devis").select("*").eq("user_id", userId).limit(5000);
  const devis = allDevis ?? [];
  const now = new Date();
  const curStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const curEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const prevStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevEnd = curStart;

  const caInRange = (start: Date, end: Date) =>
    devis
      .filter((d) => {
        const raw = d.created_at ?? d.date_creation;
        if (!raw) return false;
        const t = new Date(String(raw)).getTime();
        return t >= start.getTime() && t < end.getTime() && ["accepte", "facture"].includes(String(d.statut));
      })
      .reduce((s, d) => s + Number(d.total_ttc ?? 0), 0);

  const { data: facturesImpayees } = await supabase
    .from("factures")
    .select("total_ttc")
    .eq("user_id", userId)
    .in("statut", ["emise", "partielle"]);

  const monthly = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const ms = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    const me = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    monthly.push({
      mois: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      ca: Math.round(caInRange(ms, me) * 100) / 100,
    });
  }

  const devisEnvoyes = devis.filter((d) => d.statut === "envoye").length;
  const devisAcceptes = devis.filter((d) => ["accepte", "facture"].includes(String(d.statut))).length;
  const devisRefuses = devis.filter((d) => d.statut === "refuse").length;
  const pie = [
    { name: "Brouillon", value: devis.filter((d) => d.statut === "brouillon").length },
    { name: "Envoyé", value: devisEnvoyes },
    { name: "Accepté", value: devisAcceptes },
    { name: "Refusé", value: devisRefuses },
  ].filter((p) => p.value > 0);

  return {
    caMois: Math.round(caInRange(curStart, curEnd) * 100) / 100,
    caMoisPrec: Math.round(caInRange(prevStart, prevEnd) * 100) / 100,
    devisCrees: devis.length,
    devisEnvoyes,
    devisAcceptes,
    devisRefuses,
    montantMoyenDevis: devis.length
      ? Math.round((devis.reduce((s, d) => s + Number(d.total_ttc ?? 0), 0) / devis.length) * 100) / 100
      : 0,
    impayes: Math.round((facturesImpayees ?? []).reduce((s, f) => s + Number(f.total_ttc ?? 0), 0) * 100) / 100,
    monthly,
    pie: pie.length ? pie : [{ name: "Aucun", value: 1 }],
  };
}

export async function handleConformite(
  supabase: SupabaseClient,
  user: User,
  segments: string[],
  query: URLSearchParams,
) {
  const sub = segments[2];
  if (sub === "transmissions") {
    const limit = Math.min(Math.max(Number(query.get("limit") ?? 80), 1), 200);
    const { data, error } = await supabase
      .from("compliance_transmissions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((t) => ({
      id: String(t.id),
      facture_id: t.facture_id ? String(t.facture_id) : undefined,
      kind: t.kind,
      status: t.status,
      detail: t.detail,
      provider_ref: t.provider_ref,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
  }
  if (sub === "audit") {
    const limit = Math.min(Math.max(Number(query.get("limit") ?? 100), 1), 300);
    const { data, error } = await supabase
      .from("compliance_audit_events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((e) => ({
      id: String(e.id),
      action: e.action,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      created_at: e.created_at,
      payload: e.payload,
    }));
  }
  if (sub === "archive") {
    const { data: factures } = await supabase
      .from("factures")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(2000);
    const { data: transmissions } = await supabase
      .from("compliance_transmissions")
      .select("*")
      .eq("user_id", user.id)
      .limit(5000);
    const { data: audits } = await supabase
      .from("compliance_audit_events")
      .select("*")
      .eq("user_id", user.id)
      .limit(5000);
    const { data: devisRows } = await supabase
      .from("devis")
      .select("*")
      .eq("user_id", user.id)
      .limit(2000);
    return {
      exported_at: new Date().toISOString(),
      factures: factures ?? [],
      transmissions: transmissions ?? [],
      audit_events: audits ?? [],
      devis: devisRows ?? [],
    };
  }
  throw new Error(`Route conformité inconnue`);
}

export async function handleAuthMeUpdate(user: User, body: unknown, supabase: SupabaseClient) {
  const b = asObject(body);
  const prenom = String(b.prenom ?? "").trim();
  const nom = String(b.nom ?? "").trim();
  const update: Record<string, unknown> = {};
  if (prenom) update.prenom = prenom;
  if (nom) update.nom = nom;
  if (Object.keys(update).length > 0) {
    await supabase.from("profiles").update(update).eq("id", user.id);
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { prenom: prenom || user.user_metadata?.prenom, nom: nom || user.user_metadata?.nom },
    });
  }
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return buildMeResponse(user, profile);
}

export async function handleFacturesExtended(
  supabase: SupabaseClient,
  user: User,
  method: string,
  segments: string[],
  body: unknown,
) {
  const b = asObject(body);

  if (method === "POST" && segments[2] === "from-devis" && segments[3]) {
    const devisId = segments[3];
    const { data: devis, error: devisErr } = await supabase
      .from("devis")
      .select("*")
      .eq("id", devisId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (devisErr) throw new Error(devisErr.message);
    if (!devis) throw new Error("Devis non trouvé");

    const lignes = await fetchDevisLignesHelper(supabase, devisId);
    const numero = await nextFactureNumero(supabase, user.id);
    const now = new Date();
    const echeance = new Date(now);
    echeance.setDate(echeance.getDate() + 30);
    const clientNom = await clientDisplayName(supabase, devis.client_id as string | null);
    const branche = "particulier";

    const { data: facture, error } = await supabase
      .from("factures")
      .insert({
        user_id: user.id,
        devis_id: devisId,
        client_id: devis.client_id,
        numero,
        statut: "emise",
        total_ht: devis.total_ht,
        total_tva: devis.total_tva,
        total_ttc: devis.total_ttc,
        date_emission: now.toISOString().slice(0, 10),
        date_echeance: echeance.toISOString().slice(0, 10),
        adresse_livraison_chantier: String(b.adresse_livraison_chantier ?? devis.adresse_chantier ?? "").trim() || null,
        operations_type: String(b.operations_type ?? "services"),
        facture_type: String(b.facture_type ?? "standard"),
        conformite_branche: branche,
        conformite_warnings: [],
        locked_at: now.toISOString(),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const fid = String(facture.id);
    if (lignes.length > 0) {
      await supabase.from("facture_lignes").insert(
        lignes.map((l, i) => ({
          facture_id: fid,
          section: l.section ?? "",
          designation: l.designation,
          quantite: l.quantite ?? 1,
          unite: l.unite ?? "u",
          prix_ht: l.prix_ht ?? 0,
          tva: l.tva ?? 10,
          total_ht: l.total_ht ?? 0,
          ordre: i,
        })),
      );
    }

    await supabase.from("devis").update({ statut: "accepte" }).eq("id", devisId);
    await createDefaultTransmissions(supabase, user.id, fid, branche);
    await auditLog(supabase, user.id, "facture.created", "facture", fid, { numero, branche });

    return mapFactureDetail(facture as Record<string, unknown>, lignes, [], clientNom);
  }

  const factureId = segments[2];
  const sub = segments[3];
  const subAction = segments[4];

  if (method === "POST" && factureId && sub === "paiements") {
    const { data: facture, error: fErr } = await supabase
      .from("factures")
      .select("*")
      .eq("id", factureId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!facture) throw new Error("Facture non trouvée");

    const montant = Number(b.montant ?? 0);
    const mode = String(b.mode ?? "virement");
    const { error } = await supabase.from("paiements").insert({
      facture_id: factureId,
      montant,
      date: b.date ? String(b.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      mode,
    });
    if (error) throw new Error(error.message);

    const { data: paiements } = await supabase.from("paiements").select("*").eq("facture_id", factureId);
    const montantPaye = (paiements ?? []).reduce((s, p) => s + Number(p.montant ?? 0), 0);
    const statut = montantPaye >= Number(facture.total_ttc ?? 0) ? "payee" : "partielle";
    const { data: updated } = await supabase
      .from("factures")
      .update({ statut })
      .eq("id", factureId)
      .select("*")
      .single();

    await auditLog(supabase, user.id, "facture.paiement", "facture", factureId, { montant, mode });
    const lignes = await fetchFactureLignes(supabase, factureId);
    const clientNom = await clientDisplayName(supabase, updated?.client_id as string | null);
    return mapFactureDetail(updated as Record<string, unknown>, lignes, paiements ?? [], clientNom);
  }

  if (method === "GET" && factureId && sub === "transmissions" && !subAction) {
    const { data: facture } = await supabase
      .from("factures")
      .select("id")
      .eq("id", factureId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!facture) throw new Error("Facture non trouvée");
    const { data, error } = await supabase
      .from("compliance_transmissions")
      .select("*")
      .eq("user_id", user.id)
      .eq("facture_id", factureId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapTransmission);
  }

  if (method === "POST" && factureId && sub === "transmissions" && subAction === "retry") {
    const { data: facture } = await supabase
      .from("factures")
      .select("*")
      .eq("id", factureId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!facture) throw new Error("Facture non trouvée");
    const branche = String(facture.conformite_branche ?? "particulier");
    await supabase.from("compliance_transmissions").delete().eq("facture_id", factureId).eq("user_id", user.id);
    await createDefaultTransmissions(supabase, user.id, factureId, branche);
    await auditLog(supabase, user.id, "facture.transmissions_retry", "facture", factureId, { branche });
    const { data } = await supabase
      .from("compliance_transmissions")
      .select("*")
      .eq("facture_id", factureId)
      .order("created_at", { ascending: false });
    return (data ?? []).map(mapTransmission);
  }

  if (method === "GET" && factureId && sub === "chorus-export") {
    const { data: facture } = await supabase
      .from("factures")
      .select("*")
      .eq("id", factureId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!facture) throw new Error("Facture non trouvée");
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    return {
      facture_numero: facture.numero,
      date_emission: facture.date_emission,
      total_ttc: facture.total_ttc,
      emetteur: {
        entreprise: profile?.entreprise_nom,
        siret: profile?.siret,
        siren: profile?.siren,
      },
      chorus_service_code: facture.chorus_service_code,
      format: "chorus_stub_v1",
    };
  }

  return null;
}

async function fetchFactureLignes(supabase: SupabaseClient, factureId: string) {
  const { data } = await supabase
    .from("facture_lignes")
    .select("*")
    .eq("facture_id", factureId)
    .order("ordre", { ascending: true });
  return (data ?? []).map((l) => ({
    designation: String(l.designation ?? ""),
    quantite: Number(l.quantite ?? 1),
    unite: String(l.unite ?? "u"),
    prix_ht: Number(l.prix_ht ?? 0),
    tva: Number(l.tva ?? 10),
    total_ht: Number(l.total_ht ?? 0),
  }));
}

function mapTransmission(t: Record<string, unknown>) {
  return {
    id: String(t.id),
    facture_id: t.facture_id ? String(t.facture_id) : undefined,
    kind: t.kind,
    status: t.status,
    detail: t.detail,
    provider_ref: t.provider_ref,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

function mapFactureDetail(
  row: Record<string, unknown>,
  lignes: Array<Record<string, unknown>>,
  paiements: Array<Record<string, unknown>>,
  clientNom?: string,
) {
  const montantPaye = paiements.reduce((s, p) => s + Number(p.montant ?? 0), 0);
  return {
    id: String(row.id),
    numero: row.numero as string | undefined,
    statut: row.statut as string | undefined,
    total_ht: row.total_ht != null ? Number(row.total_ht) : undefined,
    total_tva: row.total_tva != null ? Number(row.total_tva) : undefined,
    total_ttc: row.total_ttc != null ? Number(row.total_ttc) : undefined,
    client_id: row.client_id ? String(row.client_id) : undefined,
    client_nom: clientNom,
    devis_id: row.devis_id ? String(row.devis_id) : undefined,
    notes: row.notes as string | undefined,
    date_emission: row.date_emission as string | undefined,
    date_echeance: row.date_echeance as string | undefined,
    public_token: row.share_token ? String(row.share_token) : undefined,
    conformite_branche: row.conformite_branche as string | undefined,
    conformite_warnings: row.conformite_warnings,
    operations_type: row.operations_type as string | undefined,
    facture_type: row.facture_type as string | undefined,
    adresse_livraison_chantier: row.adresse_livraison_chantier as string | undefined,
    chorus_service_code: row.chorus_service_code as string | undefined,
    immutable: row.immutable as boolean | undefined,
    locked_at: row.locked_at as string | undefined,
    lignes,
    paiements: paiements.map((p) => ({
      id: String(p.id),
      montant: Number(p.montant ?? 0),
      date: p.date as string | undefined,
      mode: p.mode as string | undefined,
    })),
    montant_paye: montantPaye,
  };
}

export async function handleDevisEsignStub(
  supabase: SupabaseClient,
  user: User,
  devisId: string,
  body: unknown,
) {
  const b = asObject(body);
  const action = String(b.action ?? "init");
  const now = new Date().toISOString();
  let patch: Record<string, unknown>;
  if (action === "init") {
    patch = {
      esign_provider: "advanced_stub",
      esign_envelope_id: randomUUID(),
      esign_status: "pending_signature",
      esign_proof: { init_at: now, note: "Stub e-sign — remplacer par Yousign/DocuSign." },
    };
  } else if (action === "mark_signed") {
    patch = {
      esign_status: "signed",
      esign_signed_at: now,
      esign_proof: { completed_via: "stub", signed_at: now },
    };
  } else if (action === "reset") {
    patch = {
      esign_provider: null,
      esign_envelope_id: null,
      esign_status: null,
      esign_signed_at: null,
      esign_proof: null,
    };
  } else {
    throw new Error("action invalide (init | mark_signed | reset)");
  }
  const { data, error } = await supabase
    .from("devis")
    .update(patch)
    .eq("id", devisId)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Devis non trouvé");
  await auditLog(supabase, user.id, `devis.esign.${action}`, "devis", devisId, patch);
  const lignes = await fetchDevisLignesHelper(supabase, devisId);
  const clientNom = await clientDisplayName(supabase, data.client_id as string | null);
  return mapDevisDetailRow(data as Record<string, unknown>, lignes, "", clientNom);
}

export { mapFactureDetail, fetchFactureLignes };
