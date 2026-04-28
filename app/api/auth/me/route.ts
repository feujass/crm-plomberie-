import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse } from "@/types/backend";

export async function GET() {
  try {
    const me = (await backendFetch("/api/auth/me", { auth: true })) as BackendMeResponse;
    return NextResponse.json(me, { status: 200 });
  } catch (e) {
    const status = isBackendErr(e) ? e.status ?? 401 : 401;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

function isBackendErr(e: unknown): e is { status?: number } {
  return Boolean(e && typeof e === "object" && "status" in e);
}

