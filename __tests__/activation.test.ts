import { describe, expect, it } from "vitest";
import {
  activatedAtForUpdate,
  activationCutoffMs,
  commentCreatedAtIso,
  commentPredatesActivation,
} from "../lib/automation/activation";

const activatedAt = new Date("2026-10-20T12:00:00.000Z");

describe("commentPredatesActivation", () => {
  it("is true only when the comment is earlier than activation", () => {
    expect(
      commentPredatesActivation("2026-10-20T11:59:59.000Z", activatedAt),
    ).toBe(true);
    expect(commentPredatesActivation(activatedAt.toISOString(), activatedAt)).toBe(
      false,
    );
    expect(
      commentPredatesActivation("2026-10-20T12:00:01.000Z", activatedAt),
    ).toBe(false);
  });

  it("accepts unix seconds and milliseconds", () => {
    expect(commentCreatedAtIso(1_700_000_000)).toBe("2023-11-14T22:13:20.000Z");
    expect(commentCreatedAtIso(1_700_000_000_000)).toBe(
      "2023-11-14T22:13:20.000Z",
    );
  });

  it("does not treat a missing or unparseable time as earlier", () => {
    expect(commentPredatesActivation(undefined, activatedAt)).toBe(false);
    expect(commentPredatesActivation("", activatedAt)).toBe(false);
    expect(commentPredatesActivation("not-a-time", activatedAt)).toBe(false);
    expect(commentPredatesActivation(0, activatedAt)).toBe(false);
    expect(
      commentPredatesActivation("2026-10-01T00:00:00.000Z", null),
    ).toBe(false);
  });
});

describe("activationCutoffMs", () => {
  const lookback = Date.parse("2026-10-20T09:00:00.000Z");

  it("uses the later of the lookback and the activation", () => {
    expect(activationCutoffMs(lookback, activatedAt)).toBe(activatedAt.getTime());
    expect(
      activationCutoffMs(lookback, new Date("2026-01-01T00:00:00.000Z")),
    ).toBe(lookback);
  });

  it("falls back to the lookback when activation is missing", () => {
    expect(activationCutoffMs(lookback, null)).toBe(lookback);
  });
});

describe("activatedAtForUpdate", () => {
  const now = new Date("2026-10-23T09:00:00.000Z");

  it("moves the timestamp only when a paused campaign is switched on", () => {
    expect(
      activatedAtForUpdate({ wasActive: false, willBeActive: true, now }),
    ).toEqual(now);
    expect(
      activatedAtForUpdate({ wasActive: true, willBeActive: true, now }),
    ).toBeNull();
    expect(
      activatedAtForUpdate({ wasActive: true, willBeActive: false, now }),
    ).toBeNull();
    expect(
      activatedAtForUpdate({ wasActive: false, willBeActive: false, now }),
    ).toBeNull();
    expect(
      activatedAtForUpdate({ wasActive: false, willBeActive: undefined, now }),
    ).toBeNull();
    expect(
      activatedAtForUpdate({ wasActive: true, willBeActive: undefined, now }),
    ).toBeNull();
  });
});
