import { cx, focusRing } from "@/lib/utils";
import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

export function CompteHubRow({
  href,
  title,
  subtitle,
  Icon,
  destructive,
}: {
  href: string;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  destructive?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "flex items-center gap-3 border-b border-gray-100 py-3.5 last:border-b-0 dark:border-gray-800/80",
        destructive && "text-red-600 dark:text-red-400",
        focusRing,
      )}
    >
      <span
        className={cx(
          "flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
          destructive && "border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cx("font-semibold text-[var(--foreground)]", destructive && "text-red-600 dark:text-red-400")}>{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
      <ChevronRight className={cx("size-5 shrink-0 text-gray-400", destructive && "text-red-400")} aria-hidden />
    </Link>
  );
}
