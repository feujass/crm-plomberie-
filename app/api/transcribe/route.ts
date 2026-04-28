import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ message: "OPENAI_API_KEY manquant" }, { status: 500 });
  }

  const formData = (await req.formData()) as unknown as { get: (name: string) => unknown };
  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ message: "Fichier audio requis" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const name = (formData.get("filename") as string) || "audio.webm";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const transcription = await openai.audio.transcriptions.create({
    file: new File([buf], name, { type: file.type || "audio/webm" }),
    model: "whisper-1",
    language: "fr",
  });

  return NextResponse.json({ text: transcription.text });
}
