import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Railway's deploy healthcheck must return 2xx as soon as the web process is
// listening. /api/health also requires the worker heartbeat and answers 503
// until that process is up, which fails the web deploy on a fresh project.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
