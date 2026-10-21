// One-shot scheduler for Railway cron.
//
// vercel.json crons do not run off Vercel. The worker already binds "next
// reel" campaigns and reconciles missed comments. Nothing in the worker
// refreshes Instagram tokens or stores the daily follower snapshot, so a
// Railway cron service runs this script once a day and exits.
//
// Required env: CRON_BASE_URL, and CRON_SECRET or NEXTAUTH_SECRET.

const baseUrl = (process.env.CRON_BASE_URL ?? "").replace(/\/$/, "");
const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET || "";

if (!baseUrl || !secret) {
  console.error(
    "[cron] CRON_BASE_URL and CRON_SECRET (or NEXTAUTH_SECRET) are required"
  );
  process.exit(1);
}

const routes = ["refresh-tokens", "snapshot-followers", "attach-next-reel"];
let failed = false;

for (const route of routes) {
  const url = `${baseUrl}/api/cron/${route}`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(180_000),
    });
    const body = await response.text();
    const line = `[cron] ${route} ${response.status} ${body}`;
    if (response.ok) {
      console.log(line);
    } else {
      console.error(line);
      failed = true;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[cron] ${route} FAILED ${message}`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
