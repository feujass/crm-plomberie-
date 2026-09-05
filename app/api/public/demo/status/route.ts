import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readDemoSessionId } from "@/lib/demo/cookie";
import { demoPreviewPayloadFromRow, fetchDemoQuoteForSession } from "@/lib/demo/session-preview";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const demoSessionId = readDemoSessionId(jar.get("flowo_demo_id")?.value);
  if (!demoSessionId) {
    return NextResponse.json({ used: false });
  }

  const row = await fetchDemoQuoteForSession(demoSessionId);
  if (!row) {
    return NextResponse.json({ used: false });
  }

  const preview = await demoPreviewPayloadFromRow(row);
  return NextResponse.json({ used: true, preview });
}
