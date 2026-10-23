import { describe, expect, it } from "vitest";
import { signInEmail } from "../lib/auth-email";

describe("sign-in email", () => {
  it("is informal German and keeps the OpenReply credit", () => {
    const url = "https://reply.example/api/auth/callback/resend?token=abc";
    const message = signInEmail({ url, host: "reply.example" });
    expect(message.subject).toBe("Dein Link zum Anmelden");
    expect(message.text).toContain(url);
    expect(message.text).toContain("Powered by OpenReply");
    expect(message.text).not.toMatch(/\bSie\b/);
    expect(message.html).toContain("Jetzt anmelden");
    expect(message.html).toContain(
      'href="https://reply.example/api/auth/callback/resend?token=abc"'
    );
  });
});
