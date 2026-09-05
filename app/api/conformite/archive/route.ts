import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date_from = searchParams.get("date_from") ?? "";
  const date_to = searchParams.get("date_to") ?? "";
  const q = new URLSearchParams();
  if (date_from) q.set("date_from", date_from);
  if (date_to) q.set("date_to", date_to);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  try {
    const data = await backendFetch(`/api/conformite/archive${suffix}`);
    return NextResponse.json(data);
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
