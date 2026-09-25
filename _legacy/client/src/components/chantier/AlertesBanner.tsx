export type AlerteItem = {
  id: string;
  chantierId: number | string;
  message: string;
  type: "warning" | "danger";
};

type Props = {
  alertes: AlerteItem[];
  onSelect: (chantierId: number | string) => void;
};

export function AlertesBanner({ alertes, onSelect }: Props) {
  if (alertes.length === 0) return null;
  return (
    <div className="alertes-banner" role="region" aria-label="Alertes chantiers">
      {alertes.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`alerte-chip ${a.type}`}
          onClick={() => onSelect(a.chantierId)}
        >
          {a.message}
        </button>
      ))}
    </div>
  );
}
