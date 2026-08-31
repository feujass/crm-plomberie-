"use client";

import { Input } from "@/components/ui/Input";
import { isPasswordValid, PASSWORD_MIN_LENGTH, validatePassword } from "@/lib/security/password-policy";
import { cx } from "@/lib/utils";
import { useMemo, useState } from "react";

export function RegisterPasswordField({
  value,
  onChange,
  serverError,
  onClearServerError,
}: {
  value: string;
  onChange: (value: string) => void;
  serverError?: string | null;
  onClearServerError?: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const clientError = useMemo(() => (value ? validatePassword(value) : null), [value]);
  const valid = isPasswordValid(value);
  const showHint = value.length > 0;

  return (
    <div>
      <Input
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onClearServerError?.();
        }}
        onBlur={() => setTouched(true)}
        hasError={Boolean((touched && clientError) || serverError)}
      />
      {showHint ? (
        <p
          className={cx(
            "mt-1.5 text-xs transition-colors",
            valid ? "font-medium text-emerald-600" : "text-slate-500",
          )}
        >
          {valid ? "✓ Mot de passe OK" : `Au moins ${PASSWORD_MIN_LENGTH} caractères`}
        </p>
      ) : null}
      {touched && clientError ? <p className="mt-1 text-xs text-red-600">{clientError}</p> : null}
      {serverError ? <p className="mt-1 text-xs text-red-600">{serverError}</p> : null}
    </div>
  );
}
