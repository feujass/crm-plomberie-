import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string };

export function Textarea({ label, className = "", id, ...rest }: Props) {
  const cid = id ?? rest.name;
  return (
    <label className="block w-full text-sm">
      {label ? <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">{label}</span> : null}
      <textarea
        id={cid}
        className={`min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 ${className}`}
        {...rest}
      />
    </label>
  );
}
