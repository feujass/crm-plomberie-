type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((ev: { results: { length: number; [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isBrowserSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Accès au micro refusé. Autorisez le micro pour localhost dans les paramètres du navigateur.";
    case "no-speech":
      return "Aucune parole détectée. Parlez plus fort ou passez en mode texte.";
    case "network":
      return "Connexion vocale bloquée (réseau ou navigateur). Essayez Chrome, vérifiez votre connexion, ou utilisez le mode texte.";
    case "audio-capture":
      return "Micro inaccessible. Vérifiez qu’aucune autre app ne l’utilise.";
    case "language-not-supported":
      return "Langue fr-FR non supportée par ce navigateur. Utilisez Chrome ou le mode texte.";
    default:
      return `Erreur de reconnaissance vocale (${code}). Utilisez Chrome ou le mode texte.`;
  }
}

/** Transcription vocale côté navigateur (Chrome recommandé) — sans API OpenAI. */
export function listenForSpeech(options?: { lang?: string }): {
  stop: () => void;
  promise: Promise<string>;
} {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    return {
      stop: () => {},
      promise: Promise.reject(
        new Error(
          "Reconnaissance vocale non supportée. Utilisez Chrome ou Edge, ou saisissez le devis en mode texte.",
        ),
      ),
    };
  }

  const rec = new Ctor();
  rec.lang = options?.lang ?? "fr-FR";
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  let settled = false;
  let stoppedByUser = false;
  const parts: string[] = [];
  let finishCaptured: ((text: string) => void) | null = null;

  const promise = new Promise<string>((resolve, reject) => {
    const finish = (text: string) => {
      if (settled) return;
      settled = true;
      const trimmed = text.trim();
      if (trimmed) resolve(trimmed);
      else reject(new Error("Aucune parole détectée. Réessayez ou passez en mode texte."));
    };
    finishCaptured = finish;

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    };

    rec.onresult = (ev) => {
      for (let i = 0; i < ev.results.length; i++) {
        const chunk = ev.results[i]?.[0]?.transcript?.trim();
        if (chunk) parts[i] = chunk;
      }
    };

    rec.onerror = (ev) => {
      // Arrêt manuel : on laisse onend traiter le texte capturé.
      if (stoppedByUser && (ev.error === "aborted" || ev.error === "no-speech")) return;
      fail(speechErrorMessage(ev.error));
    };

    rec.onend = () => {
      if (settled) return;
      finish(parts.filter(Boolean).join(" ").trim());
    };
  });

  try {
    rec.start();
  } catch {
    return {
      stop: () => {},
      promise: Promise.reject(
        new Error("Impossible de démarrer le micro. Autorisez l’accès ou utilisez le mode texte."),
      ),
    };
  }

  return {
    stop: () => {
      if (settled) return;
      stoppedByUser = true;
      try {
        rec.stop();
      } catch {
        try {
          rec.abort();
        } catch {
          finishCaptured?.(parts.filter(Boolean).join(" ").trim());
        }
      }
    },
    promise,
  };
}
