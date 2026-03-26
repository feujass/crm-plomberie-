import { formatCurrency } from "../../utils/format";

type Props = {
  budget: number;
  heuresPrevues: number;
  heuresPassees: number;
};

export function RentabiliteBloc({ budget, heuresPrevues, heuresPassees }: Props) {
  const prev = Math.max(heuresPrevues, 0);
  const ratio = prev <= 0 ? 0 : Math.min(heuresPassees / prev, 1.5);
  const warn = prev > 0 && heuresPassees > heuresPrevues;

  return (
    <div className="rentabilite-bloc">
      <div>
        <strong>Rentabilité (temps)</strong>
        <p style={{ marginTop: 6 }}>
          Budget : <strong>{formatCurrency(budget)}</strong>
          {" · "}
          Heures prévues : <strong>{heuresPrevues}h</strong>
          {" · "}
          Heures passées : <strong>{heuresPassees}h</strong>
        </p>
      </div>
      <div className={`rentabilite-bar${warn ? " warn" : " ok"}`}>
        <span style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
      <p className="muted" style={{ marginTop: 6 }}>
        {prev <= 0 ? "Indiquez des heures prévues pour suivre le temps" : warn ? "Dépassement du temps prévu" : "Dans les clous"}
      </p>
    </div>
  );
}
