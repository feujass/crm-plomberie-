import Anthropic from "@anthropic-ai/sdk";

import {
  ANTHROPIC_LLM_NOT_CONFIGURED,
  anthropicApiKey,
  anthropicMaxTokens,
  anthropicModel,
  formatAnthropicError,
} from "@/lib/llm/anthropicConfig";
import { parseLlmJson } from "@/lib/llm/parseLlmJson";

const JSON_ONLY_SUFFIX =
  "\n\nRéponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte autour.";

type DevisGenerateLlmOk = { ok: true; parsed: unknown };
type DevisGenerateLlmErr = { ok: false; message: string; status: number; code?: string };
export type DevisGenerateLlmResult = DevisGenerateLlmOk | DevisGenerateLlmErr;

/** Génère un devis structuré (JSON) via Claude à partir d’une description texte ou vocale. */
export async function completeDevisGenerateLlm(
  systemPrompt: string,
  userText: string,
): Promise<DevisGenerateLlmResult> {
  const apiKey = anthropicApiKey();
  if (!apiKey) {
    return {
      ok: false,
      message: ANTHROPIC_LLM_NOT_CONFIGURED,
      status: 501,
      code: "llm_not_configured",
    };
  }

  const system = systemPrompt + JSON_ONLY_SUFFIX;
  const client = new Anthropic({ apiKey });

  let res;
  try {
    res = await client.messages.create({
      model: anthropicModel(),
      max_tokens: anthropicMaxTokens(),
      system,
      messages: [{ role: "user", content: userText }],
    });
  } catch (e) {
    return { ok: false, message: formatAnthropicError(e), status: 502 };
  }

  const block = res.content[0];
  const raw =
    block?.type === "text" && "text" in block ? (block as { type: "text"; text: string }).text : "";
  if (!raw.trim()) {
    return { ok: false, message: "Réponse vide", status: 500 };
  }

  try {
    return { ok: true, parsed: parseLlmJson(raw) };
  } catch {
    return { ok: false, message: "JSON invalide", status: 500 };
  }
}
