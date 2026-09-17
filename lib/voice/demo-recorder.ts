/** Helpers MediaRecorder — Safari iOS : audio/mp4, desktop : audio/webm. */
export function demoRecorderMimeType(): string | undefined {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export class DemoAudioRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  async start(onChunk?: () => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = demoRecorderMimeType();
    this.recorder = mimeType ? new MediaRecorder(this.stream, { mimeType }) : new MediaRecorder(this.stream);
    this.chunks = [];
    this.startedAt = Date.now();
    this.recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) this.chunks.push(ev.data);
      onChunk?.();
    };
    this.recorder.start(250);
  }

  stop(): Promise<{ blob: Blob; durationMs: number; mimeType: string }> {
    const recorder = this.recorder;
    const stream = this.stream;
    if (!recorder || !stream) return Promise.reject(new Error("Enregistrement non démarré"));

    const durationMs = Date.now() - this.startedAt;
    const mimeType = recorder.mimeType || demoRecorderMimeType() || "audio/webm";

    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(this.chunks, { type: mimeType });
        this.recorder = null;
        this.stream = null;
        this.chunks = [];
        resolve({ blob, durationMs, mimeType });
      };
      recorder.onerror = () => reject(new Error("Enregistrement interrompu"));
      try {
        recorder.stop();
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Stop impossible"));
      }
    });
  }

  abort(): void {
    try {
      this.recorder?.stop();
    } catch {
      /* noop */
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
  }
}

export const DEMO_MAX_RECORDING_MS = 60_000;
