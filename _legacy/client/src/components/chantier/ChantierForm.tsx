import { useEffect, useMemo, useState } from "react";
import { CHANTIER_TYPES } from "../../constants/chantier";
import type { Client, EtapeMetier, Quote } from "../../types";
import { StepperMetier } from "./StepperMetier";

type Props = {
  clients: Client[];
  quotes: Quote[];
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
};

export function ChantierForm({ clients, quotes, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string>(() => String(clients[0]?.id ?? ""));
  const [etapeMetier, setEtapeMetier] = useState<EtapeMetier>("terrassement");
  const [siteAddress, setSiteAddress] = useState("");
  const [chantierType, setChantierType] = useState("plomberie");
  const [quoteId, setQuoteId] = useState<string>("");
  const [budgetEstime, setBudgetEstime] = useState("");
  const [heuresPrevues, setHeuresPrevues] = useState("");
  const [responsible, setResponsible] = useState("");
  const [comment, setComment] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId && clients[0]) setClientId(String(clients[0].id));
  }, [clients, clientId]);

  const quoteOptions = useMemo(() => quotes, [quotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert("Sélectionnez un client.");
      return;
    }
    if (!dueDate) {
      alert("Indiquez une échéance.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        name,
        clientId: clientId === "" ? null : clientId,
        status: "Planifié",
        dueDate,
        responsible,
        comment,
        siteAddress,
        chantierType,
        quoteId: quoteId === "" ? null : quoteId,
        budgetEstime: budgetEstime === "" ? 0 : Number(budgetEstime),
        heuresPrevues: heuresPrevues === "" ? 0 : Number(heuresPrevues),
        etapeMetier,
        photoUrls: [],
        aRelancer: false,
      });
      setName("");
      setSiteAddress("");
      setQuoteId("");
      setBudgetEstime("");
      setHeuresPrevues("");
      setResponsible("");
      setComment("");
      setDueDate("");
      setEtapeMetier("terrassement");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form chantier-form" onSubmit={handleSubmit}>
      <label>
        Nom du chantier
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Client
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
          {clients.length === 0 ? <option value="">Aucun client</option> : null}
          {clients.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Type de chantier
        <select value={chantierType} onChange={(e) => setChantierType(e.target.value)}>
          {CHANTIER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Adresse du chantier
        <input
          value={siteAddress}
          onChange={(e) => setSiteAddress(e.target.value)}
          placeholder="Distincte de l’adresse client si besoin"
        />
      </label>
      <label>
        Devis associé
        <select value={quoteId} onChange={(e) => setQuoteId(e.target.value)}>
          <option value="">— Aucun —</option>
          {quoteOptions.map((q) => (
            <option key={q.id} value={String(q.id)}>
              {q.quoteRef} · {formatEuro(q.amount)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Budget estimé (€)
        <input
          type="number"
          min={0}
          step={100}
          value={budgetEstime}
          onChange={(e) => setBudgetEstime(e.target.value)}
        />
      </label>
      <label>
        Heures prévues
        <input
          type="number"
          min={0}
          step={1}
          value={heuresPrevues}
          onChange={(e) => setHeuresPrevues(e.target.value)}
        />
      </label>
      <div className="chantier-stepper-wrap">
        <span className="muted chantier-stepper-label">
          Avancement métier
        </span>
        <StepperMetier value={etapeMetier} onChange={setEtapeMetier} />
      </div>
      <label>
        Responsable
        <input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Nom du responsable" />
      </label>
      <label>
        Commentaire
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Infos utiles du chantier" />
      </label>
      <label>
        Échéance
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? "Création…" : "Créer le chantier"}
      </button>
    </form>
  );
}

function formatEuro(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
