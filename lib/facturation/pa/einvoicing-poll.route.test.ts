import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/cron/einvoicing-poll/route";

function pollRequest(authorization?: string): NextRequest {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  return new NextRequest("http://localhost/api/cron/einvoicing-poll", { headers });
}

describe("GET /api/cron/einvoicing-poll", () => {
  const previous = process.env.CRON_SECRET;

  afterEach(() => {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });

  it("répond 401 sans Authorization", async () => {
    process.env.CRON_SECRET = "einvoicing-cron-secret";
    const res = await GET(pollRequest());
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ ok: false });
  });

  it("répond 401 si le Bearer n’est pas CRON_SECRET", async () => {
    process.env.CRON_SECRET = "einvoicing-cron-secret";
    const res = await GET(pollRequest("Bearer other-secret"));
    expect(res.status).toBe(401);
  });

  it("n’est pas 401 avec le header Vercel Cron Authorization: Bearer $CRON_SECRET", async () => {
    process.env.CRON_SECRET = "einvoicing-cron-secret";
    const res = await GET(pollRequest("Bearer einvoicing-cron-secret"));
    expect(res.status).not.toBe(401);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
  });
});
