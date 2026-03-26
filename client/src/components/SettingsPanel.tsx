import { apiFetch, TOKEN_KEY } from "../api";

type Props = {
  googleConnected: boolean;
  googleConfigurable: boolean;
  onRefreshStatus: () => void;
};

export function SettingsPanel({ googleConnected, googleConfigurable, onRefreshStatus }: Props) {
  const connectGoogle = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      alert("Connectez-vous d’abord.");
      return;
    }
    window.location.href = `${window.location.origin}/auth/google?token=${encodeURIComponent(token)}`;
  };

  const disconnect = async () => {
    try {
      await apiFetch("/google/disconnect", { method: "POST" });
      onRefreshStatus();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <section id="parametres" className="panel active">
      <div className="panel-header">
        <div>
          <h2>Paramètres du compte</h2>
          <p>Connexions externes et préférences.</p>
        </div>
      </div>
      <div className="card settings-google">
        <h3>Google Calendar</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          {googleConnected
            ? "Votre compte est connecté. Vous pouvez ajouter des échéances depuis chaque fiche chantier (icône calendrier)."
            : googleConfigurable
              ? "Connectez-vous pour créer des événements depuis les fiches chantiers."
              : "Google OAuth n’est pas configuré sur ce serveur (variables d’environnement)."}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="ghost" onClick={connectGoogle} disabled={!googleConfigurable}>
            {googleConnected ? "Reconnecter Google" : "Connecter Google Calendar"}
          </button>
          {googleConnected ? (
            <button type="button" className="ghost danger" onClick={() => void disconnect()}>
              Déconnecter
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
