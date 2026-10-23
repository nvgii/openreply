/**
 * Comment reconciliation — ad copies of a boosted post.
 *
 * Comments left on an ad carry the ad's own media id, so the sweep has to look
 * at those media too or a webhook Meta never delivers is lost for good.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, queueAdd, readComments } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
    automation: { findMany: vi.fn() },
    dmLog: { findMany: vi.fn() },
    operationalEvent: { create: vi.fn() },
  },
  queueAdd: vi.fn(),
  readComments: vi.fn(),
}));
vi.mock("@/lib/queue/client", () => ({
  getDMQueue: () => ({ add: queueAdd }),
}));
vi.mock("@/lib/instagram/provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/instagram/provider")>()),
  createInstagramContext: async () => ({
    provider: "META",
    accessToken: "local-test",
  }),
  getRecentMediaComments: readComments,
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));

import {
  adMediaFor,
  reconcileComments,
} from "../lib/polling/comment-reconciler";

const POST = "18023946917554990";
const AD = "17899788633163100";

describe("adMediaFor", () => {
  beforeEach(() => {
    mockPrisma.$queryRaw.mockReset();
  });

  it("returns the ad media ids seen for the post", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ mediaId: AD }]);
    await expect(adMediaFor(POST)).resolves.toEqual([AD]);
  });

  it("never returns the post itself, so it is not swept twice", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { mediaId: AD },
      { mediaId: POST },
    ]);
    await expect(adMediaFor(POST)).resolves.toEqual([AD]);
  });

  it("drops rows without a media id", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { mediaId: null },
      { mediaId: AD },
    ]);
    await expect(adMediaFor(POST)).resolves.toEqual([AD]);
  });

  it("returns nothing when the post was never boosted", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
    await expect(adMediaFor(POST)).resolves.toEqual([]);
  });

  it("swallows a query failure, leaving the post itself still swept", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("connection lost"));
    await expect(adMediaFor(POST)).resolves.toEqual([]);
  });
});

describe("comment polling does not recreate unsafe sends", () => {
  beforeEach(() => {
    queueAdd.mockReset();
    mockPrisma.operationalEvent.create.mockResolvedValue({});
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.automation.findMany.mockResolvedValue([
      {
        id: "campaign",
        name: "Campaign",
        workspaceId: "workspace",
        postId: POST,
        matchAnyWord: false,
        keywords: ["AI"],
        publicReplyEnabled: true,
        activatedAt: new Date(Date.now() - 60 * 60 * 1000),
        instagramAccount: {
          id: "connection",
          instagramId: "owner",
          provider: "META",
          accessToken: "test",
        },
      },
    ]);
    readComments.mockResolvedValue([
      {
        id: "old",
        text: "AI",
        from: { id: "reader" },
        timestamp: new Date().toISOString(),
      },
      {
        id: "new",
        text: "AI",
        from: { id: "another-reader" },
        timestamp: new Date().toISOString(),
      },
    ]);
  });
  it.each([
    { status: "FAILED", attempts: 1, dmDeliveryUnconfirmed: true },
    { status: "FAILED", attempts: 3, dmDeliveryUnconfirmed: false },
    {
      status: "FAILED",
      attempts: 1,
      errorMessage: "MetaApiError 1: An unknown error has occurred.",
    },
    { status: "PENDING", attempts: 1, dmDeliveryUnconfirmed: true },
  ])(
    "leaves an unsafe old comment alone while continuing new comments: %j",
    async (state) => {
      mockPrisma.dmLog.findMany.mockResolvedValue([
        { commentId: "old", publicReplySentAt: new Date(), ...state },
      ]);
      await reconcileComments();
      await reconcileComments();
      expect(queueAdd).toHaveBeenCalledTimes(2);
      for (const [, data] of queueAdd.mock.calls)
        expect(data.commentId).toBe("new");
    },
  );
});

describe("comment polling ignores comments from before the campaign was active", () => {
  // Inside the 72-hour lookback, so the poll cutoff is the activation time.
  const activatedAt = new Date(Date.now() - 60 * 60 * 1000);

  function campaign() {
    return {
      id: "campaign",
      name: "Campaign",
      workspaceId: "workspace",
      postId: POST,
      matchAnyWord: false,
      keywords: ["AI"],
      publicReplyEnabled: false,
      activatedAt,
      instagramAccount: {
        id: "connection",
        instagramId: "owner",
        provider: "META" as const,
        accessToken: "test",
      },
    };
  }

  beforeEach(() => {
    queueAdd.mockReset();
    readComments.mockReset();
    mockPrisma.operationalEvent.create.mockResolvedValue({});
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.dmLog.findMany.mockResolvedValue([]);
    mockPrisma.automation.findMany.mockResolvedValue([campaign()]);
  });

  it("skips a comment written before activation and enqueues one written after", async () => {
    readComments.mockResolvedValue([
      {
        id: "before",
        text: "AI",
        from: { id: "reader" },
        timestamp: new Date(activatedAt.getTime() - 1000).toISOString(),
      },
      {
        id: "at-start",
        text: "AI",
        from: { id: "reader-2" },
        timestamp: activatedAt.toISOString(),
      },
      {
        id: "after",
        text: "AI",
        from: { id: "reader-3" },
        timestamp: new Date(activatedAt.getTime() + 60 * 1000).toISOString(),
      },
    ]);

    await reconcileComments();

    expect(readComments).toHaveBeenCalledWith(
      expect.objectContaining({ sinceMs: activatedAt.getTime() }),
    );
    const ids = queueAdd.mock.calls.map(([, data]) => data.commentId);
    expect(ids).toEqual(["at-start", "after"]);
    expect(queueAdd.mock.calls[0][1].commentCreatedAt).toBe(
      activatedAt.toISOString(),
    );
  });

  it("keeps the lookback when the campaign was activated earlier than that", async () => {
    const oldActivation = new Date("2026-01-01T00:00:00.000Z");
    mockPrisma.automation.findMany.mockResolvedValue([
      { ...campaign(), activatedAt: oldActivation },
    ]);
    readComments.mockResolvedValue([
      {
        id: "recent",
        text: "AI",
        from: { id: "reader" },
        timestamp: new Date().toISOString(),
      },
    ]);

    const before = Date.now();
    await reconcileComments();

    const sinceMs = readComments.mock.calls[0][0].sinceMs as number;
    expect(sinceMs).toBeGreaterThan(oldActivation.getTime());
    expect(sinceMs).toBeGreaterThanOrEqual(before - 72 * 60 * 60 * 1000);
    expect(sinceMs).toBeLessThanOrEqual(Date.now() - 72 * 60 * 60 * 1000);
    expect(queueAdd.mock.calls.map(([, data]) => data.commentId)).toEqual([
      "recent",
    ]);
  });

  it("still enqueues a comment the provider returned without a timestamp", async () => {
    readComments.mockResolvedValue([
      { id: "undated", text: "AI", from: { id: "reader" }, timestamp: "" },
    ]);

    await reconcileComments();

    expect(queueAdd).toHaveBeenCalledTimes(1);
    expect(queueAdd.mock.calls[0][1].commentCreatedAt).toBeUndefined();
  });
});
