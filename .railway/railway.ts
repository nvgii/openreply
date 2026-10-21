// Railway project for OpenReply: web, worker, daily cron, Postgres, Redis.
//
// New Railway services do not read railway.json / railway.toml (deprecated,
// ignored for new services, hard cutoff 2026-12-01). This file is the
// supported project config. The click-by-click path is docs/railway-setup-de.md.
// Do not railway config apply over a project you already built by clicking
// unless you have read the plan: a whole-project apply deletes resources this
// file does not name.
//
// `railway config plan` needs the `railway` package (`npm install railway`)
// and the Railway CLI. The Next.js app does not import this file.

import {
  defineRailway,
  group,
  postgres,
  preserve,
  project,
  redis,
  service,
} from "railway/iac";

const railpackNode = {
  RAILPACK_NODE_VERSION: "22",
} as const;

export default defineRailway(() => {
  const db = postgres("postgres");
  const cache = redis("redis");

  // ioredis (and BullMQ, which uses it) defaults to IPv4 DNS. Railway documents
  // `family=0` on REDIS_URL for dual-stack private networking. New projects
  // created after 2025-10-16 have IPv4 as well; the query is still the
  // documented fix and is a no-op when the URL is already dual-stack capable.
  const redisUrl = "${{redis.REDIS_URL}}?family=0";

  const web = service("web", {
    build: {
      builder: "RAILPACK",
      buildCommand: "npm run build",
    },
    preDeploy: "npm run db:migrate",
    start: "npm start -- --hostname 0.0.0.0",
    healthcheck: "/api/live",
    healthcheckTimeout: 300,
    deploy: {
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
    },
    env: {
      ...railpackNode,
      // Set after Generate Domain. Empty until that domain exists.
      NEXTAUTH_URL: "https://${{RAILWAY_PUBLIC_DOMAIN}}",
      NEXTAUTH_SECRET: preserve(),
      CRON_SECRET: preserve(),
      ENCRYPTION_KEY: preserve(),
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: redisUrl,
      META_GRAPH_API_VERSION: "v25.0",
      RESEND_API_KEY: preserve(),
      EMAIL_FROM: preserve(),
      EMAIL_SERVER: preserve(),
      ALLOWED_EMAILS: preserve(),
      INSTAGRAM_APP_ID: preserve(),
      INSTAGRAM_APP_SECRET: preserve(),
      FACEBOOK_APP_SECRET: preserve(),
      WEBHOOK_VERIFY_TOKEN: preserve(),
    },
  });

  const worker = service("worker", {
    build: {
      builder: "RAILPACK",
      buildCommand: "npm run db:generate",
    },
    start: "npm run worker",
    deploy: {
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
    },
    env: {
      ...railpackNode,
      NEXTAUTH_URL: "https://${{web.RAILWAY_PUBLIC_DOMAIN}}",
      NEXTAUTH_SECRET: preserve(),
      ENCRYPTION_KEY: preserve(),
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: redisUrl,
      META_GRAPH_API_VERSION: "v25.0",
    },
  });

  // 05:00 UTC daily. The process must exit; Railway skips the next run while
  // the previous one is still active. attach-next-reel also runs inside the
  // worker every few minutes; this call is the same daily safety net as
  // vercel.json.
  const cron = service("cron", {
    build: {
      builder: "RAILPACK",
      buildCommand: "node --check scripts/railway-cron.mjs",
    },
    start: "node scripts/railway-cron.mjs",
    deploy: {
      cronSchedule: "0 5 * * *",
      restartPolicyType: "NEVER",
    },
    env: {
      ...railpackNode,
      CRON_BASE_URL:
        "http://${{web.RAILWAY_PRIVATE_DOMAIN}}:${{web.PORT}}",
      CRON_SECRET: preserve(),
    },
  });

  return project("openreply", {
    resources: [group("OpenReply", [db, cache, web, worker, cron])],
  });
});
