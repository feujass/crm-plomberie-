import { formatCurrency } from "../../utils/format";

type Props = {
  budget: number;
  heuresPrevues: number;
  heuresPassees: number;
};

export function RentabiliteBloc({ budget, heuresPrevues, heuresPassees }: Props) {
  const planned = Math.max(heuresPrevues, 0);
  const spent = Math.max(0, heuresPassees);

  const ratioBar = planned <= 0 ? 0 : Math.min(spent / planned, 1.5);

  let barTone: "ok" | "warn" | "danger" = "ok";
  let statusText = "";
  let statusColor = "var(--muted)";

  if (planned > 0) {
    if (spent < planned * 0.9) {
      barTone = "ok";
      statusText = "Dans les clous";
      statusColor = "var(--success)";
    } else if (spent <= planned) {
      barTone = "warn";
      statusText = "Attention";
      statusColor = "var(--warning)";
    } else {
      barTone = "danger";
      statusText = "Dépassement — chantier déficitaire";
      statusColor = "var(--danger)";
    }
  }

  return (
    <div className="rentabilite-bloc">
      <div>
        <strong>Rentabilité (temps)</strong>
        <p style={{ marginTop: 6 }}>
          Budget : <strong>{formatCurrency(budget)}</strong>
          {" · "}
          Heures prévues : <strong>{heuresPrevues}h</strong>
          {" · "}
          Heures passées : <strong>{formatHeures(spent)}h</strong>
        </p>
      </div>
      {planned > 0 ? (
        <>
          <div className={`rentabilite-bar${barTone === "ok" ? " ok" : ""}${barTone === "warn" ? " warn" : ""}${barTone === "danger" ? " danger" : ""}`}>
            <span style={{ width: `${Math.min(100, ratioBar * 100)}%` }} />
          </div>
          <p className="muted" style={{ marginTop: 6, color: statusColor, fontWeight: 600 }}>
            {statusText}
          </p>
        </>
      ) : (
        <p className="muted" style={{ marginTop: 6 }}>Indiquez des heures prévues pour activer la jauge de suivi.</p>
      )}
    </div>
  );
}

function formatHeures(n: number) {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, "");
}
