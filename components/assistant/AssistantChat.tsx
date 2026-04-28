"use client";

import { createAssistantSession, persistAssistantMessages } from "@/app/actions/assistant";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useRef, useState, useTransition } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export function AssistantChat({ initialMessages, sessionId }: { initialMessages: Msg[]; sessionId: string | null }) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const sidRef = useRef<string | null>(sessionId);
  const [sidDisplay, setSidDisplay] = useState<string | null>(sessionId);
  const [pending, start] = useTransition();

  async function ensureSession() {
    if (sidRef.current) return sidRef.current;
    const id = await createAssistantSession();
    sidRef.current = id;
    setSidDisplay(id);
    return id;
  }

  async function send() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    const nextMsgs = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(nextMsgs);
    start(async () => {
      const id = await ensureSession();
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: json.message || "Erreur" }]);
        return;
      }
      const assistantMsg = json.content as string;
      setMessages((m) => [...m, { role: "assistant", content: assistantMsg }]);
      await persistAssistantMessages(id, userMsg, assistantMsg);
    });
  }

  return (
    <div className="flex min-h-[50vh] flex-col gap-3">
      {sidDisplay ? <p className="text-xs text-slate-500">Session : {sidDisplay.slice(0, 8)}…</p> : null}
      <div className="flex-1 space-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        {messages.length === 0 ? <p className="text-sm text-slate-500">Posez votre question…</p> : null}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg p-2 text-sm ${m.role === "user" ? "ml-8 bg-sky-50 dark:bg-sky-950" : "mr-8 bg-slate-50 dark:bg-slate-800"}`}
          >
            <strong className="text-xs uppercase text-slate-500">{m.role}</strong>
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
      </div>
      <Textarea label="Message" value={input} onChange={(e) => setInput(e.target.value)} rows={3} />
      <Button type="button" onClick={() => void send()} disabled={pending}>
        Envoyer
      </Button>
    </div>
  );
}
