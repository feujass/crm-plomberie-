import { ETAPES_METIER, ETAPE_LABELS } from "../../constants/chantier";
import type { EtapeMetier } from "../../types";

type Props = {
  value: EtapeMetier;
  onChange: (step: EtapeMetier) => void;
  compact?: boolean;
  disabled?: boolean;
};

export function StepperMetier({ value, onChange, compact, disabled }: Props) {
  const currentIndex = ETAPES_METIER.indexOf(value);
  return (
    <div className={`stepper-metier${compact ? " stepper-metier--compact" : ""}`} role="group" aria-label="Étapes métier">
      {ETAPES_METIER.map((step, index) => {
        const isActive = step === value;
        const isDone = index < currentIndex;
        return (
          <button
            key={step}
            type="button"
            disabled={disabled}
            className={`stepper-pill${isActive ? " active" : ""}${isDone ? " done" : ""}`}
            onClick={() => onChange(step)}
          >
            {ETAPE_LABELS[step]}
          </button>
        );
      })}
    </div>
  );
}
