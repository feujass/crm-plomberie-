import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { apiFetch } from "../../api";
import type {
  BookingRequest,
  BootstrapData,
  InterventionReport,
  MaterialOrder,
  MaterialOrderLine,
  SavTicket,
  Warranty,
} from "../../types";
import { formatDate } from "../../utils/format";

const idsMatch = (a: unknown, b: unknown) => String(a) === String(b);

type TabId = "rdv" | "cr" | "materiaux" | "garantie";

type Props = {
  data: BootstrapData;
  setData: Dispatch<SetStateAction<BootstrapData | null>>;
  getClient: (id: number | string) => { name: string; email: string | null; phone: string; address: string } | undefined;
  onRebootstrap: () => Promise<void>;
};

export function PlombierIAPanel({ data, setData, getClient, onRebootstrap }: Props) {
  const [tab, setTab] = useState<TabId>("rdv");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const iaHints = data.iaHints;

  const mergeBooking = useCallback((br: BookingRequest) => {
    setData((d) =>
      d ? { ...d, bookingRequests: [br, ...d.bookingRequests.filter((x) => !idsMatch(x.id, br.id))] } : d
    );
  }, [setData]);

  const mergeReport = useCallback((r: InterventionReport) => {
    setData((d) =>
      d
        ? {
            ...d,
            interventionReports: [r, ...d.interventionReports.filter((x) => !idsMatch(x.id, r.id))],
          }
        : d
    );
  }, [setData]);

  const mergeOrder = useCallback((o: MaterialOrder) => {
    setData((d) =>
      d ? { ...d, materialOrders: [o, ...d.materialOrders.filter((x) => !idsMatch(x.id, o.id))] } : d
    );
  }, [setData]);

  const mergeWarranty = useCallback((w: Warranty) => {
    setData((d) =>
      d ? { ...d, warranties: [...d.warranties.filter((x) => !idsMatch(x.id, w.id)), w].sort((a, b) => a.endDate.localeCompare(b.endDate)) } : d
    );
  }, [setData]);

  const mergeSav = useCallback((t: SavTicket) => {
    setData((d) =>
      d ? { ...d, savTickets: [t, ...d.savTickets.filter((x) => !idsMatch(x.id, t.id))] } : d
    );
  }, [setData]);

  const tabs = useMemo(
    () =>
      [
        { id: "rdv" as const, label: "Prise de RDV", desc: "Canal & créneaux" },
        { id: "cr" as const, label: "Comptes-rendus", desc: "Dictée → rapport" },
        { id: "materiaux" as const, label: "Matériaux", desc: "Depuis devis" },
        { id: "garantie" as const, label: "Garantie & SAV", desc: "Certificats & tickets" },
      ] as const,
    []
  );

  return (
    <section id="ia-panel" className="panel active ia-panel">
      <div className="panel-header">
        <div>
          <h2>IA & gain de temps</h2>
          <p>
            Automatisez les tâches répétitives : qualification des demandes, rédaction des comptes-rendus, listes de
            commandes et suivi garantie.
          </p>
          {iaHints ? (
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              {iaHints.openAiConfigured
                ? "Clé OpenAI détectée : enrichissement IA activé."
                : "Sans clé OpenAI : modèles locaux (templates + règles). Ajoutez OPENAI_API_KEY pour un texte plus riche."}
              {iaHints.smtpConfigured ? "" : " Configurez SMTP pour l’envoi e-mail client (CR, rappels garantie)."}
            </p>
          ) : null}
        </div>
      </div>

      {err ? (
        <div className="card ia-alert" style={{ borderColor: "var(--danger)", marginBottom: 16 }}>
          <p style={{ color: "var(--danger)" }}>{err}</p>
          <button type="button" className="ghost small" onClick={() => setErr(null)}>
            Fermer
          </button>
        </div>
      ) : null}

      <div className="ia-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`ia-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span className="ia-tab-label">{t.label}</span>
            <span className="ia-tab-desc muted">{t.desc}</span>
          </button>
        ))}
      </div>

      {tab === "rdv" ? (
        <BookingTab
          data={data}
          busy={busy}
          setBusy={setBusy}
          setErr={setErr}
          getClient={getClient}
          mergeBooking={mergeBooking}
          onRebootstrap={onRebootstrap}
        />
      ) : null}
      {tab === "cr" ? (
        <ReportsTab
          data={data}
          busy={busy}
          setBusy={setBusy}
          setErr={setErr}
          getClient={getClient}
          mergeReport={mergeReport}
        />
      ) : null}
      {tab === "materiaux" ? (
        <MaterialsTab data={data} busy={busy} setBusy={setBusy} setErr={setErr} mergeOrder={mergeOrder} getClient={getClient} />
      ) : null}
      {tab === "garantie" ? (
        <WarrantyTab data={data} busy={busy} setBusy={setBusy} setErr={setErr} getClient={getClient} mergeWarranty={mergeWarranty} mergeSav={mergeSav} />
      ) : null}
    </section>
  );
}

function BookingTab({
  data,
  busy,
  setBusy,
  setErr,
  getClient,
  mergeBooking,
  onRebootstrap,
}: {
  data: BootstrapData;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setErr: (s: string | null) => void;
  getClient: Props["getClient"];
  mergeBooking: (br: BookingRequest) => void;
  onRebootstrap: () => Promise<void>;
}) {
  const [channel, setChannel] = useState("email");
  const [clientId, setClientId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [problemType, setProblemType] = useState("");
  const [problemDetail, setProblemDetail] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [address, setAddress] = useState("");

  const fillFromClient = () => {
    if (!clientId) return;
    const c = getClient(clientId);
    if (!c) return;
    setContactName(c.name);
    setContactPhone(c.phone);
    setContactEmail(c.email || "");
    setAddress(c.address);
  };

  const createRequest = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ bookingRequest: BookingRequest }>("/booking-requests", {
        method: "POST",
        body: JSON.stringify({
          channel,
          clientId: clientId || null,
          contactName,
          contactPhone,
          contactEmail: contactEmail || null,
          problemType,
          problemDetail,
          urgency,
          address,
        }),
      });
      mergeBooking(res.bookingRequest);
      setProblemDetail("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
      try {
        await onRebootstrap();
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  };

  const suggestSlots = async (id: number | string) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<{ bookingRequest: BookingRequest }>(`/booking-requests/${id}/suggest-slots`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      mergeBooking(res.bookingRequest);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const patchBooking = async (id: number | string, body: Record<string, unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<{ bookingRequest: BookingRequest }>(`/booking-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      mergeBooking(res.bookingRequest);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ia-grid">
      <div className="card ia-card-form">
        <h3>Nouvelle demande (simulation canal)</h3>
        <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
          Centralisez les sollicitations e-mail / SMS / WhatsApp. Les créneaux sont générés automatiquement (agenda type
          artisan : lun–ven, matin & après-midi).
        </p>
        <div className="ia-form-grid">
          <label>
            Canal
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="email">E-mail</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="manuel">Autre / manuel</option>
            </select>
          </label>
          <label>
            Lier un client (optionnel)
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">—</option>
              {data.clients.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="ghost small" onClick={fillFromClient} disabled={!clientId}>
            Remplir depuis le client
          </button>
          <label>
            Nom contact
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </label>
          <label>
            Téléphone
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </label>
          <label>
            E-mail
            <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </label>
          <label>
            Type de problème
            <input
              placeholder="Fuite, chauffe-eau, rénovation salle de bains…"
              value={problemType}
              onChange={(e) => setProblemType(e.target.value)}
            />
          </label>
          <label className="ia-span-2">
            Détail & urgence
            <textarea
              rows={3}
              value={problemDetail}
              onChange={(e) => setProblemDetail(e.target.value)}
              placeholder="Message reçu ou notes d’appel"
            />
          </label>
          <label>
            Urgence
            <select value={urgency} onChange={(e) => setUrgency(e.target.value as "normal" | "urgent")}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="ia-span-2">
            Adresse d’intervention
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
        </div>
        <button type="button" className="ia-btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={() => void createRequest()}>
          Enregistrer la demande + proposer des créneaux
        </button>
      </div>

      <div className="card">
        <h3>Demandes en cours</h3>
        <ul className="ia-list">
          {data.bookingRequests.length === 0 ? <li className="muted">Aucune demande.</li> : null}
          {data.bookingRequests.map((br) => (
            <li key={String(br.id)} className="ia-list-item">
              <div>
                <strong>{br.contactName || "Sans nom"}</strong>
                <span className="muted"> · {br.channel}</span>
                {br.urgency === "urgent" ? <span className="ia-badge ia-badge--urgent">Urgent</span> : null}
                <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                  {br.problemType} {br.problemDetail ? `— ${br.problemDetail.slice(0, 120)}${br.problemDetail.length > 120 ? "…" : ""}` : ""}
                </p>
                {br.aiSuggestedSlots?.length ? (
                  <ul className="ia-slots">
                    {br.aiSuggestedSlots.slice(0, 6).map((s) => (
                      <li key={s.start}>
                        <button
                          type="button"
                          className="ghost small"
                          disabled={busy}
                          onClick={() =>
                            void patchBooking(br.id, { scheduledAt: s.start, status: "confirme" })
                          }
                        >
                          Choisir : {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="ia-row-actions">
                  <button type="button" className="ghost small" disabled={busy} onClick={() => void suggestSlots(br.id)}>
                    Régénérer créneaux
                  </button>
                  <CopyQualifTemplates br={br} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CopyQualifTemplates({ br }: { br: BookingRequest }) {
  const emailText = useMemo(() => {
    return (
      `Bonjour,\n\nMerci pour votre message. Pour vous proposer un créneau, merci de préciser :\n` +
      `1) Type de problème : ${br.problemType || "…"}\n` +
      `2) Urgence (fuite active ?) : ${br.urgency}\n` +
      `3) Adresse précise : ${br.address || "…"}\n\n` +
      `Créneaux proposés :\n${(br.aiSuggestedSlots || []).slice(0, 4).map((s) => `• ${s.label}`).join("\n")}\n\n` +
      `Cordialement`
    );
  }, [br]);

  const smsText = useMemo(() => {
    const first = br.aiSuggestedSlots?.[0];
    return `Bonjour, nous avons bien reçu votre demande (${br.problemType || "plomberie"}). ${first ? `Proposition : ${first.label}. ` : ""}Répondez OK pour confirmer.`;
  }, [br]);

  const copy = (t: string) => {
    void navigator.clipboard.writeText(t);
  };

  return (
    <div className="ia-copy-btns">
      <button type="button" className="ghost small" onClick={() => copy(emailText)}>
        Copier e-mail
      </button>
      <button type="button" className="ghost small" onClick={() => copy(smsText)}>
        Copier SMS
      </button>
    </div>
  );
}

function ReportsTab({
  data,
  busy,
  setBusy,
  setErr,
  getClient,
  mergeReport,
}: {
  data: BootstrapData;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setErr: (s: string | null) => void;
  getClient: Props["getClient"];
  mergeReport: (r: InterventionReport) => void;
}) {
  const [projectId, setProjectId] = useState("");
  const [transcript, setTranscript] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [editBodies, setEditBodies] = useState<Record<string, string>>({});

  const createReport = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ interventionReport: InterventionReport }>("/intervention-reports", {
        method: "POST",
        body: JSON.stringify({
          projectId: projectId || null,
          transcript,
          useAi,
          photoUrls: [],
        }),
      });
      mergeReport(res.interventionReport);
      setTranscript("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async (id: number | string) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<{ interventionReport: InterventionReport }>(`/intervention-reports/${id}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ useAi }),
      });
      mergeReport(res.interventionReport);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const notify = async (id: number | string) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<{ interventionReport: InterventionReport }>(`/intervention-reports/${id}/notify-client`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      mergeReport(res.interventionReport);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const saveBody = async (id: number | string) => {
    const body = editBodies[String(id)];
    if (body === undefined) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<{ interventionReport: InterventionReport }>(`/intervention-reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ reportBody: body }),
      });
      mergeReport(res.interventionReport);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ia-grid">
      <div className="card ia-card-form">
        <h3>Dictée → compte-rendu structuré</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Saisissez 20–40 secondes de notes vocales transcrites (ou tapez au clavier). Le texte est structuré en sections
          prêtes à envoyer.
        </p>
        <label>
          Chantier (recommandé)
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">—</option>
            {data.projects.map((p) => (
              <option key={String(p.id)} value={String(p.id)}>
                {p.name} ({getClient(p.clientId)?.name ?? "?"})
              </option>
            ))}
          </select>
        </label>
        <label className="ia-check">
          <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
          Utiliser l’IA si configurée (sinon modèle local)
        </label>
        <label>
          Transcription / notes
          <textarea rows={6} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Ex. : Remplacé groupe de sécurité, test étanchéité OK, client informé…" />
        </label>
        <button type="button" className="ia-btn-primary" disabled={busy || !transcript.trim()} onClick={() => void createReport()}>
          Générer le compte-rendu
        </button>
      </div>

      <div className="card">
        <h3>Historique</h3>
        {data.interventionReports.length === 0 ? <p className="muted">Aucun compte-rendu.</p> : null}
        <ul className="ia-list">
          {data.interventionReports.map((r) => {
            const c = r.clientId ? getClient(r.clientId) : undefined;
            const draft = editBodies[String(r.id)] ?? r.reportBody;
            return (
              <li key={String(r.id)} className="ia-list-item">
                <p className="muted" style={{ fontSize: 12 }}>
                  {formatDate(r.createdAt)} · {c?.name ?? "Client lié"}
                  {r.clientEmailSentAt ? <span className="ia-badge ia-badge--ok">Envoyé client</span> : null}
                </p>
                <textarea
                  className="ia-report-textarea"
                  rows={10}
                  value={draft}
                  onChange={(e) => setEditBodies((prev) => ({ ...prev, [String(r.id)]: e.target.value }))}
                />
                <div className="ia-row-actions">
                  <button type="button" className="ghost small" disabled={busy} onClick={() => void saveBody(r.id)}>
                    Enregistrer le texte
                  </button>
                  <button type="button" className="ghost small" disabled={busy} onClick={() => void regenerate(r.id)}>
                    Régénérer
                  </button>
                  <button type="button" className="ia-btn-primary ia-btn-primary--small" disabled={busy} onClick={() => void notify(r.id)}>
                    E-mail client
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function MaterialsTab({
  data,
  busy,
  setBusy,
  setErr,
  mergeOrder,
  getClient,
}: {
  data: BootstrapData;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setErr: (s: string | null) => void;
  mergeOrder: (o: MaterialOrder) => void;
  getClient: Props["getClient"];
}) {
  const [quoteId, setQuoteId] = useState("");
  const [useAi, setUseAi] = useState(true);

  const generate = async () => {
    if (!quoteId) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<{ materialOrder: MaterialOrder }>(`/material-orders/from-quote/${quoteId}`, {
        method: "POST",
        body: JSON.stringify({ useAi }),
      });
      mergeOrder(res.materialOrder);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const updateLine = (orderId: number | string, lines: MaterialOrderLine[]) => {
    void (async () => {
      setBusy(true);
      setErr(null);
      try {
        const res = await apiFetch<{ materialOrder: MaterialOrder }>(`/material-orders/${orderId}`, {
          method: "PATCH",
          body: JSON.stringify({ lines }),
        });
        mergeOrder(res.materialOrder);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erreur");
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className="ia-grid">
      <div className="card ia-card-form">
        <h3>Commande matériaux depuis un devis</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Extrait les lignes matériaux du devis (texte + montants) et propose quantités et fournisseurs types. Ajustez
          avant d’envoyer au grossiste.
        </p>
        <label>
          Devis
          <select value={quoteId} onChange={(e) => setQuoteId(e.target.value)}>
            <option value="">—</option>
            {data.quotes.map((q) => (
              <option key={String(q.id)} value={String(q.id)}>
                {q.quoteRef} · {getClient(q.clientId)?.name ?? "?"} · {q.status}
              </option>
            ))}
          </select>
        </label>
        <label className="ia-check">
          <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
          Enrichir avec l’IA (sinon parsing local du champ matériaux)
        </label>
        <button type="button" className="ia-btn-primary" disabled={busy || !quoteId} onClick={() => void generate()}>
          Générer la liste
        </button>
      </div>

      <div className="card">
        <h3>Listes générées</h3>
        {data.materialOrders.length === 0 ? <p className="muted">Aucune liste.</p> : null}
        <ul className="ia-list">
          {data.materialOrders.map((o) => (
            <li key={String(o.id)} className="ia-list-item">
              <strong>{o.title}</strong>
              <p className="muted" style={{ fontSize: 12 }}>
                {formatDate(o.createdAt)} · {o.status}
              </p>
              <table className="ia-table">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Qté</th>
                    <th>Fournisseur</th>
                  </tr>
                </thead>
                <tbody>
                  {o.lines.map((line, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          className="ia-table-input"
                          value={line.name}
                          onChange={(e) => {
                            const next = o.lines.map((x, j) => (j === i ? { ...x, name: e.target.value } : x));
                            mergeOrder({ ...o, lines: next });
                          }}
                          onBlur={() => updateLine(o.id, o.lines)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="ia-table-input ia-table-input--num"
                          value={line.quantity ?? 1}
                          onChange={(e) => {
                            const q = Number(e.target.value);
                            const next = o.lines.map((x, j) => (j === i ? { ...x, quantity: q } : x));
                            mergeOrder({ ...o, lines: next });
                          }}
                          onBlur={() => updateLine(o.id, o.lines)}
                        />
                      </td>
                      <td>
                        <input
                          className="ia-table-input"
                          value={line.supplier ?? ""}
                          onChange={(e) => {
                            const next = o.lines.map((x, j) => (j === i ? { ...x, supplier: e.target.value } : x));
                            mergeOrder({ ...o, lines: next });
                          }}
                          onBlur={() => updateLine(o.id, o.lines)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ia-row-actions">
                <button
                  type="button"
                  className="ghost small"
                  disabled={busy}
                  onClick={() => {
                    const text = o.lines.map((l) => `${l.name} x${l.quantity ?? 1} — ${l.supplier ?? ""}`).join("\n");
                    void navigator.clipboard.writeText(text);
                  }}
                >
                  Copier pour commande
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function WarrantyTab({
  data,
  busy,
  setBusy,
  setErr,
  getClient,
  mergeWarranty,
  mergeSav,
}: {
  data: BootstrapData;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setErr: (s: string | null) => void;
  getClient: Props["getClient"];
  mergeWarranty: (w: Warranty) => void;
  mergeSav: (t: SavTicket) => void;
}) {
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [months, setMonths] = useState(24);
  const [useAi, setUseAi] = useState(true);
  const [savClientId, setSavClientId] = useState("");
  const [savSubject, setSavSubject] = useState("");
  const [savDesc, setSavDesc] = useState("");
  const [savWarrantyId, setSavWarrantyId] = useState("");

  const createWarranty = async () => {
    if (!clientId) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<{ warranty: Warranty }>("/warranties", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          projectId: projectId || null,
          workSummary,
          warrantyMonths: months,
          useAi,
        }),
      });
      mergeWarranty(res.warranty);
      setWorkSummary("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const createSav = async () => {
    if (!savClientId || !savSubject) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<{ savTicket: SavTicket }>("/sav-tickets", {
        method: "POST",
        body: JSON.stringify({
          clientId: savClientId,
          subject: savSubject,
          description: savDesc,
          warrantyId: savWarrantyId || null,
        }),
      });
      mergeSav(res.savTicket);
      setSavSubject("");
      setSavDesc("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const patchSav = (id: number | string, status: string) => {
    void (async () => {
      setBusy(true);
      try {
        const res = await apiFetch<{ savTicket: SavTicket }>(`/sav-tickets/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        mergeSav(res.savTicket);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erreur");
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className="ia-grid ia-grid--triple">
      <div className="card ia-card-form">
        <h3>Garantie & certificat</h3>
        <label>
          Client
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">—</option>
            {data.clients.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chantier (optionnel)
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">—</option>
            {data.projects.map((p) => (
              <option key={String(p.id)} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Durée (mois)
          <input type="number" min={1} max={120} value={months} onChange={(e) => setMonths(Number(e.target.value))} />
        </label>
        <label>
          Travaux couverts
          <textarea rows={3} value={workSummary} onChange={(e) => setWorkSummary(e.target.value)} />
        </label>
        <label className="ia-check">
          <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
          Reformuler le certificat (IA si disponible)
        </label>
        <button type="button" className="ia-btn-primary" disabled={busy || !clientId} onClick={() => void createWarranty()}>
          Créer la garantie
        </button>
      </div>

      <div className="card">
        <h3>Garanties actives</h3>
        <p className="muted" style={{ fontSize: 12 }}>
          Rappels e-mail J-30 et J-7 : cron <code>/api/cron/warranty-reminders</code> (même secret que les relances
          devis).
        </p>
        {data.warranties.length === 0 ? <p className="muted">Aucune garantie.</p> : null}
        <ul className="ia-list">
          {data.warranties.map((w) => (
            <li key={String(w.id)} className="ia-list-item">
              <strong>{w.label}</strong>
              <p className="muted" style={{ fontSize: 12 }}>
                {getClient(w.clientId)?.name} · fin {formatDate(w.endDate)}
              </p>
              <pre className="ia-cert-preview">{w.certificateBody.slice(0, 400)}{w.certificateBody.length > 400 ? "…" : ""}</pre>
              <button
                type="button"
                className="ghost small"
                onClick={() => void navigator.clipboard.writeText(w.certificateBody)}
              >
                Copier certificat
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card ia-card-form">
        <h3>Tickets SAV</h3>
        <label>
          Client
          <select value={savClientId} onChange={(e) => setSavClientId(e.target.value)}>
            <option value="">—</option>
            {data.clients.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Lier garantie (optionnel)
          <select value={savWarrantyId} onChange={(e) => setSavWarrantyId(e.target.value)}>
            <option value="">—</option>
            {data.warranties.map((w) => (
              <option key={String(w.id)} value={String(w.id)}>
                {w.label} · fin {w.endDate}
              </option>
            ))}
          </select>
        </label>
        <label>
          Objet
          <input value={savSubject} onChange={(e) => setSavSubject(e.target.value)} />
        </label>
        <label>
          Description
          <textarea rows={3} value={savDesc} onChange={(e) => setSavDesc(e.target.value)} />
        </label>
        <button type="button" className="ia-btn-primary" disabled={busy || !savClientId || !savSubject} onClick={() => void createSav()}>
          Créer le ticket
        </button>
        <ul className="ia-list" style={{ marginTop: 16 }}>
          {data.savTickets.map((t) => (
            <li key={String(t.id)} className="ia-list-item">
              <strong>{t.subject}</strong>
              <p className="muted" style={{ fontSize: 12 }}>
                {getClient(t.clientId)?.name} · {t.status}
              </p>
              <div className="ia-row-actions">
                <button type="button" className="ghost small" disabled={busy} onClick={() => patchSav(t.id, "en_cours")}>
                  En cours
                </button>
                <button type="button" className="ghost small" disabled={busy} onClick={() => patchSav(t.id, "resolu")}>
                  Résolu
                </button>
                <button type="button" className="ghost small" disabled={busy} onClick={() => patchSav(t.id, "ferme")}>
                  Fermer
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
