/** Contrôles internes à l’émission — pas un envoi plateforme, pas une conformité légale. */
export function FactureControlesFlowo({ warnings }: { warnings?: string[] }) {
  const list = (warnings ?? []).map((w) => w.trim()).filter(Boolean);
  if (list.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Contrôles Flowo</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Vérifications internes au moment de l’émission. Ce n’est pas un contrôle de la réforme, ni un envoi vers une
        plateforme.
      </p>
      <ul className="mt-3 list-inside list-disc text-sm text-slate-700 dark:text-slate-300">
        {list.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
