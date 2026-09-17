import { useMemo, useState } from "react";
import type { Client, Project, Quote } from "../../types";
import { AlertesBanner, type AlerteItem } from "./AlertesBanner";
import { ChantierCard } from "./ChantierCard";
import { ChantierForm } from "./ChantierForm";

type SortMode = "due" | "progress";

type Props = {
  projects: Project[];
  clients: Client[];
  quotes: Quote[];
  googleConnected: boolean;
  onCreateProject: (payload: Record<string, unknown>) => Promise<void>;
  onPatchProject: (id: number | string, body: Record<string, unknown>) => Promise<void>;
  onSyncCalendar: (id: number | string) => Promise<{ url?: string }>;
  onOpenDevis: (quoteId: number | string) => void;
  onFocusPanel: () => void;
};

function buildAlertes(projects: Project[]): AlerteItem[] {
  const items: AlerteItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const p of projects) {
    if (p.status === "Terminé") continue;
    if (p.aRelancer) {
      items.push({
        id: `rel-${p.id}`,
        chantierId: p.id,
        message: `À relancer · ${p.name}`,
        type: "danger",
      });
    }
    const due = new Date(`${p.dueDate}T12:00:00`);
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    if (diff >= 0 && diff <= 7) {
      items.push({
        id: `due-${p.id}`,
        chantierId: p.id,
        message: `Échéance ${diff <= 0 ? "aujourd’hui" : `dans ${diff} j`} · ${p.name}`,
        type: "warning",
      });
    }
  }
  return items;
}

const ETAPES_ORDER = [
  "terrassement",
  "maconnerie",
  "plomberie",
  "electricite",
  "finitions",
  "reception_client",
] as const;

function etapeIndex(e: string) {
  const i = ETAPES_ORDER.indexOf(e as (typeof ETAPES_ORDER)[number]);
  return i < 0 ? 0 : i;
}

export function SuiviProjetsPanel({
  projects,
  clients,
  quotes,
  googleConnected,
  onCreateProject,
  onPatchProject,
  onSyncCalendar,
  onOpenDevis,
  onFocusPanel,
}: Props) {
  const [sort, setSort] = useState<SortMode>("due");

  const sorted = useMemo(() => {
    const list = [...projects];
    if (sort === "due") {
      list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    } else {
      list.sort((a, b) => {
        const d = etapeIndex(b.etapeMetier) - etapeIndex(a.etapeMetier);
        if (d !== 0) return d;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }
    return list;
  }, [projects, sort]);

  const alertes = useMemo(() => buildAlertes(projects), [projects]);

  const getClientName = (id: number | string) => clients.find((c) => String(c.id) === String(id))?.name ?? "—";

  const getQuoteRef = (quoteId: number | string | null) => {
    if (quoteId == null) return null;
    return quotes.find((q) => String(q.id) === String(quoteId))?.quoteRef ?? null;
  };

  const scrollToChantier = (chantierId: number | string) => {
    onFocusPanel();
    requestAnimationFrame(() => {
      document.getElementById(`chantier-${chantierId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  return (
    <section id="projets" className="panel active">
      <div className="panel-header">
        <div>
          <h2>Suivi des projets</h2>
          <p>Gardez une vue claire sur l’avancement et les échéances.</p>
        </div>
      </div>

      <AlertesBanner alertes={alertes} onSelect={(id) => scrollToChantier(id)} />

      <div className="split">
        <div className="card">
          <h3>Nouveau chantier</h3>
          <ChantierForm
            clients={clients}
            quotes={quotes}
            onSubmit={onCreateProject}
          />
        </div>
        <div className="card">
          <div className="project-filters">
            <div>
              <strong>Vue chantier</strong>
              <p className="muted">Mise à jour rapide par échéance et avancement métier.</p>
            </div>
            <div className="project-actions">
              <button type="button" className={`ghost${sort === "due" ? " active" : ""}`} onClick={() => setSort("due")}>
                Échéance
              </button>
              <button
                type="button"
                className={`ghost${sort === "progress" ? " active" : ""}`}
                onClick={() => setSort("progress")}
              >
                Avancement
              </button>
            </div>
          </div>
          <div className="project-list">
            {sorted.map((p) => (
              <ChantierCard
                key={String(p.id)}
                project={p}
                clientName={getClientName(p.clientId)}
                quoteRef={getQuoteRef(p.quoteId)}
                googleConnected={googleConnected}
                onPatch={async (id, body) => {
                  await onPatchProject(id, body);
                }}
                onSyncCalendar={async (id) => {
                  try {
                    const res = await onSyncCalendar(id);
                    if (res?.url) window.alert(`Synchronisé.\n${res.url}`);
                    else window.alert("Échéance ajoutée au calendrier.");
                  } catch (e) {
                    window.alert(e instanceof Error ? e.message : "Erreur calendrier");
                  }
                }}
                onOpenDevis={onOpenDevis}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
