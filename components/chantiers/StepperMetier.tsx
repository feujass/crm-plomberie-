"use client";

import type { EtapeMetier } from "@/lib/chantier";
import { ETAPES_METIER, ETAPE_LABELS } from "@/lib/chantier";
import { cx } from "@/lib/utils";

export function StepperMetier({
  value,
  onChange,
  compact,
  disabled,
}: {
  value: EtapeMetier;
  onChange: (step: EtapeMetier) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const currentIndex = ETAPES_METIER.indexOf(value);
  return (
    <div
      className={cx(
        "flex flex-wrap gap-2",
        compact ? "gap-1.5" : "",
      )}
      role="group"
      aria-label="Étapes métier"
    >
      {ETAPES_METIER.map((step, index) => {
        const isActive = step === value;
        const isDone = index < currentIndex;
        return (
          <button
            key={step}
            type="button"
            disabled={disabled}
            onClick={() => onChange(step)}
            className={cx(
              "touch-target rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--accent)]/60",
              isDone ? "opacity-80" : "",
              isActive ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary)]/90" : "",
              disabled ? "opacity-60" : "",
            )}
          >
            {ETAPE_LABELS[step]}
          </button>
        );
      })}
    </div>
  );
}

