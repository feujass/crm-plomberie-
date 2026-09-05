import type { DevisIaResponse } from "@/lib/schemas/devis-ia";

export type DemoQuoteRow = {
  id: string;
  demo_session_id: string;
  user_id: string | null;
  devis_id: string | null;
  transcript: string;
  quote_json: DevisIaResponse;
  preview_lines: Array<{ designation: string; quantite: number; unite: string }>;
  line_count: number;
  total_ttc: number;
  created_at: string;
  linked_at: string | null;
  expires_at: string;
};

export type DemoPreviewPayload = {
  demo_quote_id: string;
  preview_image_base64: string;
  preview_lines: Array<{ designation: string; quantite: number; unite: string }>;
  line_count: number;
  total_ttc: number;
};

export type DemoGenerateErrorCode =
  | "rate_limited"
  | "monthly_cap"
  | "timeout"
  | "invalid_input"
  | "generation_failed";
