import type { DevisIaClient } from "@/lib/schemas/devis-ia";

export type ResolveClientInput = {
  existingClientId?: string | null;
  manualNom?: string;
  manualPrenom?: string;
  manualEmail?: string;
  iaClient?: DevisIaClient;
};

/** Fusionne saisie manuelle + extraction IA pour créer un client si besoin. */
export function shouldCreateClientFromIa(input: ResolveClientInput): boolean {
  if (input.existingClientId?.trim()) return false;
  const ia = input.iaClient;
  const nom = input.manualNom?.trim() || ia?.nom?.trim() || "";
  const prenom = input.manualPrenom?.trim() || ia?.prenom?.trim() || "";
  const email = input.manualEmail?.trim() || ia?.email?.trim() || "";
  return Boolean(nom || prenom || email);
}

export function buildClientPayload(input: ResolveClientInput): {
  nom: string;
  prenom: string;
  email: string;
  tel: string;
  adresse: string;
} {
  const ia = input.iaClient;
  const email = input.manualEmail?.trim() || ia?.email?.trim() || "";
  const prenom = input.manualPrenom?.trim() || ia?.prenom?.trim() || "";
  const nom =
    input.manualNom?.trim() ||
    ia?.nom?.trim() ||
    (email ? email.split("@")[0] : "") ||
    prenom ||
    "Client";

  return {
    nom,
    prenom,
    email,
    tel: ia?.tel?.trim() || "",
    adresse: ia?.adresse?.trim() || "",
  };
}

export async function createClientFromIa(input: ResolveClientInput): Promise<string | null> {
  if (input.existingClientId?.trim()) return input.existingClientId.trim();
  if (!shouldCreateClientFromIa(input)) return null;

  const payload = buildClientPayload(input);
  const res = await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ ...payload, type: "particulier" }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) throw new Error(json.message || "Création client");
  return json.id ?? null;
}
