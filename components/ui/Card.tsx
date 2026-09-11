import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm ${className}`}
    >
      {title ? <h2 className="mb-3 text-lg font-semibold text-card-foreground">{title}</h2> : null}
      {children}
    </section>
  );
}
