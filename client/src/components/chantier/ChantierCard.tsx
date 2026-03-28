import { useState } from "react";
import type { EtapeMetier, Project } from "../../types";
import { formatDate } from "../../utils/format";
import { PhotosChantier } from "./PhotosChantier";
import { RentabiliteBloc } from "./RentabiliteBloc";
import { StepperMetier } from "./StepperMetier";

const STATUS_OPTIONS = ["Planifié", "En cours", "Urgent", "Terminé"] as const;

type Props = {
  project: Project;
  clientName: string;
  quoteRef: string | null;
  googleConnected: boolean;
  onPatch: (id: number | string, body: Record<string, unknown>) => Promise<void>;
  onSyncCalendar: (id: number | string) => Promise<void>;
  onOpenDevis: (quoteId: number | string) => void;
};

export function ChantierCard({
  project,
  clientName,
  quoteRef,
  googleConnected,
  onPatch,
  onSyncCalendar,
  onOpenDevis,
}: Props) {
  const [heuresAAjouter, setHeuresAAjouter] = useState("");
  const showRelancer = project.aRelancer || project.status === "Urgent";

  const patchEtape = async (etapeMetier: EtapeMetier) => {
    await onPatch(project.id, { etapeMetier });
  };

  const patchStatus = async (status: string) => {
    await onPatch(project.id, { status });
  };

  const patchPhotos = async (photoUrls: string[]) => {
    await onPatch(project.id, { photoUrls });
  };

  const handleAjouterHeures = async () => {
    const raw = heuresAAjouter.trim().replace(",", ".");
    if (raw === "") {
      alert("Indiquez un nombre d’heures à ajouter.");
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      alert("Saisissez un nombre positif (ex. 1,5).");
      return;
    }
    const newHoursSpent = project.heuresPassees + n;
    try {
      await onPatch(project.id, { hoursSpent: newHoursSpent });
      setHeuresAAjouter("");
    } catch {
      /* alert déjà affiché par onPatchProject */
    }
  };

  return (
    <div id={`chantier-${project.id}`} className="project-card-react">
      {showRelancer ? <span className="badge-a-relancer">À relancer</span> : null}
      <div className="project-card-head">
        <div>
          <h4>{project.name}</h4>
          <div className="project-meta">
            <span>{clientName}</span>
            {project.siteAddress ? <span>Chantier : {project.siteAddress}</span> : null}
            <span>Échéance : {formatDate(project.dueDate)}</span>
            {project.responsible ? <span>Responsable : {project.responsible}</span> : null}
            {project.comment ? <span>Note : {project.comment}</span> : null}
          </div>
          {project.quoteId && quoteRef ? (
            <button type="button" className="link-devis-ref" onClick={() => onOpenDevis(project.quoteId!)}>
              Devis {quoteRef}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="btn-cal-icon"
          disabled={!googleConnected}
          title={googleConnected ? "Ajouter l’échéance au calendrier Google" : "Connectez Google dans Paramètres"}
          onClick={() => onSyncCalendar(project.id)}
        >
          🗓
        </button>
      </div>

      <div className="project-card-body">
        <div>
          <span className="muted" style={{ fontWeight: 600 }}>
            Étapes métier
          </span>
          <StepperMetier
            value={project.etapeMetier}
            onChange={(step) => void patchEtape(step).catch(() => null)}
            compact
          />
        </div>

        <div className="project-row-status">
          <label className="muted" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            Statut opérationnel
            <select
              className="status-select"
              value={project.status}
              onChange={(e) => void patchStatus(e.target.value).catch(() => null)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <span className={`tag ${statusTagClass(project.status)}`}>{project.status}</span>
        </div>

        <RentabiliteBloc
          budget={project.budgetEstime}
          heuresPrevues={project.heuresPrevues}
          heuresPassees={project.heuresPassees}
        />

        <div className="rentabilite-bloc">
          <p style={{ marginBottom: 8 }}>
            Heures passées : <strong>{formatHeuresCard(project.heuresPassees)}h</strong>
          </p>
          <div className="inline-form" style={{ alignItems: "stretch" }}>
            <input
              type="number"
              min={0}
              step={0.25}
              inputMode="decimal"
              placeholder="ex. 1,5"
              value={heuresAAjouter}
              onChange={(e) => setHeuresAAjouter(e.target.value)}
            />
            <button type="button" className="ghost" onClick={() => void handleAjouterHeures()}>
              + Ajouter
            </button>
          </div>
        </div>

        <PhotosChantier photoUrls={project.photoUrls} onChange={patchPhotos} />
      </div>
    </div>
  );
}

function statusTagClass(status: string) {
  if (status === "Terminé") return "success";
  if (status === "Urgent") return "danger";
  if (status === "Planifié") return "warning";
  if (status === "En cours") return "info";
  return "success";
}

function formatHeuresCard(n: number) {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, "");
}
