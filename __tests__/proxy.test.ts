import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "../proxy";

function request(path: string, cookie?: string) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

describe("home redirect", () => {
  it("sends anonymous visitors from / to the login page", () => {
    const response = proxy(request("/"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("sends a signed-in visitor from / to the dashboard", () => {
    const response = proxy(
      request("/", "__Secure-authjs.session-token=session")
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard"
    );
  });

  it("leaves Meta and public routes reachable", () => {
    for (const path of [
      "/login",
      "/privacy",
      "/terms",
      "/data-deletion",
      "/api/webhook",
      "/api/instagram/callback",
      "/api/auth/signin",
    ]) {
      const response = proxy(request(path));
      expect(response.headers.get("location")).toBeNull();
    }
  });
});
