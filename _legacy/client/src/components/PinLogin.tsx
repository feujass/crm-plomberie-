import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  onSuccess: (pin: string) => Promise<void>;
};

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
] as const;

export function PinLogin({ onSuccess }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const shakeRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const runShake = useCallback(() => {
    const el = shakeRef.current;
    if (!el) return;
    el.classList.remove("pin-shake");
    void el.offsetWidth;
    el.classList.add("pin-shake");
  }, []);

  useEffect(() => {
    if (pin.length !== 4) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await onSuccessRef.current(pin);
        if (!cancelled) setPin("");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Code refusé.");
          setPin("");
          runShake();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pin, runShake]);

  const append = (d: string) => {
    if (loading || pin.length >= 4) return;
    setError("");
    setPin((p) => p + d);
  };

  const backspace = () => {
    if (loading) return;
    setError("");
    setPin((p) => p.slice(0, -1));
  };

  return (
    <div className="pin-login">
      <p className="muted pin-login-hint">Saisissez votre code à 4 chiffres</p>
      <div ref={shakeRef} className="pin-dots" aria-live="polite">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-dot${i < pin.length ? " pin-dot--filled" : ""}`} />
        ))}
      </div>
      {error ? (
        <p className="pin-login-error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="muted pin-login-loading">Vérification…</p> : null}
      <div className="pin-keypad">
        {KEYS.map((row) => (
          <div key={row.join("")} className="pin-keypad-row">
            {row.map((k) => (
              <button
                key={k}
                type="button"
                className="pin-key"
                disabled={loading}
                onClick={() => append(k)}
              >
                {k}
              </button>
            ))}
          </div>
        ))}
        <div className="pin-keypad-row pin-keypad-row--bottom">
          <span className="pin-key-spacer" />
          <button type="button" className="pin-key" disabled={loading} onClick={() => append("0")}>
            0
          </button>
          <button
            type="button"
            className="pin-key pin-key--ghost"
            disabled={loading}
            onClick={backspace}
            aria-label="Effacer le dernier chiffre"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
