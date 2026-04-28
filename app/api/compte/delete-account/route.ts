import { NextResponse } from "next/server";

/** Placeholder jusqu’à implémentation backend — même comportement que l’action (évite tout manifest d’actions côté page). */
export async function POST() {
  return NextResponse.json({ redirect: "/compte/securite" });
}
