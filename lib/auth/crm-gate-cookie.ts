export const CRM_GATE_COOKIE = "flowo_crm_ok";
export const CRM_GATE_MAX_AGE_SEC = 180;

export function crmGateCookieOptions() {
  return {
    path: "/",
    maxAge: CRM_GATE_MAX_AGE_SEC,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
