import { createTransport, type TransportOptions } from "nodemailer";
import type { EmailProviderSendVerificationRequestParams } from "@auth/core/providers/email";

export function signInEmail({ url, host }: { url: string; host: string }) {
  const subject = "Dein Link zum Anmelden";
  const text = [
    "Hallo,",
    "",
    `hier ist dein Link, um dich bei ${host} anzumelden:`,
    url,
    "",
    "Der Link gilt 24 Stunden. Wenn du ihn nicht angefordert hast, ignoriere diese E-Mail.",
    "",
    "Powered by OpenReply",
  ].join("\n");

  const safeUrl = url
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
  const safeHost = host
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\./g, "&#8203;.");

  const html = `<!DOCTYPE html>
<body style="margin:0;background:#f1eee8;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1eee8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;background:#f1eee8;color:#0d0d0d;font-family:Helvetica,Arial,sans-serif;">
          <tr>
            <td style="font-size:28px;font-weight:900;letter-spacing:-0.04em;padding-bottom:16px;">nadworker</td>
          </tr>
          <tr>
            <td style="font-size:16px;line-height:1.5;padding-bottom:8px;">Hallo,</td>
          </tr>
          <tr>
            <td style="font-size:16px;line-height:1.5;padding-bottom:24px;">hier ist dein Link, um dich bei <strong>${safeHost}</strong> anzumelden. Er gilt 24 Stunden.</td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <a href="${safeUrl}" style="display:inline-block;background:#f25c05;color:#0d0d0d;font-weight:700;font-size:15px;line-height:56px;padding:0 20px;text-decoration:none;">Jetzt anmelden</a>
            </td>
          </tr>
          <tr>
            <td style="font-size:14px;line-height:1.5;color:#4a463f;padding-bottom:24px;">Wenn du diese E-Mail nicht angefordert hast, ignoriere sie einfach.</td>
          </tr>
          <tr>
            <td style="font-size:13px;font-weight:600;color:#4a463f;">Powered by OpenReply</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>`;

  return { subject, text, html };
}

export async function sendGermanSignInEmail(
  params: EmailProviderSendVerificationRequestParams,
) {
  const { identifier: to, provider, url } = params;
  const { host } = new URL(url);
  const message = signInEmail({ url, host });

  if (provider.server) {
    const transport = createTransport(provider.server as TransportOptions);
    const result = await transport.sendMail({
      to,
      from: provider.from,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    const rejected = result.rejected ?? [];
    const pending = result.pending ?? [];
    const failed = [...rejected, ...pending].filter(Boolean);
    if (failed.length) {
      throw new Error(`Email (${failed.join(", ")}) could not be sent`);
    }
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: provider.from,
      to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });
  if (!res.ok) {
    throw new Error("Resend error: " + JSON.stringify(await res.json()));
  }
}
