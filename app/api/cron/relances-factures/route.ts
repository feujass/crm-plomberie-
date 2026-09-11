import { backendCronFetch } from "@/lib/backend/cron-fetch";
import { assertCronSecret } from "@/lib/cron-auth";
import type { CronRelanceFactureItem } from "@/lib/relances/cron-types";
import {
  notifyArtisanAfterFactureRelance,
  sendFactureRelanceToClient,
} from "@/lib/relances/run-cron";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  let items: CronRelanceFactureItem[] = [];
  try {
    const data = (await backendCronFetch("/api/cron/factures-a-relancer")) as {
      items?: CronRelanceFactureItem[];
    };
    items = data.items ?? [];
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur backend";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  let sent = 0;
  let artisanNotified = 0;
  for (const f of items) {
    const clientOk = await sendFactureRelanceToClient(site, f);
    const artisan = await notifyArtisanAfterFactureRelance(f, clientOk);
    if (artisan.channels.length) artisanNotified += 1;

    if (clientOk || artisan.channels.length > 0 || !f.client_email?.trim()) {
      try {
        await backendCronFetch(`/api/cron/factures/${f.id}/relance-envoyee`, { method: "POST" });
        if (clientOk) sent += 1;
      } catch {
        // best-effort
      }
    }
  }

  return NextResponse.json({ ok: true, processed: items.length, sent, artisanNotified });
}
