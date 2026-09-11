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

type VisionMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

type DevisVisionLlmOk = { ok: true; parsed: unknown };
type DevisVisionLlmErr = { ok: false; message: string; status: number; code?: string };
export type DevisVisionLlmResult = DevisVisionLlmOk | DevisVisionLlmErr;

function normalizeMediaType(mime: string): VisionMediaType {
  if (mime === "image/png") return "image/png";
  if (mime === "image/gif") return "image/gif";
  if (mime === "image/webp") return "image/webp";
  return "image/jpeg";
}

/** Extrait un devis structuré (JSON) depuis une image via Claude Vision. */
export async function completeDevisVisionLlm(
  systemPrompt: string,
  imageBase64: string,
  mimeType: string,
): Promise<DevisVisionLlmResult> {
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
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: normalizeMediaType(mimeType),
                data: imageBase64,
              },
            },
            { type: "text", text: "Analyse ce document et génère le JSON du devis." },
          ],
        },
      ],
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
