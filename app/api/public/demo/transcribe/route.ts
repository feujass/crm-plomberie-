import { NextResponse } from "next/server";

import { transcribeDemoAudio } from "@/lib/demo/transcribe-audio";

export const runtime = "nodejs";
export const maxDuration = 40;

const MAX_AUDIO_BYTES = 2_500_000;

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ message: "Fichier audio requis." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return NextResponse.json({ message: "Enregistrement vide." }, { status: 400 });
  }
  if (buffer.length > MAX_AUDIO_BYTES) {
    return NextResponse.json({ message: "Enregistrement trop long (max 60 s)." }, { status: 400 });
  }

  const mimeType = file.type || "audio/webm";
  const result = await transcribeDemoAudio(buffer, mimeType);
  if (!result.ok) {
    return NextResponse.json({ message: result.message, code: result.code }, { status: 422 });
  }
  return NextResponse.json({ transcript: result.transcript });
}
