import { cx, focusRing } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function CircleBackLink({
  href,
  label = "Retour",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cx(
        "inline-flex size-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white",
        focusRing,
        className,
      )}
    >
      <ArrowLeft className="size-5" aria-hidden />
    </Link>
  );
}
