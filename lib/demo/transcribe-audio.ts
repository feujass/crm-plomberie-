const MAX_AUDIO_BYTES = 2_500_000;

export async function transcribeDemoAudio(buffer: Buffer, mimeType: string): Promise<string> {
  if (buffer.length > MAX_AUDIO_BYTES) {
    throw new Error("Enregistrement trop long. Limite 60 secondes.");
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Transcription serveur indisponible. Utilise « ou écris ton chantier » ou un navigateur compatible reconnaissance vocale.",
    );
  }

  const ext = mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a" : "webm";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), `demo.${ext}`);
  form.append("model", "whisper-1");
  form.append("language", "fr");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const json = (await res.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message ?? "Transcription impossible");
  }
  const text = json.text?.trim();
  if (!text) throw new Error("Aucune parole détectée dans l'enregistrement.");
  return text;
}
