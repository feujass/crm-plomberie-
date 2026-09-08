import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { assertCronSecret } from "@/lib/cron-auth";

function requestWithAuth(authorization?: string): NextRequest {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  return new NextRequest("http://localhost/api/cron/einvoicing-poll", { headers });
}

describe("assertCronSecret", () => {
  const previous = process.env.CRON_SECRET;

  afterEach(() => {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });

  it("refuse si CRON_SECRET est absent", () => {
    delete process.env.CRON_SECRET;
    expect(assertCronSecret(requestWithAuth("Bearer anything"))).toBe(false);
  });

  it("refuse sans en-tête Authorization", () => {
    process.env.CRON_SECRET = "cron-test-secret";
    expect(assertCronSecret(requestWithAuth())).toBe(false);
  });

  it("refuse un Bearer incorrect", () => {
    process.env.CRON_SECRET = "cron-test-secret";
    expect(assertCronSecret(requestWithAuth("Bearer wrong"))).toBe(false);
  });

  it("accepte Authorization: Bearer $CRON_SECRET (format Vercel Cron)", () => {
    process.env.CRON_SECRET = "cron-test-secret";
    expect(assertCronSecret(requestWithAuth("Bearer cron-test-secret"))).toBe(true);
  });
});
