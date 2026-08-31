import { NextResponse, type NextRequest } from "next/server";

import { deviceTypeFromUserAgent } from "@/lib/analytics/device";
import type { AnalyticsEventPayload } from "@/lib/analytics/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "edge";

const ALLOWED_EVENTS = new Set<AnalyticsEventPayload["event_type"]>([
  "page_view",
  "page_exit",
  "landing_view",
  "cta_click",
  "video_play",
  "video_25",
  "video_50",
  "video_75",
  "video_complete",
  "pricing_view",
  "register_view",
  "register_submit",
  "register_error",
  "register_success",
  "onboarding_profile_complete",
  "first_devis_created",
  "first_devis_sent",
  "trial_expired",
  "subscription_started",
]);

type GeoRequest = NextRequest & { geo?: { country?: string } };

function resolveCountry(req: NextRequest): string | null {
  const geoReq = req as GeoRequest;
  return geoReq.geo?.country ?? req.headers.get("x-vercel-ip-country") ?? null;
}

function isInternalTraffic(req: NextRequest): boolean {
  return req.cookies.get("flowo_internal")?.value === "1";
}

function parsePayload(body: unknown): AnalyticsEventPayload | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const session_id = typeof raw.session_id === "string" ? raw.session_id.trim() : "";
  const event_type = raw.event_type;
  const page_path = typeof raw.page_path === "string" ? raw.page_path.trim() : "";
  if (!session_id || !page_path || typeof event_type !== "string") return null;
  if (!ALLOWED_EVENTS.has(event_type as AnalyticsEventPayload["event_type"])) return null;

  const referrer = typeof raw.referrer === "string" ? raw.referrer.slice(0, 2048) : null;
  const time_on_page_ms =
    typeof raw.time_on_page_ms === "number" && Number.isFinite(raw.time_on_page_ms)
      ? Math.max(0, Math.round(raw.time_on_page_ms))
      : null;

  let properties: Record<string, unknown> | null = null;
  if (raw.properties && typeof raw.properties === "object" && !Array.isArray(raw.properties)) {
    properties = raw.properties as Record<string, unknown>;
  }

  let attribution: AnalyticsEventPayload["attribution"] = null;
  if (raw.attribution && typeof raw.attribution === "object" && !Array.isArray(raw.attribution)) {
    const a = raw.attribution as Record<string, unknown>;
    attribution = {
      utm_source: typeof a.utm_source === "string" ? a.utm_source.slice(0, 256) : null,
      utm_medium: typeof a.utm_medium === "string" ? a.utm_medium.slice(0, 256) : null,
      utm_campaign: typeof a.utm_campaign === "string" ? a.utm_campaign.slice(0, 256) : null,
      utm_content: typeof a.utm_content === "string" ? a.utm_content.slice(0, 256) : null,
      utm_term: typeof a.utm_term === "string" ? a.utm_term.slice(0, 256) : null,
      referrer: typeof a.referrer === "string" ? a.referrer.slice(0, 2048) : null,
      referrer_domain: typeof a.referrer_domain === "string" ? a.referrer_domain.slice(0, 256) : null,
      landing_path: typeof a.landing_path === "string" ? a.landing_path.slice(0, 512) : null,
      viewport_width:
        typeof a.viewport_width === "number" && Number.isFinite(a.viewport_width)
          ? Math.round(a.viewport_width)
          : null,
    };
  }

  return {
    session_id,
    event_type: event_type as AnalyticsEventPayload["event_type"],
    page_path: page_path.slice(0, 512),
    referrer,
    time_on_page_ms: event_type === "page_exit" ? time_on_page_ms : null,
    properties,
    attribution,
    attach_session: raw.attach_session === true,
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  const payload = parsePayload(body);
  if (!payload) return NextResponse.json({ ok: false }, { status: 400 });

  const country = resolveCountry(req);
  const userAgent = req.headers.get("user-agent");
  const device = deviceTypeFromUserAgent(userAgent);
  const isInternal = isInternalTraffic(req);
  const attr = payload.attribution;

  const fieldFromProps =
    typeof payload.properties?.field === "string" ? payload.properties.field.slice(0, 80) : null;
  const valueFilledFromProps =
    typeof payload.properties?.value_filled === "boolean" ? payload.properties.value_filled : null;

  try {
    const supabase = createAdminClient();

    if (payload.attach_session && attr) {
      await supabase.from("analytics_sessions").upsert(
        {
          session_id: payload.session_id,
          utm_source: attr.utm_source,
          utm_medium: attr.utm_medium,
          utm_campaign: attr.utm_campaign,
          utm_content: attr.utm_content,
          utm_term: attr.utm_term,
          referrer: attr.referrer,
          referrer_domain: attr.referrer_domain,
          landing_path: attr.landing_path,
          device_type: device,
          viewport_width: attr.viewport_width,
        },
        { onConflict: "session_id", ignoreDuplicates: true },
      );
    }

    const fullRow = {
      session_id: payload.session_id,
      event_type: payload.event_type,
      page_path: payload.page_path,
      country,
      referrer: payload.referrer ?? attr?.referrer ?? null,
      time_on_page_ms: payload.time_on_page_ms,
      properties: payload.properties,
      utm_source: attr?.utm_source ?? null,
      utm_medium: attr?.utm_medium ?? null,
      utm_campaign: attr?.utm_campaign ?? null,
      utm_content: attr?.utm_content ?? null,
      utm_term: attr?.utm_term ?? null,
      device,
      user_agent: userAgent?.slice(0, 512) ?? null,
      is_internal: isInternal,
      field: fieldFromProps,
      value_filled: valueFilledFromProps,
    };

    let { error } = await supabase.from("analytics_events").insert(fullRow);

    // Schéma dashboard pas encore migré : on garde le tracking de base.
    if (error && /column|schema cache/i.test(error.message)) {
      const legacy = await supabase.from("analytics_events").insert({
        session_id: payload.session_id,
        event_type: payload.event_type,
        page_path: payload.page_path,
        country,
        referrer: payload.referrer ?? attr?.referrer ?? null,
        time_on_page_ms: payload.time_on_page_ms,
        properties: payload.properties,
      });
      error = legacy.error;
    }

    if (error) return NextResponse.json({ ok: false }, { status: 500 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
