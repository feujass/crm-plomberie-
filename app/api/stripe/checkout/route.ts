import { getCheckoutSessionUrl, parseCheckoutBody } from "@/lib/stripe/session-urls";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = await getCheckoutSessionUrl(parseCheckoutBody(body));
    return NextResponse.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur Stripe";
    const status = message === "Non authentifié" ? 401 : 400;
    return NextResponse.json({ message }, { status });
  }
}
