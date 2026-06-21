import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

import type { BackendFetchOptions } from "@/lib/backend/server";
import { buildMeResponse } from "@/lib/supabase/profile-map";
import {
  calcDevisTotals,
  clientDisplayName,
  mapClientRow,
  mapDevisDetailRow,
  mapDevisLineRow,
  mapDevisRow,
  mapOuvrageRow,
  mapProfileRow,
  nextDevisNumero,
  profileUpdateFromBody,
  remiseTypeToDb,
} from "@/lib/supabase/row-maps";
import { fetchDevisLignesHelper } from "@/lib/supabase/routes-shared";
import {
  handleAuthMeUpdate,
  handleConformite,
  handleCronRoute,
  handleDashboardRentabilite,
  handleDevisEsignStub,
  handleFacturesExtended,
  handleInternalRoute,
  handlePublicRoute,
  fetchFactureLignes,
  mapFactureDetail,
} from "@/lib/supabase/routes-rest";

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

function parsePath(path: string) {
  const [pathname, queryString] = path.split("?");
  const query = new URLSearchParams(queryString ?? "");
  const segments = pathname.split("/").filter(Boolean);
  return { pathname, query, segments };
}

function asObject(body: unknown): Record<string, unknown> {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

function requireUser(user: User | null | undefined): asserts user is User {
  if (!user) throw new Error("Non authentifié");
}

async function fetchDevisLignes(supabase: SupabaseClient, devisId: string) {
  return fetchDevisLignesHelper(supabase, devisId);
}

async function fetchInternalNotes(supabase: SupabaseClient, devisId: string) {
  const { data } = await supabase
    .from("devis_notes_internes")
    .select("body")
    .eq("devis_id", devisId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((n) => String(n.body ?? "")).filter(Boolean).join("\n\n");
}

async function replaceDevisLignes(
  supabase: SupabaseClient,
  devisId: string,
  lignesIn: unknown[],
) {
  const raw = lignesIn.map((l, i) => {
    const row = (l ?? {}) as Record<string, unknown>;
    return {
      section: String(row.section ?? ""),
      designation: String(row.designation ?? ""),
      quantite: Number(row.quantite ?? 1),
      unite: String(row.unite ?? "u"),
      prix_ht: Number(row.prix_ht ?? 0),
      tva: Number(row.tva ?? 10),
      ordre: Number(row.ordre ?? i),
      ligne_type: String(row.ligne_type ?? "prestation"),
    };
  });
  const { lignes, total_ht, total_tva, total_ttc } = calcDevisTotals(raw);
  await supabase.from("devis_lignes").delete().eq("devis_id", devisId);
  if (lignes.length > 0) {
    const { error } = await supabase.from("devis_lignes").insert(
      lignes.map((l) => ({
        devis_id: devisId,
        section: l.section,
        designation: l.designation,
        quantite: l.quantite,
        unite: l.unite,
        prix_ht: l.prix_ht,
        tva: l.tva,
        total_ht: l.total_ht,
        ordre: l.ordre,
        ligne_type: l.ligne_type,
      })),
    );
    if (error) throw new Error(error.message);
  }
  return { total_ht, total_tva, total_ttc };
}

async function handleClients(
  supabase: SupabaseClient,
  user: User,
  method: string,
  segments: string[],
  query: URLSearchParams,
  body: unknown,
) {
  const b = asObject(body);
  const clientId = segments[2];

  if (method === "GET" && !clientId) {
    let q = supabase.from("clients").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    const search = query.get("search")?.trim();
    const type = query.get("type")?.trim();
    if (type) q = q.eq("type", type);
    if (search) {
      q = q.or(`nom.ilike.%${search}%,email.ilike.%${search}%,tel.ilike.%${search}%`);
    }
    const { data, error } = await q.limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapClientRow(r as Record<string, unknown>));
  }

  if (method === "POST" && !clientId) {
    const nom = String(b.nom ?? "").trim();
    if (!nom) throw new Error("Nom requis");
    const { data, error } = await supabase
      .from("clients")
      .insert({
        user_id: user.id,
        nom,
        prenom: String(b.prenom ?? "").trim() || null,
        email: String(b.email ?? "").trim() || null,
        tel: String(b.tel ?? "").trim() || null,
        adresse: String(b.adresse ?? "").trim() || null,
        type: String(b.type ?? "particulier"),
        siret: String(b.siret ?? "").trim() || null,
        notes: String(b.notes ?? "").trim() || null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapClientRow(data as Record<string, unknown>);
  }

  if (method === "GET" && clientId) {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Client non trouvé");
    const client = mapClientRow(data as Record<string, unknown>);
    const [{ data: devisRows }, { data: factureRows }] = await Promise.all([
      supabase.from("devis").select("*").eq("user_id", user.id).eq("client_id", clientId).limit(10),
      supabase.from("factures").select("*").eq("user_id", user.id).eq("client_id", clientId).limit(10),
    ]);
    const devis = (devisRows ?? []).map((d) => mapDevisRow(d as Record<string, unknown>, client.nom));
    const factures = (factureRows ?? []).map((f) => ({
      id: String(f.id),
      numero: f.numero as string | undefined,
      statut: f.statut as string | undefined,
      total_ttc: f.total_ttc != null ? Number(f.total_ttc) : undefined,
      client_id: f.client_id ? String(f.client_id) : undefined,
    }));
    const ca_total = devis
      .filter((d) => d.statut === "accepte")
      .reduce((s, d) => s + Number(d.total_ttc ?? 0), 0);
    return {
      ...client,
      devis_count: devis.length,
      factures_count: factures.length,
      ca_total,
      devis,
      factures,
    };
  }

  if ((method === "PUT" || method === "PATCH") && clientId) {
    const update: Record<string, unknown> = {};
    for (const key of ["nom", "prenom", "email", "tel", "adresse", "type", "siret", "notes", "inactive"]) {
      if (b[key] !== undefined) update[key] = b[key];
    }
    const { data, error } = await supabase
      .from("clients")
      .update(update)
      .eq("id", clientId)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Client non trouvé");
    return mapClientRow(data as Record<string, unknown>);
  }

  if (method === "DELETE" && clientId) {
    const { error, count } = await supabase
      .from("clients")
      .delete({ count: "exact" })
      .eq("id", clientId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    if (!count) throw new Error("Client non trouvé");
    return { message: "Client supprimé" };
  }

  throw new Error(`Méthode ${method} non supportée pour /api/clients`);
}

async function handleDevis(
  supabase: SupabaseClient,
  user: User,
  method: string,
  segments: string[],
  query: URLSearchParams,
  body: unknown,
) {
  const b = asObject(body);
  const devisId = segments[2];
  const sub = segments[3];

  if (method === "GET" && !devisId) {
    let q = supabase.from("devis").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    const segment = query.get("segment")?.trim();
    const statut = query.get("statut")?.trim();
    const search = query.get("search")?.trim();
    if (segment === "brouillon") q = q.eq("statut", "brouillon");
    else if (segment === "en_cours") q = q.eq("statut", "envoye");
    else if (segment === "termine") q = q.in("statut", ["accepte", "refuse", "archive", "expire"]);
    else if (statut) q = q.eq("statut", statut);
    const { data, error } = await q.limit(500);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Record<string, unknown>[];
    const clientIds = [...new Set(rows.map((r) => r.client_id).filter(Boolean))] as string[];
    const names: Record<string, string> = {};
    if (clientIds.length > 0) {
      const { data: clients } = await supabase.from("clients").select("id, nom, prenom").in("id", clientIds);
      for (const c of clients ?? []) {
        names[String(c.id)] = [c.prenom, c.nom].filter(Boolean).join(" ").trim();
      }
    }
    let mapped = rows.map((r) => mapDevisRow(r, r.client_id ? names[String(r.client_id)] : undefined));
    if (search) {
      const s = search.toLowerCase();
      mapped = mapped.filter(
        (d) => d.numero?.toLowerCase().includes(s) || d.client_nom?.toLowerCase().includes(s),
      );
    }
    return mapped;
  }

  if (method === "POST" && !devisId) {
    const clientId = b.client_id ? String(b.client_id) : null;
    const lignesIn = Array.isArray(b.lignes) ? b.lignes : [];
    const numero = await nextDevisNumero(supabase, user.id);
    const { total_ht, total_tva, total_ttc } = calcDevisTotals(
      lignesIn.map((l, i) => ({ ...(l as Record<string, unknown>), ordre: i })),
    );
    const { data, error } = await supabase
      .from("devis")
      .insert({
        user_id: user.id,
        client_id: clientId,
        numero,
        statut: "brouillon",
        total_ht,
        total_tva,
        total_ttc,
        notes: String(b.notes ?? ""),
        date_expiration: b.date_expiration ? String(b.date_expiration) : null,
        remise_type: remiseTypeToDb(b.remise_type),
        remise_value: Number(b.remise_valeur ?? b.remise_value ?? 0) || null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const id = String(data.id);
    if (lignesIn.length > 0) {
      await replaceDevisLignes(supabase, id, lignesIn);
    }
    const clientNom = await clientDisplayName(supabase, clientId);
    const lignes = await fetchDevisLignes(supabase, id);
    return mapDevisDetailRow(data as Record<string, unknown>, lignes, "", clientNom);
  }

  if (method === "GET" && devisId && !sub) {
    const { data, error } = await supabase
      .from("devis")
      .select("*")
      .eq("id", devisId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Devis non trouvé");
    const [lignes, internalNotes, clientNom] = await Promise.all([
      fetchDevisLignes(supabase, devisId),
      fetchInternalNotes(supabase, devisId),
      clientDisplayName(supabase, data.client_id as string | null),
    ]);
    return mapDevisDetailRow(data as Record<string, unknown>, lignes, internalNotes, clientNom);
  }

  if ((method === "PUT" || method === "PATCH") && devisId && sub === "lignes") {
    const totals = await replaceDevisLignes(supabase, devisId, Array.isArray(body) ? body : []);
    const { data, error } = await supabase
      .from("devis")
      .update(totals)
      .eq("id", devisId)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Devis non trouvé");
    const lignes = await fetchDevisLignes(supabase, devisId);
    const clientNom = await clientDisplayName(supabase, data.client_id as string | null);
    const internalNotes = await fetchInternalNotes(supabase, devisId);
    return mapDevisDetailRow(data as Record<string, unknown>, lignes, internalNotes, clientNom);
  }

  if (method === "POST" && devisId && sub === "internal-notes") {
    const text = String(b.text ?? "").trim();
    if (!text) throw new Error("Texte vide");
    const { data: existing } = await supabase
      .from("devis")
      .select("id")
      .eq("id", devisId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) throw new Error("Devis non trouvé");
    const { error } = await supabase.from("devis_notes_internes").insert({
      devis_id: devisId,
      user_id: user.id,
      body: text,
    });
    if (error) throw new Error(error.message);
    return handleDevis(supabase, user, "GET", ["api", "devis", devisId], query, body);
  }

  if ((method === "PUT" || method === "PATCH") && devisId && !sub) {
    const update: Record<string, unknown> = {};
    if (b.client_id !== undefined) update.client_id = b.client_id || null;
    if (b.notes !== undefined) update.notes = b.notes;
    if (b.date_expiration !== undefined) update.date_expiration = b.date_expiration || null;
    if (b.statut !== undefined) {
      update.statut = b.statut;
      if (b.statut === "envoye") update.date_envoi = new Date().toISOString();
    }
    if (b.remise_type !== undefined) update.remise_type = remiseTypeToDb(b.remise_type);
    if (b.remise_valeur !== undefined || b.remise_value !== undefined) {
      update.remise_value = Number(b.remise_valeur ?? b.remise_value ?? 0) || null;
    }
    if (b.adresse_chantier !== undefined) update.adresse_chantier = b.adresse_chantier;
    if (b.derniere_relance_at !== undefined) update.derniere_relance_at = b.derniere_relance_at;
    const { data, error } = await supabase
      .from("devis")
      .update(update)
      .eq("id", devisId)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Devis non trouvé");
    const lignes = await fetchDevisLignes(supabase, devisId);
    const clientNom = await clientDisplayName(supabase, data.client_id as string | null);
    const internalNotes = await fetchInternalNotes(supabase, devisId);
    return mapDevisDetailRow(data as Record<string, unknown>, lignes, internalNotes, clientNom);
  }

  if (method === "DELETE" && devisId && !sub) {
    const { error, count } = await supabase
      .from("devis")
      .delete({ count: "exact" })
      .eq("id", devisId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    if (!count) throw new Error("Devis non trouvé");
    return { message: "Devis supprimé" };
  }

  if ((method === "PUT" || method === "PATCH") && devisId && sub === "esign-stub") {
    return handleDevisEsignStub(supabase, user, devisId, body);
  }

  throw new Error(`Méthode ${method} non supportée pour /api/devis`);
}

async function handleProfile(
  supabase: SupabaseClient,
  user: User,
  method: string,
  body: unknown,
) {
  if (method === "GET") {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (error) throw new Error(error.message);
    return mapProfileRow(data as Record<string, unknown> | null);
  }
  if (method === "PUT" || method === "PATCH") {
    const update = profileUpdateFromBody(asObject(body));
    if (Object.keys(update).length === 0) {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return mapProfileRow(data as Record<string, unknown> | null);
    }
    const { data, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return mapProfileRow(data as Record<string, unknown> | null);
  }
  throw new Error(`Méthode ${method} non supportée pour /api/profile`);
}

async function handleOuvrages(
  supabase: SupabaseClient,
  user: User,
  method: string,
  segments: string[],
  query: URLSearchParams,
  body: unknown,
) {
  const b = asObject(body);
  const sub = segments[2];

  if (method === "POST" && sub === "seed-defaults") {
    const defaults = [
      { nom: "Taux horaire standard", description: "Tarif horaire de base", type: "main_oeuvre", prix_ht: 50, unite: "h", tva: 10, tags: ["exemple"] },
      { nom: "Lame de parquet chêne massif", description: "Exemple fourniture", type: "fourniture", prix_ht: 48, unite: "m²", tva: 10, tags: ["exemple"] },
      { nom: "Pose et finition", description: "Exemple ouvrage", type: "ouvrage", prix_ht: 35, unite: "m²", tva: 10, tags: ["exemple"] },
    ];
    const { error } = await supabase.from("ouvrages").insert(defaults.map((d) => ({ ...d, user_id: user.id })));
    if (error) throw new Error(error.message);
    return { message: "Ouvrages par défaut créés", count: defaults.length };
  }

  if (method === "GET" && !sub) {
    let q = supabase.from("ouvrages").select("*").eq("user_id", user.id).order("nom", { ascending: true });
    const search = query.get("search")?.trim();
    const type = query.get("type")?.trim();
    if (type) q = q.eq("type", type);
    if (search) q = q.ilike("nom", `%${search}%`);
    const { data, error } = await q.limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapOuvrageRow(r as Record<string, unknown>));
  }

  if (method === "POST" && !sub) {
    const nom = String(b.nom ?? "").trim();
    if (!nom) throw new Error("Nom requis");
    const { data, error } = await supabase
      .from("ouvrages")
      .insert({
        user_id: user.id,
        nom,
        description: String(b.description ?? "").trim() || null,
        type: String(b.type ?? "ouvrage"),
        prix_ht: Number(b.prix_ht ?? 0),
        unite: String(b.unite ?? "forfait"),
        tva: Number(b.tva ?? 10),
        tags: Array.isArray(b.tags) ? b.tags : [],
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapOuvrageRow(data as Record<string, unknown>);
  }

  if (method === "DELETE" && sub) {
    const { error, count } = await supabase
      .from("ouvrages")
      .delete({ count: "exact" })
      .eq("id", sub)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    if (!count) throw new Error("Ouvrage non trouvé");
    return { message: "Ouvrage supprimé" };
  }

  if (method === "GET" && sub) {
    const { data, error } = await supabase
      .from("ouvrages")
      .select("*")
      .eq("id", sub)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Ouvrage non trouvé");
    return mapOuvrageRow(data as Record<string, unknown>);
  }

  if ((method === "PUT" || method === "PATCH") && sub) {
    const update: Record<string, unknown> = {};
    for (const key of ["nom", "description", "type", "prix_ht", "unite", "tva", "tags"]) {
      if (b[key] !== undefined) update[key] = b[key];
    }
    const { data, error } = await supabase
      .from("ouvrages")
      .update(update)
      .eq("id", sub)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Ouvrage non trouvé");
    return mapOuvrageRow(data as Record<string, unknown>);
  }

  throw new Error(`Méthode ${method} non supportée pour /api/ouvrages`);
}

async function handleChantiers(
  supabase: SupabaseClient,
  user: User,
  method: string,
  segments: string[],
  query: URLSearchParams,
  body: unknown,
) {
  const b = asObject(body);
  const chantierId = segments[2];

  const mapChantier = (row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.nom ?? ""),
    client_id: row.client_id ? String(row.client_id) : null,
    devis_id: row.devis_id ? String(row.devis_id) : null,
    status: (row.statut as string) ?? "en_cours",
    due_date: row.date_fin ? String(row.date_fin) : row.date_debut ? String(row.date_debut) : null,
    site_address: (row.adresse as string) ?? null,
    comment: (row.notes as string) ?? null,
    created_at: (row.created_at as string) ?? null,
    updated_at: (row.updated_at as string) ?? null,
  });

  if (method === "GET" && !chantierId) {
    let q = supabase.from("chantiers").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    const clientId = query.get("client_id")?.trim();
    const search = query.get("search")?.trim();
    const status = query.get("status")?.trim();
    if (clientId) q = q.eq("client_id", clientId);
    if (status) q = q.eq("statut", status);
    if (search) q = q.ilike("nom", `%${search}%`);
    const { data, error } = await q.limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapChantier(r as Record<string, unknown>));
  }

  if (method === "POST" && !chantierId) {
    const { data, error } = await supabase
      .from("chantiers")
      .insert({
        user_id: user.id,
        nom: String(b.name ?? b.nom ?? "Chantier").trim(),
        client_id: b.client_id ? String(b.client_id) : null,
        devis_id: b.devis_id ? String(b.devis_id) : null,
        adresse: String(b.site_address ?? b.adresse ?? "").trim() || null,
        statut: String(b.status ?? b.statut ?? "en_cours"),
        date_debut: b.due_date ? String(b.due_date) : null,
        notes: String(b.comment ?? b.notes ?? "").trim() || null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapChantier(data as Record<string, unknown>);
  }

  if (method === "GET" && chantierId) {
    const { data, error } = await supabase
      .from("chantiers")
      .select("*")
      .eq("id", chantierId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Chantier introuvable");
    return mapChantier(data as Record<string, unknown>);
  }

  if ((method === "PUT" || method === "PATCH") && chantierId) {
    const update: Record<string, unknown> = {};
    if (b.name !== undefined || b.nom !== undefined) update.nom = String(b.name ?? b.nom ?? "").trim();
    if (b.client_id !== undefined) update.client_id = b.client_id || null;
    if (b.devis_id !== undefined) update.devis_id = b.devis_id || null;
    if (b.site_address !== undefined || b.adresse !== undefined) {
      update.adresse = String(b.site_address ?? b.adresse ?? "").trim() || null;
    }
    if (b.status !== undefined || b.statut !== undefined) update.statut = String(b.status ?? b.statut);
    if (b.due_date !== undefined) update.date_fin = b.due_date ? String(b.due_date) : null;
    if (b.comment !== undefined || b.notes !== undefined) {
      update.notes = String(b.comment ?? b.notes ?? "").trim() || null;
    }
    const { data, error } = await supabase
      .from("chantiers")
      .update(update)
      .eq("id", chantierId)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Chantier introuvable");
    return mapChantier(data as Record<string, unknown>);
  }

  if (method === "DELETE" && chantierId) {
    const { error, count } = await supabase
      .from("chantiers")
      .delete({ count: "exact" })
      .eq("id", chantierId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    if (!count) throw new Error("Chantier introuvable");
    return { message: "Chantier supprimé" };
  }

  throw new Error(`Méthode ${method} non supportée pour /api/chantiers`);
}

async function handleFactures(
  supabase: SupabaseClient,
  user: User,
  method: string,
  segments: string[],
  query: URLSearchParams,
  body: unknown,
) {
  const extended = await handleFacturesExtended(supabase, user, method, segments, body);
  if (extended != null) return extended;

  const factureId = segments[2];
  const sub = segments[3];

  if (method === "GET" && !factureId) {
    const statut = query.get("statut")?.trim();
    let q = supabase.from("factures").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (statut) q = q.eq("statut", statut);
    const { data, error } = await q.limit(500);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const clientIds = [...new Set(rows.map((f) => f.client_id).filter(Boolean))] as string[];
    const names: Record<string, string> = {};
    if (clientIds.length > 0) {
      const { data: clients } = await supabase.from("clients").select("id, nom, prenom").in("id", clientIds);
      for (const c of clients ?? []) {
        names[String(c.id)] = [c.prenom, c.nom].filter(Boolean).join(" ").trim();
      }
    }
    return rows.map((f) => ({
      id: String(f.id),
      numero: f.numero as string | undefined,
      statut: f.statut as string | undefined,
      total_ttc: f.total_ttc != null ? Number(f.total_ttc) : undefined,
      date_emission: f.date_emission as string | undefined,
      created_at: f.created_at as string | undefined,
      client_id: f.client_id ? String(f.client_id) : undefined,
      client_nom: f.client_id ? names[String(f.client_id)] : undefined,
    }));
  }

  if (method === "GET" && factureId && !sub) {
    const { data, error } = await supabase
      .from("factures")
      .select("*")
      .eq("id", factureId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Facture introuvable");
    const [lignes, paiements, clientNom] = await Promise.all([
      fetchFactureLignes(supabase, factureId),
      supabase.from("paiements").select("*").eq("facture_id", factureId).then((r) => r.data ?? []),
      clientDisplayName(supabase, data.client_id as string | null),
    ]);
    return mapFactureDetail(data as Record<string, unknown>, lignes, paiements, clientNom);
  }

  throw new Error(`Méthode ${method} non supportée pour /api/factures`);
}

export async function handleSupabaseDataRoute(
  path: string,
  opts: BackendFetchOptions,
  user: User | null,
): Promise<unknown> {
  const method = (opts.method ?? "GET").toUpperCase();
  const body = parseBody(opts);
  const { query, segments } = parsePath(path);

  if (segments[0] !== "api") {
    throw new Error(`Chemin invalide : ${path}`);
  }

  const resource = segments[1];

  if (resource === "public") {
    return handlePublicRoute(path);
  }

  if (resource === "cron") {
    return handleCronRoute(path, opts);
  }

  if (resource === "internal") {
    return handleInternalRoute(path, opts);
  }

  if (resource === "auth" && segments[2] === "me") {
    requireUser(user);
    const supabase = await import("@/lib/supabase/server").then((m) => m.createClient());
    if (method === "GET") {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return buildMeResponse(user, profile);
    }
    if (method === "PUT" || method === "PATCH") {
      return handleAuthMeUpdate(user, body, supabase);
    }
    throw new Error(`Méthode ${method} non supportée pour /api/auth/me`);
  }

  requireUser(user);
  const supabase = await import("@/lib/supabase/server").then((m) => m.createClient());

  if (resource === "dashboard" && segments[2] === "rentabilite") {
    return handleDashboardRentabilite(supabase, user.id);
  }

  switch (resource) {
    case "clients":
      return handleClients(supabase, user, method, segments, query, body);
    case "devis":
      return handleDevis(supabase, user, method, segments, query, body);
    case "profile":
      return handleProfile(supabase, user, method, body);
    case "ouvrages":
      return handleOuvrages(supabase, user, method, segments, query, body);
    case "chantiers":
      return handleChantiers(supabase, user, method, segments, query, body);
    case "factures":
      return handleFactures(supabase, user, method, segments, query, body);
    case "conformite":
      return handleConformite(supabase, user, segments, query);
    default:
      break;
  }

  throw new Error(`Route /${segments.join("/")} pas encore disponible en mode Supabase.`);
}
