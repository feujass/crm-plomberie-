import { useCallback, useEffect, useMemo, useState } from "react";
import { PinLogin } from "./components/PinLogin";
import { apiFetch, TOKEN_KEY } from "./api";
import { SettingsPanel } from "./components/SettingsPanel";
import { SuiviProjetsPanel } from "./components/chantier/SuiviProjetsPanel";
import { ETAPE_LABELS } from "./constants/chantier";
import type { BootstrapData, Client, Quote, Service } from "./types";
import { formatCurrency, formatDate, formatPhone } from "./utils/format";
import { parseHours } from "./utils/hours";
import { normalizeProject } from "./utils/project";

type PanelId = "dashboard" | "clients" | "devis" | "projets" | "rapports" | "parametres";

type MaterialRow = { name: string; price: number };

type BootstrapResponse = {
  user: { id: number | string; name: string; email: string; initials: string };
  data: BootstrapData & {
    satisfaction?: { score: number; responses: number };
  };
};

const idsMatch = (a: unknown, b: unknown) => String(a) === String(b);

export default function App() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [user, setUser] = useState<BootstrapResponse["user"] | null>(null);
  const [authVisible, setAuthVisible] = useState(true);
  const [panel, setPanel] = useState<PanelId>("dashboard");
  const [quoteFilterId, setQuoteFilterId] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConfigurable, setGoogleConfigurable] = useState(false);
  const [clientsQuery, setClientsQuery] = useState("");
  const [materials, setMaterials] = useState<MaterialRow[]>([{ name: "", price: 0 }]);
  const [quotePreview, setQuotePreview] = useState<{
    clientId: string;
    serviceId: string;
    hours: number;
    discount: number;
    materials: MaterialRow[];
    materialsTotal: number;
  } | null>(null);

  const getClient = useCallback(
    (id: number | string) => data?.clients.find((c) => idsMatch(c.id, id)),
    [data]
  );
  const getService = useCallback(
    (id: number | string) => data?.services.find((s) => idsMatch(s.id, id)),
    [data]
  );

  const computeQuotePreview = useCallback(
    (q: { serviceId: string; materialsTotal: number; hours: number; discount: number }) => {
      const service = getService(q.serviceId);
      if (!service || !data) return 0;
      const base = service.basePrice + q.materialsTotal + q.hours * data.laborRate;
      const discount = base * (q.discount / 100);
      return Math.round(base - discount);
    },
    [data, getService]
  );

  const refreshGoogle = useCallback(async () => {
    try {
      const s = await apiFetch<{ connected: boolean; configured: boolean }>("/google/status");
      setGoogleConnected(Boolean(s.connected));
      setGoogleConfigurable(Boolean(s.configured));
    } catch {
      setGoogleConnected(false);
      setGoogleConfigurable(false);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    const payload = await apiFetch<BootstrapResponse>("/bootstrap");
    setUser(payload.user);
    setData({
      ...payload.data,
      projects: payload.data.projects.map((p) => normalizeProject(p as unknown as Record<string, unknown>)),
    });
    await refreshGoogle();
  }, [refreshGoogle]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      void refreshGoogle();
      window.history.replaceState({}, "", window.location.pathname);
    }
    const qid = params.get("quoteId");
    if (qid) {
      setQuoteFilterId(qid);
      setPanel("devis");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refreshGoogle]);

  useEffect(() => {
    const run = async () => {
      try {
        await apiFetch("/health");
      } catch {
        alert("Le backend n’est pas démarré. Lancez le serveur (npm start) sur le port 3000.");
        setAuthVisible(true);
        return;
      }
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          await bootstrap();
          setAuthVisible(false);
          return;
        } catch {
          localStorage.removeItem(TOKEN_KEY);
        }
      }
      setAuthVisible(true);
    };
    void run();
  }, [bootstrap]);

  const filteredClients = useMemo(() => {
    if (!data) return [];
    const v = clientsQuery.toLowerCase().trim();
    if (!v) return data.clients;
    return data.clients.filter(
      (c) =>
        c.name.toLowerCase().includes(v) ||
        c.address.toLowerCase().includes(v) ||
        c.phone.toLowerCase().includes(v)
    );
  }, [data, clientsQuery]);

  const filteredQuotes = useMemo(() => {
    if (!data) return [];
    if (!quoteFilterId) return data.quotes;
    return data.quotes.filter((q) => String(q.id) === quoteFilterId);
  }, [data, quoteFilterId]);

  const loginWithPin = useCallback(
    async (pin: string) => {
      const payload = await apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ pin }),
      });
      localStorage.setItem(TOKEN_KEY, payload.token);
      setAuthVisible(false);
      await bootstrap();
    },
    [bootstrap]
  );

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setData(null);
    setUser(null);
    setAuthVisible(true);
  };

  const renderDate = () =>
    new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());

  if (!data && !authVisible) {
    return (
      <div className="main" style={{ padding: 40 }}>
        <p>Chargement…</p>
      </div>
    );
  }

  const kpis = data
    ? (() => {
        const totalRevenue = data.quotes
          .filter((q) => q.status === "Accepté")
          .reduce((acc, q) => acc + q.amount, 0);
        const totalQuotes = data.quotes.length;
        const acceptedQuotes = data.quotes.filter((q) => q.status === "Accepté").length;
        const activeProjects = data.projects.filter((p) => p.status !== "Terminé").length;
        return [
          { label: "Chiffre d'affaires", value: formatCurrency(totalRevenue), icon: "💶", theme: "kpi-primary" },
          {
            label: "Devis envoyés",
            value: `${acceptedQuotes} / ${totalQuotes}`,
            sublabel: "acceptés / envoyés",
            icon: "🧾",
            theme: "kpi-info",
          },
          { label: "Clients actifs", value: String(data.clients.length), icon: "👥", theme: "kpi-success" },
          { label: "Projets en cours", value: String(activeProjects), icon: "🛠️", theme: "kpi-warning" },
        ];
      })()
    : [];

  const nav = (id: PanelId, icon: string, label: string) => (
    <button
      type="button"
      className={`nav-item${panel === id ? " active" : ""}`}
      onClick={() => setPanel(id)}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </button>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">≈</span>
          <div>
            <h1>PlombiCRM</h1>
            <p>BTP • Plomberie</p>
          </div>
        </div>
        <nav className="nav">
          {nav("dashboard", "🏠", "Tableau de bord")}
          {nav("clients", "👥", "Clients")}
          {nav("devis", "🧾", "Devis")}
          {nav("projets", "🛠️", "Suivi projets")}
          {nav("rapports", "📊", "Rapports")}
          {nav("parametres", "⚙️", "Paramètres")}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-actions">
            <span>{renderDate()}</span>
            <button type="button" id="logout" className="ghost" onClick={logout}>
              Déconnexion
            </button>
            <div className="avatar">{user?.initials ?? "—"}</div>
          </div>
        </header>

        {data && panel === "dashboard" ? (
          <section id="dashboard" className="panel active">
            <div className="panel-header">
              <div>
                <h2>Bonjour 👋</h2>
                <p>Voici les indicateurs clés du mois.</p>
              </div>
              <button
                type="button"
                id="reset-data"
                className="ghost"
                onClick={async () => {
                  try {
                    await apiFetch("/reset", { method: "POST" });
                    await bootstrap();
                  } catch (e) {
                    alert(e instanceof Error ? e.message : "Erreur");
                  }
                }}
              >
                Réinitialiser les données
              </button>
            </div>
            <div className="cards">
              {kpis.map((k) => (
                <div key={k.label} className={`card kpi-card ${k.theme}`}>
                  <p className="muted">{k.label}</p>
                  <div className="kpi-icon">{k.icon}</div>
                  <div className={`metric${k.sublabel ? " metric-stack" : ""}`}>
                    {k.value}
                    {k.sublabel ? <span>{k.sublabel}</span> : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid">
              <div className="card">
                <h3>Suivi des projets</h3>
                {data.projects.map((p) => (
                  <div key={String(p.id)} className="progress">
                    <div>
                      <strong>{p.name}</strong>
                      <p className="muted">{getClient(p.clientId)?.name}</p>
                      <p className="muted" style={{ marginTop: 4 }}>
                        {ETAPE_LABELS[p.etapeMetier]} · {p.progress}%
                      </p>
                    </div>
                    <div className="progress-bar">
                      <span style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3>Notifications</h3>
                <ul className="list">
                  {notificationsList(data)}
                </ul>
              </div>
              <div className="card">
                <h3>Devis récents</h3>
                <ul className="list">
                  {data.quotes.slice(0, 4).map((q) => (
                    <li key={String(q.id)}>
                      <span>{getClient(q.clientId)?.name}</span>
                      <span>{formatCurrency(q.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {data && panel === "clients" ? (
          <section id="clients" className="panel active">
            <div className="panel-header">
              <div>
                <h2>Gestion des clients</h2>
                <p>Ajoutez, classez et suivez l’historique des interventions.</p>
              </div>
              <div className="search">
                <input
                  type="search"
                  placeholder="Rechercher un client"
                  value={clientsQuery}
                  onChange={(e) => setClientsQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="split">
              <div className="card">
                <h3>Nouveau client</h3>
                <form
                  className="form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    try {
                      const payload = await apiFetch<{ client: Client }>("/clients", {
                        method: "POST",
                        body: JSON.stringify({
                          name: fd.get("name"),
                          address: fd.get("address"),
                          phone: fd.get("phone"),
                          email: fd.get("email"),
                          segment: fd.get("segment"),
                          lastProject: "Nouveau projet",
                        }),
                      });
                      setData((d) => (d ? { ...d, clients: [payload.client, ...d.clients] } : d));
                      e.currentTarget.reset();
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Erreur");
                    }
                  }}
                >
                  <label>
                    Nom complet
                    <input name="name" required />
                  </label>
                  <label>
                    Adresse
                    <input name="address" required />
                  </label>
                  <label>
                    Téléphone
                    <input name="phone" required />
                  </label>
                  <label>
                    Email
                    <input name="email" type="email" placeholder="client@exemple.fr" />
                  </label>
                  <label>
                    Classification
                    <select name="segment">
                      <option value="Nouveau">Nouveau</option>
                      <option value="Régulier">Régulier</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </label>
                  <button type="submit">Ajouter le client</button>
                </form>
              </div>
              <div className="card">
                <h3>Base clients</h3>
                <div className="client-grid">
                  {filteredClients.map((client) => (
                    <div key={String(client.id)} className="client-card">
                      <div className="client-header">
                        <div>
                          <strong>{client.name}</strong>
                          <p className="muted">{client.address}</p>
                        </div>
                        <span className={`tag ${client.segment === "VIP" ? "danger" : "success"}`}>{client.segment}</span>
                      </div>
                      <div className="client-info">
                        <div>
                          <span className="muted">Dernier projet</span>
                          <strong>{client.lastProject}</strong>
                        </div>
                        <div>
                          <span className="muted">Téléphone</span>
                          <strong>{formatPhone(client.phone)}</strong>
                        </div>
                        <div>
                          <span className="muted">Email</span>
                          <strong>{client.email || "-"}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {data && panel === "devis" ? (
          <section id="devis" className="panel active">
            <div className="panel-header">
              <div>
                <h2>Devis automatisés</h2>
                <p>Générez des devis personnalisés avec la bibliothèque de tarifs.</p>
                {quoteFilterId ? (
                  <p className="muted" style={{ marginTop: 8 }}>
                    Filtre actif : un devis sélectionné depuis un chantier.{" "}
                    <button type="button" className="link-devis-ref" onClick={() => setQuoteFilterId(null)}>
                      Afficher tout
                    </button>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="split">
              <div className="card">
                <h3>Créer un devis</h3>
                <DevisFormInner
                  data={data}
                  materials={materials}
                  setMaterials={setMaterials}
                  onPreview={(draft) => setQuotePreview(draft)}
                  onServiceAdded={(svc) =>
                    setData((d) => (d ? { ...d, services: [svc, ...d.services] } : d))
                  }
                />
                {quotePreview ? (
                  <QuotePreviewBlock
                    data={data}
                    draft={quotePreview}
                    total={computeQuotePreview(quotePreview)}
                    onClose={() => setQuotePreview(null)}
                    onSent={async () => {
                      await bootstrap();
                      setQuotePreview(null);
                    }}
                  />
                ) : null}
              </div>
              <div className="card">
                <h3>Historique des devis</h3>
                <ul className="list" style={{ display: "grid", gap: 12 }}>
                  {filteredQuotes.map((quote) => (
                    <QuoteRow
                      key={String(quote.id)}
                      quote={quote}
                      clientName={getClient(quote.clientId)?.name ?? "—"}
                      onAck={async () => {
                        const payload = await apiFetch<{ quote: Quote }>(`/quotes/${quote.id}/ack`, { method: "PATCH" });
                        setData((d) =>
                          d
                            ? {
                                ...d,
                                quotes: d.quotes.map((x) => (idsMatch(x.id, quote.id) ? payload.quote : x)),
                              }
                            : d
                        );
                      }}
                      onStatus={async (status) => {
                        const payload = await apiFetch<{ quote: Quote }>(`/quotes/${quote.id}/status`, {
                          method: "PATCH",
                          body: JSON.stringify({ status }),
                        });
                        setData((d) =>
                          d
                            ? {
                                ...d,
                                quotes: d.quotes.map((x) => (idsMatch(x.id, quote.id) ? payload.quote : x)),
                              }
                            : d
                        );
                      }}
                    />
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {data && panel === "projets" ? (
          <SuiviProjetsPanel
            projects={data.projects}
            clients={data.clients}
            quotes={data.quotes}
            googleConnected={googleConnected}
            onCreateProject={async (payload) => {
              const res = await apiFetch<{ project: Record<string, unknown> }>("/projects", {
                method: "POST",
                body: JSON.stringify(payload),
              });
              const proj = normalizeProject(res.project);
              setData((d) => (d ? { ...d, projects: [proj, ...d.projects] } : d));
            }}
            onPatchProject={async (id, body) => {
              try {
                const res = await apiFetch<{ project: Record<string, unknown> }>(`/projects/${id}`, {
                  method: "PATCH",
                  body: JSON.stringify(body),
                });
                const proj = normalizeProject(res.project);
                setData((d) =>
                  d ? { ...d, projects: d.projects.map((p) => (idsMatch(p.id, id) ? proj : p)) } : d
                );
              } catch (e) {
                alert(e instanceof Error ? e.message : "Impossible d’enregistrer les modifications.");
                throw e;
              }
            }}
            onSyncCalendar={async (id) => {
              return apiFetch<{ ok: boolean; url?: string }>(`/projects/${id}/sync-calendar`, { method: "POST" });
            }}
            onOpenDevis={(quoteId) => {
              setQuoteFilterId(String(quoteId));
              setPanel("devis");
            }}
            onFocusPanel={() => setPanel("projets")}
          />
        ) : null}

        {data && panel === "rapports" ? <RapportsPanel data={data} getService={getService} /> : null}

        {data && panel === "parametres" ? (
          <SettingsPanel
            googleConnected={googleConnected}
            googleConfigurable={googleConfigurable}
            onRefreshStatus={refreshGoogle}
          />
        ) : null}
      </main>

      <div className={`auth-modal${authVisible ? " active" : ""}`}>
        <div className="auth-card auth-card--pin">
          <div className="auth-header">
            <h2>Déverrouiller</h2>
            <p className="muted">Code d’accès à 4 chiffres (comme sur iPhone).</p>
          </div>
          <PinLogin onSuccess={loginWithPin} />
        </div>
      </div>
    </div>
  );
}

function notificationsList(data: BootstrapData) {
  const today = new Date();
  const dayDiff = (date: Date) => Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const items: { label: string; type: string }[] = [];
  const parseDate = (value: string) => new Date(`${value}T00:00:00`);

  data.projects.forEach((project) => {
    if (project.status === "Terminé") return;
    const due = parseDate(project.dueDate);
    const diff = dayDiff(due);
    if (project.status === "Urgent") items.push({ label: `Projet urgent : ${project.name}`, type: "danger" });
    if (diff < 0) items.push({ label: `Projet en retard : ${project.name}`, type: "danger" });
    else if (diff <= 5) items.push({ label: `Échéance proche (${diff} j) : ${project.name}`, type: "warning" });
  });

  data.quotes.forEach((quote) => {
    const sent = parseDate(quote.sentAt);
    const diff = dayDiff(sent);
    const client = data.clients.find((c) => idsMatch(c.id, quote.clientId));
    if (quote.status === "En attente" && diff <= -7) {
      items.push({ label: `Relance devis : ${client?.name}`, type: "warning" });
    }
    if (quote.status === "Envoyé" && !quote.ack && diff <= -2) {
      items.push({ label: `Accusé manquant : ${client?.name}`, type: "warning" });
    }
  });

  const notifications = items.slice(0, 6);
  if (notifications.length === 0) {
    return (
      <li>
        <span>Aucune notification pour le moment.</span>
        <span className="tag success">OK</span>
      </li>
    );
  }
  return notifications.map((item, i) => (
    <li key={i}>
      <span>{item.label}</span>
      <span className={`tag ${item.type}`}>{item.type === "danger" ? "Urgent" : "Action"}</span>
    </li>
  ));
}

function DevisFormInner({
  data,
  materials,
  setMaterials,
  onPreview,
  onServiceAdded,
}: {
  data: BootstrapData;
  materials: MaterialRow[];
  setMaterials: React.Dispatch<React.SetStateAction<MaterialRow[]>>;
  onServiceAdded: (s: Service) => void;
  onPreview: (d: {
    clientId: string;
    serviceId: string;
    hours: number;
    discount: number;
    materials: MaterialRow[];
    materialsTotal: number;
  }) => void;
}) {
  const [clientId, setClientId] = useState(String(data.clients[0]?.id ?? ""));
  const [serviceId, setServiceId] = useState(String(data.services[0]?.id ?? ""));
  const [hours, setHours] = useState("");
  const [discount, setDiscount] = useState("0");

  useEffect(() => {
    if (!data.clients.some((c) => String(c.id) === clientId) && data.clients[0]) {
      setClientId(String(data.clients[0].id));
    }
  }, [data.clients, clientId]);

  useEffect(() => {
    if (!data.services.some((s) => String(s.id) === serviceId) && data.services[0]) {
      setServiceId(String(data.services[0].id));
    }
  }, [data.services, serviceId]);

  const sumMaterials = (m: MaterialRow[]) => m.reduce((t, x) => t + (Number(x.price) || 0), 0);

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!clientId) {
          alert("Sélectionnez un client.");
          return;
        }
        if (!serviceId) {
          alert("Sélectionnez un service.");
          return;
        }
        const h = parseHours(hours);
        if (!h) {
          alert("Durée invalide (ex: 1,30 • 1h30 • 45min).");
          return;
        }
        const list = materials.map((m) => ({ name: m.name.trim(), price: Number(m.price) || 0 })).filter((m) => m.name || m.price);
        onPreview({
          clientId,
          serviceId,
          hours: h,
          discount: Number(discount),
          materials: list,
          materialsTotal: sumMaterials(list),
        });
      }}
    >
      <label>
        Client
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {data.clients.map((c) => (
            <option key={String(c.id)} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Service
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {data.services.length === 0 ? <option value="">Aucun service</option> : null}
          {data.services.map((s) => (
            <option key={String(s.id)} value={String(s.id)}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="inline-form">
        <AddServiceButton
          onAdd={async (name, price) => {
            const payload = await apiFetch<{ service: Service }>("/services", {
              method: "POST",
              body: JSON.stringify({ name, basePrice: price }),
            });
            onServiceAdded(payload.service);
            setServiceId(String(payload.service.id));
          }}
        />
      </div>
      <div className="materials-field">
        <div className="materials-header">
          <div>
            <span>Matériaux</span>
            <p className="muted">Ajoutez plusieurs matériaux si besoin.</p>
          </div>
          <button type="button" className="ghost small add-material-btn" onClick={() => setMaterials((m) => [...m, { name: "", price: 0 }])}>
            + Ajouter
          </button>
        </div>
        <div className="materials-list">
          {materials.map((row, idx) => (
            <div key={idx} className="material-card">
              <div className="material-actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Supprimer"
                  onClick={() =>
                    setMaterials((m) => {
                      const n = m.filter((_, i) => i !== idx);
                      return n.length ? n : [{ name: "", price: 0 }];
                    })
                  }
                >
                  ×
                </button>
              </div>
              <div className="material-row">
                <input
                  type="text"
                  placeholder="Ajouter…"
                  value={row.name}
                  onChange={(e) =>
                    setMaterials((m) => m.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                  }
                />
                <div className="material-price">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="Prix"
                    value={row.price || ""}
                    onChange={(e) =>
                      setMaterials((m) => m.map((x, i) => (i === idx ? { ...x, price: Number(e.target.value) } : x)))
                    }
                  />
                  <span>€</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <label>
        Heures de main-d&apos;œuvre
        <input value={hours} onChange={(e) => setHours(e.target.value)} required />
      </label>
      <label>
        Remise (%)
        <input type="number" min={0} max={30} value={discount} onChange={(e) => setDiscount(e.target.value)} />
      </label>
      <button type="submit">Générer le devis</button>
    </form>
  );
}

function AddServiceButton({ onAdd }: { onAdd: (name: string, price: number) => Promise<void> }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  return (
    <>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du service" />
      <input
        type="number"
        min={0}
        step={0.01}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Prix HT"
      />
      <button
        type="button"
        className="ghost small"
        onClick={async () => {
          const p = Number(price);
          if (!name.trim() || !Number.isFinite(p)) {
            alert("Nom et prix requis.");
            return;
          }
          await onAdd(name.trim(), p);
          setName("");
          setPrice("");
        }}
      >
        Ajouter
      </button>
    </>
  );
}

function QuotePreviewBlock({
  data,
  draft,
  total,
  onClose,
  onSent,
}: {
  data: BootstrapData;
  draft: {
    clientId: string;
    serviceId: string;
    hours: number;
    discount: number;
    materials: MaterialRow[];
    materialsTotal: number;
  };
  total: number;
  onClose: () => void;
  onSent: () => Promise<void>;
}) {
  const client = data.clients.find((c) => idsMatch(c.id, draft.clientId));
  const service = data.services.find((s) => idsMatch(s.id, draft.serviceId));
  if (!client || !service) return null;
  return (
    <div className="quote-preview">
      <strong>Devis pour {client.name}</strong>
      <p>Service : {service.name}</p>
      <p>Matériaux :</p>
      <ul className="list">
        {draft.materials.length > 0
          ? draft.materials.map((m, i) => (
              <li key={i}>
                <span>{m.name || "Matériau"}</span>
                <span>{formatCurrency(m.price)}</span>
              </li>
            ))
          : (
            <li>
              <span>Matériaux personnalisés</span>
            </li>
          )}
      </ul>
      <p>
        Main-d&apos;œuvre : {draft.hours}h à {formatCurrency(data.laborRate)}/h
      </p>
      <p>Remise : {draft.discount}%</p>
      <p>
        <strong>Total estimé : {formatCurrency(total)}</strong>
      </p>
      <button type="button" className="ghost" onClick={onClose}>
        Fermer
      </button>
      <button
        type="button"
        className="ghost"
        style={{ marginLeft: 8 }}
        onClick={async () => {
          if (!client.email) {
            alert("Ajoutez l’email du client pour envoyer le devis.");
            return;
          }
          try {
            await apiFetch("/quotes", {
              method: "POST",
              body: JSON.stringify({ ...draft, sendEmail: true }),
            });
            await onSent();
          } catch (e) {
            alert(e instanceof Error ? e.message : "Erreur");
          }
        }}
      >
        Envoyer par email
      </button>
    </div>
  );
}

function QuoteRow({
  quote,
  clientName,
  onAck,
  onStatus,
}: {
  quote: Quote;
  clientName: string;
  onAck: () => Promise<void>;
  onStatus: (status: string) => Promise<void>;
}) {
  const statusClass =
    quote.status === "Accepté"
      ? "success"
      : quote.status === "Refusé"
        ? "danger"
        : quote.status === "Envoyé"
          ? "info"
          : "warning";
  return (
    <li className="quote-item" style={{ display: "grid", listStyle: "none" }}>
      <div className="quote-main">
        <strong>{clientName}</strong>
        <p className="muted">Envoyé le {formatDate(quote.sentAt)}</p>
      </div>
      <div className="quote-meta">
        <span className={`tag ${statusClass}`}>{quote.status}</span>
        <span className="quote-amount">{formatCurrency(quote.amount)}</span>
      </div>
      <div className="quote-actions">
        <select
          className="status-select"
          value={quote.status}
          onChange={(e) => void onStatus(e.target.value)}
        >
          {["En attente", "Envoyé", "Accepté", "Refusé"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" className="ghost" onClick={() => void onAck()}>
          {quote.ack ? "Annuler accusé" : "Confirmer réception"}
        </button>
      </div>
    </li>
  );
}

function RapportsPanel({
  data,
  getService,
}: {
  data: BootstrapData;
  getService: (id: number | string) => Service | undefined;
}) {
  const accepted = data.quotes.filter((q) => q.status === "Accepté").length;
  const conversion = data.quotes.length ? Math.round((accepted / data.quotes.length) * 100) : 0;
  const sales = data.quotes.reduce((acc, q) => acc + q.amount, 0);

  const months = useMemo(() => {
    const m = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      m.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleString("fr-FR", { month: "short" }),
      });
    }
    return m;
  }, []);

  const monthTotals = months.map((month) => ({
    ...month,
    total: data.quotes.filter((q) => q.sentAt.startsWith(month.key)).reduce((acc, q) => acc + q.amount, 0),
  }));
  const max = Math.max(...monthTotals.map((x) => x.total), 1);

  const serviceCount = data.quotes.reduce<Record<string, number>>((acc, quote) => {
    acc[String(quote.serviceId)] = (acc[String(quote.serviceId)] || 0) + 1;
    return acc;
  }, {});
  const ranked = Object.entries(serviceCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id, count]) => ({ name: getService(id)?.name ?? "—", count }));

  return (
    <section id="rapports" className="panel active">
      <div className="panel-header">
        <div>
          <h2>Rapports &amp; analyses</h2>
          <p>Suivez la performance des devis, ventes et satisfaction.</p>
        </div>
      </div>
      <div className="grid">
        <div className="card">
          <h3>Taux de conversion</h3>
          <div className="metric" id="conversion-rate">
            {conversion}%
          </div>
          <div
            className="ring"
            id="conversion-ring"
            style={{
              background: `conic-gradient(var(--primary) ${conversion * 3.6}deg, #e5e7eb 0deg)`,
            }}
          />
          <p className="muted">Devis convertis en contrats</p>
        </div>
        <div className="card">
          <h3>Tendances de vente</h3>
          <div id="sales-chart" className="bar-chart">
            {monthTotals.map((item) => (
              <div
                key={item.key}
                className="bar"
                style={{ height: `${Math.max((item.total / max) * 100, 8)}%` }}
              >
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <ul id="sales-trends" className="list">
            <li>
              <span>CA estimé</span>
              <strong>{formatCurrency(sales)}</strong>
            </li>
            <li>
              <span>Marge moyenne</span>
              <strong>28%</strong>
            </li>
            <li>
              <span>Délais moyens</span>
              <strong>9 jours</strong>
            </li>
          </ul>
        </div>
        <div className="card">
          <h3>Services les plus demandés</h3>
          <ul id="top-services" className="list">
            {ranked.map((s) => (
              <li key={s.name}>
                <span>{s.name}</span>
                <strong>{s.count} demandes</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
