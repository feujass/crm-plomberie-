import { formatDateFr } from "@/lib/format";
import { journalEventLabel } from "@/lib/facturation/pa/cycle-display";
import type { CycleJournalRow } from "@/lib/facturation/pa/redeposit";
import { Card } from "@/components/ui/Card";

function formatJournalWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDateFr(iso);
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function FactureCycleJournal({ events }: { events: CycleJournalRow[] }) {
  if (events.length === 0) return null;

  return (
    <Card title="Journal e-facturation">
      <ol className="space-y-3">
        {events.map((event) => {
          const label = journalEventLabel(event.statusCode);
          return (
            <li key={event.id} className="flex flex-col gap-0.5 text-sm">
              <span className="font-medium text-slate-900 dark:text-slate-100" title={event.statusCode}>
                {label}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatJournalWhen(event.occurredAt)}
                <span className="sr-only"> {event.statusCode}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
