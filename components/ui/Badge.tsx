const colors: Record<string, string> = {
  en_cours: "bg-sky-100 text-sky-900",
  planifie: "bg-indigo-100 text-indigo-900",
  termine: "bg-emerald-100 text-emerald-900",
  pause: "bg-amber-100 text-amber-900",
  brouillon: "bg-slate-200 text-slate-800",
  envoye: "bg-amber-100 text-amber-900",
  accepte: "bg-emerald-100 text-emerald-900",
  refuse: "bg-red-100 text-red-900",
  expire: "bg-orange-100 text-orange-900",
  archive: "bg-slate-100 text-slate-600",
  emise: "bg-sky-100 text-sky-900",
  partielle: "bg-violet-100 text-violet-900",
  payee: "bg-emerald-100 text-emerald-900",
  retard: "bg-red-100 text-red-900",
  default: "bg-slate-100 text-slate-800",
};

export function Badge({ statut }: { statut: string }) {
  const c = colors[statut] ?? colors.default;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${c}`}>{statut.replace("_", " ")}</span>
  );
}
