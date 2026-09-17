export default function MainLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-44 rounded-lg bg-slate-200/90 dark:bg-slate-800" />
      <div className="h-28 rounded-2xl bg-slate-200/80 dark:bg-slate-800" />
      <div className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800" />
      <div className="h-28 rounded-2xl bg-slate-200/60 dark:bg-slate-800" />
    </div>
  );
}
