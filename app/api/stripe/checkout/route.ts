import { getCheckoutSessionUrl } from "@/lib/stripe/session-urls";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const url = await getCheckoutSessionUrl();
    return NextResponse.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur Stripe";
    const status = message === "Non authentifié" ? 401 : 400;
    return NextResponse.json({ message }, { status });
  }
}
