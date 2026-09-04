const MAX_AUDIO_BYTES = 2_500_000;

export type TranscribeResult =
  | { ok: true; transcript: string }
  | { ok: false; code: "transcription_unconfigured" | "transcription_failed"; message: string };

export async function transcribeDemoAudio(buffer: Buffer, mimeType: string): Promise<TranscribeResult> {
  if (buffer.length > MAX_AUDIO_BYTES) {
    return { ok: false, code: "transcription_failed", message: "Enregistrement trop long. Limite 60 secondes." };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      code: "transcription_unconfigured",
      message:
        "Transcription serveur indisponible. Utilise « ou écris ton chantier » ou un navigateur compatible reconnaissance vocale.",
    };
  }

  const ext = mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a" : "webm";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), `demo.${ext}`);
  form.append("model", "whisper-1");
  form.append("language", "fr");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    const json = (await res.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
    if (!res.ok) {
      return {
        ok: false,
        code: "transcription_failed",
        message: json.error?.message ?? "Transcription impossible",
      };
    }
    const text = json.text?.trim();
    if (!text) {
      return { ok: false, code: "transcription_failed", message: "Aucune parole détectée dans l'enregistrement." };
    }
    return { ok: true, transcript: text };
  } catch {
    return { ok: false, code: "transcription_failed", message: "Transcription impossible" };
  }
}
