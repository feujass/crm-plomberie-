/** Devis encore facturables (pas déjà transformés, refusés ou archivés). */
export function devisCanBeInvoiced(statut: string | undefined): boolean {
  const s = statut ?? "";
  return s === "accepte" || s === "envoye";
}

export type CreateFactureFromDevisResult =
  | { ok: true; id: string }
  | { ok: false; status: number; message: string; code?: string };

export async function createFactureFromDevisRequest(devisId: string): Promise<CreateFactureFromDevisResult> {
  const res = await fetch(`/api/factures/from-devis/${devisId}`, { method: "POST", credentials: "same-origin" });
  const data = (await res.json().catch(() => ({}))) as { message?: string; id?: string; code?: string };
  if (!res.ok || typeof data.id !== "string" || !data.id) {
    return {
      ok: false,
      status: res.status,
      message: typeof data.message === "string" ? data.message : `Erreur ${res.status}`,
      code: typeof data.code === "string" ? data.code : undefined,
    };
  }
  return { ok: true, id: data.id };
}
