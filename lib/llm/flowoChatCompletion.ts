import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type FlowoChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type LlmOk = { ok: true; content: string };
type LlmErr = { ok: false; message: string; status: number };
export type FlowoLlmResult = LlmOk | LlmErr;

function isClaudeProvider(): boolean {
  const v = process.env.FLOWO_LLM?.trim().toLowerCase();
  return v === "claude";
}

function buildSystemAndDialogue(
  systemPrompt: string,
  messages: FlowoChatMessage[],
): { system: string; dialogue: { role: "user" | "assistant"; content: string }[] } {
  const systemChunks: string[] = [];
  if (systemPrompt.trim()) systemChunks.push(systemPrompt.trim());
  const dialogue: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      if (m.content.trim()) systemChunks.push(m.content.trim());
    } else {
      dialogue.push({ role: m.role, content: m.content });
    }
  }
  return {
    system: systemChunks.join("\n\n"),
    dialogue,
  };
}

/** Anthropic exige une alternance user/assistant et commence en général par l’utilisateur. */
function toAnthropicMessages(
  dialogue: { role: "user" | "assistant"; content: string }[],
): Anthropic.Messages.MessageParam[] {
  const out: Anthropic.Messages.MessageParam[] = [];
  for (const m of dialogue) {
    out.push({ role: m.role, content: m.content });
  }
  if (out.length === 0) return out;
  if (out[0].role === "assistant") {
    out.unshift({ role: "user", content: "…" });
  }
  return out;
}

/**
 * Complétion chat pour l’assistant Flowo (route /api/assistant/flowo-chat).
 * - FLOWO_LLM absent ou "openai" : OpenAI (comportement historique).
 * - FLOWO_LLM=claude : Anthropic Messages API.
 */
export async function completeFlowoChatLlm(
  systemPrompt: string,
  messages: FlowoChatMessage[],
): Promise<FlowoLlmResult> {
  const useClaude = isClaudeProvider();

  if (useClaude) {
    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      return { ok: false, message: "ANTHROPIC_API_KEY manquant", status: 500 };
    }
    const { system, dialogue } = buildSystemAndDialogue(systemPrompt, messages);
    const anthropicMessages = toAnthropicMessages(dialogue);
    if (anthropicMessages.length === 0) {
      return { ok: false, message: "messages requis", status: 400 };
    }

    const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";
    const maxTokens = Math.min(
      Math.max(Number.parseInt(process.env.ANTHROPIC_MAX_TOKENS || "4096", 10) || 4096, 256),
      8192,
    );

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: system || undefined,
      messages: anthropicMessages,
    });

    const block = res.content[0];
    const text =
      block?.type === "text" && "text" in block ? (block as { type: "text"; text: string }).text : "";
    return { ok: true, content: text };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, message: "OPENAI_API_KEY manquant", status: 500 };
  }

  const { system, dialogue } = buildSystemAndDialogue(systemPrompt, messages);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [{ role: "system", content: system || "Tu es un assistant." }, ...dialogue],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  return { ok: true, content };
}
