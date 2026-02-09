const API_BASE = "/api";
const TOKEN_KEY = "plombicrm-token";

const elements = {
  navItems: document.querySelectorAll(".nav-item"),
  panels: document.querySelectorAll(".panel"),
  kpiCards: document.getElementById("kpi-cards"),
  clientsTable: document.getElementById("clients-table"),
  clientForm: document.getElementById("client-form"),
  quoteForm: document.getElementById("quote-form"),
  quotePreview: document.getElementById("quote-preview"),
  quoteClient: document.getElementById("quote-client"),
  quoteClientSearch: document.getElementById("quote-client-search"),
  clientsDatalist: document.getElementById("clients-datalist"),
  projectForm: document.getElementById("project-form"),
  projectClient: document.getElementById("project-client"),
  projectClientSearch: document.getElementById("project-client-search"),
  projectClientsDatalist: document.getElementById("project-clients-datalist"),
  quoteService: document.getElementById("quote-service"),
  materialsList: document.getElementById("materials-list"),
  addMaterial: document.getElementById("add-material"),
  quotesList: document.getElementById("quotes-list"),
  projectProgress: document.getElementById("project-progress"),
  projectsList: document.getElementById("projects-list"),
  projectsSortDue: document.getElementById("projects-sort-due"),
  projectsSortProgress: document.getElementById("projects-sort-progress"),
  projectsSortLegacy: document.getElementById("projects-sort"),
  projectsSortActions: document.querySelector(".project-actions"),
  notifications: document.getElementById("notifications"),
  recentQuotes: document.getElementById("recent-quotes"),
  conversionRate: document.getElementById("conversion-rate"),
  salesTrends: document.getElementById("sales-trends"),
  topServices: document.getElementById("top-services"),
  resetData: document.getElementById("reset-data"),
  currentDate: document.getElementById("current-date"),
  clientsSearch: document.getElementById("clients-search"),
  authModal: document.getElementById("auth-modal"),
  loginForm: document.getElementById("login-form"),
  avatar: document.querySelector(".avatar"),
  logout: document.getElementById("logout"),
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

const formatDate = (value) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));

const parseHours = (value) => {
  if (value === null || value === undefined) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const minutesMatch = raw.match(/^(\d+)\s*(min|m)$/i);
  if (minutesMatch) {
    const minutes = Number(minutesMatch[1]);
    if (Number.isFinite(minutes) && minutes >= 0) {
      return minutes / 60;
    }
  }
  if (raw.includes("h")) {
    const [hoursPart, minutesPart] = raw.split("h");
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);
    if (Number.isFinite(hours) && Number.isFinite(minutes) && minutes >= 0 && minutes <= 59) {
      return hours + minutes / 60;
    }
  }
  if (raw.includes(":")) {
    const [hoursPart, minutesPart] = raw.split(":");
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);
    if (Number.isFinite(hours) && Number.isFinite(minutes) && minutes >= 0 && minutes <= 59) {
      return hours + minutes / 60;
    }
  }
  if (raw.includes(",")) {
    const [hoursPart, minutesPart] = raw.split(",");
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);
    if (Number.isFinite(hours) && Number.isFinite(minutes) && minutes >= 0 && minutes <= 59) {
      return hours + minutes / 60;
    }
    const fallback = Number(raw.replace(",", "."));
    return Number.isFinite(fallback) ? fallback : 0;
  }
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatPhone = (value) => {
  if (!value) return "-";
  const trimmed = String(value).trim();
  const isInternational = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "-";
  if (isInternational) {
    const country = digits.slice(0, 2);
    const rest = digits.slice(2).replace(/(\d{2})(?=\d)/g, "$1 ").trim();
    return `+${country} ${rest}`.trim();
  }
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
};

const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Erreur API");
  }
  return response.json();
};

let data = null;
let user = null;

const showAuth = (visible) => {
  elements.authModal.classList.toggle("active", visible);
};

const setUser = (payload) => {
  user = payload;
  if (user?.initials) {
    elements.avatar.textContent = user.initials;
  }
};

const idsMatch = (a, b) => String(a) === String(b);
const getClient = (id) => data.clients.find((client) => idsMatch(client.id, id));
const getService = (id) => data.services.find((service) => idsMatch(service.id, id));

const renderDate = () => {
  const today = new Date();
  elements.currentDate.textContent = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(today);
};

const renderKpis = () => {
  const totalRevenue = data.quotes
    .filter((quote) => quote.status === "Accepté")
    .reduce((acc, quote) => acc + quote.amount, 0);
  const totalQuotes = data.quotes.length;
  const acceptedQuotes = data.quotes.filter((quote) => quote.status === "Accepté").length;
  const totalClients = data.clients.length;
  const activeProjects = data.projects.filter((project) => project.status !== "Terminé").length;

  const kpis = [
    { label: "Chiffre d'affaires", value: formatCurrency(totalRevenue), icon: "💶", theme: "kpi-primary" },
    {
      label: "Devis envoyés",
      value: `${acceptedQuotes} / ${totalQuotes}`,
      sublabel: "acceptés / envoyés",
      icon: "🧾",
      theme: "kpi-info",
    },
    { label: "Clients actifs", value: totalClients, icon: "👥", theme: "kpi-success" },
    { label: "Projets en cours", value: activeProjects, icon: "🛠️", theme: "kpi-warning" },
  ];

  elements.kpiCards.innerHTML = kpis
    .map(
      (kpi) => `
        <div class="card kpi-card ${kpi.theme || ""}">
          <p class="muted">${kpi.label}</p>
          <div class="kpi-icon">${kpi.icon || ""}</div>
          <div class="metric ${kpi.sublabel ? "metric-stack" : ""}">
            ${kpi.value}
            ${kpi.sublabel ? `<span>${kpi.sublabel}</span>` : ""}
          </div>
        </div>
      `
    )
    .join("");
};

const renderClients = (filtered = data.clients) => {
  elements.clientsTable.innerHTML = filtered
    .map(
      (client) => `
        <div class="client-card">
          <div class="client-header">
            <div>
              <strong>${client.name}</strong>
              <p class="muted">${client.address}</p>
            </div>
            <span class="tag ${client.segment === "VIP" ? "danger" : "success"}">${client.segment}</span>
          </div>
          <div class="client-info">
            <div>
              <span class="muted">Dernier projet</span>
              <strong>${client.lastProject}</strong>
            </div>
            <div>
              <span class="muted">Téléphone</span>
              <strong>${formatPhone(client.phone)}</strong>
            </div>
            <div>
              <span class="muted">Email</span>
              <strong>${client.email || "-"}</strong>
            </div>
          </div>
        </div>
      `
    )
    .join("");
};

const renderSelectOptions = () => {
  elements.clientsDatalist.innerHTML = data.clients
    .map((client) => `<option value="${client.name}"></option>`)
    .join("");
  elements.projectClientsDatalist.innerHTML = data.clients
    .map((client) => `<option value="${client.name}"></option>`)
    .join("");
  elements.quoteService.innerHTML = data.services
    .map((service) => `<option value="${service.id}">${service.name}</option>`)
    .join("");
};

const computeQuote = (quote) => {
  const service = getService(quote.serviceId);
  const base = service.basePrice + quote.materialsTotal + quote.hours * data.laborRate;
  const discount = base * (quote.discount / 100);
  return Math.round(base - discount);
};

const createMaterialRow = (material = {}) => {
  const wrapper = document.createElement("div");
  wrapper.className = "material-card";
  wrapper.innerHTML = `
    <div class="material-actions">
      <button
        type="button"
        class="icon-btn"
        data-action="remove-material"
        aria-label="Supprimer le matériau"
        title="Supprimer"
      >
        ×
      </button>
    </div>
    <div class="material-row">
      <input type="text" name="materialName" placeholder="Ajouter..." value="${material.name || ""}" />
      <div class="material-price">
        <input type="number" name="materialPrice" min="0" step="0.01" placeholder="Prix" value="${
          material.price ?? ""
        }" />
        <span>€</span>
      </div>
    </div>
  `;
  return wrapper;
};

const ensureMaterialRow = () => {
  if (!elements.materialsList) return;
  if (elements.materialsList.children.length === 0) {
    elements.materialsList.appendChild(createMaterialRow());
  }
};

const readMaterials = () => {
  const rows = Array.from(elements.materialsList.querySelectorAll(".material-card"));
  return rows
    .map((row) => {
      const name = row.querySelector("input[name='materialName']").value.trim();
      const price = Number(row.querySelector("input[name='materialPrice']").value || 0);
      if (!name && !price) return null;
      return { name, price };
    })
    .filter(Boolean);
};

const sumMaterials = (materials) =>
  materials.reduce((total, item) => total + (Number(item.price) || 0), 0);

const renderQuotePreview = (quote) => {
  const client = getClient(quote.clientId);
  const service = getService(quote.serviceId);
  const total = computeQuote(quote);
  const materialsLines =
    quote.materials.length > 0
      ? quote.materials
          .map((item) => `<li>${item.name || "Matériau"} • ${formatCurrency(item.price || 0)}</li>`)
          .join("")
      : "<li>Matériaux personnalisés</li>";
  elements.quotePreview.classList.remove("hidden");
  elements.quotePreview.innerHTML = `
    <strong>Devis pour ${client.name}</strong>
    <p>Service : ${service.name}</p>
    <p>Matériaux :</p>
    <ul class="list">${materialsLines}</ul>
    <p>Main-d'œuvre : ${quote.hours}h à ${formatCurrency(data.laborRate)}/h</p>
    <p>Remise : ${quote.discount}%</p>
    <p><strong>Total estimé : ${formatCurrency(total)}</strong></p>
    <button id="send-quote" class="ghost">Envoyer par email</button>
  `;

  const sendButton = document.getElementById("send-quote");
  sendButton.addEventListener("click", async () => {
    if (!client.email) {
      alert("Ajoutez l'email du client pour envoyer le devis.");
      return;
    }
    try {
      const payload = await apiFetch("/quotes", {
        method: "POST",
        body: JSON.stringify({ ...quote, sendEmail: true }),
      });
      data.quotes.unshift(payload.quote);
      renderAll();
      elements.quotePreview.classList.add("hidden");
    } catch (error) {
      alert(error.message);
    }
  });
};

const renderQuotes = () => {
  elements.quotesList.innerHTML = data.quotes
    .map((quote) => {
      const client = getClient(quote.clientId);
      const statusClass =
        quote.status === "Accepté"
          ? "success"
          : quote.status === "Refusé"
            ? "danger"
            : quote.status === "Envoyé"
              ? "info"
              : "warning";
      return `
        <li class="quote-item">
          <div class="quote-main">
            <strong>${client.name}</strong>
            <p class="muted">Envoyé le ${formatDate(quote.sentAt)}</p>
          </div>
          <div class="quote-meta">
            <span class="tag ${statusClass}">${quote.status}</span>
            <span class="quote-amount">${formatCurrency(quote.amount)}</span>
          </div>
          <div class="quote-actions">
            <select class="status-select" data-action="quote-status" data-id="${quote.id}">
              ${["En attente", "Envoyé", "Accepté", "Refusé"]
                .map(
                  (status) =>
                    `<option value="${status}" ${status === quote.status ? "selected" : ""}>${status}</option>`
                )
                .join("")}
            </select>
            <button class="ghost" data-action="ack" data-id="${quote.id}">
              ${quote.ack ? "Annuler accusé" : "Confirmer réception"}
            </button>
          </div>
        </li>
      `;
    })
    .join("");
};

const statusTagClass = (status) => {
  if (status === "Terminé") return "success";
  if (status === "Urgent") return "danger";
  if (status === "Planifié") return "warning";
  if (status === "En cours") return "info";
  return "success";
};

const progressForStatus = (status, fallback) => {
  if (status === "Planifié") return 15;
  if (status === "En cours") return 55;
  if (status === "Urgent") return 75;
  if (status === "Terminé") return 100;
  return fallback;
};

let currentProjectSort = "due";

const renderProjects = () => {
  elements.projectProgress.innerHTML = data.projects
    .map(
      (project) => `
        <div class="progress">
          <div>
            <strong>${project.name}</strong>
            <p class="muted">${getClient(project.clientId).name}</p>
          </div>
          <div class="progress-bar">
            <span style="width: ${project.progress}%"></span>
          </div>
          <p class="muted">${project.progress}% • ${project.status}</p>
        </div>
      `
    )
    .join("");

  const projects = [...data.projects].sort((a, b) => {
    if (currentProjectSort === "due") {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    const progressDelta = Number(b.progress) - Number(a.progress);
    if (progressDelta !== 0) return progressDelta;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  elements.projectsList.innerHTML = projects
    .map(
      (project) => `
        <div class="project-card" data-project="${project.id}">
          <div class="project-main">
            <h4>${project.name}</h4>
            <div class="project-meta">
              <span>${getClient(project.clientId).name}</span>
              <span>Échéance : ${formatDate(project.dueDate)}</span>
              ${project.responsible ? `<span>Responsable : ${project.responsible}</span>` : ""}
              ${project.comment ? `<span>Note : ${project.comment}</span>` : ""}
            </div>
          </div>
          <div class="project-progress">
            <div class="progress-bar">
              <span style="width: ${project.progress}%"></span>
            </div>
            <span class="muted">Avancement ${project.progress}%</span>
          </div>
          <div class="project-status">
            <label class="muted">Statut</label>
            <select class="status-select" data-action="status">
              ${["Planifié", "En cours", "Urgent", "Terminé"]
                .map(
                  (status) =>
                    `<option value="${status}" ${status === project.status ? "selected" : ""}>${status}</option>`
                )
                .join("")}
            </select>
            <span class="tag ${statusTagClass(project.status)}">${project.status}</span>
          </div>
          <div class="project-kpi">
            <span>Priorité</span>
            <strong>${project.status === "Urgent" ? "Haute" : "Standard"}</strong>
            <span>Suivi client</span>
            <strong>${project.progress >= 70 ? "OK" : "À relancer"}</strong>
            <button class="ghost small" data-action="sync-calendar" data-id="${project.id}">
              Synchroniser avec mon calendrier
            </button>
          </div>
        </div>
      `
    )
    .join("");
};

const renderNotifications = () => {
  const today = new Date();
  const dayDiff = (date) => Math.ceil((date - today) / (1000 * 60 * 60 * 24));
  const parseDate = (value) => new Date(`${value}T00:00:00`);

  const items = [];

  data.projects.forEach((project) => {
    if (project.status === "Terminé") return;
    const due = parseDate(project.dueDate);
    const diff = dayDiff(due);
    if (project.status === "Urgent") {
      items.push({
        label: `Projet urgent : ${project.name}`,
        type: "danger",
      });
    }
    if (diff < 0) {
      items.push({
        label: `Projet en retard : ${project.name}`,
        type: "danger",
      });
    } else if (diff <= 5) {
      items.push({
        label: `Échéance proche (${diff} j) : ${project.name}`,
        type: "warning",
      });
    }
  });

  data.quotes.forEach((quote) => {
    const sent = parseDate(quote.sentAt);
    const diff = dayDiff(sent);
    if (quote.status === "En attente" && diff <= -7) {
      items.push({
        label: `Relance devis : ${getClient(quote.clientId).name}`,
        type: "warning",
      });
    }
    if (quote.status === "Envoyé" && !quote.ack && diff <= -2) {
      items.push({
        label: `Accusé manquant : ${getClient(quote.clientId).name}`,
        type: "warning",
      });
    }
  });

  const notifications = items.slice(0, 6);
  elements.notifications.innerHTML =
    notifications.length > 0
      ? notifications
          .map(
            (item) => `
        <li>
          <span>${item.label}</span>
          <span class="tag ${item.type}">${item.type === "danger" ? "Urgent" : "Action"}</span>
        </li>
      `
          )
          .join("")
      : `<li><span>Aucune notification pour le moment.</span><span class="tag success">OK</span></li>`;
};

const renderRecentQuotes = () => {
  elements.recentQuotes.innerHTML = data.quotes
    .slice(0, 4)
    .map((quote) => {
      const client = getClient(quote.clientId);
      return `<li><span>${client.name}</span><span>${formatCurrency(quote.amount)}</span></li>`;
    })
    .join("");
};

const renderReports = () => {
  const accepted = data.quotes.filter((quote) => quote.status === "Accepté").length;
  const conversion = data.quotes.length ? Math.round((accepted / data.quotes.length) * 100) : 0;
  elements.conversionRate.textContent = `${conversion}%`;
  const ring = document.getElementById("conversion-ring");
  if (ring) {
    ring.style.background = `conic-gradient(var(--primary) ${conversion * 3.6}deg, #e5e7eb 0deg)`;
  }

  const sales = data.quotes.reduce((acc, quote) => acc + quote.amount, 0);
  elements.salesTrends.innerHTML = `
    <li><span>CA estimé</span><strong>${formatCurrency(sales)}</strong></li>
    <li><span>Marge moyenne</span><strong>28%</strong></li>
    <li><span>Délais moyens</span><strong>9 jours</strong></li>
  `;

  const salesChart = document.getElementById("sales-chart");
  if (salesChart) {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleString("fr-FR", { month: "short" }),
      });
    }
    const monthTotals = months.map((month) => {
      const total = data.quotes
        .filter((quote) => quote.sentAt.startsWith(month.key))
        .reduce((acc, quote) => acc + quote.amount, 0);
      return { ...month, total };
    });
    const max = Math.max(...monthTotals.map((item) => item.total), 1);
    salesChart.innerHTML = monthTotals
      .map(
        (item) => `
        <div class="bar" style="height:${Math.max((item.total / max) * 100, 8)}%">
          <span>${item.label}</span>
        </div>
      `
      )
      .join("");
  }

  const serviceCount = data.quotes.reduce((acc, quote) => {
    acc[quote.serviceId] = (acc[quote.serviceId] || 0) + 1;
    return acc;
  }, {});
  const rankedServices = Object.entries(serviceCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id, count]) => ({
      name: getService(id).name,
      count,
    }));
  elements.topServices.innerHTML = rankedServices
    .map((service) => `<li><span>${service.name}</span><strong>${service.count} demandes</strong></li>`)
    .join("");

};

const renderAll = () => {
  renderDate();
  renderKpis();
  renderClients();
  renderSelectOptions();
  renderQuotes();
  renderProjects();
  renderNotifications();
  renderRecentQuotes();
  renderReports();
  ensureMaterialRow();
};

const bootstrap = async () => {
  const payload = await apiFetch("/bootstrap");
  data = payload.data;
  setUser(payload.user);
  renderAll();
  if (elements.quoteClientSearch) {
    elements.quoteClientSearch.value = data.clients[0]?.name || "";
    elements.quoteClient.value = data.clients[0]?.id || "";
  }
  if (elements.projectClientSearch) {
    elements.projectClientSearch.value = data.clients[0]?.name || "";
    elements.projectClient.value = data.clients[0]?.id || "";
  }
};

elements.navItems.forEach((button) => {
  button.addEventListener("click", () => {
    elements.navItems.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    elements.panels.forEach((panel) => panel.classList.remove("active"));
    document.getElementById(button.dataset.target).classList.add("active");
  });
});

elements.clientForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const newClient = {
    name: formData.get("name"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    segment: formData.get("segment"),
    lastProject: "Nouveau projet",
  };
  try {
    const payload = await apiFetch("/clients", {
      method: "POST",
      body: JSON.stringify(newClient),
    });
    data.clients.unshift(payload.client);
    renderAll();
    event.target.reset();
  } catch (error) {
    alert(error.message);
  }
});

elements.quoteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const materials = readMaterials();
  const materialsTotal = sumMaterials(materials);
  const clientId = formData.get("clientId");
  if (!clientId) {
    alert("Veuillez sélectionner un client valide.");
    return;
  }
  const parsedHours = parseHours(formData.get("hours"));
  if (!parsedHours) {
    alert("Veuillez saisir une durée valide (ex: 1,30 • 1h30 • 45min).");
    return;
  }
  const draft = {
    clientId,
    serviceId: formData.get("serviceId"),
    materials,
    materialsTotal,
    hours: parsedHours,
    discount: Number(formData.get("discount")),
  };
  renderQuotePreview(draft);
});

elements.projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  try {
    const clientId = formData.get("clientId");
    if (!clientId) {
      alert("Veuillez sélectionner un client valide.");
      return;
    }
    const payload = await apiFetch("/projects", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        clientId,
        status: formData.get("status"),
        dueDate: formData.get("dueDate"),
        responsible: formData.get("responsible"),
        comment: formData.get("comment"),
      }),
    });
    data.projects.unshift(payload.project);
    renderProjects();
    renderKpis();
    renderNotifications();
    event.target.reset();
  } catch (error) {
    alert(error.message);
  }
});

elements.quotesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.dataset.action !== "ack") return;
  const quote = data.quotes.find((item) => idsMatch(item.id, button.dataset.id));
  if (!quote) return;
  try {
    const payload = await apiFetch(`/quotes/${quote.id}/ack`, { method: "PATCH" });
    quote.ack = payload.quote.ack;
    renderAll();
  } catch (error) {
    alert(error.message);
  }
});

elements.quotesList.addEventListener("change", async (event) => {
  const select = event.target.closest("select[data-action='quote-status']");
  if (!select) return;
  const quote = data.quotes.find((item) => idsMatch(item.id, select.dataset.id));
  if (!quote) return;
  try {
    const payload = await apiFetch(`/quotes/${quote.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: select.value }),
    });
    quote.status = payload.quote.status;
    renderAll();
  } catch (error) {
    alert(error.message);
  }
});

elements.projectsList.addEventListener("change", async (event) => {
  const select = event.target.closest("select[data-action='status']");
  if (!select) return;
  const card = event.target.closest(".project-card");
  if (!card) return;
  const project = data.projects.find((item) => String(item.id) === card.dataset.project);
  if (!project) return;
  const status = select.value;
  const progress = progressForStatus(status, project.progress);
  const payloadBody = { status, progress };
  try {
    const payload = await apiFetch(`/projects/${project.id}`, {
      method: "PATCH",
      body: JSON.stringify(payloadBody),
    });
    project.progress = payload.project.progress;
    project.status = payload.project.status;
    renderProjects();
    renderNotifications();
  } catch (error) {
    alert(error.message);
  }
});

elements.projectsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='sync-calendar']");
  if (!button) return;
  const projectId = button.dataset.id;
  try {
    const payload = await apiFetch(`/projects/${projectId}/sync-calendar`, { method: "POST" });
    alert(
      payload.url
        ? `Synchronisé. L'événement existe sur iCloud.\n${payload.url}`
        : "Chantier synchronisé avec Calendrier Apple."
    );
  } catch (error) {
    alert(error.message);
  }
});


elements.resetData.addEventListener("click", async () => {
  try {
    await apiFetch("/reset", { method: "POST" });
    await bootstrap();
  } catch (error) {
    alert(error.message);
  }
});

elements.clientsSearch.addEventListener("input", (event) => {
  const value = event.target.value.toLowerCase().trim();
  if (!value) {
    renderClients();
    return;
  }
  const filtered = data.clients.filter(
    (client) =>
      client.name.toLowerCase().includes(value) ||
      client.address.toLowerCase().includes(value) ||
      client.phone.toLowerCase().includes(value)
  );
  renderClients(filtered);
});

const setProjectSort = (sort) => {
  currentProjectSort = sort;
  if (elements.projectsSortDue && elements.projectsSortProgress) {
    elements.projectsSortDue.classList.toggle("active", sort === "due");
    elements.projectsSortProgress.classList.toggle("active", sort === "progress");
  }
  if (elements.projectsSortLegacy) {
    elements.projectsSortLegacy.textContent = sort === "due" ? "Trier par échéance" : "Trier par avancement";
  }
  renderProjects();
};

if (elements.projectsSortDue && elements.projectsSortProgress) {
  elements.projectsSortDue.addEventListener("click", () => {
    setProjectSort("due");
  });

  elements.projectsSortProgress.addEventListener("click", () => {
    setProjectSort("progress");
  });
}

if (elements.projectsSortLegacy) {
  elements.projectsSortLegacy.addEventListener("click", () => {
    setProjectSort(currentProjectSort === "due" ? "progress" : "due");
  });
}

if (elements.projectsSortActions) {
  elements.projectsSortActions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-sort]");
    if (!button) return;
    setProjectSort(button.dataset.sort);
  });
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  try {
    const payload = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });
    localStorage.setItem(TOKEN_KEY, payload.token);
    showAuth(false);
    await bootstrap();
  } catch (error) {
    alert(error.message);
  }
});


elements.logout.addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  showAuth(true);
});

if (elements.addMaterial) {
  elements.addMaterial.addEventListener("click", () => {
    elements.materialsList.appendChild(createMaterialRow());
  });
}

if (elements.quoteClientSearch) {
  const syncClientId = () => {
    const value = elements.quoteClientSearch.value.trim().toLowerCase();
    const match = data.clients.find((client) => client.name.toLowerCase() === value);
    elements.quoteClient.value = match ? match.id : "";
  };
  elements.quoteClientSearch.addEventListener("input", syncClientId);
  elements.quoteClientSearch.addEventListener("change", syncClientId);
}

if (elements.projectClientSearch) {
  const syncProjectClientId = () => {
    const value = elements.projectClientSearch.value.trim().toLowerCase();
    const match = data.clients.find((client) => client.name.toLowerCase() === value);
    elements.projectClient.value = match ? match.id : "";
  };
  elements.projectClientSearch.addEventListener("input", syncProjectClientId);
  elements.projectClientSearch.addEventListener("change", syncProjectClientId);
}

if (elements.materialsList) {
  elements.materialsList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='remove-material']");
    if (!button) return;
    const card = event.target.closest(".material-card");
    if (!card) return;
    card.remove();
    ensureMaterialRow();
  });
}

const init = async () => {
  try {
    await apiFetch("/health");
  } catch (error) {
    alert("Le backend n'est pas démarré. Lancez le serveur avant d'utiliser le CRM.");
    showAuth(true);
    return;
  }

  if (localStorage.getItem(TOKEN_KEY)) {
    try {
      await bootstrap();
      showAuth(false);
      return;
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
  showAuth(true);
};

init();
