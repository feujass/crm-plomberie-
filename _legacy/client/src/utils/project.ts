import type { EtapeMetier, Project } from "../types";

export function normalizeProject(raw: Record<string, unknown>): Project {
  const r = raw as Partial<Project> & { id: Project["id"] };
  return {
    id: r.id,
    name: String(r.name ?? ""),
    clientId: r.clientId as Project["clientId"],
    status: String(r.status ?? "Planifié"),
    progress: Number(r.progress ?? 0),
    dueDate: String(r.dueDate ?? ""),
    responsible: String(r.responsible ?? ""),
    comment: String(r.comment ?? ""),
    siteAddress: String(r.siteAddress ?? ""),
    chantierType: String(r.chantierType ?? "plomberie"),
    quoteId: r.quoteId != null ? r.quoteId : null,
    budgetEstime: Number(r.budgetEstime ?? 0),
    heuresPrevues: Number(r.heuresPrevues ?? 0),
    heuresPassees: Number(r.heuresPassees ?? 0),
    etapeMetier: (r.etapeMetier as EtapeMetier) || "terrassement",
    photoUrls: Array.isArray(r.photoUrls) ? (r.photoUrls as string[]) : [],
    aRelancer: Boolean(r.aRelancer),
  };
}
