import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, queueAdd } = vi.hoisted(() => ({
  mockPrisma: {
    instagramAccount: { findMany: vi.fn() },
    webhookEvent: { create: vi.fn(), update: vi.fn() },
  },
  queueAdd: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/queue/client", () => ({
  getDMQueue: () => ({ add: queueAdd }),
  MESSAGE_JOB_NAME: "process-message",
  POSTBACK_JOB_NAME: "process-postback",
}));

import { processInstagramWebhook } from "../lib/queue/process-webhook";

const account = { id: "connection", instagramId: "page_123", workspaceId: "workspace" };

function commentPayload(time: number, createdTime?: string) {
  return {
    object: "instagram",
    entry: [
      {
        id: "page_123",
        time,
        changes: [
          {
            field: "comments",
            value: {
              id: "comment_456",
              text: "LINK",
              from: { id: "user_789", username: "reader" },
              media: { id: "media_101" },
              ...(createdTime ? { created_time: createdTime } : {}),
            },
          },
        ],
      },
    ],
  };
}

beforeEach(() => {
  queueAdd.mockReset();
  mockPrisma.instagramAccount.findMany.mockResolvedValue([account]);
  mockPrisma.webhookEvent.create.mockResolvedValue({ id: "evt" });
  mockPrisma.webhookEvent.update.mockResolvedValue({});
});

describe("processInstagramWebhook comment time", () => {
  it("passes a known comment time through to the worker", async () => {
    await processInstagramWebhook({
      payload: commentPayload(1_700_000_000),
      provider: "META",
    });

    expect(queueAdd).toHaveBeenCalledWith(
      "process-comment",
      expect.objectContaining({
        commentId: "comment_456",
        commentCreatedAt: "2023-11-14T22:13:20.000Z",
        source: "WEBHOOK",
      }),
      expect.objectContaining({
        jobId: "comment_page_123_comment_456",
      }),
    );
  });

  it("still enqueues a comment when the payload has no time", async () => {
    await processInstagramWebhook({
      payload: commentPayload(0),
      provider: "META",
    });

    expect(queueAdd).toHaveBeenCalledWith(
      "process-comment",
      expect.objectContaining({
        commentId: "comment_456",
        commentCreatedAt: undefined,
      }),
      expect.any(Object),
    );
  });

  it("still enqueues keyword DMs and button taps", async () => {
    await processInstagramWebhook({
      payload: {
        object: "instagram",
        entry: [
          {
            id: "page_123",
            time: 1_700_000_000,
            messaging: [
              {
                sender: { id: "user_789" },
                recipient: { id: "page_123" },
                message: { mid: "mid_1", text: "LINK" },
              },
              {
                sender: { id: "user_789" },
                recipient: { id: "page_123" },
                postback: { mid: "mid_2", payload: "reveal:auto_789" },
              },
            ],
          },
        ],
      },
      provider: "META",
    });

    const names = queueAdd.mock.calls.map(([name]) => name);
    expect(names).toEqual(["process-postback", "process-message"]);
  });
});
