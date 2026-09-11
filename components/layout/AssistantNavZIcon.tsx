import { cx } from "@/lib/utils";

/** Icône texte « Z » (Zeus) — même emplacement / taille que les Lucide (props className, aria-hidden). */
export function AssistantNavZIcon({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex min-h-0 min-w-0 shrink-0 select-none items-center justify-center font-black leading-none tracking-tight text-current",
        // Même cible visuelle que les glyphes Lucide dans une boîte size-5 / size-[18px] (~16px utiles)
        "text-base",
        className,
      )}
      aria-hidden
    >
      Z
    </span>
  );
}
