/** Instants (ms) après un dépôt : le 1er poll ne voit souvent que `api:uploaded`. */
export const POST_DEPOSIT_UI_REFRESH_MS = [5_000, 30_000] as const;

/** Poll PA puis rafraîchit la page. Les timers survivent un changement d’écran (ingest utile). */
export function scheduleFactureCycleUiRefresh(factureId: string, refresh: () => void): void {
  for (const ms of POST_DEPOSIT_UI_REFRESH_MS) {
    window.setTimeout(() => {
      void fetch(`/api/factures/${encodeURIComponent(factureId)}/cycle-refresh`, {
        method: "POST",
        credentials: "same-origin",
      }).finally(() => refresh());
    }, ms);
  }
}
