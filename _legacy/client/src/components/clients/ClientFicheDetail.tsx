import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHANTIER_TYPES } from "../../constants/chantier";
import type { Client, Project, Quote } from "../../types";
import { formatCurrency, formatDate, formatDateTime, formatPhone } from "../../utils/format";

type Props = {
  client: Client;
  projects: Project[];
  quotes: Quote[];
  patchClientNotes: (clientId: number | string, notes: string) => Promise<void>;
};

function chantierTypeLabel(value: string) {
  return CHANTIER_TYPES.find((t) => t.value === value)?.label ?? value;
}

function interventionStatut(p: Project): string {
  if (p.status === "Terminé") return "Terminé";
  if (p.status === "Annulé") return "Annulé";
  return "En cours";
}

function devisStatutLabel(status: string): string {
  if (status === "Accepté") return "Signé";
  if (status === "Refusé") return "Refusé";
  if (status === "Expiré") return "Expiré";
  if (status === "En attente" || status === "Envoyé") return "En attente";
  return status;
}

function tagClassForIntervention(s: string) {
  if (s === "Terminé") return "success";
  if (s === "Annulé") return "danger";
  return "info";
}

function tagClassForDevis(label: string) {
  if (label === "Signé") return "success";
  if (label === "Refusé" || label === "Expiré") return "danger";
  return "warning";
}

export function ClientFicheDetail({ client, projects, quotes, patchClientNotes }: Props) {
  const [draftNotes, setDraftNotes] = useState(client.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(client.notes ?? "");

  useEffect(() => {
    setDraftNotes(client.notes ?? "");
    lastSavedRef.current = client.notes ?? "";
    setSaveError(null);
  }, [client.id, client.notes]);

  const flushSave = useCallback(
    async (text: string) => {
      if (text === lastSavedRef.current) return;
      setSaving(true);
      setSaveError(null);
      try {
        await patchClientNotes(client.id, text);
        lastSavedRef.current = text;
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Erreur d’enregistrement");
      } finally {
        setSaving(false);
      }
    },
    [client.id, patchClientNotes]
  );

  const onNotesChange = (v: string) => {
    setDraftNotes(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void flushSave(v);
    }, 1000);
  };

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [projects]
  );

  const sortedQuotes = useMemo(
    () => [...quotes].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
    [quotes]
  );

  return (
    <div className="client-fiche">
      <div className="client-fiche-head">
        <div>
          <h3>{client.name}</h3>
          <p className="muted">{client.address}</p>
        </div>
        <span className={`tag ${client.segment === "VIP" ? "danger" : "success"}`}>{client.segment}</span>
      </div>

      <div className="client-fiche-meta">
        <div>
          <span className="muted">Téléphone</span>
          <strong>{formatPhone(client.phone)}</strong>
        </div>
        <div>
          <span className="muted">Email</span>
          <strong>{client.email || "—"}</strong>
        </div>
        <div>
          <span className="muted">Dernier projet (résumé)</span>
          <strong>{client.lastProject}</strong>
        </div>
      </div>

      <div className="client-fiche-section">
        <h4>Interventions (chantiers)</h4>
        <p className="muted client-fiche-hint">Historique des projets liés à ce client.</p>
        {sortedProjects.length === 0 ? (
          <p className="muted client-fiche-empty">Aucune intervention enregistrée.</p>
        ) : (
          <div className="client-fiche-table-wrap">
            <table className="client-fiche-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type de travaux</th>
                  <th>Montant (budget)</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((p) => {
                  const st = interventionStatut(p);
                  return (
                    <tr key={String(p.id)}>
                      <td>{formatDate(p.dueDate)}</td>
                      <td>{chantierTypeLabel(p.chantierType)}</td>
                      <td>{formatCurrency(p.budgetEstime)}</td>
                      <td>
                        <span className={`tag ${tagClassForIntervention(st)}`}>{st}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="client-fiche-section">
        <h4>Devis</h4>
        <p className="muted client-fiche-hint">Montants affichés comme sur le reste du CRM (TTC).</p>
        {sortedQuotes.length === 0 ? (
          <p className="muted client-fiche-empty">Aucun devis pour ce client.</p>
        ) : (
          <div className="client-fiche-table-wrap">
            <table className="client-fiche-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Date</th>
                  <th>Montant TTC</th>
                  <th>Statut</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {sortedQuotes.map((q) => {
                  const st = devisStatutLabel(q.status);
                  return (
                    <tr key={String(q.id)}>
                      <td>
                        <strong>{q.quoteRef}</strong>
                      </td>
                      <td>{formatDate(q.sentAt)}</td>
                      <td>{formatCurrency(q.amount)}</td>
                      <td>
                        <span className={`tag ${tagClassForDevis(st)}`}>{st}</span>
                      </td>
                      <td>
                        {q.pdfPublicUrl ? (
                          <a href={q.pdfPublicUrl} target="_blank" rel="noopener noreferrer" className="link-devis-ref">
                            Ouvrir le PDF
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="client-fiche-section">
        <h4>Notes personnelles</h4>
        <textarea
          className="client-fiche-notes"
          rows={4}
          placeholder="Ex. préfère être contacté le matin, accès par l’impasse…"
          value={draftNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          aria-label="Notes sur le client"
        />
        <div className="client-fiche-notes-footer">
          {saving ? <span className="muted client-fiche-saving">Enregistrement…</span> : null}
          {saveError ? <span className="client-fiche-error">{saveError}</span> : null}
          {!saving && !saveError && client.notesUpdatedAt ? (
            <span className="muted">Dernière modification : {formatDateTime(client.notesUpdatedAt)}</span>
          ) : null}
          {!saving && !saveError && !client.notesUpdatedAt && (draftNotes || "").length > 0 ? (
            <span className="muted">Sera horodaté après la première sauvegarde.</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
